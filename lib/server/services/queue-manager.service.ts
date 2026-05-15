import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { redisUrl } from "@/lib/redis/redis"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { scheduleGroup } from "@/lib/server/action/openplay.action"
import { TQueuePlayer } from "@/lib/type/openplay/openplay.type"
import { QUEUE_KEYS } from "@/lib/type/queue/queue.type"
import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq"
import Redis from "ioredis"
import Redlock from "redlock"

class QueueManager {
  private connection: Redis
  private queues: Record<string, Queue<any>> = {}
  private events: Record<string, QueueEvents> = {}
  private workers: Record<string, Worker<any>> = {}
  private promotionLocks: Map<string, Promise<void>> = new Map()
  private redlock: Redlock
  private assignCourtCounter = 0

  constructor() {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null })

    this.connection.on("error", (err) => {
      console.error("[Redis] Connection error:", err)
    })
    this.connection.on("close", () => {
      console.warn("[Redis] Connection closed")
    })

    this.redlock = new Redlock([this.connection as unknown as Redlock.CompatibleRedisClient], {
      retryCount: 20,
      retryDelay: 500,
      retryJitter: 100,
      driftFactor: 0.01,
    })

    this.redlock.on("clientError", (error: any) => {
      console.error("[Redlock] Error:", error)
    })

    this.clearStaleLocks()
      .then(() => {
        for (const queueName of Object.values(QUEUE_KEYS)) {
          console.info(`[QueueManager] Creating queue: ${queueName}`)
          this.queues[queueName] = new Queue(queueName, { connection: this.connection })

          console.info(`[QueueManager] Creating events: ${queueName}`)
          this.events[queueName] = new QueueEvents(queueName, { connection: this.connection })

          this.events[queueName].on("waiting", ({ jobId }) => {
            console.info(`[${queueName}] Job received and waiting: ${jobId}`)
          })

          this.events[queueName].on("completed", ({ jobId }) => {
            console.info(`[${queueName}] Job completed: ${jobId}`)
          })
          this.events[queueName].on("failed", ({ jobId, failedReason }) => {
            console.error(`[${queueName}] Job failed: ${jobId}`, failedReason)
          })

          this.connection.on("error", (err) => {
            console.error("[Redis] Connection error:", err)
          })

          this.connection.on("close", () => {
            console.warn("[Redis] Connection closed")
          })

          this.registerWorker(queueName)
        }
      })
      .finally(() => {
        this.periodicSweepExpiredLocks()
      })

    process.on("SIGINT", async () => {
      await this.close()
      process.exit(0)
    })
    process.on("SIGTERM", async () => {
      await this.close()
      process.exit(0)
    })
  }

  private async clearStaleLocks() {
    try {
      const keys = await this.connection.keys("lock:schedule:*")
      if (keys.length > 0) {
        await this.connection.del(...keys)
        console.info(`[QueueManager] Cleared ${keys.length} stale locks`)
      }
    } catch (err) {
      console.error("[QueueManager] Error clearing stale locks:", err)
    }
  }

  private safeJobId(id?: string): string | undefined {
    if (!id) return undefined
    return id.replace(/[^a-zA-Z0-9_-]/g, "-") // Replace anything not alphanumeric, dash, or underscore
  }

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options: JobsOptions = {
      attempts: 1,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  ) {
    if (options.jobId) options.jobId = this.safeJobId(options.jobId) // sanitize jobId if present
    return this.queues[queueName].add(jobName, data, options)
  }

  async getJobs(
    queueName: string,
    types: ("waiting" | "active" | "completed" | "failed")[] = ["waiting", "active"],
  ) {
    console.info(
      `[QueueManager] Fetching jobs from queue: ${queueName}, types: ${types.join(", ")}`,
    )
    const jobs = await this.queues[queueName].getJobs(types)
    console.info(`[QueueManager] Found ${jobs.length} jobs in ${queueName}`)
    jobs.forEach((job) => {
      console.info(
        `[Job:${queueName}] id=${job.id}, name=${job.name}, status=${job.finishedOn ? "completed" : job.failedReason ? "failed" : "pending"}`,
      )
    })
    return jobs
  }

  async getJobCounts(queueName: string) {
    console.info(`[QueueManager] Fetching job counts for queue: ${queueName}`)
    const counts = await this.queues[queueName].getJobCounts()
    console.info(`[QueueManager] Counts for ${queueName}:`, counts)
    return counts
  }

  async getJob(queueName: string, jobId: string) {
    console.info(`[QueueManager] Fetching job ${jobId} from queue: ${queueName}`)
    const job = await this.queues[queueName].getJob(jobId)
    if (job) {
      console.info(
        `[Job:${queueName}] id=${job.id}, name=${job.name}, data=${JSON.stringify(job.data)}, status=${job.finishedOn ? "completed" : job.failedReason ? "failed" : "pending"}`,
      )
    } else {
      console.warn(`[QueueManager] Job ${jobId} not found in ${queueName}`)
    }
    return job
  }

  async clearQueue(queueName: string) {
    const queue = this.queues[queueName]
    if (!queue) throw new Error(`Queue ${queueName} not found`)
    console.info(`[QueueManager] Pausing queue ${queueName}`)
    await queue.pause()

    try {
      await queue.drain() // Remove waiting + delayed jobs
      await queue.clean(0, 1000, "completed") // Remove completed jobs
      await queue.clean(0, 1000, "failed") // Remove failed jobs
      console.info(`[QueueManager] Queue ${queueName} cleaned successfully`)
    } finally {
      await queue.resume()
      console.info(`[QueueManager] Queue ${queueName} resumed`)
    }
    return true
  }

  private registerWorker(queueName: string) {
    if (this.workers[queueName]) return
    console.info(`[QueueManager] Registering worker for: ${queueName}`)

    this.workers[queueName] = new Worker(
      queueName,
      async (job) => {
        switch (queueName) {
          case QUEUE_KEYS.LINEUP_PLAYER: {
            const player: TQueuePlayer = job.data
            console.info(`[Worker:${queueName}] Player ${player.playerName} joined lineup`)

            await this.aggregateBatchPlayers(
              `batch_${player.openPlayGroupId}`, // redis batch key
              player, // payload
              4,
              {
                onPromoted: async (data) => {
                  const playersHash = data
                    .map((p: any) => p.id)
                    .sort()
                    .join(":")

                  this.assignCourtCounter++ // Increment counter each time a group is promoted
                  const delay = this.assignCourtCounter * 4000 // Delay = counter * 2000 ms

                  await this.addJob(QUEUE_KEYS.ASSIGN_COURT, "assign-court", data, {
                    jobId: `schedule_${playersHash}`,
                    removeOnComplete: true,
                    delay,
                  })
                },
              },
            )
            break
          }

          case QUEUE_KEYS.ASSIGN_COURT: {
            const group = job.data
            if (!group?.length) return
            const openPlayId = group[0].openPlayId
            console.info(`[Worker:${queueName}] Scheduling group for openPlay ${openPlayId}`)

            await this.withScheduleLock(this.connection, this.redlock, openPlayId, async () => {
              const schedule = await scheduleGroup(group)

              console.info(
                `[${QUEUE_KEYS.ASSIGN_COURT}] Scheduled group ${group[0].openPlayGroupId} on court: ${schedule?.courtName}`,
              )
              if (schedule) {
                // Delays for start game
                const startedAt = new Date(schedule.scheduledAt).getTime()
                const delayStartGame = Math.max(0, startedAt - Date.now())

                // Delays for end game
                const endedAt = new Date(schedule.endedAt).getTime()
                const delayEndGame = Math.max(0, endedAt - Date.now())

                const preparationAt = startedAt - schedule.preparationSeconds * 1000 + 1000
                const delayPreparation = Math.max(0, preparationAt - Date.now())

                await Promise.all([
                  //start game
                  this.addJob(
                    QUEUE_KEYS.MATCH_STARTED,
                    `court:${schedule.courtId}`,
                    {
                      courtId: schedule.courtId,
                      openPlayGroupId: schedule.players[0].openPlayGroupId,
                      players: schedule.players,
                      startsAt: schedule.scheduledAt,
                    },
                    {
                      delay: delayStartGame,
                      jobId: `match-start_${schedule.courtId}:${group[0].openPlayGroupId}`,
                      removeOnComplete: true,
                    },
                  ),
                  //end game
                  this.addJob(
                    QUEUE_KEYS.MATCH_ENDED,
                    `court:${schedule.courtId}`,
                    {
                      courtId: schedule.courtId,
                      openPlayGroupId: schedule.players[0].openPlayGroupId,
                      players: schedule.players,
                      endsAt: schedule.endedAt,
                    },
                    {
                      delay: delayEndGame,
                      jobId: `match-end_${schedule.courtId}:${group[0].openPlayGroupId}`,
                      removeOnComplete: true,
                    },
                  ),
                  // Transition announcement
                  this.addJob(
                    QUEUE_KEYS.MATCH_ANNOUNCEMENT,
                    `court:${schedule.courtId}:${schedule.courtName}:announcement`,
                    {
                      courtName: schedule.courtName,
                      startedAt: schedule.scheduledAt,
                      preparationAt: new Date(preparationAt),
                      players: schedule.players
                        .map((p) => p.player.playerName || "Player")
                        .sort((a, b) => a.localeCompare(b)),
                      key: QUEUE_KEYS.MATCH_ANNOUNCEMENT,
                    },
                    delayPreparation > 0 ? { delay: delayPreparation } : {},
                  ),
                ])
              }

              EventBroadcast({ type: BroadcastEventTypes.OPENPLAY_UPDATED, data: group })
            })

            // const lock = await this.redlock.acquire([`lock:schedule:${openPlayId}`], 15000)
            // try {
            //   const schedule = await scheduleGroup(group)
            //   console.info(
            //     `[${QUEUE_KEYS.ASSIGN_COURT}] Scheduled group ${group[0].openPlayGroupId} on court: ${schedule?.courtName}`,
            //   )
            //   if (schedule) {
            //     // Delays for start game
            //     const startedAt = new Date(schedule.scheduledAt).getTime()
            //     const delayStartGame = Math.max(0, startedAt - Date.now())

            //     // Delays for end game
            //     const endedAt = new Date(schedule.endedAt).getTime()
            //     const delayEndGame = Math.max(0, endedAt - Date.now())

            //     const preparationAt = startedAt - schedule.preparationSeconds * 1000 + 1000
            //     const delayPreparation = Math.max(0, preparationAt - Date.now())

            //     await Promise.all([
            //       //start game
            //       this.addJob(
            //         QUEUE_KEYS.MATCH_STARTED,
            //         `court:${schedule.courtId}`,
            //         {
            //           courtId: schedule.courtId,
            //           openPlayGroupId: schedule.players[0].openPlayGroupId,
            //           players: schedule.players,
            //           startsAt: schedule.scheduledAt,
            //         },
            //         {
            //           delay: delayStartGame,
            //           jobId: `match-start_${schedule.courtId}:${group[0].openPlayGroupId}`,
            //           removeOnComplete: true,
            //         },
            //       ),
            //       //end game
            //       this.addJob(
            //         QUEUE_KEYS.MATCH_ENDED,
            //         `court:${schedule.courtId}`,
            //         {
            //           courtId: schedule.courtId,
            //           openPlayGroupId: schedule.players[0].openPlayGroupId,
            //           players: schedule.players,
            //           endsAt: schedule.endedAt,
            //         },
            //         {
            //           delay: delayEndGame,
            //           jobId: `match-end_${schedule.courtId}:${group[0].openPlayGroupId}`,
            //           removeOnComplete: true,
            //         },
            //       ),
            //       // Transition announcement
            //       this.addJob(
            //         QUEUE_KEYS.MATCH_ANNOUNCEMENT,
            //         `court:${schedule.courtId}:${schedule.courtName}:announcement`,
            //         {
            //           courtName: schedule.courtName,
            //           startedAt: schedule.scheduledAt,
            //           preparationAt: new Date(preparationAt),
            //           players: schedule.players
            //             .map((p) => p.player.playerName || "Player")
            //             .sort((a, b) => a.localeCompare(b)),
            //           key: QUEUE_KEYS.MATCH_ANNOUNCEMENT,
            //         },
            //         delayPreparation > 0 ? { delay: delayPreparation } : {},
            //       ),
            //     ])
            //   }

            //   EventBroadcast({ type: BroadcastEventTypes.OPENPLAY_UPDATED, data: group })
            // } catch (err) {
            //   console.error(`[${queueName}] Error scheduling group:`, err)
            //   await this.connection.del(`lock:schedule:${openPlayId}`) //Force cleanup if lock acquisition or scheduling fails
            // } finally {
            //   try {
            //     await lock.unlock()
            //   } catch (err) {
            //     console.error(`[Redlock] Failed to unlock:`, err)
            //     await this.connection.del(`lock:schedule:${openPlayId}`)
            //   }
            // }

            break
          }
          case QUEUE_KEYS.MATCH_STARTED:
          case QUEUE_KEYS.MATCH_ENDED: {
            const group = job.data
            EventBroadcast({
              type: BroadcastEventTypes.OPENPLAY_UPDATED,
              data: group,
            })

            //Refresh batches for this open play
            const openPlayId = group[0].openPlayId
            await manager.promoteWaitingPlayers<TQueuePlayer>(`batch_${openPlayId}`, 4, {
              onPromoted: async (data) => {
                await manager.addJob(QUEUE_KEYS.ASSIGN_COURT, "assign-court", data, {
                  jobId: `schedule_trigger_${openPlayId}}_${Date.now()}`,
                  removeOnComplete: true,
                })
              },
            })

            break
          }
          case QUEUE_KEYS.MATCH_ANNOUNCEMENT: {
            EventBroadcast({
              type: BroadcastEventTypes.OPENPLAY_UPDATED,
              data: job.data,
            })
            break
          }
          default:
            console.warn(`[Worker:${queueName}] No processor defined`)
        }
      },
      {
        connection: this.connection,
        concurrency: [QUEUE_KEYS.ASSIGN_COURT].includes(queueName as any) ? 1 : 5,
      },
    )
  }

  async close() {
    await Promise.all(Object.values(this.queues).map((q) => q.close()))
    await Promise.all(Object.values(this.workers).map((w) => w.close()))
    await Promise.all(Object.values(this.events).map((e) => e.close()))
    await this.connection.quit()
  }

  /**
   * Clear/reset a batch list in Redis.
   * @param batchKey - redis key used for batching
   */
  async clearBatch(batchKey: string) {
    const removed = await this.connection.del(batchKey)
    console.log(`[QueueManager] Cleared batch ${batchKey}, removed ${removed} entries`)
    return removed
  }

  /**
   * Inspect current batch contents without consuming them.
   * @param batchKey - redis key used for batching
   */
  async getBatch(batchKey: string) {
    const items = await this.connection.lrange(batchKey, 0, -1)
    const parsed = items.map((item) => JSON.parse(item))
    console.log(`[QueueManager] Peek batch ${batchKey}:`, parsed)
    return parsed
  }

  async aggregateBatchPlayers<T>(
    batchKey: string,
    payload: T,
    batchSize: number,
    options?: { onPromoted?: (data: any) => Promise<void> },
  ) {
    const lua = `
      local key = KEYS[1]
      local payload = ARGV[1]
      local batchSize = tonumber(ARGV[2])

      redis.call("RPUSH", key, payload)

      local size = redis.call("LLEN", key)

      if size >= batchSize then
        local group = redis.call("LRANGE", key, 0, batchSize - 1)
        redis.call("LTRIM", key, batchSize, -1)
        return group
      else
        return {}
      end
    `

    const raw = await this.connection.eval(
      lua,
      1,
      batchKey,
      JSON.stringify(payload),
      batchSize.toString(),
    )

    const result: string[] = Array.isArray(raw) ? (raw as string[]) : []
    if (result.length === 0) return

    const parsed: T[] = result.map((item) => JSON.parse(item))

    const previous = this.promotionLocks.get(batchKey) || Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })

    this.promotionLocks.set(
      batchKey,
      previous.then(() => current),
    )
    await previous

    try {
      await options?.onPromoted?.(parsed)
    } finally {
      release()
      if (this.promotionLocks.get(batchKey) === current) {
        this.promotionLocks.delete(batchKey)
      }
    }
  }

  async promoteWaitingPlayers<T>(
    batchKey: string,
    batchSize: number,
    options?: { onPromoted?: (data: any) => Promise<void> },
  ) {
    const items = await this.connection.lrange(batchKey, 0, batchSize - 1)
    if (items.length < batchSize) return

    const parsed: T[] = items.map((item) => JSON.parse(item))
    await this.connection.ltrim(batchKey, batchSize, -1)

    // reuse promotion lock logic
    const previous = this.promotionLocks.get(batchKey) || Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    this.promotionLocks.set(
      batchKey,
      previous.then(() => current),
    )
    await previous

    try {
      await options?.onPromoted?.(parsed)
    } finally {
      release()
      if (this.promotionLocks.get(batchKey) === current) {
        this.promotionLocks.delete(batchKey)
      }
    }
  }

  private periodicSweepExpiredLocks() {
    setInterval(async () => {
      try {
        const keys = await this.connection.keys("lock:schedule:*")
        for (const key of keys) {
          const ttl = await this.connection.pttl(key)
          if (ttl < 0) {
            await this.connection.del(key)
            console.info(`[QueueManager] Cleared expired lock: ${key}`)
          }
        }
      } catch (err) {
        console.error("[QueueManager] Error sweeping locks:", err)
      }
    }, 300000)
  }

  private async withScheduleLock<T>(
    connection: Redis,
    redlock: Redlock,
    openPlayId: string,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    let lock: Redlock.Lock | undefined
    try {
      // 🔹 Short TTL (10–15s) since jobs are fast
      lock = await redlock.acquire([`lock:schedule:${openPlayId}`], 15000)

      // Run the protected logic
      return await fn()
    } catch (err) {
      console.error(`[Lock] Error for ${openPlayId}:`, err)
      // 🔹 Force cleanup if acquire or fn fails
      await connection.del(`lock:schedule:${openPlayId}`)
      return null
    } finally {
      if (lock) {
        try {
          await lock.unlock()
        } catch (err) {
          console.error(`[Lock] Failed to unlock ${openPlayId}:`, err)
          // 🔹 Force cleanup if unlock fails
          await connection.del(`lock:schedule:${openPlayId}`)
        }
      }
    }
  }
}

export const manager = new QueueManager()

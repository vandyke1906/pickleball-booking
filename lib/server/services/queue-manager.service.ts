import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { redisUrl } from "@/lib/redis/redis"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { scheduleGroup } from "@/lib/server/action/openplay.action"
import { TQueuePlayer } from "@/lib/type/openplay/openplay.type"
import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq"
import Redis from "ioredis"
import Redlock from "redlock"

export const QUEUE_KEYS = {
  LINEUP_PLAYER: "line-up-player",
  ASSIGN_COURT: "assign-court",
  MATCH_STARTED: "match-started",
  MATCH_ENDED: "match-ended",
} as const

class QueueManager {
  private connection: Redis
  private queues: Record<string, Queue<any>> = {}
  private events: Record<string, QueueEvents> = {}
  private workers: Record<string, Worker<any>> = {}
  private promotionLocks: Map<string, Promise<void>> = new Map()
  private redlock: Redlock

  constructor() {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null })

    this.connection.on("error", (err) => {
      console.error("[Redis] Connection error:", err)
    })
    this.connection.on("close", () => {
      console.warn("[Redis] Connection closed")
    })

    this.redlock = new Redlock([this.connection as unknown as Redlock.CompatibleRedisClient], {
      retryCount: 50,
      retryDelay: 200,
      retryJitter: 100,
      driftFactor: 0.01,
    })

    this.redlock.on("clientError", (error: any) => {
      console.error("[Redlock] Error:", error)
    })

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

    process.on("SIGINT", async () => {
      await this.close()
      process.exit(0)
    })
    process.on("SIGTERM", async () => {
      await this.close()
      process.exit(0)
    })
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
              `batch:${player.openPlayGroupId}`, // redis batch key
              player, // payload
              4,
              {
                onPromoted: async (data) => {
                  // console.info(
                  //   `Promoted: ${JSON.stringify(
                  //     data.map((d: any) => ({
                  //       name: d.playerName,
                  //       startAt: d.startAt,
                  //       endAt: d.endAt,
                  //       openPlayGroupId: d.openPlayGroupId,
                  //     })),
                  //     null,
                  //     2,
                  //   )}`,
                  // )

                  const playersHash = data .map((p: any) => p.id) .sort() .join(":")
                  await this.addJob(QUEUE_KEYS.ASSIGN_COURT, `schedule:${playersHash}`, data)
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
            const lock = await this.redlock.acquire([`lock:schedule:${openPlayId}`], 30000)

            try {
              const schedule = await scheduleGroup(group)
              // console.info({"######": JSON.stringify(schedule, null, 2)})
              EventBroadcast({ type: BroadcastEventTypes.OPENPLAY_UPDATED, data: group })

              console.info( `[${QUEUE_KEYS.ASSIGN_COURT}] Scheduled group ${group[0].openPlayGroupId}`)

              if(schedule){
                const startedAt = new Date(schedule.scheduledAt).getTime()
                const delayStartGame = Math.max(0, startedAt - Date.now())

                const endedAt = new Date(schedule.endedAt).getTime()
                const delayEndGame = Math.max(0, endedAt - Date.now())
                

                //start game
                await this.addJob(QUEUE_KEYS.MATCH_STARTED, `court:${schedule.courtId}`,
                  {
                    courtId: schedule.courtId,
                    openPlayGroupId: schedule.players[0].openPlayGroupId,
                    players: schedule.players,
                  },
                  { delay: delayStartGame },
                )

                //end game
                await this.addJob(QUEUE_KEYS.MATCH_ENDED, `court:${schedule.courtId}`,
                  {
                    courtId: schedule.courtId,
                    openPlayGroupId: schedule.players[0].openPlayGroupId,
                    players: schedule.players,
                  },
                  { delay: delayEndGame },
                )
              }
            } finally {
              try {
                await lock.unlock()
              } catch (err) {
                console.error(`[Redlock] Failed to unlock:`, err)
              }
            }

            break
          }
          case QUEUE_KEYS.MATCH_STARTED:
          case QUEUE_KEYS.MATCH_ENDED: {
            const group = job.data
            console.info("*********QUEUE_KEYS.MATCH_ENDED")
            EventBroadcast({ type: BroadcastEventTypes.OPENPLAY_UPDATED, data: group })
            break
          }

          default:
            console.warn(`[Worker:${queueName}] No processor defined`)
        }
      },
      { connection: this.connection, concurrency: 1 },
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
}

export const manager = new QueueManager()

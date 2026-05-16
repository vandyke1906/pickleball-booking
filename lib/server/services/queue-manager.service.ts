import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { redisUrl } from "@/lib/redis/redis"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { isOpenPlayActive, scheduleGroup } from "@/lib/server/action/openplay.action"
import { TQueuePlayer } from "@/lib/type/openplay/openplay.type"
import { QUEUE_KEYS } from "@/lib/type/queue/queue.type"
import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq"
import Redis from "ioredis"
import crypto from "crypto"
import { differenceInMilliseconds, subSeconds } from "date-fns"

class QueueManager {
  private connection: Redis
  private queues: Record<string, Queue<any>> = {}
  private events: Record<string, QueueEvents> = {}
  private workers: Record<string, Worker<any>> = {}
  private promotionLocks: Map<string, Promise<void>> = new Map()

  // Scheduler leadership
  private serverId = crypto.randomUUID()
  private lockKey = "scheduler:leader"
  private isLeader = false
  private heartbeatTimer?: NodeJS.Timeout
  private schedulerWorker?: Worker
  private schedulerQueue: Queue

  // Scheduler defaults
  private readonly concurrency = 1
  private readonly lockTTL = 10000 // 10s
  private readonly heartbeatInterval = 5000

  constructor() {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null })
    this.schedulerQueue = new Queue(QUEUE_KEYS.ASSIGN_COURT, { connection: this.connection })

    this.connection.on("ready", () => {
      console.info("[Redis] Connection ready.")

      for (const queueName of Object.values(QUEUE_KEYS)) {
        console.info(`[QueueManager] Creating queue and queue-events: ${queueName}`)
        if (queueName === QUEUE_KEYS.ASSIGN_COURT) continue // Skip ASSIGN_COURT here — it's handled by startSchedulerWorker
        this.queues[queueName] = new Queue(queueName, { connection: this.connection })
        this.events[queueName] = new QueueEvents(queueName, { connection: this.connection })
        this.registerWorker(queueName)
      }
    })

    this.connection.on("error", (err) => {
      console.error("[Redis] Connection error:", err)
    })
    this.connection.on("close", () => {
      console.warn("[Redis] Connection closed")
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

  /** ---------------- Scheduler Leadership ---------------- */
  private async tryAcquireLeadership(): Promise<boolean> {
    const result = await this.connection.set(this.lockKey, this.serverId, "PX", this.lockTTL, "NX")
    this.isLeader = result === "OK"
    return this.isLeader
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isLeader) return
      await this.connection.set(this.lockKey, this.serverId, "PX", this.lockTTL, "XX")
    }, this.heartbeatInterval)
  }

  private startSchedulerWorker() {
    this.schedulerWorker = new Worker(
      QUEUE_KEYS.ASSIGN_COURT,
      async (job) => {
        const schedule = await scheduleGroup(job.data)
        if (schedule) {
          EventBroadcast({ type: BroadcastEventTypes.OPENPLAY_UPDATED, data: schedule })

          const startedAt = new Date(schedule.scheduledAt)
          const endedAt = new Date(schedule.endedAt)
          const preparationTime = subSeconds(startedAt, schedule.preparationSeconds || 0)

          const now = new Date()

          const startDelay = Math.max(0, differenceInMilliseconds(startedAt, now)) // delay before game starts
          const endDelay = Math.max(0, differenceInMilliseconds(endedAt, now)) // delay before game ends
          const prepDelay = Math.max(0, differenceInMilliseconds(preparationTime, now)) // delay before preparation/announcement

          const jobId = `job_${schedule.courtId}_${schedule.courtName}_${schedule.scheduledAt}`
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
                delay: startDelay,
                jobId: `start_${jobId}`,
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
                delay: endDelay,
                jobId: `end_${jobId}`,
                removeOnComplete: true,
              },
            ),
            // Transition announcement
            this.addJob(
              QUEUE_KEYS.MATCH_ANNOUNCEMENT,
              `court:${schedule.courtId}:${schedule.courtName}:announcement`,
              {
                courtName: schedule.courtName,
                openPlayId: schedule.openPlayId,
                startedAt: schedule.scheduledAt,
                preparationAt: new Date(preparationTime),
                players: schedule.players
                  .map((p) => p.player.playerName || "Player")
                  .sort((a, b) => a.localeCompare(b)),
                key: QUEUE_KEYS.MATCH_ANNOUNCEMENT,
              },
              prepDelay > 0
                ? { delay: prepDelay, jobId: `announcement_${jobId}_${prepDelay}_${new Date()}` }
                : { jobId: `announcement_${jobId}` },
            ),
          ])
        }
      },
      { connection: this.connection, concurrency: this.concurrency },
    )
  }

  async startScheduler() {
    const acquired = await this.tryAcquireLeadership()
    if (acquired) {
      console.log(`[Scheduler] I am the leader: ${this.serverId}`)
      this.startSchedulerWorker()
      this.startHeartbeat()
    } else {
      console.log(`[Scheduler] Standby mode: ${this.serverId}`)
      setTimeout(() => this.startScheduler(), 3000)
    }
  }

  async stopScheduler() {
    this.isLeader = false
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.schedulerWorker) await this.schedulerWorker.close()
    await this.connection.del(this.lockKey)
  }

  async addSchedulerJob(name: string, data: any) {
    return this.schedulerQueue.add(name, data)
  }

  /** ---------------- QueueManager Core ---------------- */
  private safeJobId(id?: string): string | undefined {
    if (!id) return undefined
    return id.replace(/[^a-zA-Z0-9_-]/g, "-")
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
    if (options.jobId) options.jobId = this.safeJobId(options.jobId)
    return this.queues[queueName].add(jobName, data, options)
  }

  async getJobs(
    queueName: string,
    types: ("waiting" | "active" | "completed" | "failed")[] = ["waiting", "active"],
  ) {
    return this.queues[queueName].getJobs(types)
  }

  async getJobCounts(queueName: string) {
    return this.queues[queueName].getJobCounts()
  }

  async getJob(queueName: string, jobId: string) {
    return this.queues[queueName].getJob(jobId)
  }

  async clearQueue(queueName: string) {
    const queue = this.queues[queueName]
    if (!queue) throw new Error(`Queue ${queueName} not found`)

    await queue.pause()
    try {
      await queue.clean(0, 1000, "wait")
      await queue.clean(0, 1000, "delayed")
      await queue.clean(0, 1000, "active")
      await queue.clean(0, 1000, "completed")
      await queue.clean(0, 1000, "failed")
    } finally {
      await queue.resume()
    }
    return true
  }

  private registerWorker(queueName: string) {
    if (this.workers[queueName]) return

    this.workers[queueName] = new Worker(
      queueName,
      async (job) => {
        switch (queueName) {
          case QUEUE_KEYS.LINEUP_PLAYER: {
            const player: TQueuePlayer = job.data
            console.info(`[Worker:${queueName}] Player ${player.playerName} joined lineup`)

            await this.aggregateBatchPlayers(`batch_${player.openPlayGroupId}`, player, 4, {
              onPromoted: async (data) => {
                // console.info(`##Group promoted: ${JSON.stringify(data, null, 2)}`)
                await this.addSchedulerJob("group-ready", data)
              },
            })
            break
          }

          case QUEUE_KEYS.MATCH_STARTED:
          case QUEUE_KEYS.MATCH_ENDED:
          case QUEUE_KEYS.MATCH_ANNOUNCEMENT: {
            if (queueName === QUEUE_KEYS.MATCH_ANNOUNCEMENT) {
              const isActive = await isOpenPlayActive(job.data.openPlayId)
              if (!isActive) break
            }
            EventBroadcast({ type: BroadcastEventTypes.OPENPLAY_UPDATED, data: job.data })
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
    await this.stopScheduler()
    await this.connection.quit()
  }

  async clearBatch(batchKey: string) {
    return this.connection.del(batchKey)
  }

  async getBatch(batchKey: string) {
    const items = await this.connection.lrange(batchKey, 0, -1)
    return items.map((item) => JSON.parse(item))
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

    const result: string[] = Array.isArray(raw) ? raw : []
    if (result.length === 0) return

    const parsed: T[] = result.map((item) => JSON.parse(item))

    // Promotion lock logic
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

    // Promotion lock logic
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

// Boot the scheduler when the app starts
;(async () => {
  await manager.startScheduler()
})()

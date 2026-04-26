import { LineupQueue } from "@/.config/prisma/generated/prisma"
import { redisUrl } from "@/lib/redis/redis"
import { TQueuePlayer } from "@/lib/type/openplay/openplay.type"
import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq"
import Redis from "ioredis"

export const QUEUE_KEYS = {
  LINEUP_PLAYER: "line-up-player",
  ASSIGN_COURT: "assign-court",
} as const

class QueueManager {
  private connection: Redis
  private queues: Record<string, Queue<any>> = {}
  private events: Record<string, QueueEvents> = {}
  private workers: Record<string, Worker<any>> = {}

  constructor() {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null })

    for (const queueName of Object.values(QUEUE_KEYS)) {
      console.info(`[QueueManager] Creating queue: ${queueName}`)
      this.queues[queueName] = new Queue(queueName, { connection: this.connection })

      console.info(`[QueueManager] Creating events: ${queueName}`)
      this.events[queueName] = new QueueEvents(queueName, { connection: this.connection })

      this.events[queueName].on("waiting", ({ jobId }) => {
        // console.info(`[${queueName}] Job received and waiting: ${jobId}`)
      })

      this.events[queueName].on("completed", ({ jobId }) => {
        // console.info(`[${queueName}] Job completed: ${jobId}`)
      })
      this.events[queueName].on("failed", ({ jobId, failedReason }) => {
        console.error(`[${queueName}] Job failed: ${jobId}`, failedReason)
      })

      this.registerWorker(queueName)
    }
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
            console.log(`[Worker:${queueName}] Player ${player.playerName} joined lineup`)

            await this.aggregateBatchPlayers(
              `batch:${player.openPlayCourtId}`, // redis batch key
              player, // payload
              4,
              {
                onPromoted: (data) => {
                  console.info(`Promoted: ${JSON.stringify(data, null, 2)}`)
                  // await this.queues[targetQueueName].add(
                  //   targetJobName,
                  //   { group: parsed },
                  //   {
                  //     attempts: 3,
                  //     backoff: { type: "exponential", delay: 5000 },
                  //     removeOnComplete: true,
                  //   },
                  // )
                },
              },
            )
            break
          }

          case QUEUE_KEYS.ASSIGN_COURT: {
            const { openPlayId } = job.data
            console.info(`[Worker:${queueName}] Scheduling group for openPlay ${openPlayId}`)
            // Example: call your scheduling logic
            // const qm = new QueueManager(openPlayId) // if you want nested scheduling
            // await qm.initializeData()
            // const newGroup = qm.promoteWaitingGroup()
            // if (newGroup) await qm.lineupQueueGroupPlayers(newGroup, prisma)
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

  /**
   * Aggregate jobs into batches of players before promoting to next queue.
   * @param batchKey - redis key to track batch state
   * @param payload - job payload
   * @param batchSize - number of jobs per batch
   * @param options - optional
   * @param options.onPromoted - callback when batch is promoted
   */
  async aggregateBatchPlayers<T>(
    batchKey: string,
    payload: T,
    batchSize: number,
    options?: {
      onPromoted?: (data: any) => void
    },
  ) {
    await this.connection.rpush(batchKey, JSON.stringify(payload)) // Push payload to the *end* of the list (FIFO)

    const currentSize = await this.connection.llen(batchKey)
    console.log(`[QueueManager] ${currentSize}/${batchSize} items in ${batchKey}`)

    if (currentSize >= batchSize) {
      const group = await this.connection.lrange(batchKey, 0, batchSize - 1) // Get the first N items (FIFO order)
      const parsed = group.map((item) => JSON.parse(item))
      options?.onPromoted?.(parsed)
      // console.log(`\n[QueueManager] Batch of ${batchSize} promoted (FIFO).\n`)

      await this.connection.ltrim(batchKey, batchSize, -1) // Trim list to remove those items
    }
  }
}

export const manager = new QueueManager()

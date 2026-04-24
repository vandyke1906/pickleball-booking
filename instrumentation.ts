import { initRedis } from "@/lib/redis/redis"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info("[Startup] Initializing Redis Connection...")
    await initRedis()

    // await intervalTest()
    // await singleTest()
    await randomTest()
  }
}

function getRandomId(ids: string[]): string {
  const randomIndex = Math.floor(Math.random() * ids.length)
  return ids[randomIndex]
}

async function intervalTest() {
  const { manager, QUEUE_KEYS } = await import("@/lib/server/services/queue-manager.service")
  setTimeout(async () => {
    console.info("xxxxx")
    const openPlayId = "openplay-1"
    //clear batch first
    await manager.clearBatch(`batch:${openPlayId}`)

    const limit = 8
    let counter = 0
    const interval = setInterval(async () => {
      if (counter < limit) {
        await manager.addJob(QUEUE_KEYS.LINEUP_PLAYER, "assignPlayer", {
          playerId: `player ${counter + 1}`,
          openPlayId,
        })
      } else {
        clearInterval(interval)
        console.info("Interval Cleared.")
      }
      counter++
    }, 2000)
  }, 2000)
}

async function singleTest() {
  const { manager, QUEUE_KEYS } = await import("@/lib/server/services/queue-manager.service")

  setTimeout(async () => {
    console.info("xxxxx")
    const openPlayId = "openplay-1"

    // Clear batch first
    await manager.clearBatch(`batch:${openPlayId}`)

    const limit = 8
    for (let counter = 0; counter < limit; counter++) {
      await manager.addJob(QUEUE_KEYS.LINEUP_PLAYER, "assignPlayer", {
        playerId: `player ${counter + 1}`,
        openPlayId,
      })
    }

    console.info("All jobs added in one batch.")
  }, 2000)
}

async function randomTest() {
  const { manager, QUEUE_KEYS } = await import("@/lib/server/services/queue-manager.service")

  setTimeout(async () => {
    const courtIds = ["court 1", "court 2"]

    // Clear batch first
    await Promise.all(courtIds.map((id) => manager.clearBatch(`batch:${id}`)))

    const limit = 20
    const jobs: Promise<any>[] = []

    for (let counter = 0; counter < limit; counter++) {
      const courtId = getRandomId(courtIds)
      jobs.push(
        manager.addJob(QUEUE_KEYS.LINEUP_PLAYER, courtId, {
          playerId: `player ${counter + 1}`,
          openPlayId: "1",
          courtId,
        }),
      )
    }

    // Fire them all at once, but don’t await each individually
    Promise.allSettled(jobs).then((results) => {
      console.info(
        "BatchTest finished, results:",
        results.map((r, idx) => {
          if (r.status === "fulfilled") {
            const job = r.value
            return `Job ${idx + 1}: player=${job.data.playerId} on court=${job.data.courtId}, status=fulfilled`
          } else {
            return `Job ${idx + 1}: status=failed, reason=${r.reason}`
          }
        }),
      )
    })
  }, 2000)
}

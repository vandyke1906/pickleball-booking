import { QueueStatus } from "@/.config/prisma/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  TQueuePlayer,
  TCurrentGame,
  TQueueGroup,
  TQueueOpenPlay,
} from "@/lib/type/openplay/openplay.type";
import { TPrismaTransaction } from "@/lib/type/util.type";

export class QueueManager {
  private openPlay: TQueueOpenPlay | null = null;
  constructor(private openPlayId: string) {}

  public async initializeData(prismaTransaction?: TPrismaTransaction) {
    const db = prismaTransaction ?? prisma
    const activeOpenPlay = await db.openPlay.findUnique({
      where: { id: this.openPlayId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        isActive: true,
        isCompleted: true,
        startedAt: true,
        transitionMinutes: true,
        announcementMinutesBeforeTransition: true,
        preparationSeconds: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        queues: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            playerId: true,
            player: true,
            scheduledAt: true,
            endedAt: true,
          },
        },
        courts: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!activeOpenPlay) throw new Error("No active Open Play found")

    const data: TQueueOpenPlay = {
      id: activeOpenPlay.id,
      isActive: activeOpenPlay.isActive,
      startedAt: activeOpenPlay.startedAt,
      isCompleted: activeOpenPlay.isCompleted,
      startTime: activeOpenPlay.startTime,
      endTime: activeOpenPlay.endTime,
      transitionMinutes: activeOpenPlay.transitionMinutes,
      preparationSeconds: activeOpenPlay.preparationSeconds,
      announcementMinutesBeforeTransition:
        activeOpenPlay.announcementMinutesBeforeTransition,
      status: activeOpenPlay.status,
      organizationId: activeOpenPlay.organizationId,
      createdAt: activeOpenPlay.createdAt,
      updatedAt: activeOpenPlay.updatedAt,
      queuePlayers: activeOpenPlay.queues.map((q) => ({
        id: q.id,
        playerId: q.playerId,
        playerName: q.player.playerName,
        scheduledAt: q.scheduledAt,
        endedAt: q.endedAt,
      })),
      courts: activeOpenPlay.courts.map((c) => ({ id: c.id, name: c.name })),
    };

    this.openPlay = data;
    return data;
  }

  /** FIFO chunking into groups of 4 */
  private chunkPlayers(
    players: TQueuePlayer[],
    size: number = 4,
  ): TQueuePlayer[][] {
    const result: TQueuePlayer[][] = [];
    let queue: TQueuePlayer[] = [];

    for (const p of players) {
      queue.push(p);
      if (queue.length === size) {
        result.push(queue);
        queue = [];
      }
    }
    if (queue.length > 0) result.push(queue);
    return result;
  }

  /** Unified schedule state builder */
  private getScheduleState(
    currentGames: TCurrentGame[],
    queue: TQueueGroup[],
    completedGames: TCurrentGame[],
    nextTransition: Date | null,
    waitingPlayers: TQueuePlayer[] = [],
  ) {
    if (!this.openPlay) throw new Error("No available Open Play Data");
    return {
      isStarted: !!this.openPlay.startedAt,
      openPlay: this.openPlay,
      currentGames,
      queue,
      completedGames,
      nextTransition,
      waitingPlayers,
    };
  }

  /** Initialize schedule based on FIFO players */
  public initializeSchedule(): {
    scheduledGroups: TQueueGroup[];
    waitingPlayers: TQueuePlayer[];
  } {
    const { openPlay } = this;
    if (!openPlay) throw new Error("No available Open Play Data");

    if (!openPlay.startedAt) {
      return { scheduledGroups: [], waitingPlayers: openPlay.queuePlayers };
    }

    const GAME_MS = openPlay.transitionMinutes * 60_000;
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000;
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS;

    const startTime = new Date(openPlay.startedAt);
    const players = openPlay.queuePlayers;
    const courts = openPlay.courts;
    const groups = this.chunkPlayers(players, 4);
    const courtsCount = courts.length;

    const scheduledGroups: TQueueGroup[] = [];
    let waitingPlayers: TQueuePlayer[] = [];

    for (let slot = 0; slot * courtsCount < groups.length; slot++) {
      const scheduledAt = new Date(
        startTime.getTime() + slot * SLOT_DURATION_MS,
      );
      const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS);

      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci;
        if (gi >= groups.length) break;

        const g = groups[gi];
        if (g.length < 4) {
          waitingPlayers = g;
          break;
        }

        scheduledGroups.push({
          id: `grp-${courts[ci].id}-${scheduledAt.getTime()}`,
          courtId: courts[ci].id,
          courtName: courts[ci].name,
          players: g.map((p) => ({ ...p, scheduledAt })),
          scheduledAt,
          estimatedEndTime: gameEndTime,
          position: gi + 1,
        });
      }
    }

    return { scheduledGroups, waitingPlayers };
  }

/** Add player to queue respecting FIFO and group size */
private addPlayerToQueue(
  player: TQueuePlayer,
  now: Date = new Date(),
): TQueueGroup | null {
  const { openPlay } = this;
  if (!openPlay) throw new Error("No available Open Play Data");

  const GAME_MS = openPlay.transitionMinutes * 60_000;
  const PREPARATION_MS = openPlay.preparationSeconds * 1_000;
  const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS;

  const { scheduledGroups, waitingPlayers } = this.getPlayerSchedules();
  const lastGroup = scheduledGroups.length ? scheduledGroups[scheduledGroups.length - 1] : null;

  let newGroup: TQueueGroup | null = null;

  if (waitingPlayers.length > 0 && waitingPlayers.length < 4) {
    // Add to waiting players
    waitingPlayers.push(player);
    if (waitingPlayers.length === 4) {
      // Promote to scheduled group
      const scheduledAt = lastGroup
        ? new Date(lastGroup.estimatedEndTime.getTime() + SLOT_DURATION_MS)
        : new Date(now.getTime()  + SLOT_DURATION_MS);

      const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS);
      newGroup = {
        id: `grp-${openPlay.courts[0].id}-${scheduledAt.getTime()}`,
        courtId: openPlay.courts[0].id,
        courtName: openPlay.courts[0].name,
        players: waitingPlayers.map((p) => ({ ...p, scheduledAt })),
        scheduledAt,
        estimatedEndTime: gameEndTime,
        position: (lastGroup?.position ?? 0) + 1,
      };
      scheduledGroups.push(newGroup);
    }
  } else {
    // No waiting players, start a new waiting group
    const scheduledAt = lastGroup
      ? new Date(lastGroup.estimatedEndTime.getTime() + SLOT_DURATION_MS)
      : new Date(now.getTime()  + SLOT_DURATION_MS);

    const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS);
    newGroup = {
      id: `grp-${openPlay.courts[0].id}-${scheduledAt.getTime()}`,
      courtId: openPlay.courts[0].id,
      courtName: openPlay.courts[0].name,
      players: [{ ...player, scheduledAt }],
      scheduledAt,
      estimatedEndTime: gameEndTime,
      position: (lastGroup?.position ?? 0) + 1,
    };
    scheduledGroups.push(newGroup);
  }

  // Update queuePlayers
  openPlay.queuePlayers.push(player);

  // Return only the newly scheduled group (or null if not promoted yet)
  return newGroup;
}

  /** Compute current state with callbacks */
  public compute(
    options: {
      now?: Date;
      onGroupDone?: (game: TCurrentGame) => void;
      onPlayerDone?: (player: TQueuePlayer) => void;
      completedPlayerIds?: Set<string>;
    } = {},
  ) {
    const { openPlay } = this;
    if (!openPlay) throw new Error("No available Open Play Data");
    const now = options.now ?? new Date();
    const onGroupDone = options.onGroupDone;
    const onPlayerDone = options.onPlayerDone;
    const completedPlayerIds = options.completedPlayerIds ?? new Set<string>();

    if (!openPlay.startedAt) {
      return this.getScheduleState([], [], [], null, openPlay.queuePlayers);
    }

    const GAME_MS = openPlay.transitionMinutes * 60_000;
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000;
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS;

    // Remove completed players entirely
    const players = openPlay.queuePlayers.filter(
      (p) => !completedPlayerIds.has(p.id),
    );
    const courts = openPlay.courts;
    const groups = this.chunkPlayers(players, 4); // FIFO chunking
    const courtsCount = courts.length;

    const currentGames: TCurrentGame[] = [];
    const queue: TQueueGroup[] = [];
    const completedGames: TCurrentGame[] = [];
    let waitingPlayers: TQueuePlayer[] = [];

    for (let slot = 0; slot * courtsCount < groups.length; slot++) {
      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci;
        if (gi >= groups.length) break;

        const g = groups[gi];
        if (g.length < 4) {
          waitingPlayers = g;
          break;
        }

        // Determine scheduledAt: use players’ scheduledAt if available, else fallback
        const scheduledAt =
          g[0].scheduledAt ??
          (openPlay.startedAt ? new Date(openPlay.startedAt) : now);

        const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS);
        const slotEndTime = new Date(scheduledAt.getTime() + SLOT_DURATION_MS);

        const annotated = g.map((p) => ({ ...p, scheduledAt }));

        if (now >= gameEndTime) {
          const finished: TCurrentGame = {
            courtId: courts[ci].id,
            courtName: courts[ci].name,
            players: annotated,
            startTime: scheduledAt,
            estimatedEndTime: gameEndTime,
            isPreparing: false,
          };
          completedGames.push(finished);
          if (onGroupDone) onGroupDone(finished);
          if (onPlayerDone) annotated.forEach((p) => onPlayerDone(p));
        } else if (now >= scheduledAt && now < gameEndTime) {
          currentGames.push({
            courtId: courts[ci].id,
            courtName: courts[ci].name,
            players: annotated,
            startTime: scheduledAt,
            estimatedEndTime: gameEndTime,
            isPreparing: now > gameEndTime && now < slotEndTime,
          });
        } else {
          queue.push({
            id: `grp-${courts[ci].id}-${scheduledAt.getTime()}`,
            courtId: courts[ci].id,
            courtName: courts[ci].name,
            players: annotated,
            scheduledAt,
            estimatedEndTime: gameEndTime,
            position: gi + 1,
          });
        }
      }
    }

    let nextTransition: Date | null = null;
    if (currentGames.length > 0) {
      nextTransition = currentGames
        .map((g) => g.estimatedEndTime)
        .sort((a, b) => a.getTime() - b.getTime())[0];
    } else if (queue.length > 0) {
      nextTransition = queue[0].scheduledAt;
    }

    return this.getScheduleState(
      currentGames,
      queue,
      completedGames,
      nextTransition,
      waitingPlayers,
    );
  }

  /** Get current schedule state based on FIFO players */
  private getPlayerSchedules(now: Date = new Date()): {
    scheduledGroups: TQueueGroup[];
    waitingPlayers: TQueuePlayer[];
  } {
    const { openPlay } = this;
    if (!openPlay) throw new Error("No available Open Play Data");

    const GAME_MS = openPlay.transitionMinutes * 60_000;
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000;
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS;

    const players = openPlay.queuePlayers;
    const courts = openPlay.courts;
    const groups = this.chunkPlayers(players, 4);
    const courtsCount = courts.length;

    const scheduledGroups: TQueueGroup[] = [];
    let waitingPlayers: TQueuePlayer[] = [];

    // Find the latest endedAt among players
    const lastEndedAt = players
      .filter((p) => p.endedAt)
      .map((p) => p.endedAt as Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    // Baseline time: last endedAt if exists, otherwise now
    let baseline = lastEndedAt ?? now;

    for (let slot = 0; slot * courtsCount < groups.length; slot++) {
      const scheduledAt = new Date(baseline.getTime() + slot * GAME_MS);
      const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS);

      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci;
        if (gi >= groups.length) break;

        const g = groups[gi];
        if (g.length < 4) {
          waitingPlayers = g;
          break;
        }

        scheduledGroups.push({
          id: `grp-${courts[ci].id}-${scheduledAt.getTime()}`,
          courtId: courts[ci].id,
          courtName: courts[ci].name,
          players: g.map((p) => ({ ...p, scheduledAt })),
          scheduledAt,
          estimatedEndTime: gameEndTime,
          position: gi + 1,
        });
      }
    }

    return { scheduledGroups, waitingPlayers };
  }

  public async addPlayerToQueueAndScheduleWaitingPlayers(queuePlayer:TQueuePlayer, prismaTransaction?: TPrismaTransaction) {
    const db = prismaTransaction ?? prisma
    await this.initializeData(db)
    const group = this.addPlayerToQueue(queuePlayer);
          if (group) {
            for (const player of group?.players) {
              await db.lineupQueue.upsert({
                where: {
                  playerId_openPlayId: {
                    playerId: player.playerId,
                    openPlayId: this.openPlayId,
                  },
                },
                update: {
                  scheduledAt: group.scheduledAt,
                  endedAt: group.estimatedEndTime,
                  status: QueueStatus.waiting,
                },
                create: {
                  playerId: player.id,
                  openPlayId: this.openPlayId,
                  scheduledAt: group.scheduledAt,
                  endedAt: group.estimatedEndTime,
                  status: QueueStatus.waiting,
                },
              });
            }
          }

  }

}

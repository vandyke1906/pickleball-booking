"use client"

import { useEffect, useState } from "react"
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core"

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/common/copy-button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatTimeOnly, formatToPHDateTime } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  group: any
  onEditPlayer: (player: any) => void
  onDeletePlayer: (player: any) => void
  PlayerSkillLabels: any
  PlayerSkill: any
  onReorder?: (players: any[]) => void
  isLoading?: boolean
  isOpenPlayActive?: boolean
}

export default function DraggablePlayersList({
  group,
  onEditPlayer,
  onDeletePlayer,
  PlayerSkillLabels,
  PlayerSkill,
  onReorder,
  isLoading = false,
  isOpenPlayActive = false,
}: Props) {
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    setPlayers(group?.players || [])
  }, [group])

  function handleDragEnd(event: DragEndEvent) {
    if (isOpenPlayActive) return
    const { active, over } = event

    if (!over || active.id === over.id) return

    let newOrder: any[] = []

    setPlayers((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)

      newOrder = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index + 1,
      }))

      return newOrder
    })

    onReorder?.(newOrder)
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 text-sm">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))
          ) : players.length ? (
            players.map((player, index) => (
              <SortablePlayerRow
                key={player.id}
                index={index}
                player={player}
                onEditPlayer={onEditPlayer}
                onDeletePlayer={onDeletePlayer}
                PlayerSkillLabels={PlayerSkillLabels}
                PlayerSkill={PlayerSkill}
                isOpenPlayActive={isOpenPlayActive}
              />
            ))
          ) : (
            <span className="text-muted-foreground">No players registered.</span>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

/* =========================
   INTERNAL SORTABLE ROW
   ========================= */

function SortablePlayerRow({
  index,
  player,
  onEditPlayer,
  onDeletePlayer,
  PlayerSkillLabels,
  PlayerSkill,
  isOpenPlayActive = false,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
    disabled: isOpenPlayActive,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      style={style}
      {...(!isOpenPlayActive ? attributes : {})}
      className={`flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 shadow-sm gap-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* DRAG AREA */}
      <div className="flex flex-col sm:flex-row sm:items-center flex-1 gap-2">
        {/* Numbering Circle */}
        <div className="flex items-center gap-3 sm:mr-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  ref={setNodeRef}
                  {...(!isOpenPlayActive ? listeners : {})}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white text-xs font-semibold  cursor-grab active:cursor-grabbing"
                >
                  {index + 1}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isOpenPlayActive
                    ? "Reordering disabled while open play is active"
                    : "Drag to move player"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Code */}
          <div className="text-sm">
            code: <span className="font-semibold text-primary">{player.code}</span>
            <CopyButton text={player.code} html={`strong>${player.code}</strong>`} />
          </div>
        </div>

        {/* Name + Skill */}
        <div className="sm:flex-1 text-sm font-medium">
          {player.playerName}

          <Badge variant="outline" className="ml-2">
            {PlayerSkillLabels[player.skill as typeof PlayerSkill]}
          </Badge>
        </div>

        {/* Play time */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            <span className="font-medium">Play Time:</span> {player.totalPlayTime ?? "N/A"} min
          </div>

          <div className="flex gap-2 flex-wrap">
            <span>
              <span className="font-medium">Start:</span>{" "}
              {player.startAt && formatTimeOnly(player.startAt)}
            </span>

            <span className="text-muted-foreground/60">•</span>

            <span>
              <span className="font-medium">End:</span>{" "}
              {player.endAt && formatTimeOnly(player.endAt)}
            </span>
          </div>
        </div>
      </div>

      {/* ACTIONS (NOT DRAGGABLE) */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEditPlayer(player)}>
          Edit
        </Button>

        {!isOpenPlayActive && (
          <Button size="sm" variant="destructive" onClick={() => onDeletePlayer(player)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

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

type Props = {
  group: any
  onEditPlayer: (player: any) => void
  onDeletePlayer: (player: any) => void
  PlayerSkillLabels: any
  PlayerSkill: any
  onReorder?: (players: any[]) => void
}

export default function DraggablePlayersList({
  group,
  onEditPlayer,
  onDeletePlayer,
  PlayerSkillLabels,
  PlayerSkill,
  onReorder,
}: Props) {
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    setPlayers(group?.players || [])
  }, [group])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    setPlayers((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)

      const newOrder = arrayMove(items, oldIndex, newIndex)

      onReorder?.(newOrder)

      return newOrder
    })
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 text-sm">
          {players.length ? (
            players.map((player, index) => (
              <SortablePlayerRow
                key={player.id}
                index={index}
                player={player}
                onEditPlayer={onEditPlayer}
                onDeletePlayer={onDeletePlayer}
                PlayerSkillLabels={PlayerSkillLabels}
                PlayerSkill={PlayerSkill}
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
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 shadow-sm gap-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* DRAG AREA */}
      <div
        {...listeners}
        className="flex flex-col sm:flex-row sm:items-center flex-1 gap-2 cursor-grab active:cursor-grabbing"
      >
        {/* Numbering Circle */}
        <div className="flex items-center gap-3 sm:mr-4">
          <div className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
            {index + 1}
          </div>

          {/* Code */}
          <div className="text-sm">
            code: <span className="font-semibold text-primary">{player.code}</span>
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
        <div className="text-sm text-muted-foreground">
          ({player.totalPlayTime || "N/A"} minutes Play Time)
        </div>
      </div>

      {/* ACTIONS (NOT DRAGGABLE) */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEditPlayer(player)}>
          Edit
        </Button>

        <Button size="sm" variant="destructive" onClick={() => onDeletePlayer(player)}>
          Delete
        </Button>
      </div>
    </div>
  )
}

"use client"

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Column, Table } from "@tanstack/react-table"
import { Eye, EyeOff, GripVertical, Settings2Icon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface DataTableViewOptionsProps<TData> extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>
  disabled?: boolean
}

const ColumnItem = <TData,>({ column }: { column: Column<TData, unknown> }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const label =
    column.columnDef.meta?.label ??
    (typeof column.columnDef.header === "string" ? column.columnDef.header : column.id)

  const isVisible = column.getIsVisible()

  const toggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault()
    column.toggleVisibility(!isVisible)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center gap-2 rounded-md border bg-background p-2 shadow-sm",
        !isVisible && "bg-muted opacity-60",
        isDragging && "z-50 ring-2 ring-primary",
      )}
    >
      <button onClick={toggleVisibility} className="text-muted-foreground hover:text-foreground">
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <span className="flex-1 truncate text-xs font-medium">{label}</span>{" "}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label="Drag column"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  )
}

export function DataTableViewOptions<TData>({
  table,
}: // disabled,
// ...props
DataTableViewOptionsProps<TData>) {
  // Get all hidable columns
  const allColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide()),
    [table],
  )

  // Initialize column order from table state
  const initialOrder = React.useMemo(() => allColumns.map((col) => col.id), [allColumns])

  const [columnOrder, setColumnOrder] = React.useState<string[]>(initialOrder)

  // Sync with table state
  React.useEffect(() => {
    const currentOrder = table.getState().columnOrder
    // Only update if currentOrder is different and non-empty
    if (currentOrder.length > 0) {
      // Ensure we only include columns that are actually in our filtered list to avoid issues
      const relevantOrder = currentOrder.filter((id) => allColumns.some((c) => c.id === id))

      if (relevantOrder.length > 0) {
        setColumnOrder((prev) => {
          // simple array equality check
          if (
            prev.length === relevantOrder.length &&
            prev.every((val, index) => val === relevantOrder[index])
          ) {
            return prev
          }
          return relevantOrder
        })
      }
    }
  }, [table, allColumns])

  React.useEffect(() => {
    if (table.getState().columnOrder.length === 0) {
      setColumnOrder(allColumns.map((c) => c.id))
    }
  }, [allColumns, table])

  const handleDragEndBetter = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columnOrder.indexOf(active.id as string)
    const newIndex = columnOrder.indexOf(over.id as string)

    const newLocalOrder = [...columnOrder]
    const [moved] = newLocalOrder.splice(oldIndex, 1)
    newLocalOrder.splice(newIndex, 0, moved)

    setColumnOrder(newLocalOrder)

    // Merging with global order
    const currentGlobalOrder =
      table.getState().columnOrder.length > 0
        ? table.getState().columnOrder
        : table.getAllColumns().map((c) => c.id)

    // Valid non-hidable columns that shouldn't be touched
    const nonHidable = currentGlobalOrder.filter((id) => !columnOrder.includes(id))

    table.setColumnOrder([...nonHidable, ...newLocalOrder])
  }

  const handleReset = () => {
    table.resetColumnOrder()
    table.resetColumnVisibility()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const orderedColumns = React.useMemo(
    () =>
      columnOrder
        .map((id) => allColumns.find((col) => col.id === id))
        .filter(Boolean) as Column<TData>[],
    [columnOrder, allColumns],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="size-6">
          <Settings2Icon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] px-0 py-2">
        <div className="flex items-center justify-between px-4">
          <h4 className="font-medium leading-none">Columns</h4>
          <Button variant="ghost" className="text-red-400 hover:text-red-500" onClick={handleReset}>
            Reset
          </Button>
        </div>
        <ScrollArea className="h-[300px] overflow-y-auto px-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndBetter}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedColumns.map((column) => (
                  <ColumnItem key={column.id} column={column} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

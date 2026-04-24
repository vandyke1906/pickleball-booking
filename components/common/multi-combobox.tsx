"use client"

import React from "react"
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { VariantProps } from "class-variance-authority"

export interface ComboboxOption {
  value: string
  label: string
}

interface MultiComboboxProps {
  options: ComboboxOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  label?: string
  placeholder?: string
  maxVisibleItems?: number // Re-added prop
  className?: string
  variant?: VariantProps<typeof buttonVariants>["variant"]
}

export function MultiCombobox({
  options,
  value,
  onValueChange,
  label,
  placeholder = "Select...",
  maxVisibleItems = 3, // Default to 3 for a clean look
  className,
  variant = "outline",
}: MultiComboboxProps) {
  const id = React.useId()
  const [open, setOpen] = React.useState(false)

  const toggleSelection = (itemValue: string) => {
    const newValue = value.includes(itemValue)
      ? value.filter((v) => v !== itemValue)
      : [...value, itemValue]
    onValueChange(newValue)
  }

  const removeSelection = (e: React.MouseEvent, itemValue: string) => {
    e.stopPropagation()
    onValueChange(value.filter((v) => v !== itemValue))
  }

  // Logic for limiting visibility
  const visibleItems = value.slice(0, maxVisibleItems)
  const hiddenCount = value.length - maxVisibleItems

  return (
    <div className={cn("grid w-full gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between px-2 py-1 hover:bg-transparent focus:ring-1 focus:ring-ring"
          >
            <div className="flex items-center gap-1 overflow-hidden w-full">
              {value.length > 0 ? (
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                  {visibleItems.map((val) => {
                    const option = options.find((o) => o.value === val)
                    return option ? (
                      <Badge
                        key={val}
                        variant={variant}
                        className="flex-shrink-0 gap-1 rounded px-1.5 py-0 text-[10px] font-medium"
                      >
                        {option.label}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeSelection(e, val)
                          }}
                          asChild
                        >
                          <span>
                            <XIcon className="size-3" />
                          </span>
                        </Button>
                      </Badge>
                    ) : null
                  })}

                  {hiddenCount > 0 && (
                    <Badge
                      variant={variant}
                      className="flex-shrink-0 rounded px-1.5 py-0 text-[10px] font-medium border-dashed border-muted-foreground/50"
                    >
                      +{hiddenCount}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground truncate">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          sideOffset={4}
        >
          <Command className="text-sm">
            <CommandInput placeholder="Search..." className="h-8" />
            <CommandList className="max-h-[200px]">
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleSelection(option.value)}
                      className="py-1.5 text-sm"
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <CheckIcon size={16} className="ml-auto" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

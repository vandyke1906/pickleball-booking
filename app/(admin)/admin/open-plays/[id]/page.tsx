"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useOpenPlay } from "@/lib/hooks/open-play/open-play.hook"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import BadgeStatus from "@/components/common/badge-status"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  OpenPlayPlayerPayload,
  openPlayPlayerSchema,
} from "@/lib/validation/open-play/open-play.validation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Label } from "@/components/ui/label"
import {
  useCreateOpenPlayPlayer,
  useDeleteOpenPlayPlayer,
  useUpdateOpenPlayPlayer,
} from "@/lib/mutations/open-play/open-play.mutation"
import ConfirmationDialog from "@/components/common/confirm-dialog"
import { X } from "lucide-react"
import { preventDialogCloseProps } from "@/components/dialog/dialog-helper"
import { Loading } from "@/components/animated/loading"

export default function OpenPlayPage() {
  const params = useParams()
  const rawParam = params.id ?? ""
  const id = Array.isArray(rawParam) ? rawParam[0] : (rawParam ?? "")

  const { data: openPlay, isLoading, isError, error } = useOpenPlay(id)

  const [openPlayerFormDialog, setOpenPlayerFormDialog] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any>(null)
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState<any>(null)

  const createMutation = useCreateOpenPlayPlayer()
  const updateMutation = useUpdateOpenPlayPlayer()
  const deleteMutation = useDeleteOpenPlayPlayer()

  const form = useForm<OpenPlayPlayerPayload>({
    resolver: zodResolver(openPlayPlayerSchema),
    defaultValues: {
      openPlayId: id,
      playerName: "",
      contactNumber: "",
      emailAddress: "",
      code: "",
    },
  })

  // Reset form whenever dialog closes or editingPlayer changes
  useEffect(() => {
    if (!openPlayerFormDialog) {
      setEditingPlayer(null)
      form.reset({ openPlayId: id })
    }
  }, [openPlayerFormDialog, id])

  if (isLoading) {
    return <Loading text="Loading Open Play..." className="p-6 min-h-[200px]" />
  }

  if (isError) {
    return (
      <div className="p-6 text-red-500">
        Error: {(error as Error)?.message || "Something went wrong"}
      </div>
    )
  }

  const onSubmit = (values: OpenPlayPlayerPayload) => {
    if (editingPlayer) {
      updateMutation.mutate(
        { id: editingPlayer.id, payload: values },
        {
          onSuccess: () => {
            setOpenPlayerFormDialog(false)
            form.reset({ openPlayId: id })
            setEditingPlayer(null)
          },
        },
      )
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          form.reset({
            openPlayId: id,
            playerName: "",
            contactNumber: "",
            emailAddress: "",
            code: "",
          })
          setOpenPlayerFormDialog(false)
        },
      })
    }
  }

  const onEditPlayer = (player: any) => {
    setEditingPlayer(player)
    form.reset({ ...player, openPlayId: id })
    setOpenPlayerFormDialog(true)
  }

  const onDeletePlayer = (player: any) => {
    setPlayerToDelete(player)
    setConfirmDeleteDialogOpen(true)
  }

  const handleDeletePlayer = () => {
    if (!playerToDelete.id) return
    deleteMutation.mutate(
      { id: playerToDelete.id, openPlayId: id },
      {
        onSuccess: () => {
          setConfirmDeleteDialogOpen(false)
          setPlayerToDelete(null)
        },
      },
    )
  }

  return (
    <div className="p-6 w-full">
      <Card className="w-full shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-lg">Open Play Details</span>
              <BadgeStatus status={openPlay?.status as any} />
            </div>

            {/* Register Button */}
            <Dialog open={openPlayerFormDialog} onOpenChange={setOpenPlayerFormDialog}>
              <DialogTrigger asChild>
                <Button size="sm">+ Register Player</Button>
              </DialogTrigger>

              <DialogContent className="w-full sm:max-w-md" {...preventDialogCloseProps}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  key={editingPlayer?.id || "new-player"}
                >
                  <fieldset
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="space-y-6"
                  >
                    <DialogHeader>
                      <DialogTitle>{editingPlayer ? "Edit Player" : "Register Player"}</DialogTitle>
                      <DialogDescription>
                        {editingPlayer
                          ? "Update player details for this open play session."
                          : "Add a player to this open play session."}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Full Name */}
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input placeholder="Enter player name" {...form.register("playerName")} />
                        {form.formState.errors.playerName && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.playerName.message}
                          </p>
                        )}
                      </div>

                      {/* Contact Number */}
                      <div className="space-y-2">
                        <Label>Contact Number</Label>
                        <Input
                          placeholder="e.g. 09123456789"
                          {...form.register("contactNumber")}
                          onBlur={(e) => {
                            const value = e.target.value.trim()
                            form.setValue("contactNumber", value)
                            const currentCode = form.getValues("code")
                            if (!currentCode) form.setValue("code", value)
                          }}
                        />
                        {form.formState.errors.contactNumber && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.contactNumber.message}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          placeholder="Enter email (optional)"
                          {...form.register("emailAddress")}
                        />
                        {form.formState.errors.emailAddress && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.emailAddress.message}
                          </p>
                        )}
                      </div>

                      {/* Player Code */}
                      <div className="space-y-2">
                        <Label>Player Code</Label>
                        <Input
                          placeholder="Auto-generated or custom code"
                          {...form.register("code")}
                        />
                        <p className="text-xs text-muted-foreground">
                          Defaults to contact number. You can override this.
                        </p>
                        {form.formState.errors.code && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.code.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? "Submitting..."
                          : editingPlayer
                            ? "Update Player"
                            : "Register Player"}
                      </Button>
                    </DialogFooter>
                  </fieldset>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Time Section */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Schedule</p>
            <p className="font-medium">{openPlay?.formatted?.date}</p>
            <p className="text-sm">{openPlay?.formatted?.timeRange}</p>
          </div>

          <Separator />

          {/* Transition */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Transition Time</span>
            <span className="font-medium">{openPlay?.transitionMinutes} minutes</span>
          </div>

          <Separator />

          {/* Courts */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Courts</p>
            <div className="flex flex-wrap gap-2">
              {openPlay?.courts?.length ? (
                openPlay.courts.map((court: any, index: number) => (
                  <Badge key={index} variant="default">
                    {court.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No courts assigned</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Players */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-semibold">
              Players ({openPlay?.players?.length || 0})
            </p>

            {openPlay?.players?.length ? (
              <div className="space-y-2">
                {openPlay.players.map((player: any, index: number) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 shadow-sm gap-2"
                  >
                    <div className="font-semibold text-primary sm:mr-4 min-w-[80px]">
                      Code: {player.code}
                    </div>
                    <div className="sm:flex-1 text-sm font-medium">{player.playerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.contactNumber || "N/A"}
                    </div>
                    <div className="flex gap-2">
                      <Button size="xs" variant="outline" onClick={() => onEditPlayer(player)}>
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => onDeletePlayer(player)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No players yet</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {playerToDelete && (
        <ConfirmationDialog
          title="Confirm Delete"
          variant="delete"
          Icon={<X className="text-red-500" size={20} />}
          description={`Are you sure you want to delete player "${playerToDelete.playerName}"?`}
          open={confirmDeleteDialogOpen}
          setOpen={setConfirmDeleteDialogOpen}
          isLoading={deleteMutation.isPending}
          onConfirm={handleDeletePlayer}
        />
      )}
    </div>
  )
}

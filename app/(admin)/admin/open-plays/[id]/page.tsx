"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
  useDeleteOpenPlay,
  useDeleteOpenPlayPlayer,
  useStartActiveOpenPlay,
  useStatusUpdateOpenPlay,
  useUpdateOpenPlayPlayer,
} from "@/lib/mutations/open-play/open-play.mutation"
import ConfirmationDialog from "@/components/common/confirm-dialog"
import {
  AlertTriangleIcon,
  BadgeCheck,
  CheckIcon,
  ChevronDownIcon,
  Clock,
  Pencil,
  Trash2,
  TrashIcon,
  X,
} from "lucide-react"
import { preventDialogCloseProps } from "@/components/dialog/dialog-helper"
import { Loading } from "@/components/animated/loading"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { ButtonGroup } from "@/components/ui/button-group"
import OpenPlayDialog from "@/app/(admin)/admin/(component)/open-play-dialog"
import { format } from "date-fns"
import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

const dialogConfig: any = {
  [OpenPlayStatus.active]: {
    title: "Confirm Activation",
    variant: "default",
    description:
      "Are you sure you want to activate this Open Play? Any active session will be completed. Registered players will be automatically included in the lineup.",
    icon: <BadgeCheck className="text-blue-500" size={20} />,
  },
  [OpenPlayStatus.completed]: {
    title: "Confirm Completion",
    variant: "confirm",
    description: "Are you sure you want to complete this Open Play?",
    icon: <CheckIcon className="text-green-500" size={20} />,
  },
  [OpenPlayStatus.cancelled]: {
    title: "Confirm Cancellation",
    variant: "delete",
    description: "Are you sure you want to cancel this Open Play?",
    icon: <AlertTriangleIcon className="text-red-500" size={20} />,
  },
} as const

export default function OpenPlayPage() {
  const router = useRouter()
  const params = useParams()
  const rawParam = params.id ?? ""
  const id = Array.isArray(rawParam) ? rawParam[0] : (rawParam ?? "")

  const { data: openPlay, isLoading, isError, error } = useOpenPlay(id)

  const [openEditOpenPlayDialog, setOpenEditOpenPlayDialog] = useState(false)
  const [confirmDeleteOpenPlayDialogOpen, setConfirmDeleteOpenPlayDialogOpen] = useState(false)
  const [openPlayerFormDialog, setOpenPlayerFormDialog] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any>(null)
  const [confirmDeletePlayerDialogOpen, setConfirmDeletePlayerDialogOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState<any>(null)
  const [confirmStartNow, setConfirmStartNow] = useState(false)

  const updateStatusMutation = useStatusUpdateOpenPlay()
  const startActiveOpenPlayMutation = useStartActiveOpenPlay()
  const deleteOpenPlayMutation = useDeleteOpenPlay()

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
      totalPlayTime: 3 * 60,
    },
  })

  const [confirmOpenPlay, setConfirmOpenPlay] = useState<{
    open: boolean
    status: OpenPlayStatus | null
  }>({
    open: false,
    status: null,
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
    router.back()
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
            totalPlayTime: 3 * 60,
          })
          setOpenPlayerFormDialog(false)
        },
      })
    }
  }

  const handleDeleteOpenPlay = () => {
    if (!openPlay) return
    deleteOpenPlayMutation.mutate(
      { id: openPlay.id },
      {
        onSuccess: () => {
          setConfirmDeleteOpenPlayDialogOpen(false)
          router.push("/admin/open-plays")
        },
      },
    )
  }

  const onEditPlayer = (player: any) => {
    setEditingPlayer(player)
    form.reset({ ...player, openPlayId: id })
    setOpenPlayerFormDialog(true)
  }

  const onDeletePlayer = (player: any) => {
    setPlayerToDelete(player)
    setConfirmDeletePlayerDialogOpen(true)
  }

  const handleDeletePlayer = () => {
    if (!playerToDelete.id) return
    deleteMutation.mutate(
      { id: playerToDelete.id, openPlayId: id },
      {
        onSuccess: () => {
          setConfirmDeletePlayerDialogOpen(false)
          setPlayerToDelete(null)
        },
      },
    )
  }

  const handleConfirmUpdateStatus = () => {
    if (!openPlay?.id || !confirmOpenPlay.status) return

    updateStatusMutation.mutate(
      { id: openPlay.id, status: confirmOpenPlay.status },
      {
        onSuccess: () => {
          setConfirmOpenPlay({ open: false, status: null })
        },
      },
    )
  }

  const handleStartOpenPlayNow = () => {
    console.info({ openPlay })
    if (!openPlay?.id || !openPlay.isActive) return

    startActiveOpenPlayMutation.mutate(
      { id: openPlay.id },
      {
        onSuccess: () => {
          setConfirmStartNow(false)
        },
      },
    )
  }

  const initialOpenPlayData = openPlay
    ? {
        id: openPlay.id,
        date: format(openPlay?.startTime, "yyyy-MM-dd"),
        startTime: openPlay?.formatted?.format24?.startTime,
        duration: openPlay?.formatted?.duration,
        transitionMinutes: openPlay?.transitionMinutes,
        playerSwitchMinutes: openPlay?.playerSwitchMinutes,
        courtIds: openPlay.courts.map((c) => c.id),
      }
    : undefined

  const current: any = confirmOpenPlay.status ? dialogConfig[confirmOpenPlay.status] : null
  const isPendingMutations =
    updateStatusMutation.isPending ||
    deleteOpenPlayMutation.isPending ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    startActiveOpenPlayMutation.isPending
  const isOpenPlayActive = openPlay?.isActive && openPlay.status === OpenPlayStatus.active

  return (
    <div className="p-6 w-full">
      <Card className="w-full shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="font-semibold text-lg">Open Play Details</span>
              <BadgeStatus status={openPlay?.status as any} />
            </div>
            <ButtonGroup>
              <Button
                // disabled={isPendingMutations || isOpenPlayActive}
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => {
                  // if (isPendingMutations || isOpenPlayActive) return
                  setOpenEditOpenPlayDialog(true)
                }}
              >
                {isPendingMutations ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Pencil className="h-4 w-4 mr-2" />
                )}
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="pl-2!">
                    <ChevronDownIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    {openPlay?.status === OpenPlayStatus.pending && (
                      <DropdownMenuItem
                        className="text-[var(--primary)]"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          setConfirmOpenPlay({
                            open: true,
                            status: OpenPlayStatus.active,
                          })
                        }}
                      >
                        {updateStatusMutation.isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <BadgeCheck className="text-[var(--primary)]" />
                        )}
                        Activate
                      </DropdownMenuItem>
                    )}
                    {!openPlay?.startedAt && openPlay?.status === OpenPlayStatus.active && (
                      <DropdownMenuItem
                        className="text-[var(--primary)]"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          setConfirmStartNow(true)
                        }}
                      >
                        {updateStatusMutation.isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <Clock className="text-[var(--primary)]" />
                        )}
                        Start Now
                      </DropdownMenuItem>
                    )}
                    {!!openPlay?.startedAt && openPlay?.status === OpenPlayStatus.active && (
                      <DropdownMenuItem
                        className="text-[var(--primary)]"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          setConfirmOpenPlay({
                            open: true,
                            status: OpenPlayStatus.completed,
                          })
                        }}
                      >
                        {updateStatusMutation.isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <CheckIcon className="text-[var(--primary)]" />
                        )}
                        Complete
                      </DropdownMenuItem>
                    )}
                    {(openPlay?.status === OpenPlayStatus.active ||
                      openPlay?.status === OpenPlayStatus.pending) && (
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          setConfirmOpenPlay({
                            open: true,
                            status: OpenPlayStatus.cancelled,
                          })
                        }}
                      >
                        {updateStatusMutation.isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <AlertTriangleIcon />
                        )}
                        Cancel
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  {openPlay?.status !== OpenPlayStatus.active && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={deleteOpenPlayMutation.isPending}
                          onClick={() => {
                            setConfirmDeleteOpenPlayDialogOpen(true)
                          }}
                        >
                          <TrashIcon />
                          Delete Openplay
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
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

          {/* Started At */}
          {openPlay?.formatted?.startedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Started Time</span>
              <span className="font-medium">{openPlay?.formatted?.startedAt}</span>
            </div>
          )}

          {/* Transition */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Transition Time</span>
            <span className="font-medium">{openPlay?.transitionMinutes} minutes</span>
          </div>

          {/*  Switch Preparation Minutes */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground"> Switch Preparation Time</span>
            <span className="font-medium">{openPlay?.playerSwitchMinutes} minutes</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-muted-foreground font-semibold">
                Players ({openPlay?.players?.length || 0})
              </p>
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
                        <DialogTitle>
                          {editingPlayer ? "Edit Player" : "Register Player"}
                        </DialogTitle>
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

                        {/* Total Play Time Minutes */}
                        <div className="rounded w-full space-y-2">
                          <Label className="font-semibold text-slate-700">
                            Total Play Time
                            <span className="text-xs font-normal text-slate-500 block">
                              Default value is 180 minutes (3 hours)
                            </span>
                          </Label>
                          <InputGroup>
                            <InputGroupInput
                              id="totalPlayTime"
                              type="number"
                              step={1}
                              defaultValue={180}
                              placeholder="Enter duration"
                              required
                              {...form.register("totalPlayTime", { valueAsNumber: true })}
                            />

                            <InputGroupAddon align="inline-end">
                              <InputGroupText>minutes</InputGroupText>
                            </InputGroupAddon>
                          </InputGroup>
                          {form.formState.errors.totalPlayTime && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.totalPlayTime.message}
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
            </div>

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

      {/* Delete Openplay Confirmation Dialog */}
      {openPlay && (
        <ConfirmationDialog
          title="Confirm Delete"
          variant="delete"
          Icon={<X className="text-red-500" size={20} />}
          description={`Are you sure you want to Openplay?`}
          open={confirmDeleteOpenPlayDialogOpen}
          setOpen={setConfirmDeleteOpenPlayDialogOpen}
          isLoading={deleteOpenPlayMutation.isPending}
          onConfirm={handleDeleteOpenPlay}
        />
      )}

      {/* Delete Player Confirmation Dialog */}
      {playerToDelete && (
        <ConfirmationDialog
          title="Confirm Delete"
          variant="delete"
          Icon={<X className="text-red-500" size={20} />}
          description={`Are you sure you want to delete player "${playerToDelete.playerName}"?`}
          open={confirmDeletePlayerDialogOpen}
          setOpen={setConfirmDeletePlayerDialogOpen}
          isLoading={deleteMutation.isPending}
          onConfirm={handleDeletePlayer}
        />
      )}

      {/* Edit Openplay */}
      {!!openPlay && initialOpenPlayData && (
        <OpenPlayDialog
          initialData={initialOpenPlayData}
          open={openEditOpenPlayDialog}
          onOpenChange={setOpenEditOpenPlayDialog}
        />
      )}

      {/* Edit Openplay status */}
      <ConfirmationDialog
        title={current?.title ?? ""}
        variant={current?.variant ?? "default"}
        Icon={current?.icon ?? null}
        description={current?.description ?? ""}
        open={confirmOpenPlay.open}
        setOpen={(open) =>
          setConfirmOpenPlay((prev) => ({
            ...prev,
            open,
            ...(open === false && { id: null, action: null }),
          }))
        }
        isLoading={false}
        onConfirm={handleConfirmUpdateStatus}
      />

      {/* Confirm to start active openplay */}
      {openPlay && (
        <ConfirmationDialog
          title="Start Now"
          variant="confirm"
          Icon={<Clock className="text-green-700" size={20} />}
          description={`Are you sure you want to start timer of current Open Play?`}
          open={confirmStartNow}
          setOpen={setConfirmStartNow}
          isLoading={startActiveOpenPlayMutation.isPending}
          onConfirm={handleStartOpenPlayNow}
        />
      )}
    </div>
  )
}

"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TOpenPlay, useOpenPlay } from "@/lib/hooks/open-play/open-play.hook"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  BicepsFlexed,
  CheckIcon,
  ChevronDownIcon,
  Clock,
  Pencil,
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
import { OpenPlayStatus, PlayerSkill } from "@/.config/prisma/generated/prisma"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { PlayerSkillLabels } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CopyButton } from "@/components/common/copy-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TCourt } from "@/app/(admin)/admin/(component)/court-list"

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

  console.info({ openPlay })

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
      skill: PlayerSkill.beginner,
    },
  })

  //watch
  const playerSkill = form.watch("skill")

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

  const getAssignedCourtPerSkill = useMemo(() => {
    if (!openPlay || !playerSkill) return []

    const courts = openPlay.courts
      .filter((c: any) => c.skills.includes(playerSkill))
      .flatMap((c: any) => (c.courts || []).map((court: any) => court.name))

    return [...new Set(courts)]
  }, [openPlay, playerSkill])

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
            skill: PlayerSkill.beginner,
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
        preparationSeconds: openPlay?.preparationSeconds,
        courtSkills: openPlay.courts.map((c) => ({
          courtIds: c.courts.map((c) => c.id),
          skills: c.skills,
        })),
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
            <span className="font-medium">{openPlay?.preparationSeconds} seconds</span>
          </div>

          <Separator />

          {/* Courts */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Courts</p>
            <div className="flex flex-wrap gap-2">
              {openPlay?.courts?.length ? (
                openPlay.courts.map((playCourt: any) => (
                  <div
                    key={playCourt.id}
                    className="flex flex-col border rounded-md p-2 mb-2 space-y-1"
                  >
                    {/* Courts */}
                    <div className="flex flex-wrap gap-1">
                      {(playCourt.courts || []).map((court: any) => (
                        <Badge variant="default" key={court.id} className="text-xs px-2 py-0.5">
                          {court.name}
                        </Badge>
                      ))}
                    </div>

                    {/* Skills */}
                    {playCourt.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {playCourt.skills.map((skill: any) => (
                          <Badge key={skill} variant="outline" className="text-xs px-2 py-0.5">
                            {PlayerSkillLabels[skill as PlayerSkill]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No courts assigned</span>
              )}
            </div>
          </div>

          <Separator />

          {/* //// */}
          {/* <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>
                    View your key metrics and recent project activity. Track progress across all
                    your active projects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  You have 12 active projects and 3 pending tasks.
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>
                    Track performance and user engagement metrics. Monitor trends and identify
                    growth opportunities.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Page views are up 25% compared to last month.
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Reports</CardTitle>
                  <CardDescription>
                    Generate and download your detailed reports. Export data in multiple formats for
                    analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  You have 5 reports ready and available to export.
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    Manage your account preferences and options. Customize your experience to fit
                    your needs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Configure notifications, security, and themes.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs> */}

          {/* total players with register player */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-muted-foreground font-semibold">
              Overall Total Players ({openPlay?.players?.length || 0})
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

                      {/* Player Skill */}
                      <div className="rounded w-full space-y-2">
                        <Label className="font-semibold text-slate-700">Skill Level</Label>
                        <Select
                          value={form.watch("skill")}
                          onValueChange={(v: PlayerSkill) => form.setValue("skill", v)}
                        >
                          <SelectTrigger className="h-12 w-full">
                            <BicepsFlexed className="mr-3 h-5 w-5 text-primary" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PlayerSkillLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.skill && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.skill.message}
                          </p>
                        )}
                      </div>

                      {/* Assigned Courts */}
                      <div className="rounded w-full flex flex-wrap gap-2">
                        {getAssignedCourtPerSkill.length > 0 ? (
                          getAssignedCourtPerSkill.map((court) => (
                            <Badge key={court} variant="default" className="px-3 py-1">
                              {court}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No courts assigned on {PlayerSkillLabels[form.watch("skill")]} skill
                            level
                          </span>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={
                          createMutation.isPending ||
                          updateMutation.isPending ||
                          !Boolean(getAssignedCourtPerSkill.length)
                        }
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

          <Tabs
            defaultValue={openPlay?.formatted?.courts[0]?.skills.join(" | ") ?? ""}
            className="w-full"
          >
            <TabsList>
              {openPlay?.formatted?.courts.map((group) => (
                <TabsTrigger key={group.id} value={group.skills.join(" | ")}>
                  {group.skills.map((skill: PlayerSkill) => PlayerSkillLabels[skill]).join(" | ")}
                </TabsTrigger>
              ))}
            </TabsList>

            {openPlay?.formatted?.courts.map((group: any) => (
              <TabsContent key={group.id} value={group.skills.join(" | ")}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {group.skills
                        .map((skill: PlayerSkill) => PlayerSkillLabels[skill])
                        .join(" | ")}{" "}
                      <span className="text-sm text-primary">
                        ({group.players.length} Available Player
                        {group.players.length > 1 ? "s" : ""})
                      </span>
                    </CardTitle>
                    <CardDescription>Courts available for these skill levels.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        {group.courts.map((court: any) => (
                          <Badge key={court.id} variant="default">
                            {court.name}
                          </Badge>
                        ))}
                      </div>

                      {/* Players */}
                      <div className="space-y-2 text-sm">
                        {group.players && group.players.length > 0 ? (
                          group.players.map((player: any, index: number) => (
                            <div
                              key={index}
                              className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 shadow-sm gap-2"
                            >
                              <div className="sm:mr-4 min-w-[80px] text-sm">
                                code:{" "}
                                <span className="font-semibold text-primary ">
                                  <CopyButton
                                    text={player.code}
                                    html={`strong>${player.code}</strong>`}
                                  />
                                  {player.code}
                                </span>
                              </div>
                              <div className="sm:flex-1 text-sm font-medium">
                                {player.playerName}
                                <Badge variant="outline">
                                  {PlayerSkillLabels[player.skill as PlayerSkill]}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ({player.totalPlayTime || "N/A"} minutes Play Time)
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => onEditPlayer(player)}
                                >
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
                          ))
                        ) : (
                          <span className="text-muted-foreground">No players registered.</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
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

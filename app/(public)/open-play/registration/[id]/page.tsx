"use client"

import { PlayerSkill } from "@/.config/prisma/generated/prisma"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOpenPlay } from "@/lib/hooks/open-play/open-play.hook"
import { useRegisterOpenPlayPlayer } from "@/lib/mutations/open-play/open-play.mutation"
import { PlayerSkillLabels } from "@/lib/utils"
import {
  OpenPlayPlayerRegistrationPayload,
  openPlayPlayerRegistrationSchema,
} from "@/lib/validation/open-play/open-play.validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, BicepsFlexed, RefreshCw } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { LoadingScreen } from "@/components/animated/loading-screen"

export default function RegistrationOpenPlayPage() {
  const params = useParams()
  const openPlayIdParam = params.id ?? ""
  const openPlayId = Array.isArray(openPlayIdParam) ? openPlayIdParam[0] : (openPlayIdParam ?? "")

  const { data: openPlay, isLoading, isError, refetch } = useOpenPlay(openPlayId)

  const form = useForm<OpenPlayPlayerRegistrationPayload>({
    resolver: zodResolver(openPlayPlayerRegistrationSchema),
    defaultValues: {
      openPlayId: openPlayId,
      playerName: "",
      code: "",
      skill: PlayerSkill.beginner,
      registrationCode: "",
    },
  })

  useEffect(() => {
    if (openPlay) {
      form.reset({
        openPlayId: openPlayId,
        playerName: "",
        code: "",
        skill: PlayerSkill.beginner,
        registrationCode: "",
      })
    }
  }, [openPlay])

  const registerOpenplayPlayerMutation = useRegisterOpenPlayPlayer()

  const onSubmit = (values: OpenPlayPlayerRegistrationPayload) => {
    registerOpenplayPlayerMutation.mutate(values, {
      onSuccess: () => {
        form.reset({
          openPlayId: openPlayId,
          playerName: "",
          code: "",
          skill: PlayerSkill.beginner,
          registrationCode: "",
        })
      },
    })
  }

  const registrationCode = form.watch("registrationCode")

  if (isLoading) return <LoadingScreen message="Loading Open Play Registration..." />

  if (isError || !openPlay) return <OpenPlayUnavailable />

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Register Player</CardTitle>
          <CardDescription className="space-y-2 text-sm md:text-base">
            <p className="text-muted-foreground">Register to this open play session.</p>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-slate-700">
                  Date
                </span>
                <span className="font-medium text-slate-800">{openPlay?.formatted?.date}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-slate-700">
                  Time
                </span>
                <span className="text-slate-600">{openPlay?.formatted?.timeRange}</span>
              </div>
            </div>
          </CardDescription>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset disabled={registerOpenplayPlayerMutation.isPending}>
            <CardContent className="space-y-6">
              {/* Registration Code */}
              <div className="space-y-2">
                <Label htmlFor="registrationCode">Registration Code</Label>
                <Input
                  id="registrationCode"
                  className="uppercase"
                  placeholder="Registration code provided by organizer"
                  {...form.register("registrationCode")}
                />
                <p className="text-xs text-muted-foreground">
                  Provide Registration Code provided by organizer.
                </p>
                {form.formState.errors.registrationCode && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.registrationCode.message}
                  </p>
                )}
              </div>
              <fieldset
                className="text-sm text-muted-foreground gap-2 flex flex-col"
                disabled={!registrationCode}
              >
                Player Information
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="playerName">Full Name</Label>
                  <Input
                    id="playerName"
                    placeholder="Enter player name"
                    {...form.register("playerName")}
                  />
                  {form.formState.errors.playerName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.playerName.message}
                    </p>
                  )}
                </div>
                {/* Player Code */}
                <div className="space-y-2">
                  <Label htmlFor="code">Player Code</Label>
                  <Input
                    id="code"
                    className="uppercase"
                    placeholder="Auto-generated or custom code"
                    {...form.register("code")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to contact number. You can override this.
                  </p>
                  {form.formState.errors.code && (
                    <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
                  )}
                </div>
                {/* Player Skill */}
                <div className="space-y-2">
                  <Label htmlFor="skill" className="font-semibold text-slate-700">
                    Skill Level
                  </Label>
                  <Select
                    value={form.watch("skill")}
                    onValueChange={(v: PlayerSkill) => form.setValue("skill", v)}
                    disabled={!registrationCode}
                  >
                    <SelectTrigger id="skill" className="h-12 w-full">
                      <BicepsFlexed className="mr-3 h-5 w-5 text-primary" />
                      <SelectValue placeholder="Select skill level" />
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
                    <p className="text-sm text-red-600">{form.formState.errors.skill.message}</p>
                  )}
                </div>
              </fieldset>
            </CardContent>

            <CardFooter className="flex justify-end">
              <Button
                type="submit"
                disabled={registerOpenplayPlayerMutation.isPending || !registrationCode}
                className="w-full sm:w-auto"
              >
                {registerOpenplayPlayerMutation.isPending ? "Submitting..." : "Register"}
              </Button>
            </CardFooter>
          </fieldset>
        </form>
      </Card>
    </div>
  )
}

function OpenPlayUnavailable({
  message = "Open Play is currently unavailable.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="min-h-screen bg-[#092021] text-white flex items-center justify-center font-mono px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/70 border border-emerald-600/40 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
      >
        {/* ICON */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-bold text-white mb-2">Open Play Unavailable</h1>

        {/* MESSAGE */}
        <p className="text-emerald-300/70 text-sm mb-6">{message}</p>

        {/* ACTIONS */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl transition active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </motion.div>
    </div>
  )
}

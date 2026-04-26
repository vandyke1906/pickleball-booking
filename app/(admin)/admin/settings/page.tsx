"use client"

import OrganizationUpdateForm from "@/app/(admin)/admin/(component)/organization-update-form"
import { Card, CardContent } from "@/components/ui/card"
import { useUpdateOrganization } from "@/lib/mutations/organization/organization.mutation"
import { Settings2 } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Settings2 className="h-6 w-6 text-primary" />
              <h1>Organization Settings</h1>
            </div>
          </div>
          <div>
            <OrganizationUpdateForm />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

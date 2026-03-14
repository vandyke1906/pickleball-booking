"use client"

import { Features } from "@/app/(public)/(components)/features"
import { Hero } from "@/app/(public)/(components)/hero"
import FBMessengerChat from "@/app/(public)/(components)/fb-messenger-chat"
import { useParams } from "next/navigation"
import { Footer } from "@/app/(public)/(components)/footer"

export default function OrganizationPublicPage() {
  const params = useParams()
  const slugParam = params.slug ?? ""
  const slug = Array.isArray(slugParam) ? slugParam[0] : (slugParam ?? "")

  return (
    <div className="relative z-10">
      <Hero slug={slug} />
      <Features />
      <Footer />
      <FBMessengerChat />
    </div>
  )
}

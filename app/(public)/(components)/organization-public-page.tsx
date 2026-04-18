"use client"

import { Features } from "@/app/(public)/(components)/features"
import { Hero } from "@/app/(public)/(components)/hero"
import { useParams } from "next/navigation"
import { Footer } from "@/app/(public)/(components)/footer"
import { useEffect } from "react"

export default function OrganizationPublicPage() {
  const params = useParams()
  const slugParam = params.slug ?? ""
  const slug = Array.isArray(slugParam) ? slugParam[0] : (slugParam ?? "")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <div className="relative z-10">
      <Hero slug={slug} />
      <Features />
      <Footer />
    </div>
  )
}

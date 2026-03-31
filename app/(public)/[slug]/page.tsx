"use client"

import { Features } from "@/app/(public)/(components)/features"
import { Hero } from "@/app/(public)/(components)/hero"
import FBMessengerChat from "@/app/(public)/(components)/fb-messenger-chat"
import { useParams } from "next/navigation"
import { Footer } from "@/app/(public)/(components)/footer"
import { useEffect } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pickl. Digos",
  description:
    "Book your pickleball court in Digos easily. Fast, reliable, and hassle-free scheduling for players and enthusiasts.",
  openGraph: {
    title: "Pickl. Digos",
    description:
      "Book your pickleball court in Digos easily. Fast, reliable, and hassle-free scheduling for players and enthusiasts.",
    url: "https://pickleballbook.vercel.app/pickl.digos",
    siteName: "Pickl.Digos - Book",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "Pickl. Digos Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pickl. Digos",
    description: "Book your pickleball court in Digos easily.",
    images: ["/images/logo.png"],
  },
  other: {
    "article:publisher": "https://www.facebook.com/profile.php?id=61554303354722",
    "fb:app_id": "61554303354722",
  },
}

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
      <FBMessengerChat />
    </div>
  )
}

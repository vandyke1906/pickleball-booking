"use client"

import { BubbleBackground } from "@/components/animated/background/bubble-background"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BubbleBackground interactive={true} />
      <div className="relative z-10">{children}</div>
    </>
  )
}

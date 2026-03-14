import { BokehBackground } from "@/app/(public)/(components)/background/bokeh-background"
import { BubbleBackground } from "@/app/(public)/(components)/background/bubble-background"
import FBMessengerChat from "@/app/(public)/(components)/fb-messenger-chat"
import { Features } from "@/app/(public)/(components)/features"
import { Footer } from "@/app/(public)/(components)/footer"
import { Hero } from "@/app/(public)/(components)/hero"
import { redirect } from "next/navigation"

export default function Home() {
  redirect(`/pickl.digos`)
  return (
    // <div className="min-h-screen bg-slate-50 relative">
    //   <BokehBackground />
    <div className="relative z-10">
      test
      {/* <Hero />
      <Features />
      <Footer />
      <FBMessengerChat /> */}
    </div>
  )
}

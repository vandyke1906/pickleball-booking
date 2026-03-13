import FBMessengerChat from "@/app/(public)/(components)/fb-messenger-chat"
import { Features } from "@/app/(public)/(components)/features"
import { Footer } from "@/app/(public)/(components)/footer"
import { Hero } from "@/app/(public)/(components)/hero"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-700 to-transparent">
      <Hero />
      <Features />
      <Footer />
      <FBMessengerChat />
    </div>
  )
}

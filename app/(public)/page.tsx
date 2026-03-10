import { CourtGrid } from "@/app/(public)/(components)/court-grid"
import { Features } from "@/app/(public)/(components)/features"
import { Footer } from "@/app/(public)/(components)/footer"
import { Hero } from "@/app/(public)/(components)/hero"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Hero />
      <Features />
      <CourtGrid />
      <Footer />
    </div>
  )
}

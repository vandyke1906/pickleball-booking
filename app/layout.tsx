import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Providers from "@/lib/providers/app-provider"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pickleball Booking",
  description: "Online Pickleball Booking System",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.className} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  )
}

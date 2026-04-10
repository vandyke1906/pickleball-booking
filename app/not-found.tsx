"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 relative">
      <main className="flex min-h-screen items-center justify-center bg-muted px-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-lg">
            <CardHeader className="flex flex-col items-center space-y-2">
              <Image
                src="/images/logo.png"
                alt="App Logo"
                width={64}
                height={64}
                className="rounded-md"
                priority
              />
              <CardTitle className="text-center text-red-600 text-lg md:text-xl font-semibold">
                404 - Page Not Found
              </CardTitle>
            </CardHeader>

            <CardContent className="text-center space-y-4">
              <p className="text-sm md:text-base text-muted-foreground">
                Oops! The page you’re looking for doesn’t exist or may have been moved.
              </p>
            </CardContent>

            <CardFooter className="flex justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild>
                  <a href="/">Go Back Home</a>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}

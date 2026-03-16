"use client"

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function RestrictedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm md:text-base text-muted-foreground">
            Pasensya na, ang app na ito ay para lamang sa mga gumagamit sa Pilipinas.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <a href="/">Go Back Home</a>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

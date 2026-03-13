import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [session, { id }] = await Promise.all([isServerAuthenticated(), params])
    if (!session?.user) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })

    // Parse JSON body from client
    const body = await request.json()
    const { accept } = body

    await prisma.booking.update({
      where: { id, status: "pending" },
      data: {
        status: accept ? "confirmed" : "cancelled",
      },
    })

    //TODO trigger Send Email to client

    return NextResponse.json({ success: true, status: accept ? "confirmed" : "cancelled" })
  } catch (error) {
    console.error("Error confirming booking:", error)
    return NextResponse.json({ error: "Failed confirming booking" }, { status: 500 })
  }
}

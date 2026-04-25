import { sendEmail } from "@/lib/nodemailer/mailer"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const { to, subject, html } = await req.json()

    const info = await sendEmail({
      to,
      subject,
      html,
    })

    return NextResponse.json({ success: true, messageId: info?.messageId ?? info })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || "Email failed" }, { status: 500 })
  }
})

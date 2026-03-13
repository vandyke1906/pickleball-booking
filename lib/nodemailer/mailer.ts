import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSPHRASE,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    if (!process.env.GMAIL_EMAIL || !transporter) return null
    const info = await transporter.sendMail({
      from: `"Pickl. Digos Admin" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
    })

    console.info(`Email sent to ${to} with message ID: ${info.messageId}`)
    return info
  } catch (err) {
    console.error("Error sending email:", err)
    throw err
  }
}

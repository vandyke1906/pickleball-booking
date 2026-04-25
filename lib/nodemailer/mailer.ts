import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE ?? "gmail",
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSPHRASE,
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
    if (!process.env.EMAIL_ADDRESS || !transporter) return null
    const info = await transporter.sendMail({
      from: `"Pickl. Digos Admin" <${process.env.EMAIL_ADDRESS}>`,
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

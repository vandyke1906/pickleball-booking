import { render } from "@react-email/render"
import { sendEmail } from "@/lib/nodemailer/mailer"
import {
  BookingConfirmationEmail,
  BookingConfirmationEmailProps,
} from "@/lib/nodemailer/email/booking-confirmation.email"
import {
  AdminBookingNotificationEmail,
  AdminBookingNotificationEmailProps,
} from "@/lib/nodemailer/email/admin-booking-notification.email"
import {
  ClientBookingStatusEmail,
  ClientBookingStatusEmailProps,
} from "@/lib/nodemailer/email/client-booking-status.email"

export async function sendBookingConfirmationEmail({ booking }: BookingConfirmationEmailProps) {
  if (!booking.emailAddress) return null
  const html = await render(<BookingConfirmationEmail booking={booking} />)
  await sendEmail({
    to: booking.emailAddress,
    subject: `Booking Confirmation [${booking.code}] `,
    html,
  })
}

export async function sendAdminBookingNotificationEmail({
  adminEmailAddress,
  booking,
}: AdminBookingNotificationEmailProps) {
  if (!adminEmailAddress) return null
  const html = await render(
    <AdminBookingNotificationEmail booking={booking} adminEmailAddress={adminEmailAddress} />,
  )
  await sendEmail({
    to: adminEmailAddress,
    subject: `New Booking [${booking.code}] Submitted`,
    html,
  })
}

export async function sendClientBookingStatusEmail({ booking }: ClientBookingStatusEmailProps) {
  if (!booking.emailAddress) return null
  const html = await render(<ClientBookingStatusEmail booking={booking} />)
  await sendEmail({
    to: booking.emailAddress,
    subject: `Booking Action for [${booking.code}]`,
    html,
  })
}

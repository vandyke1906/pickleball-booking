import { formatFloat, formatToPHTime } from "@/lib/utils"
import { Html, Head, Body, Container, Section, Text, Link, Img } from "@react-email/components"

export type BookingConfirmationEmailProps = {
  booking: {
    code: string
    bookedBy: string
    contactNumber?: string
    emailAddress?: string
    status: string
    proofOfPayment?: string
    totalPrice: string
    start: string
    end: string
    courts: { name: string }[]
  }
}

export const BookingConfirmationEmail = ({ booking }: BookingConfirmationEmailProps) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial, sans-serif", backgroundColor: "#f9f9f9" }}>
      <Container
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          padding: "24px",
          borderRadius: "8px",
        }}
      >
        {/* Logo */}
        <Section style={{ textAlign: "center", marginBottom: "24px" }}>
          <Img
            src="https://ffuq0pf52dpcvo3q.public.blob.vercel-storage.com/pickleballbook-resources/pickl.digos.png"
            alt="Company Logo"
            width="120"
            height="auto"
            style={{ margin: "0 auto" }}
          />
        </Section>

        {/* Header */}
        <Text
          style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px", color: "#2d3748" }}
        >
          Your Booking is Submitted and Waiting for Review
        </Text>
        <Text style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
          Hi {booking.bookedBy}, thank you for booking with us! Below are the details of your
          reservation:
        </Text>

        {/* Booking Code */}
        <Section style={{ marginBottom: "12px" }}>
          <Text style={{ fontSize: "14px", fontWeight: "600" }}>Booking Code</Text>
          <Text style={{ fontSize: "14px", color: "#555" }}>{booking.code}</Text>
        </Section>

        {/* Contact Details */}
        {(booking.contactNumber || booking.emailAddress) && (
          <Section style={{ marginBottom: "12px" }}>
            <Text style={{ fontSize: "14px", fontWeight: "600" }}>Contact Details</Text>
            <Text style={{ fontSize: "14px", color: "#555" }}>
              {booking.contactNumber}
              {booking.contactNumber && booking.emailAddress && " | "}
              {booking.emailAddress}
            </Text>
          </Section>
        )}

        {/* Status */}
        <Section style={{ marginBottom: "12px" }}>
          <Text style={{ fontSize: "14px", fontWeight: "600" }}>Status</Text>
          <Text style={{ fontSize: "14px", color: "#555" }}>{booking.status}</Text>
        </Section>

        {/* Proof of Payment */}
        {booking.proofOfPayment && (
          <Section style={{ marginBottom: "12px" }}>
            <Text style={{ fontSize: "14px", fontWeight: "600" }}>Proof of Payment</Text>
            <Link href={booking.proofOfPayment} style={{ fontSize: "14px", color: "#1a73e8" }}>
              View Proof
            </Link>
          </Section>
        )}

        {/* Price */}
        <Section style={{ marginBottom: "12px" }}>
          <Text style={{ fontSize: "14px", fontWeight: "600" }}>Total Price</Text>
          <Text style={{ fontSize: "14px", color: "#555" }}>{formatFloat(booking.totalPrice)}</Text>
        </Section>

        {/* Start & End */}
        <Section style={{ marginBottom: "12px" }}>
          <Text style={{ fontSize: "14px", fontWeight: "600" }}>Start</Text>
          <Text style={{ fontSize: "14px", color: "#555" }}>{formatToPHTime(booking.start)}</Text>
        </Section>

        <Section style={{ marginBottom: "12px" }}>
          <Text style={{ fontSize: "14px", fontWeight: "600" }}>End</Text>
          <Text style={{ fontSize: "14px", color: "#555" }}>{formatToPHTime(booking.end)}</Text>
        </Section>

        {/* Courts */}
        <Section style={{ marginBottom: "12px" }}>
          <Text style={{ fontSize: "14px", fontWeight: "600" }}>Courts</Text>
        </Section>

        {/* Footer */}
        <Text style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
          We look forward to seeing you on the court. If you have any questions, feel free to reply
          to this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

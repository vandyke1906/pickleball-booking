import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcrypt"
import * as dotenv from "dotenv"

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ──────────────────────────────────────────────────────────────
// Helper: Hash password once
// ──────────────────────────────────────────────────────────────
async function hashPassword(): Promise<string> {
  const password = process.env.DEFAULT_PASSWORD || "12345"
  return hash(password, 10)
}

// ──────────────────────────────────────────────────────────────
// 1. Seed / upsert Organization
// ──────────────────────────────────────────────────────────────
async function seedOrganization() {
  const orgData = {
    name: "Pickleball Hub",
    openTime: "06:00",
    closeTime: "22:00",
    courtLimit: 10,
  }

  const organization = await prisma.organization.upsert({
    where: { name: orgData.name },
    update: orgData,
    create: orgData,
  })

  console.log(`Organization ready: ${organization.name} (ID: ${organization.id})`)
  return organization
}

// ──────────────────────────────────────────────────────────────
// 2. Seed / upsert Admin User
// ──────────────────────────────────────────────────────────────
async function seedAdminUser(organizationId: string) {
  const hashedPassword = await hashPassword()

  const userData = {
    email: "admin@gmail.com",
    name: "Administrator",
    password: hashedPassword,
    role: "admin",
    organizationId,
  }

  const admin = await prisma.user.upsert({
    where: { email: userData.email },
    update: {
      name: userData.name,
      password: userData.password,
      role: userData.role,
      organizationId: userData.organizationId,
    },
    create: userData,
  })

  console.log(`Admin user ready: ${admin.email}`)
  return admin
}

// ──────────────────────────────────────────────────────────────
// 3. Seed Courts
// ──────────────────────────────────────────────────────────────
async function seedCourts(organizationId: string) {
  const courtData = [
    { name: "Court 1 (Indoor)", location: "Main Arena", pricePerHour: 550 },
    { name: "Court 2 (Indoor)", location: "Main Arena", pricePerHour: 550 },
    { name: "Court 3 (Left)", location: "Left Area", pricePerHour: 450 },
    { name: "Court 4 (Right)", location: "Right Area", pricePerHour: 500 },
  ]

  const courts = []

  for (const data of courtData) {
    const court = await prisma.court.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: data.name,
        },
      },
      update: {
        location: data.location,
        pricePerHour: data.pricePerHour,
      },
      create: {
        name: data.name,
        location: data.location,
        pricePerHour: data.pricePerHour,
        organizationId,
      },
    })

    courts.push(court)
    console.log(`Court ready: ${court.name} (ID: ${court.id})`)
  }

  return courts
}

// ──────────────────────────────────────────────────────────────
// 4. Seed Dummy Bookings
// ──────────────────────────────────────────────────────────────
async function seedDummyBookings(courts: Array<{ id: string }>) {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const bookingData = [
    // Today
    {
      courtId: courts[0].id,
      userName: "Ronie",
      start: now.setHours(8, 0, 0, 0),
      end: now.setHours(9, 0, 0, 0),
      status: "confirmed",
    },
    {
      courtId: courts[0].id,
      userName: "Guest 1",
      start: now.setHours(13, 0, 0, 0),
      end: now.setHours(14, 0, 0, 0),
      status: "confirmed",
    },
    {
      courtId: courts[1].id,
      userName: "Team Alpha",
      start: now.setHours(16, 0, 0, 0),
      end: now.setHours(17, 0, 0, 0),
      status: "confirmed",
    },

    // Tomorrow
    {
      courtId: courts[2].id,
      userName: "Ronie",
      start: tomorrow.setHours(7, 0, 0, 0),
      end: tomorrow.setHours(8, 0, 0, 0),
      status: "pending",
    },
    {
      courtId: courts[2].id,
      userName: "Family B",
      start: tomorrow.setHours(14, 0, 0, 0),
      end: tomorrow.setHours(16, 0, 0, 0),
      status: "confirmed",
    },

    // Next week
    {
      courtId: courts[3].id,
      userName: "Corporate Event",
      start: nextWeek.setHours(9, 0, 0, 0),
      end: nextWeek.setHours(10, 0, 0, 0),
      status: "pending",
    },
    {
      courtId: courts[3].id,
      userName: "League Match",
      start: nextWeek.setHours(13, 0, 0, 0),
      end: nextWeek.setHours(14, 0, 0, 0),
      status: "confirmed",
    },
    {
      courtId: courts[3].id,
      userName: "Night Training",
      start: nextWeek.setHours(21, 0, 0, 0),
      end: nextWeek.setHours(22, 0, 0, 0),
      status: "pending",
    },
  ]

  for (const data of bookingData) {
    await prisma.booking.create({
      data: {
        courtId: data.courtId,
        userName: data.userName,
        startTime: new Date(data.start),
        endTime: new Date(data.end),
        status: data.status,
      },
    })
    console.log(
      `Booking created → ${data.userName} @ ${new Date(data.start).toISOString().slice(0, 16)}`,
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Main execution flow
// ──────────────────────────────────────────────────────────────
async function seedAll() {
  try {
    console.log("=== Seeding started ===\n")

    const org = await seedOrganization()
    await seedAdminUser(org.id)
    const courts = await seedCourts(org.id)
    await seedDummyBookings(courts)

    console.log("\n=== Seeding completed successfully! ===")
  } catch (err) {
    console.error("Seeding failed:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedAll()

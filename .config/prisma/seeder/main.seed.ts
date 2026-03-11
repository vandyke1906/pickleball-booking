import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcrypt"
import * as dotenv from "dotenv"
import { faker } from "@faker-js/faker"

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
  const today = new Date()
  const bookingsPerCourt = 5 // how many bookings per court

  for (const court of courts) {
    for (let i = 0; i < bookingsPerCourt; i++) {
      // Random start hour between 6 AM and 21 PM
      const startHour = faker.number.int({ min: 6, max: 21 })
      const durationHours = faker.number.int({ min: 1, max: 2 })

      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + faker.number.int({ min: 0, max: 7 }), // today + up to 7 days
        startHour,
        0,
        0,
        0,
      )
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)

      await prisma.booking.create({
        data: {
          code: `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          courts: { connect: { id: court.id } },
          fullName: faker.person.fullName(),
          contactNumber: faker.phone.number({ style: "human" }),
          emailAddress: faker.internet.email(),
          startTime: start,
          endTime: end,
          status: faker.helpers.arrayElement(["pending", "confirmed", "cancelled"]),
          totalPrice: court.pricePerHour * durationHours,
          notes: faker.lorem.sentence(),
        },
      })

      console.log(`Booking created → ${court.name} @ ${start.toISOString().slice(0, 16)}`)
    }
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

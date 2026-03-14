import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcrypt"
import * as dotenv from "dotenv"
import { faker } from "@faker-js/faker"
import { customAlphabet } from "nanoid"
import slugify from "slugify"

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const nanoid = customAlphabet(alphabet, 6)

// ──────────────────────────────────────────────────────────────
// Helper: Hash password once
// ──────────────────────────────────────────────────────────────
async function hashPassword(): Promise<string> {
  const password = process.env.DEFAULT_PASSWORD || "12345"
  return hash(password, 10)
}

export function generateBookingRef(): string {
  return `BK-${nanoid()}`
}

async function clearAllRecords() {
  console.log("=== Clearing record started ===\n")
  await Promise.all([prisma.booking.deleteMany({}), prisma.court.deleteMany({})])
  console.log("=== Clear Records ===\n")
}

// ──────────────────────────────────────────────────────────────
// 1. Seed / upsert Organization with Opening Hours + Pricing Rules
// ──────────────────────────────────────────────────────────────
async function seedOrganization() {
  const orgData = {
    slug: "pickl.digos",
    name: "PICKL. Digos",
    address:
      "Sta Ana Road , Beside Citta de Oro Subdivision (Inside Calibjo Rice Milling), Brgy Tres de Mayo , Digos City , Davao del sur , 8002 Philippines",
    contactNumber: "0962 814 9964",
    facebookPage: "https://www.facebook.com/profile.php?id=61554303354722",
    tiktokPage: "https://www.tiktok.com/@pickl.digos",
    email: "pickl.digos@gmail.com",
    courtLimit: 5,
  }

  const slug = orgData.slug ?? slugify(orgData.name)
  orgData.slug = slug

  const organization = await prisma.organization.upsert({
    where: { slug },
    update: orgData,
    create: orgData,
  })

  console.log(`Organization ready: ${organization.name} (ID: ${organization.id})`)

  // ──────────────────────────────────────────────────────────────
  // Seed Opening Hours
  // ──────────────────────────────────────────────────────────────
  await prisma.organizationOpeningHour.deleteMany({
    where: { organizationId: organization.id },
  })

  const openingHours = [
    { startHour: 0, endHour: 1 }, // 12 AM – 1 AM
    { startHour: 9, endHour: 24 }, // 8 AM – 12 AM
  ]

  for (const interval of openingHours) {
    await prisma.organizationOpeningHour.create({
      data: {
        organizationId: organization.id,
        ...interval,
      },
    })
  }

  console.log(`Opening hours seeded for ${organization.name}`)

  // ──────────────────────────────────────────────────────────────
  // Seed Pricing Rules
  // ──────────────────────────────────────────────────────────────
  await prisma.organizationPricingRule.deleteMany({
    where: { organizationId: organization.id },
  })

  const pricingRules = [
    { startHour: 0, endHour: 1, price: 350 }, // 12 AM – 1 AM
    { startHour: 9, endHour: 16, price: 300 }, // 9 AM – 1 PM
    { startHour: 16, endHour: 24, price: 350 }, // 1 PM – 12 AM
  ]

  for (const rule of pricingRules) {
    await prisma.organizationPricingRule.create({
      data: {
        organizationId: organization.id,
        ...rule,
      },
    })
  }

  console.log(`Pricing rules seeded for ${organization.name}`)

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
    { name: "Court 1", location: "Main Arena" },
    { name: "Court 2", location: "Main Arena" },
    { name: "Court 3", location: "Left Area" },
    { name: "Court 4", location: "Right Area" },
    { name: "Court 5", location: "Right Area" },
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
      },
      create: {
        name: data.name,
        location: data.location,
        organizationId,
      },
    })

    courts.push(court)
    console.log(`Court ready: ${court.name} (ID: ${court.id})`)
  }

  return courts
}
// ──────────────────────────────────────────────────────────────
// 4. Seed Dummy Bookings (3 per court)
// ──────────────────────────────────────────────────────────────
async function seedDummyBookings(
  courts: Array<{ id: string; name: string }>,
  organizationId: string,
) {
  const today = new Date()
  const bookingsPerCourt = 3 // only 3 bookings per court

  // fetch org pricing rules once
  const pricingRules = await prisma.organizationPricingRule.findMany({
    where: { organizationId },
  })

  for (const court of courts) {
    for (let i = 0; i < bookingsPerCourt; i++) {
      // Random start hour between 6 AM and 21 PM
      const startHour = faker.number.int({ min: 9, max: 21 })
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

      // resolve price based on org pricing rules
      const rule = pricingRules.find((r) => startHour >= r.startHour && startHour < r.endHour)
      const hourlyRate = rule ? rule.price : 0
      const totalPrice = hourlyRate * durationHours

      await prisma.booking.create({
        data: {
          code: generateBookingRef(),
          courts: { connect: { id: court.id } },
          fullName: faker.person.fullName(),
          contactNumber: faker.phone.number({ style: "human" }),
          emailAddress: faker.internet.email(),
          startTime: start,
          endTime: end,
          status: faker.helpers.arrayElement(["pending", "confirmed", "cancelled"]),
          totalPrice,
          proofOfPaymentLink: "",
          notes: faker.lorem.sentence(),
        },
      })

      console.log(
        `Booking created → ${court.name} @ ${start.toISOString().slice(0, 16)} (₱${totalPrice})`,
      )
    }
  }
}
// ──────────────────────────────────────────────────────────────
// Main execution flow
// ──────────────────────────────────────────────────────────────
async function seedAll() {
  try {
    console.log("=== Seeding started ===\n")
    await clearAllRecords()

    const org = await seedOrganization()
    await seedAdminUser(org.id)
    const courts = await seedCourts(org.id)
    // await seedDummyBookings(courts, org.id)

    console.log("\n=== Seeding completed successfully! ===")
  } catch (err) {
    console.error("Seeding failed:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedAll()

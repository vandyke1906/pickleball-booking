import { PrismaClient  } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


async function main() {
  const hashedPassword = await hash("123456", 10);
  console.log("Starting Admin User Seeder...");
  const userData = {
    name: "Administrator",
    email: "admin@gmail.com",
    password: hashedPassword,
    role: "admin",
  };
  await prisma.user.upsert({
    where: {
      email: userData.email,
    },
    update: {
      name: userData.name,
      password: userData.password,
    },
    create: userData,
  });
  console.log(`Successfully seeded Admin User: ${userData.email}`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

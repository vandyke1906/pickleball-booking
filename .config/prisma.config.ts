import path from "node:path"
import { defineConfig } from "prisma/config"
import "dotenv/config"

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("db", "migrations"),
    seed: "tsx .config/prisma/seeder/main.seed.ts"
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})


import { Prisma, PrismaClient } from "@/.config/prisma/generated/prisma"
import { DefaultArgs } from "@/.config/prisma/generated/prisma/runtime/client"

export type TPrismaTransaction = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>

export type TData<T> = {
  page: number
  perPage: number
  totalCount: number
  data: Array<T>
}

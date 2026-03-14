import { OrganizationType } from "@prisma/client"
import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      organizationId: string
      organization: {
        slug: string
        name: string
      }
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    email: string
    name: string
    role: string
    organizationId: string
    organization: {
      slug: string
      name: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    email: string
    name: string
    role: string
    organizationId: string
    organization: {
      slug: string
      name: string
    }
  }
}

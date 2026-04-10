import { passkey } from "@better-auth/passkey"
import { betterAuth, type BetterAuthOptions } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { twoFactor, lastLoginMethod, multiSession } from "better-auth/plugins"

import { db } from "@/lib/db/db"
import * as schema from "@/lib/db/schema"
import { authBaseUrl, authSecret, cookieDomain } from "@/utils/constants"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const authOptions = {
  appName: "Kisan Vakil",
  baseURL: authBaseUrl,
  basePath: "/api/sessions",
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    usePlural: true,
    schema,
  }),
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      // Dev-friendly fallback. Wire up Resend/Postmark/etc in production.
      console.log(`[Better Auth] Reset password for ${user.email}: ${url}`)
    },
  },
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      console.log(`[Better Auth] Verify email for ${user.email}: ${url}`)
    },
  },
  plugins: [
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          console.log(`[Better Auth] OTP for ${user.email}: ${otp}`)
        },
      },
    }),
    passkey(),
    multiSession(),
    lastLoginMethod(),
    nextCookies(),
  ],
  trustedOrigins: ["http://localhost:3000", authBaseUrl],
  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain: cookieDomain,
    },
  },
} satisfies BetterAuthOptions

export const auth = betterAuth(authOptions)

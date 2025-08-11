import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";

import { db } from "@/drizzle/index";
import * as schema from "@/drizzle/schema";

type AuthHandler = ReturnType<typeof betterAuth>;

const trusted = [];

if (process.env.CLIENT_ORIGIN) {
  trusted.push(process.env.CLIENT_ORIGIN);
}

const isProduction = process.env.NODE_ENV === "production";

export const auth: AuthHandler = betterAuth({
  appName: "FrameRate",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 40,
    autoSignIn: true,
  },
  session: {
    expiresIn: 1209600, // 14 days
    updateAge: 86400, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 20 * 60, // 20 minutes
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
  },
  advanced: {
    cookiePrefix: "framerate",
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: isProduction ? "None" : "Lax",
      partitioned: isProduction,
    },
  },
  trustedOrigins: trusted,
  plugins: [username({ minUsernameLength: 1, maxUsernameLength: 20 })],
});

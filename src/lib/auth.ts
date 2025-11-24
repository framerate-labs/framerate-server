import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt, username } from "better-auth/plugins";

import { db } from "@/drizzle/index";
import * as schema from "@/drizzle/schema";

type AuthHandler = ReturnType<typeof betterAuth>;

const trusted: string[] = [];

if (process.env.NODE_ENV === "production") {
  if (process.env.CLIENT_ORIGIN2) trusted.push(process.env.CLIENT_ORIGIN2);
}

if (process.env.CLIENT_ORIGIN) trusted.push(process.env.CLIENT_ORIGIN);

const isProduction = process.env.NODE_ENV === "production";
// In development, don't set cookie domain. Browsers ignore/deny Domain=localhost
// and host-only cookies work across ports on the same site (localhost).
const cookieDomain = isProduction ? ".frame-rate.io" : undefined;

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
      // Only set domain in production so cookies set on API are valid for subdomains
      // and avoid localhost issues during development.
      domain: cookieDomain as any,
      httpOnly: true,
      partitioned: isProduction,
      path: "/",
      sameSite: isProduction ? "None" : "Lax",
    },
  },
  trustedOrigins: trusted,
  plugins: [
    bearer(),
    jwt(),
    username({ minUsernameLength: 1, maxUsernameLength: 20 }),
  ],
});

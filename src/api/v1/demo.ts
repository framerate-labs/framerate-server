import { Elysia } from "elysia";
import { auth } from "@/lib/auth";

const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "demouser00";

export const demo = new Elysia({ prefix: "/demo" }).post(
  "/login",
  async ({ request }) => {
    try {
      const signInUrl = new URL(request.url);
      signInUrl.pathname = "/api/auth/sign-in/email";

      const signInRequest = new Request(signInUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        }),
      });

      const response = await auth.handler(signInRequest);

      return response;
    } catch (error) {
      console.error("Demo login error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to login to demo account" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
);

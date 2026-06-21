import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMAIL = "admin@albumevi.com";
const ADMIN_PASSWORD = "password123";

export const loginAdmin = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        email: z.string().trim().min(1).max(200),
        password: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (
      data.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
      data.password !== ADMIN_PASSWORD
    ) {
      throw new Error("Invalid Credentials");
    }
    return { ok: true, email: data.email };
  });

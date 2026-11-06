import { z } from "zod";

export const staffPasswordSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1, "Enter your password.").max(100),
});

export const staffPasswordSetupSchema = z.object({
  email: z.string().trim().email().max(120),
  origin: z.string().url().refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.origin === value;
  }, "Invalid return address."),
});

export const newStaffPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The passwords do not match.", path: ["confirm"] });

export function staffRoles(role: "admin" | "management" | "staff") {
  return role === "admin" ? (["admin", "management"] as const) : [role];
}
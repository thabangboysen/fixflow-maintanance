import { describe, expect, test } from "vitest";
import { newStaffPasswordSchema, staffPasswordSchema, staffPasswordSetupSchema, staffRoles } from "./staff-auth";

describe("staff password access", () => {
  test("admin retains both admin and management access", () => {
    expect(staffRoles("admin")).toEqual(["admin", "management"]);
  });
  test("management does not gain admin access", () => {
    expect(staffRoles("management")).toEqual(["management"]);
  });
  test("workers retain worker-only access", () => {
    expect(staffRoles("staff")).toEqual(["staff"]);
  });
  test("email alone cannot sign a staff member in", () => {
    expect(staffPasswordSchema.safeParse({ email: "thabangboysen@gmail.com", password: "" }).success).toBe(false);
  });
  test("password links cannot use a non-web or path-based return address", () => {
    for (const origin of ["javascript:alert(1)", "https://example.com/elsewhere"]) {
      expect(staffPasswordSetupSchema.safeParse({ email: "thabangboysen@gmail.com", origin }).success).toBe(false);
    }
  });
  test("new passwords need at least 8 characters", () => {
    expect(newStaffPasswordSchema.safeParse({ password: "short7!", confirm: "short7!" }).success).toBe(false);
    expect(newStaffPasswordSchema.safeParse({ password: "longer88", confirm: "longer88" }).success).toBe(true);
  });
  test("new password and confirmation must match", () => {
    expect(newStaffPasswordSchema.safeParse({ password: "longer88", confirm: "longer89" }).success).toBe(false);
  });
});
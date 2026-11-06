import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { staffPasswordSchema, staffPasswordSetupSchema, staffRoles } from "./staff-auth";

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"] ?? "",
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "",
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(120),
});

async function resolveStaffEmail(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("staff_accounts")
    .select("email, active, full_name")
    .ilike("email", email)
    .maybeSingle();
  if (!data) throw new Error("That email address is not registered on the staff portal.");
  if (!data.active) throw new Error("This account has been deactivated.");
  return data.email;
}

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

export const requestLoginCode = createServerFn({ method: "POST" })
  .inputValidator((data) => emailSchema.parse(data))
  .handler(async ({ data }) => {
    const email = await resolveStaffEmail(data.email);
    const { error } = await publicClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
    return { maskedEmail: maskEmail(email) };
  });

export const verifyLoginCode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    emailSchema.extend({ code: z.string().trim().min(6).max(10) }).parse(data),
  )
  .handler(async ({ data }) => {
    const email = await resolveStaffEmail(data.email);
    const { data: result, error } = await publicClient().auth.verifyOtp({
      email,
      token: data.code,
      type: "email",
    });
    if (error || !result.session) {
      throw new Error("That code is not valid or has expired. Request a new one.");
    }

    // Link the auth user to its staff directory record.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = result.session.user.id;
    const { data: staff } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, full_name, role")
      .ilike("email", email)
      .eq("active", true)
      .maybeSingle();
    if (staff) {
      await supabaseAdmin.from("staff_accounts").update({ user_id: userId }).eq("id", staff.id);
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        full_name: staff.full_name,
        role: staff.role,
        staff_id: staff.id,
      });
      const roles = staff.role === "admin" ? (["admin", "management"] as const) : [staff.role];
      for (const role of roles) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      }
    }

    return {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    };
  });

export const setupFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ email: z.string().trim().email(), fullName: z.string().trim().min(2).max(120) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("staff_accounts")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      throw new Error("An administrator already exists. Ask them to add your account.");
    }
    const { error } = await supabaseAdmin
      .from("staff_accounts")
      .insert({ email: data.email, full_name: data.fullName, role: "admin", active: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const passwordSignIn = createServerFn({ method: "POST" })
  .inputValidator((data) => staffPasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const email = await resolveStaffEmail(data.email);
    const client = publicClient();
    const { data: result, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error || !result.session) throw new Error("Incorrect email or password.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = result.session.user.id;
    const { data: staff } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, full_name, role")
      .ilike("email", email)
      .eq("active", true)
      .maybeSingle();
    if (staff) {
      const { error: linkError } = await supabaseAdmin.from("staff_accounts").update({ user_id: userId }).eq("id", staff.id);
      if (linkError) throw new Error("Could not link your staff account. Please try again.");
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: userId, email, full_name: staff.full_name, role: staff.role, staff_id: staff.id,
      });
      if (profileError) throw new Error("Could not load your staff profile. Please try again.");
      if (staff.role === "student") throw new Error("This is not a staff account.");
      const roles = staffRoles(staff.role);
      for (const role of roles) {
        const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
        if (roleError) throw new Error("Could not load your staff permissions. Please try again.");
      }
    } else throw new Error("This staff account is not active.");
    return { access_token: result.session.access_token, refresh_token: result.session.refresh_token };
  });

export const requestStaffPasswordLink = createServerFn({ method: "POST" })
  .inputValidator((data) => staffPasswordSetupSchema.parse(data))
  .handler(async ({ data }) => {
    const email = await resolveStaffEmail(data.email);
    // Only registered directory emails can be provisioned. No roles or session
    // are issued here: the recovery email verifies mailbox ownership first.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: false });
    if (createError && !["email_exists", "user_already_exists"].includes(createError.code ?? "")) {
      throw new Error("Could not prepare your staff account. Please try again.");
    }
    const { error } = await publicClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${data.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

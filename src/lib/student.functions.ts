import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type ProblemCategory = Database["public"]["Enums"]["problem_category"];

const CATEGORIES: ProblemCategory[] = [
  "Electrical",
  "Plumbing",
  "Broken/Damaged",
  "Cleaning",
  "Safety/Security",
  "Other",
];

const studentNumberSchema = z
  .string()
  .trim()
  .min(3, "Enter your student number.")
  .max(20, "That student number looks too long.");

// Reporting requires a registered 9-digit student number.
const reportingNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{9}$/, "Enter your 9-digit student number.");

const STUDENT_EMAIL_DOMAIN = "tut4life.ac.za";
const NOT_FOUND = "This student number is not registered in this residence.";
const OTP_LIMIT = 5;
const OTP_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

function studentEmail(studentNumber: string) {
  return `${studentNumber}@${STUDENT_EMAIL_DOMAIN}`;
}

// The code goes to the email on the student's directory record, falling back
// to the university address derived from the student number.
async function resolveStudentEmail(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  studentNumber: string,
) {
  const { data } = await supabaseAdmin
    .from("students")
    .select("email")
    .eq("student_number", studentNumber)
    .maybeSingle();
  return data?.email?.trim() || studentEmail(studentNumber);
}

// e.g. tswaneuniversity73@gmail.com -> ts***************@gmail.com
function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

async function findStudent(studentNumber: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("students")
    .select(
      "id, full_name, student_number, residence, active, rooms(room_name, units(unit_number, blocks(block_name)))",
    )
    .eq("student_number", studentNumber)
    .maybeSingle();
  if (!data || !data.active) throw new Error(NOT_FOUND);
  return { supabaseAdmin, student: data };
}

function shapeStudent(student: Awaited<ReturnType<typeof findStudent>>["student"]) {
  const room = student.rooms;
  const unit = room?.units ?? null;
  const block = unit?.blocks ?? null;
  return {
    fullName: student.full_name,
    studentNumber: student.student_number,
    residence: student.residence,
    block: block?.block_name ?? null,
    unit: unit?.unit_number ?? null,
    room: room?.room_name ?? null,
    roomLabel:
      block && unit && room ? `${block.block_name}${unit.unit_number}${room.room_name}` : null,
  };
}

// "A101A" -> block "A", unit "101", room "A"
function parseRoomLabel(label: string | null, block: string | null) {
  const fallbackBlock = (block ?? "").trim().toUpperCase() || null;
  const trimmed = (label ?? "").trim().toUpperCase();
  if (!trimmed) return { block: fallbackBlock, unit: null, room: null };
  const match = /^([A-Z])\s*(\d+)\s*([A-Z]*)$/.exec(trimmed);
  if (!match) return { block: fallbackBlock, unit: null, room: trimmed };
  const letter = match[1] ?? "";
  const unit = match[2] ?? "";
  const room = match[3] ?? "";
  return { block: fallbackBlock ?? letter, unit, room: room || null };
}

export const verifyStudentNumber = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ studentNumber: studentNumberSchema }).parse(data))
  .handler(async ({ data }) => {
    const { student } = await findStudent(data.studentNumber);
    return shapeStudent(student);
  });

/* ---------------- Student verification with emailed code ---------------- */

// Until a custom email domain exists, the sign-in email carries a link (not a
// code). Tapping it returns the student to /report already signed in.
const returnOriginSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:$/.test(new URL(value).protocol), "Invalid return address.")
  .transform((value) => new URL(value).origin);

export const requestStudentOtp = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ studentNumber: reportingNumberSchema, origin: returnOriginSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Limit: max 5 verification requests per student number per hour.
    const since = new Date(Date.now() - OTP_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin
      .from("student_otp_requests")
      .select("id", { count: "exact", head: true })
      .eq("student_number", data.studentNumber)
      .gte("created_at", since);
    if ((count ?? 0) >= OTP_LIMIT) {
      throw new Error(
        "Too many verification attempts for this student number. Please try again in an hour.",
      );
    }

    const { data: student } = await supabaseAdmin
      .from("residence_students")
      .select("id, full_name, room_number, block")
      .eq("student_number", data.studentNumber)
      .maybeSingle();
    if (!student) throw new Error(NOT_FOUND);

    await supabaseAdmin.from("student_otp_requests").insert({ student_number: data.studentNumber });

    const email = await resolveStudentEmail(supabaseAdmin, data.studentNumber);
    const { error } = await publicClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${data.origin}/report` },
    });
    if (error) throw new Error(error.message);

    return {
      maskedEmail: maskEmail(email),
      fullName: student.full_name,
    };
  });

export const verifyStudentOtp = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ studentNumber: reportingNumberSchema, code: z.string().trim().regex(/^\d{6}$/) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("residence_students")
      .select("id, full_name, student_number, room_number, block")
      .eq("student_number", data.studentNumber)
      .maybeSingle();
    if (!student) throw new Error(NOT_FOUND);

    const email = await resolveStudentEmail(supabaseAdmin, data.studentNumber);
    const { data: result, error } = await publicClient().auth.verifyOtp({
      email,
      token: data.code,
      type: "email",
    });
    if (error || !result?.session) {
      throw new Error("That code is not valid or has expired. Request a new one.");
    }

    await linkStudentAccount(supabaseAdmin, student, result.session.user.id, email);

    return {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
      student: {
        fullName: student.full_name,
        studentNumber: student.student_number,
        roomNumber: student.room_number,
        block: student.block,
      },
    };
  });

// Called after the student taps the emailed sign-in link and lands back on
// /report signed in. The proven email identifies the student.
export const getLinkedStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String(context.claims.email ?? "").trim().toLowerCase();
    if (!email) throw new Error(NOT_FOUND);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: byEmail } = await supabaseAdmin
      .from("students")
      .select("student_number")
      .ilike("email", email)
      .maybeSingle();
    const universityMatch = new RegExp(`^(\\d{9})@${STUDENT_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`).exec(email);
    const studentNumber = byEmail?.student_number ?? universityMatch?.[1];
    if (!studentNumber) throw new Error(NOT_FOUND);

    const { data: student } = await supabaseAdmin
      .from("residence_students")
      .select("id, full_name, student_number, room_number, block")
      .eq("student_number", studentNumber)
      .maybeSingle();
    if (!student) throw new Error(NOT_FOUND);

    await linkStudentAccount(supabaseAdmin, student, context.userId, email);

    return {
      fullName: student.full_name,
      studentNumber: student.student_number,
      roomNumber: student.room_number,
      block: student.block,
    };
  });

type ResidenceStudent = {
  id: string;
  full_name: string;
  student_number: string;
  room_number: string | null;
  block: string | null;
};

// Link the logged-in user to their residence record and to the reporting
// system's student record (used for room attachment and permissions).
async function linkStudentAccount(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  student: ResidenceStudent,
  userId: string,
  email: string,
) {
    const parsed = parseRoomLabel(student.room_number, student.block);

    await supabaseAdmin.from("residence_students").update({ user_id: userId }).eq("id", student.id);

    let roomId: string | null = null;
    if (parsed.block && parsed.unit && parsed.room) {
      const { data: room } = await supabaseAdmin
        .from("rooms")
        .select("id, room_name, units!inner(unit_number, blocks!inner(block_name))")
        .eq("room_name", parsed.room)
        .eq("units.unit_number", parsed.unit)
        .eq("units.blocks.block_name", parsed.block)
        .maybeSingle();
      roomId = room?.id ?? null;
    }

    const { data: existing } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("student_number", student.student_number)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin.from("students").update({
        full_name: student.full_name,
        email,
        user_id: userId,
        room_id: roomId,
        active: true,
      }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("students").insert({
        student_number: student.student_number,
        full_name: student.full_name,
        email,
        user_id: userId,
        room_id: roomId,
        residence: "Corridor Hill",
        active: true,
      });
    }

    return {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
      student: {
        fullName: student.full_name,
        studentNumber: student.student_number,
        roomNumber: student.room_number,
        block: student.block,
      },
    };
  });

/* ---------------- Report submission ---------------- */

export const submitStudentReport = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        studentNumber: studentNumberSchema,
        category: z.enum(CATEGORIES as [ProblemCategory, ...ProblemCategory[]]),
        description: z
          .string()
          .trim()
          .min(10, "Please describe the problem in a little more detail.")
          .max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, student } = await findStudent(data.studentNumber);
    const s = shapeStudent(student);
    if (!s.block || !s.unit || !s.room) {
      throw new Error(
        "Your room has not been allocated yet, so we can't log a report. Please contact Corridor Hills Management.",
      );
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("maintenance_reports")
      .insert({
        report_reference: "",
        student_id: student.id,
        student_number: s.studentNumber,
        student_name: s.fullName,
        category: data.category,
        description: data.description,
        residence: s.residence,
        block_name: s.block,
        unit_number: s.unit,
        room_name: s.room,
      })
      .select("id, report_reference")
      .single();
    if (error) throw new Error(error.message);
    return { reportId: inserted.id, reference: inserted.report_reference, ...s };
  });

// Attaches the photo the student uploaded for their new report.
export const setReportPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ reportId: z.string().uuid(), path: z.string().trim().min(1).max(500) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // RLS "student read own" means owners get the row back; nobody else does.
    const { data: report } = await context.supabase
      .from("maintenance_reports")
      .select("id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) throw new Error("You can only attach a photo to your own report.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("maintenance_reports")
      .update({ photo_path: data.path })
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Tracking ---------------- */

export const trackStudentReports = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ studentNumber: studentNumberSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin, student } = await findStudent(data.studentNumber);
    const { data: reports, error } = await supabaseAdmin
      .from("maintenance_reports")
      .select(
        "report_reference, category, description, status, priority, created_at, completed_at, staff_notes, photo_path, block_name, unit_number, room_name, staff_accounts(full_name)",
      )
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const shaped = [];
    for (const r of reports ?? []) {
      let photoUrl: string | null = null;
      if (r.photo_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("report-photos")
          .createSignedUrl(r.photo_path, 60 * 30);
        photoUrl = signed?.signedUrl ?? null;
      }
      shaped.push({
        reference: r.report_reference,
        category: r.category,
        description: r.description,
        status: r.status,
        priority: r.priority,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        staffNotes: r.staff_notes,
        photoUrl,
        roomLabel: `${r.block_name}${r.unit_number}${r.room_name}`,
        assignedTo: r.staff_accounts?.full_name ?? null,
      });
    }
    return { student: shapeStudent(student), reports: shaped };
  });

/* ---------------- Admin CSV import ---------------- */

const csvRowSchema = z.object({
  studentNumber: z.string().trim().min(3, "Student number is required.").max(20),
  fullName: z.string().trim().min(2, "Full name is required.").max(120),
  roomNumber: z.string().trim().max(30).optional().default(""),
  block: z.string().trim().max(10).optional().default(""),
});

export const importResidenceStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        rows: z
          .array(csvRowSchema)
          .min(1, "The file has no student rows.")
          .max(2000, "Import at most 2000 students per file."),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only administrators can import students.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve room labels ("A101A") to the residence structure in one pass.
    const [blocksRes, unitsRes, roomsRes] = await Promise.all([
      supabaseAdmin.from("blocks").select("id, block_name"),
      supabaseAdmin.from("units").select("id, unit_number, block_id"),
      supabaseAdmin.from("rooms").select("id, room_name, unit_id"),
    ]);
    const blockById = new Map((blocksRes.data ?? []).map((b) => [b.id, b.block_name.toUpperCase()]));
    const unitById = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));
    const roomKeyToId = new Map<string, string>();
    for (const room of roomsRes.data ?? []) {
      const unit = unitById.get(room.unit_id);
      const block = unit ? blockById.get(unit.block_id) : null;
      if (unit && block) {
        roomKeyToId.set(`${block}|${unit.unit_number}|${room.room_name.toUpperCase()}`, room.id);
      }
    }

    const numbers = data.rows.map((r) => r.studentNumber);
    const [residenceExisting, studentsExisting] = await Promise.all([
      supabaseAdmin.from("residence_students").select("id, student_number").in("student_number", numbers),
      supabaseAdmin.from("students").select("id, student_number").in("student_number", numbers),
    ]);
    const residenceByNumber = new Map(
      (residenceExisting.data ?? []).map((r) => [r.student_number, r.id]),
    );
    const studentsByNumber = new Map(
      (studentsExisting.data ?? []).map((s) => [s.student_number, s.id]),
    );

    let created = 0;
    let updated = 0;
    for (const row of data.rows) {
      const parsed = parseRoomLabel(row.roomNumber || null, row.block || null);
      const roomId =
        parsed.block && parsed.unit && parsed.room
          ? roomKeyToId.get(`${parsed.block}|${parsed.unit}|${parsed.room}`) ?? null
          : null;

      const residenceValues = {
        student_number: row.studentNumber,
        full_name: row.fullName,
        room_number: row.roomNumber || null,
        block: row.block || parsed.block || null,
      };
      const residenceId = residenceByNumber.get(row.studentNumber);
      if (residenceId) {
        await supabaseAdmin.from("residence_students").update(residenceValues).eq("id", residenceId);
        updated += 1;
      } else {
        await supabaseAdmin.from("residence_students").insert(residenceValues);
        created += 1;
      }

      // Keep the reporting system's student record in sync.
      const studentValues = {
        student_number: row.studentNumber,
        full_name: row.fullName,
        residence: "Corridor Hill",
        room_id: roomId,
        active: true,
      };
      const studentId = studentsByNumber.get(row.studentNumber);
      if (studentId) {
        // Keep the email already on file; codes are sent there.
        await supabaseAdmin.from("students").update(studentValues).eq("id", studentId);
      } else {
        await supabaseAdmin
          .from("students")
          .insert({ ...studentValues, email: studentEmail(row.studentNumber) });
      }
    }

    return { created, updated };
  });

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2, Plus, Search, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { importResidenceStudents } from "@/lib/student.functions";
import { useProfile } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import { PROBLEM_CATEGORY_VALUES } from "@/lib/categories";

type AppRole = Database["public"]["Enums"]["app_role"];
type Category = Database["public"]["Enums"]["problem_category"];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration · Corridor Hills Maintenance" },
      {
        name: "description",
        content:
          "Corridor Hills administration: manage students, maintenance workers, management accounts and residence blocks, units and rooms.",
      },
      { property: "og:title", content: "Administration · Corridor Hills Maintenance" },
      {
        property: "og:description",
        content: "User and residence data management for the maintenance system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id, full_name, student_number, email, residence, active, rooms(room_name, units(unit_number, blocks(block_name)))",
        )
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const teamQuery = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_accounts")
        .select("id, full_name, email, role, active, skill_category")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const blocksQuery = useQuery({
    queryKey: ["admin-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blocks").select("*").order("block_name");
      if (error) throw error;
      return data;
    },
  });

  const unitsQuery = useQuery({
    queryKey: ["admin-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, block_id")
        .order("unit_number");
      if (error) throw error;
      return data;
    },
  });

  const roomsQuery = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_name, unit_id")
        .order("room_name");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    for (const key of ["admin-students", "admin-team", "admin-blocks", "admin-units", "admin-rooms"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const students = studentsQuery.data ?? [];
  const team = teamQuery.data ?? [];

  return (
    <AppShell
      title="Administration"
      subtitle="Manage students, the maintenance team and residence data."
      personName={profile?.full_name}
      roleLabel="Administrator"
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Registered students" value={students.length} icon={<Users className="h-4 w-4" />} />
        <Stat label="Team members" value={team.length} icon={<UserPlus className="h-4 w-4" />} />
        <Stat
          label="Blocks"
          value={(blocksQuery.data ?? []).length}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="students">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="team">Workers &amp; managers</TabsTrigger>
          <TabsTrigger value="residence">Residence</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4 space-y-4">
          <CsvImportCard onChanged={invalidate} />
          <StudentsTab
            students={students}
            blocks={blocksQuery.data ?? []}
            units={unitsQuery.data ?? []}
            rooms={roomsQuery.data ?? []}
            onChanged={invalidate}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamTab team={team} onChanged={invalidate} />
        </TabsContent>

        <TabsContent value="residence" className="mt-4">
          <ResidenceTab
            blocks={blocksQuery.data ?? []}
            units={unitsQuery.data ?? []}
            rooms={roomsQuery.data ?? []}
            onChanged={invalidate}
          />
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Looking for the job list? Open the{" "}
        <Link to="/management" search={{ view: "reports" }} className="underline">
          maintenance control room
        </Link>
        .
      </p>
    </AppShell>
  );
}

/* ---------------- Students ---------------- */

type StudentRow = {
  id: string;
  full_name: string;
  student_number: string;
  email: string;
  residence: string;
  active: boolean;
  rooms: {
    room_name: string;
    units: { unit_number: string; blocks: { block_name: string } | null } | null;
  } | null;
};

function StudentsTab({
  students,
  blocks,
  units,
  rooms,
  onChanged,
}: {
  students: StudentRow[];
  blocks: { id: string; block_name: string }[];
  units: { id: string; unit_number: string; block_id: string }[];
  rooms: { id: string; room_name: string; unit_id: string }[];
  onChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [blockId, setBlockId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [roomId, setRoomId] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      [s.full_name, s.student_number, s.email].join(" ").toLowerCase().includes(term),
    );
  }, [students, search]);

  const addStudent = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !studentNumber.trim() || !email.trim()) {
        throw new Error("Name, student number and email are required.");
      }
      const { error } = await supabase.from("students").insert({
        full_name: fullName.trim(),
        student_number: studentNumber.trim(),
        email: email.trim(),
        room_id: roomId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student added.");
      setFullName("");
      setStudentNumber("");
      setEmail("");
      setBlockId("");
      setUnitId("");
      setRoomId("");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the student."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("students").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student updated.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the student."),
  });

  const unitOptions = units.filter((u) => u.block_id === blockId);
  const roomOptions = rooms.filter((r) => r.unit_id === unitId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Add a student</CardTitle>
          <CardDescription>Room allocation can be added now or later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input
            placeholder="Student number"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Select value={blockId} onValueChange={(v) => { setBlockId(v); setUnitId(""); setRoomId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Block" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.block_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={unitId} onValueChange={(v) => { setUnitId(v); setRoomId(""); }} disabled={!blockId}>
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roomId} onValueChange={setRoomId} disabled={!unitId}>
              <SelectTrigger>
                <SelectValue placeholder="Room" />
              </SelectTrigger>
              <SelectContent>
                {roomOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.room_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={() => addStudent.mutate()} disabled={addStudent.isPending}>
            {addStudent.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add student
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Students ({students.length})</CardTitle>
          <div className="relative pt-2">
            <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name, number or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
          {filtered.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {s.full_name} <span className="font-mono text-xs text-muted-foreground">{s.student_number}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.email}
                  {s.rooms?.units?.blocks
                    ? ` · Room ${s.rooms.units.blocks.block_name}${s.rooms.units.unit_number}${s.rooms.room_name}`
                    : " · No room allocated"}
                </p>
              </div>
              <Button
                size="sm"
                variant={s.active ? "secondary" : "default"}
                onClick={() => toggleActive.mutate({ id: s.id, active: !s.active })}
                disabled={toggleActive.isPending}
              >
                {s.active ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No students match.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Team ---------------- */

type TeamRow = {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  active: boolean;
  skill_category: Category | null;
};

function TeamTab({ team, onChanged }: { team: TeamRow[]; onChanged: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("staff");
  const [skill, setSkill] = useState<Category | "any">("any");

  const addMember = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !email.trim()) throw new Error("Name and email are required.");
      const { error } = await supabase.from("staff_accounts").insert({
        full_name: fullName.trim(),
        email: email.trim(),
        role,
        skill_category: role === "staff" && skill !== "any" ? skill : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member added. They can now sign in on the staff portal.");
      setFullName("");
      setEmail("");
      setRole("staff");
      setSkill("any");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the team member."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("staff_accounts").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member updated.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the team member."),
  });

  const roleLabel: Record<AppRole, string> = {
    student: "Student",
    staff: "Maintenance worker",
    management: "Management",
    admin: "Administrator",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Add a team member</CardTitle>
          <CardDescription>
            Workers only receive jobs matching their skill. Management and admins see everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Maintenance worker</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={skill}
              onValueChange={(v) => setSkill(v as Category | "any")}
              disabled={role !== "staff"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any category</SelectItem>
                {PROBLEM_CATEGORY_VALUES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={() => addMember.mutate()} disabled={addMember.isPending}>
            {addMember.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add team member
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Team ({team.length})</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
          {team.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email} · {roleLabel[m.role]}
                  {m.role === "staff" ? ` · ${m.skill_category ?? "Any category"}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant={m.active ? "secondary" : "default"}
                onClick={() => toggleActive.mutate({ id: m.id, active: !m.active })}
                disabled={toggleActive.isPending}
              >
                {m.active ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          ))}
          {team.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Residence ---------------- */

function ResidenceTab({
  blocks,
  units,
  rooms,
  onChanged,
}: {
  blocks: { id: string; block_name: string; gender_group: string }[];
  units: { id: string; unit_number: string; block_id: string }[];
  rooms: { id: string; room_name: string; unit_id: string }[];
  onChanged: () => void;
}) {
  const [blockName, setBlockName] = useState("");
  const [gender, setGender] = useState("Girls");
  const [unitBlockId, setUnitBlockId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [roomUnitId, setRoomUnitId] = useState("");
  const [roomName, setRoomName] = useState("");

  const addBlock = useMutation({
    mutationFn: async () => {
      if (!blockName.trim()) throw new Error("Enter a block name.");
      const { error } = await supabase
        .from("blocks")
        .insert({ block_name: blockName.trim(), gender_group: gender });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Block added.");
      setBlockName("");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the block."),
  });

  const addUnit = useMutation({
    mutationFn: async () => {
      if (!unitBlockId || !unitNumber.trim()) throw new Error("Choose a block and enter a unit number.");
      const { error } = await supabase
        .from("units")
        .insert({ block_id: unitBlockId, unit_number: unitNumber.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unit added.");
      setUnitNumber("");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the unit."),
  });

  const addRoom = useMutation({
    mutationFn: async () => {
      if (!roomUnitId || !roomName.trim()) throw new Error("Choose a unit and enter a room name.");
      const { error } = await supabase
        .from("rooms")
        .insert({ unit_id: roomUnitId, room_name: roomName.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Room added.");
      setRoomName("");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the room."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Blocks ({blocks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocks.map((b) => (
            <p key={b.id} className="rounded-lg border border-border p-2 text-sm">
              Block {b.block_name} <span className="text-xs text-muted-foreground">· {b.gender_group}</span>
            </p>
          ))}
          <div className="space-y-2 border-t border-border pt-3">
            <Input placeholder="New block name" value={blockName} onChange={(e) => setBlockName(e.target.value)} />
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Girls">Girls</SelectItem>
                <SelectItem value="Boys">Boys</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" size="sm" onClick={() => addBlock.mutate()} disabled={addBlock.isPending}>
              Add block
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Units ({units.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {units.map((u) => (
              <p key={u.id} className="rounded border border-border px-2 py-1 text-sm">
                {blocks.find((b) => b.id === u.block_id)?.block_name ?? "?"} · Unit {u.unit_number}
              </p>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <Select value={unitBlockId} onValueChange={setUnitBlockId}>
              <SelectTrigger>
                <SelectValue placeholder="Block" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    Block {b.block_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Unit number (e.g. 205)" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
            <Button className="w-full" size="sm" onClick={() => addUnit.mutate()} disabled={addUnit.isPending}>
              Add unit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Rooms ({rooms.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {rooms.map((r) => {
              const unit = units.find((u) => u.id === r.unit_id);
              const block = blocks.find((b) => b.id === unit?.block_id);
              return (
                <p key={r.id} className="rounded border border-border px-2 py-1 text-sm">
                  {block?.block_name ?? "?"}
                  {unit?.unit_number ?? "?"}
                  {r.room_name}
                </p>
              );
            })}
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <Select value={roomUnitId} onValueChange={setRoomUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {blocks.find((b) => b.id === u.block_id)?.block_name ?? "?"} · Unit {u.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Room name (e.g. C)" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            <Button className="w-full" size="sm" onClick={() => addRoom.mutate()} disabled={addRoom.isPending}>
              Add room
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const head = split(lines[0]!).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const idx = (n: string) => head.indexOf(n);
  const [sn, fn, rn, bl] = [idx("studentnumber"), idx("fullname"), idx("roomnumber"), idx("block")];
  if (sn < 0 || fn < 0) throw new Error("The CSV needs student_number and full_name columns.");
  return lines.slice(1).map((l) => {
    const c = split(l);
    return { studentNumber: c[sn] ?? "", fullName: c[fn] ?? "", roomNumber: rn >= 0 ? c[rn] ?? "" : "", block: bl >= 0 ? c[bl] ?? "" : "" };
  });
}

function CsvImportCard({ onChanged }: { onChanged: () => void }) {
  const run = useServerFn(importResidenceStudents);
  const [busy, setBusy] = useState(false);
  async function onFile(file: File) {
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      const r = await run({ data: { rows } });
      toast.success(`Imported: ${r.created} new, ${r.updated} updated.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import residence students (CSV)</CardTitle>
        <CardDescription>Columns: student_number, full_name, room_number, block. Example: 240371952,Thabo Mokoena,A101A,A</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} />
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      </CardContent>
    </Card>
  );
}

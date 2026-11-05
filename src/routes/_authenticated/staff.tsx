import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["report_status"];
const workStatuses: Status[] = ["Acknowledged", "Assigned", "In Progress", "Completed"];

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "My maintenance jobs · Corridor Hill" },
      {
        name: "description",
        content:
          "Maintenance staff view: see the jobs assigned to you at Corridor Hill, update their status, add notes and mark work as completed.",
      },
      { property: "og:title", content: "My maintenance jobs · Corridor Hill" },
      {
        property: "og:description",
        content: "Assigned jobs with room location, category, notes and completion tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ["staff-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const jobs = jobsQuery.data ?? [];
  const outstanding = jobs.filter((j) => j.status !== "Completed" && j.status !== "Closed");
  const done = jobs.filter((j) => j.status === "Completed" || j.status === "Closed");

  return (
    <AppShell
      title="My maintenance jobs"
      subtitle="Everything assigned to you, with the room details you need to get there."
      personName={profile?.full_name}
      roleLabel="Maintenance staff"
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Outstanding" value={outstanding.length} icon={<ClipboardList className="h-4 w-4" />} />
        <Stat
          label="In progress"
          value={jobs.filter((j) => j.status === "In Progress").length}
          icon={<Loader2 className="h-4 w-4" />}
        />
        <Stat label="Completed" value={done.length} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="outstanding">
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding ({outstanding.length})</TabsTrigger>
          <TabsTrigger value="done">Completed ({done.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="outstanding" className="mt-4 space-y-4">
          {jobsQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {!jobsQuery.isLoading && outstanding.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing outstanding right now. New jobs appear here as soon as they are assigned to you.
            </p>
          )}
          {outstanding.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSaved={() => void queryClient.invalidateQueries({ queryKey: ["staff-jobs"] })}
            />
          ))}
        </TabsContent>
        <TabsContent value="done" className="mt-4 space-y-4">
          {done.length === 0 && (
            <p className="text-sm text-muted-foreground">No completed jobs yet.</p>
          )}
          {done.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSaved={() => void queryClient.invalidateQueries({ queryKey: ["staff-jobs"] })}
            />
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

type Job = Database["public"]["Tables"]["maintenance_reports"]["Row"];

function JobCard({ job, onSaved }: { job: Job; onSaved: () => void }) {
  const [status, setStatus] = useState<Status>(job.status);
  const [notes, setNotes] = useState(job.staff_notes ?? "");

  const save = useMutation({
    mutationFn: async (nextStatus: Status) => {
      const { error } = await supabase
        .from("maintenance_reports")
        .update({
          status: nextStatus,
          staff_notes: notes.trim() || null,
          completed_at:
            nextStatus === "Completed" ? (job.completed_at ?? new Date().toISOString()) : null,
        })
        .eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated.");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this job."),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{job.report_reference}</span>
          <StatusBadge status={job.status} />
          <PriorityBadge priority={job.priority} />
          <span className="ml-auto text-xs text-muted-foreground">
            Reported {new Date(job.created_at).toLocaleDateString()}
          </span>
        </div>
        <CardTitle className="font-display text-lg">{job.category}</CardTitle>
        <CardDescription>
          {job.residence} · Block {job.block_name} · Unit {job.unit_number} · Room {job.room_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{job.description}</p>
        <p className="text-xs text-muted-foreground">
          Reported by {job.student_name} ({job.student_number})
        </p>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            rows={2}
            placeholder="Add a note about the work done, parts needed, or access problems."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => save.mutate(status)} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save update
          </Button>
          {job.status !== "Completed" && job.status !== "Closed" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setStatus("Completed");
                save.mutate("Completed");
              }}
              disabled={save.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
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

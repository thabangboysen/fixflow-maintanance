import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, DoorOpen, Grid3x3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Tab = "blocks" | "units" | "rooms";
const selectCls =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function ResidenceStructure() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("blocks");
  const q = useQuery({
    queryKey: ["structure"],
    queryFn: async () => {
      const [b, u, r] = await Promise.all([
        supabase.from("blocks").select("*").order("block_name"),
        supabase.from("units").select("id, unit_number, block_id").order("unit_number"),
        supabase.from("rooms").select("id, room_name, unit_id").order("room_name"),
      ]);
      if (b.error || u.error || r.error) throw b.error ?? u.error ?? r.error;
      return { blocks: b.data, units: u.data, rooms: r.data };
    },
  });
  const blocks = q.data?.blocks ?? [];
  const units = q.data?.units ?? [];
  const rooms = q.data?.rooms ?? [];
  const blockName = (id: string) => blocks.find((b) => b.id === id)?.block_name ?? "?";
  const unitOf = (id: string) => units.find((u) => u.id === id);

  const [letter, setLetter] = useState("A");
  const [gender, setGender] = useState("Girls");
  const [unitBlock, setUnitBlock] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [roomUnit, setRoomUnit] = useState("");
  const [roomName, setRoomName] = useState("");

  const run = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: unknown }>) => {
      const { error } = await fn();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved.");
      void qc.invalidateQueries({ queryKey: ["structure"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message).includes("foreign key")
            ? "Remove what's inside it first (units, rooms or students)."
            : String((e as { message: string }).message)
          : "Could not save.",
      ),
  });

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "blocks", label: "Blocks", count: blocks.length, icon: <Building2 className="h-4 w-4" /> },
    { id: "units", label: "Units", count: units.length, icon: <Grid3x3 className="h-4 w-4" /> },
    { id: "rooms", label: "Rooms", count: rooms.length, icon: <DoorOpen className="h-4 w-4" /> },
  ];

  const rows =
    tab === "blocks"
      ? blocks.map((b) => ({
          id: b.id, badge: b.block_name, title: `Block ${b.block_name}`,
          sub: `${b.gender_group} · ${units.filter((u) => u.block_id === b.id).length} units`,
          del: () => supabase.from("blocks").delete().eq("id", b.id),
        }))
      : tab === "units"
        ? units.map((u) => ({
            id: u.id, badge: blockName(u.block_id), title: `Unit ${blockName(u.block_id)}${u.unit_number}`,
            sub: `Block ${blockName(u.block_id)} · ${rooms.filter((r) => r.unit_id === u.id).length} rooms`,
            del: () => supabase.from("units").delete().eq("id", u.id),
          }))
        : rooms.map((r) => {
            const u = unitOf(r.unit_id);
            const label = u ? `${blockName(u.block_id)}${u.unit_number}${r.room_name}` : r.room_name;
            return {
              id: r.id, badge: r.room_name, title: `Room ${label}`,
              sub: u ? `Block ${blockName(u.block_id)} · Unit ${u.unit_number}` : "",
              del: () => supabase.from("rooms").delete().eq("id", r.id),
            };
          });

  return (
    <div>
      <h2 className="font-display text-3xl font-bold">Residence Structure</h2>
      <p className="mt-1 text-muted-foreground">Manage blocks, units and rooms across Corridor Hills.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition",
              tab === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary")}>
            {t.icon} {t.label}
            <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs", tab === t.id ? "bg-white/15" : "")}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-fit space-y-4 rounded-2xl border border-border bg-card p-7">
          {tab === "blocks" && (
            <>
              <h3 className="font-display text-lg font-semibold">Add Block</h3>
              <div className="space-y-2"><Label>Block letter</Label>
                <select className={selectCls} value={letter} onChange={(e) => setLetter(e.target.value)}>
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => <option key={l}>{l}</option>)}
                </select></div>
              <div className="space-y-2"><Label>Gender group</Label>
                <select className={selectCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option>Girls</option><option>Boys</option><option>Mixed</option>
                </select></div>
              <AddBtn label="Add Block" onClick={() => {
                if (blocks.some((b) => b.block_name === letter)) { toast.error(`Block ${letter} already exists.`); return; }
                run.mutate(() => supabase.from("blocks").insert({ block_name: letter, gender_group: gender }));
              }} />
            </>
          )}
          {tab === "units" && (
            <>
              <h3 className="font-display text-lg font-semibold">Add Unit</h3>
              <div className="space-y-2"><Label>Block</Label>
                <select className={selectCls} value={unitBlock} onChange={(e) => setUnitBlock(e.target.value)}>
                  <option value="">Choose block</option>
                  {blocks.map((b) => <option key={b.id} value={b.id}>Block {b.block_name}</option>)}
                </select></div>
              <div className="space-y-2"><Label>Unit number</Label>
                <Input className="h-12" placeholder="e.g. 205" value={unitNo} onChange={(e) => setUnitNo(e.target.value)} /></div>
              <AddBtn label="Add Unit" onClick={() => {
                if (!unitBlock || !unitNo.trim()) { toast.error("Choose a block and enter a unit number."); return; }
                run.mutate(() => supabase.from("units").insert({ block_id: unitBlock, unit_number: unitNo.trim() }));
                setUnitNo("");
              }} />
            </>
          )}
          {tab === "rooms" && (
            <>
              <h3 className="font-display text-lg font-semibold">Add Room</h3>
              <div className="space-y-2"><Label>Unit</Label>
                <select className={selectCls} value={roomUnit} onChange={(e) => setRoomUnit(e.target.value)}>
                  <option value="">Choose unit</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{blockName(u.block_id)}{u.unit_number}</option>)}
                </select></div>
              <div className="space-y-2"><Label>Room letter</Label>
                <Input className="h-12" placeholder="e.g. C" value={roomName} onChange={(e) => setRoomName(e.target.value)} /></div>
              <AddBtn label="Add Room" onClick={() => {
                if (!roomUnit || !roomName.trim()) { toast.error("Choose a unit and enter a room letter."); return; }
                run.mutate(() => supabase.from("rooms").insert({ unit_id: roomUnit, room_name: roomName.trim().toUpperCase() }));
                setRoomName("");
              }} />
            </>
          )}
        </div>

        <div className="max-h-[640px] overflow-y-auto rounded-2xl border border-border bg-card">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-4 border-b border-border px-7 py-4 last:border-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">{r.badge}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.sub}</p>
              </div>
              <button aria-label={`Delete ${r.title}`} className="rounded p-2 text-destructive hover:bg-destructive/10"
                onClick={() => confirm(`Delete ${r.title}?`) && run.mutate(r.del)}>
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
          {rows.length === 0 && <p className="p-7 text-sm text-muted-foreground">Nothing here yet.</p>}
        </div>
      </div>
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button className="h-12 w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={onClick}>
      <Plus className="mr-2 h-4 w-4" /> {label}
    </Button>
  );
}

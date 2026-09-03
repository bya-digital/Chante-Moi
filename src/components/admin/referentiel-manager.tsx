"use client";

import { useState } from "react";
import { Plus, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
}

export interface ReferentialRow {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  sort_order: number;
  [key: string]: string | number | boolean | null;
}

interface ReferentialManagerProps {
  table: "occasions" | "emotions" | "music_styles" | "voices";
  label: string;
  fields: FieldConfig[];
  initialRows: ReferentialRow[];
}

const emptyRow = (fields: FieldConfig[]): Partial<ReferentialRow> => {
  const row: Partial<ReferentialRow> = { slug: "", name: "" };
  for (const f of fields) row[f.key] = "";
  return row;
};

export function ReferentialManager({ table, label, fields, initialRows }: ReferentialManagerProps) {
  const [rows, setRows] = useState(initialRows.sort((a, b) => a.sort_order - b.sort_order));
  const [editing, setEditing] = useState<Partial<ReferentialRow> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function toggleActive(row: ReferentialRow) {
    const next = !row.active;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, active: next } : r)));
    const supabase = createClient();
    const { error } = await supabase.from(table).update({ active: next }).eq("id", row.id);
    if (error) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, active: !next } : r)));
      toast.error("Échec de la mise à jour");
    }
  }

  async function move(row: ReferentialRow, direction: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const other = rows[swapIdx];

    const newRows = [...rows];
    newRows[idx] = { ...row, sort_order: other.sort_order };
    newRows[swapIdx] = { ...other, sort_order: row.sort_order };
    newRows.sort((a, b) => a.sort_order - b.sort_order);
    setRows(newRows);

    const supabase = createClient();
    await Promise.all([
      supabase.from(table).update({ sort_order: other.sort_order }).eq("id", row.id),
      supabase.from(table).update({ sort_order: row.sort_order }).eq("id", other.id),
    ]);
  }

  function openEdit(row?: ReferentialRow) {
    setEditing(row ? { ...row } : emptyRow(fields));
    setOpen(true);
  }

  async function save() {
    if (!editing || !editing.name || !editing.slug) {
      toast.error("Nom et slug requis");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = { name: editing.name, slug: editing.slug };
    for (const f of fields) payload[f.key] = editing[f.key] ?? null;

    if (editing.id) {
      const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      setRows((rs) => rs.map((r) => (r.id === editing.id ? { ...r, ...payload } as ReferentialRow : r)));
    } else {
      const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const { data, error } = await supabase
        .from(table)
        .insert({ ...payload, active: true, sort_order: maxOrder + 1 })
        .select()
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Échec de la création");
        setSaving(false);
        return;
      }
      setRows((rs) => [...rs, data as ReferentialRow]);
    }
    toast.success("Enregistré");
    setSaving(false);
    setOpen(false);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold">{label}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openEdit()}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Modifier" : "Ajouter"} — {label}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={String(editing.name ?? "")}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={String(editing.slug ?? "")}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    className="mt-1"
                  />
                </div>
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-sm font-medium">{f.label}</label>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={String(editing[f.key] ?? "")}
                        onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                        className="mt-1"
                        rows={2}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        value={String(editing[f.key] ?? "")}
                        onValueChange={(v) => setEditing({ ...editing, [f.key]: v })}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={String(editing[f.key] ?? "")}
                        onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={save} disabled={saving}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Ordre</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.slug}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => move(row, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === rows.length - 1}
                      onClick={() => move(row, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={row.active} onCheckedChange={() => toggleActive(row)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

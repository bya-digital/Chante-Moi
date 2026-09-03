"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface ProviderRow {
  id: string;
  provider_type: string;
  display_name: string;
  active: boolean;
  priority: number;
  error_count: number;
  request_count: number;
  last_error: string | null;
}

export function ProvidersTable({ providers }: { providers: ProviderRow[] }) {
  const [rows, setRows] = useState(providers);

  async function toggle(id: string, active: boolean) {
    setRows((r) => r.map((p) => (p.id === id ? { ...p, active } : p)));
    const supabase = createClient();
    const { error } = await supabase.from("provider_configs").update({ active }).eq("id", id);
    if (error) {
      setRows((r) => r.map((p) => (p.id === id ? { ...p, active: !active } : p)));
      toast.error("Échec de la mise à jour — vérifiez vos droits admin");
    } else {
      toast.success(`${id} ${active ? "activé" : "désactivé"}`);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Requêtes</TableHead>
            <TableHead>Erreurs</TableHead>
            <TableHead>Actif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.display_name}</TableCell>
              <TableCell>
                <Badge variant="outline">{p.provider_type}</Badge>
              </TableCell>
              <TableCell>{p.priority}</TableCell>
              <TableCell>{p.request_count}</TableCell>
              <TableCell>{p.error_count > 0 ? <span className="text-destructive">{p.error_count}</span> : 0}</TableCell>
              <TableCell>
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

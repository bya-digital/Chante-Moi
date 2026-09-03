"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    // Le lien reçu par email a déjà établi une session de récupération (Supabase gère ça via le
    // fragment d'URL) — updateUser() suffit, pas besoin de redemander l'ancien mot de passe.
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour");
    router.push("/creer");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Music2 className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-semibold">Nouveau mot de passe</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Mettre à jour
          </Button>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Music2 className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-semibold">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sent
              ? "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé."
              : "Entrez votre email pour recevoir un lien de réinitialisation."}
          </p>
        </div>

        {!sent && (
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Envoyer le lien
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

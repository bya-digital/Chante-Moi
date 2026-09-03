"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";

export function ReferralShare({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : `/?ref=${code}`;

  async function copy() {
    const success = await copyToClipboard(link);
    if (!success) {
      toast.error("Impossible de copier automatiquement — sélectionnez et copiez le lien manuellement");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Crée une chanson personnalisée avec MeloKado — voici mon lien : ${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-medium">Votre code : <span className="font-heading text-primary">{code}</span></p>
      <div className="mt-3 flex gap-2">
        <Input value={link} readOnly className="text-xs" />
        <Button variant="outline" size="icon" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <Button className="mt-3 w-full rounded-full" onClick={shareWhatsApp}>
        Partager sur WhatsApp
      </Button>
    </Card>
  );
}

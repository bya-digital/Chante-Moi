"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Mic, PenLine, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { OccasionIcon } from "@/components/marketing/occasion-icon";
import { VoiceRecorder } from "./voice-recorder";
import type { EmotionRow, MusicStyleRow, OccasionRow, VoiceRow } from "@/lib/data/reference";
import type { GeneratedLyrics } from "@/services/ai/types";
import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "Occasion",
  "Destinataire",
  "Histoire",
  "Émotion",
  "Style",
  "Voix",
  "Paroles",
  "Paiement",
];

const TIERS = [
  { id: "basic", name: "Basic", price: 500, items: ["Paroles sur mesure", "Chanson complète", "MP3", "Partage"] },
  { id: "premium", name: "Premium", price: 1000, items: ["Tout Basic", "Vidéo avec photo", "Page cadeau"] },
  { id: "vip", name: "VIP", price: 2500, items: ["Tout Premium", "Personnalisation avancée", "Régénération incluse"] },
] as const;

interface CreationWizardProps {
  occasions: OccasionRow[];
  emotions: EmotionRow[];
  musicStyles: MusicStyleRow[];
  voices: VoiceRow[];
}

export function CreationWizard({ occasions, emotions, musicStyles, voices }: CreationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOccasion = searchParams.get("occasion") ?? undefined;

  const [step, setStep] = useState(0);
  const [occasionSlug, setOccasionSlug] = useState<string | undefined>(initialOccasion);
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [story, setStory] = useState("");
  const [emotionSlug, setEmotionSlug] = useState<string>();
  const [musicStyleSlug, setMusicStyleSlug] = useState<string>();
  const [voiceSlug, setVoiceSlug] = useState<string>();
  const [tier, setTier] = useState<(typeof TIERS)[number]["id"]>("basic");

  const [lyrics, setLyrics] = useState<GeneratedLyrics | null>(null);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const occasion = useMemo(() => occasions.find((o) => o.slug === occasionSlug), [occasions, occasionSlug]);
  const musicStyle = useMemo(() => musicStyles.find((s) => s.slug === musicStyleSlug), [musicStyles, musicStyleSlug]);

  const canGoNext = [
    Boolean(occasionSlug),
    true, // destinataire optionnel
    story.trim().length >= 20,
    Boolean(emotionSlug),
    Boolean(musicStyleSlug),
    Boolean(voiceSlug),
    Boolean(lyrics),
    true,
  ][step];

  async function generateLyrics() {
    if (!occasion || !emotionSlug || !musicStyle) return;
    setGeneratingLyrics(true);
    setLyricsError(null);
    try {
      const res = await fetch("/api/lyrics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story: relationship ? `${story}\n\n(Relation avec le/la destinataire : ${relationship})` : story,
          occasion: occasion.name,
          recipientName: recipientName || undefined,
          emotion: emotionSlug,
          musicStyle: musicStyle.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la génération des paroles");
      setLyrics(data.lyrics);
    } catch (err) {
      setLyricsError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGeneratingLyrics(false);
    }
  }

  async function goNext() {
    if (step === 5) {
      setStep(6);
      if (!lyrics) await generateLyrics();
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submitOrder() {
    setSubmittingOrder(true);
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasionSlug, recipientName, tier }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Échec de la création de la commande");

      const paymentRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderData.order.id }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(paymentData.error ?? "Échec de la création du paiement");

      if (paymentData.checkoutUrl) {
        window.location.href = paymentData.checkoutUrl;
      } else {
        toast.error("Aucune URL de paiement retournée par le provider");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      if (message.includes("Connexion requise")) {
        toast.error("Connectez-vous pour finaliser votre commande");
        router.push(`/connexion?next=/creer`);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmittingOrder(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Étape {step + 1} / {STEP_LABELS.length} — {STEP_LABELS[step]}
          </span>
        </div>
        <Progress value={((step + 1) / STEP_LABELS.length) * 100} className="mt-2" />
      </div>

      <Card className="p-6 sm:p-8">
        {step === 0 && (
          <StepShell title="Pour quelle occasion ?" subtitle="Choisissez ce que vous célébrez.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {occasions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOccasionSlug(o.slug)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-all",
                    occasionSlug === o.slug
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <OccasionIcon name={o.icon} className="h-6 w-6" />
                  {o.name}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="Pour qui ?" subtitle="Facultatif, mais ça rend la chanson plus personnelle.">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Prénom du destinataire</label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex. Grâce"
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Votre lien avec cette personne</label>
                <Input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Ex. ma maman, mon épouse, mon meilleur ami..."
                  className="mt-1.5"
                />
              </div>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Racontez-nous votre histoire" subtitle="Quelques phrases suffisent — soyez sincère.">
            <Tabs defaultValue="ecrire">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ecrire"><PenLine className="h-4 w-4" /> Écrire</TabsTrigger>
                <TabsTrigger value="parler"><Mic className="h-4 w-4" /> Parler</TabsTrigger>
              </TabsList>
              <TabsContent value="ecrire" className="mt-4">
                <Textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Je veux faire une chanson pour ma maman Grâce. Elle m'a beaucoup soutenu..."
                  rows={8}
                />
                <p className="mt-2 text-right text-xs text-muted-foreground">{story.length} caractères (min. 20)</p>
              </TabsContent>
              <TabsContent value="parler" className="mt-4">
                <VoiceRecorder onTranscribed={(t) => setStory(t)} />
                {story && (
                  <div className="mt-4">
                    <label className="text-sm font-medium">Transcription (modifiable)</label>
                    <Textarea value={story} onChange={(e) => setStory(e.target.value)} rows={5} className="mt-1.5" />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Quelle émotion ?" subtitle="Elle guidera le ton des paroles et de la musique.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {emotions.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEmotionSlug(e.slug)}
                  className={cn(
                    "rounded-2xl border p-4 text-sm font-medium transition-all",
                    emotionSlug === e.slug
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Quel style musical ?" subtitle="Le genre qui portera votre histoire.">
            <div className="grid gap-3 sm:grid-cols-2">
              {musicStyles.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setMusicStyleSlug(s.slug)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    musicStyleSlug === s.slug
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Quelle voix ?" subtitle="Choisissez la voix qui chantera votre chanson.">
            <div className="grid grid-cols-2 gap-3">
              {voices.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceSlug(v.slug)}
                  className={cn(
                    "rounded-2xl border p-4 text-sm font-medium transition-all",
                    voiceSlug === v.slug
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {v.name}
                  <Badge variant="secondary" className="ml-2 text-[10px]">{v.category}</Badge>
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="Aperçu des paroles" subtitle="Validez, modifiez ou régénérez avant de continuer.">
            {generatingLyrics && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Votre histoire prend forme en paroles...</p>
              </div>
            )}

            {!generatingLyrics && lyricsError && (
              <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Génération indisponible</p>
                <p className="text-muted-foreground">{lyricsError}</p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez qu&apos;une clé OPENAI_API_KEY ou ANTHROPIC_API_KEY est configurée côté serveur.
                </p>
                <Button variant="outline" size="sm" onClick={generateLyrics}>
                  <RefreshCw className="h-4 w-4" /> Réessayer
                </Button>
              </div>
            )}

            {!generatingLyrics && lyrics && (
              <div className="space-y-4">
                <Input
                  value={lyrics.title}
                  onChange={(e) => setLyrics({ ...lyrics, title: e.target.value })}
                  className="font-heading text-lg font-semibold"
                />
                <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-4">
                  {lyrics.sections.map((section, i) => (
                    <div key={i}>
                      <Badge variant="outline" className="mb-1.5 text-[10px] uppercase">{section.kind}</Badge>
                      <Textarea
                        value={section.text}
                        onChange={(e) => {
                          const sections = [...lyrics.sections];
                          sections[i] = { ...section, text: e.target.value };
                          setLyrics({ ...lyrics, sections, fullText: sections.map((s) => s.text).join("\n\n") });
                        }}
                        rows={3}
                        className="border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={generateLyrics}>
                  <Sparkles className="h-4 w-4" /> Régénérer une version
                </Button>
              </div>
            )}
          </StepShell>
        )}

        {step === 7 && (
          <StepShell title="Créer ma chanson" subtitle="Choisissez votre formule et finalisez.">
            <div className="grid gap-3">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border p-4 text-left transition-all",
                    tier === t.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  <div>
                    <p className="font-heading text-base font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.items.join(" · ")}</p>
                  </div>
                  <p className="font-heading text-xl font-semibold text-primary shrink-0 pl-4">{t.price} FCFA</p>
                </button>
              ))}
            </div>
            <Button
              className="mt-6 w-full rounded-full"
              size="lg"
              disabled={submittingOrder}
              onClick={submitOrder}
            >
              {submittingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Payer et générer ma chanson
            </Button>
          </StepShell>
        )}
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={goBack} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        {step < STEP_LABELS.length - 1 && (
          <Button onClick={goNext} disabled={!canGoNext}>
            Continuer <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

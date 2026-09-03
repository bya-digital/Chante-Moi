import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { OccasionIcon } from "@/components/marketing/occasion-icon";
import { getMusicStyles, getOccasions } from "@/lib/data/reference";

async function findOccasion(slug: string) {
  const occasions = await getOccasions();
  return occasions.find((o) => o.slug === slug) ?? null;
}

type OccasionPageProps = { params: Promise<{ occasion: string }> };

export async function generateMetadata({ params }: OccasionPageProps): Promise<Metadata> {
  const { occasion: slug } = await params;
  const occasion = await findOccasion(slug);
  if (!occasion) return {};

  return {
    title: `Chanson ${occasion.name.toLowerCase()} personnalisée`,
    description: occasion.description ?? `Créez une chanson ${occasion.name.toLowerCase()} personnalisée avec MeloKado.`,
  };
}

export default async function OccasionLandingPage({ params }: OccasionPageProps) {
  const { occasion: slug } = await params;
  const [occasion, styles] = await Promise.all([findOccasion(slug), getMusicStyles()]);

  if (!occasion) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <OccasionIcon name={occasion.icon} className="h-7 w-7" />
          </span>
          <h1 className="mt-6 text-balance font-heading text-4xl font-semibold sm:text-5xl">
            Une chanson <span className="italic text-primary">{occasion.name.toLowerCase()}</span> rien que pour vous
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            {occasion.description ?? "Racontez votre histoire, MeloKado la transforme en chanson personnalisée."}
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href={`/creer?occasion=${occasion.slug}`}>
                Créer ma chanson {occasion.name.toLowerCase()} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="bg-secondary/40 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-center font-heading text-2xl font-semibold">Comment ça marche</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Racontez votre histoire, à l'écrit ou à l'oral",
                "Choisissez l'émotion, le style musical et la voix",
                "Validez les paroles générées par IA",
                "Recevez votre chanson en quelques minutes",
              ].map((step) => (
                <Card key={step} className="flex items-center gap-3 p-4 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" /> {step}
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-center font-heading text-2xl font-semibold">Styles musicaux disponibles</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {styles.map((s) => (
              <span key={s.id} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm">
                {s.name}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
          <Button asChild size="lg" className="rounded-full px-10">
            <Link href={`/creer?occasion=${occasion.slug}`}>
              Commencer maintenant <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">À partir de 500 FCFA</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

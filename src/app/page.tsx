import Link from "next/link";
import { ArrowRight, Mic, Sparkles, Wand2, Play, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { OccasionIcon } from "@/components/marketing/occasion-icon";
import { getMusicStyles, getOccasions } from "@/lib/data/reference";

const STEPS = [
  { icon: Mic, title: "Racontez", text: "Écrivez ou parlez : partagez votre histoire, vos souvenirs, ce que vous ressentez." },
  { icon: Wand2, title: "Personnalisez", text: "Choisissez l'émotion, le style musical et la voix qui racontent le mieux votre histoire." },
  { icon: Sparkles, title: "Payez", text: "Un tarif clair, à partir de 500 FCFA. Paiement Mobile Money, carte, tout est sécurisé." },
  { icon: Play, title: "Recevez", text: "Votre chanson est prête en quelques minutes. Écoutez, téléchargez, offrez." },
];

const FAQS = [
  {
    q: "Combien de temps faut-il pour créer une chanson ?",
    a: "Quelques minutes suffisent pour raconter votre histoire et choisir vos préférences. La composition musicale prend ensuite quelques minutes supplémentaires — vous recevez une notification dès qu'elle est prête.",
  },
  {
    q: "Dois-je savoir écrire des paroles ou jouer de la musique ?",
    a: "Non. Vous racontez votre histoire avec vos mots (ou à l'oral), notre IA se charge d'en faire des paroles chantables et de choisir la mise en musique.",
  },
  {
    q: "Puis-je modifier les paroles avant la génération musicale ?",
    a: "Oui, vous validez systématiquement un aperçu des paroles avant tout paiement de la génération musicale — vous pouvez les modifier ou en demander une nouvelle version.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Mobile Money (Orange Money, MTN, Moov, Wave selon disponibilité), carte bancaire, et d'autres moyens locaux selon votre pays.",
  },
  {
    q: "Comment offrir la chanson à quelqu'un ?",
    a: "Chaque chanson peut être livrée avec une page cadeau personnalisée (photo, message, lecteur audio) à partager par WhatsApp ou tout autre réseau.",
  },
];

export default async function HomePage() {
  const [occasions, styles] = await Promise.all([getOccasions(), getMusicStyles()]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background"
          />
          <div
            aria-hidden
            className="animate-float-slow pointer-events-none absolute -right-24 top-24 -z-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-float-slow pointer-events-none absolute -left-24 top-72 -z-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl [animation-delay:2s]"
          />

          <div className="mx-auto max-w-5xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Conçu pour l&apos;Afrique francophone
            </span>

            <h1 className="mt-6 text-balance font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Racontez votre histoire.
              <br />
              <span className="italic text-primary">Nous la transformons en chanson.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Une histoire, une émotion, une chanson, un cadeau, un souvenir partageable.
              Créez une chanson 100&nbsp;% personnalisée pour un anniversaire, un mariage,
              une déclaration d&apos;amour ou toute occasion qui compte pour vous.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-8 text-base shadow-lg shadow-primary/20">
                <Link href="/creer">
                  Créer ma chanson <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 text-base">
                <Link href="#comment-ca-marche">Voir comment ça marche</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">À partir de 500 FCFA · Paiement Mobile Money & carte</p>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment-ca-marche" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Comment ça marche</h2>
            <p className="mt-3 text-muted-foreground">Quatre étapes, quelques minutes, un cadeau inoubliable.</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="relative overflow-hidden p-6">
                <span className="font-heading text-4xl font-semibold text-primary/15">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <step.icon className="mt-2 h-6 w-6 text-primary" />
                <h3 className="mt-3 font-heading text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Occasions */}
        <section id="occasions" className="bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Pour chaque occasion qui compte</h2>
              <p className="mt-3 text-muted-foreground">
                Anniversaires, mariages, naissances, hommages, Gospel... et bien d&apos;autres.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {occasions.map((occasion) => (
                <Link
                  key={occasion.id}
                  href={`/creer?occasion=${occasion.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <OccasionIcon name={occasion.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">{occasion.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Styles musicaux */}
        <section id="styles" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Des styles qui vous ressemblent</h2>
            <p className="mt-3 text-muted-foreground">
              De l&apos;Afrobeat au Coupé-Décalé, du Gospel à l&apos;acoustique intime.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {styles.map((style) => (
              <Card key={style.id} className="p-5">
                <h3 className="font-heading text-base font-semibold">{style.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{style.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Ce que vous pouvez créer */}
        <section className="bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Ce que vous pouvez offrir</h2>
              <p className="mt-3 text-muted-foreground">Trois formules simples, un cadeau qui reste.</p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                { name: "Basic", price: "500 FCFA", items: ["Paroles sur mesure", "Chanson complète", "Fichier MP3", "Partage direct"] },
                { name: "Premium", price: "1 000 FCFA", items: ["Tout Basic", "Vidéo avec photo", "Page cadeau personnalisée", "Paroles animées"], featured: true },
                { name: "VIP", price: "2 500 FCFA", items: ["Tout Premium", "Personnalisation avancée", "Vidéo premium", "Régénération incluse"] },
              ].map((tier) => (
                <Card
                  key={tier.name}
                  className={`p-6 ${tier.featured ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary" : ""}`}
                >
                  {tier.featured && (
                    <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Le plus populaire
                    </span>
                  )}
                  <h3 className="font-heading text-xl font-semibold">{tier.name}</h3>
                  <p className="mt-1 font-heading text-3xl font-semibold text-primary">{tier.price}</p>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {tier.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full rounded-full" variant={tier.featured ? "default" : "outline"}>
                    <Link href="/creer">Choisir {tier.name}</Link>
                  </Button>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Tarifs indicatifs en FCFA — ajustables selon votre pays.
            </p>
          </div>
        </section>

        {/* Partage */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Share2 className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">Un cadeau qui se partage</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Chaque création peut devenir une page cadeau unique — photo, message, lecteur audio —
            à envoyer directement sur WhatsApp à la personne que vous célébrez.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-secondary/40 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-semibold sm:text-4xl">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="mt-10">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q}>
                  <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <h2 className="text-balance font-heading text-3xl font-semibold sm:text-5xl">
            Votre histoire mérite <span className="italic text-primary">sa chanson</span>.
          </h2>
          <div className="mt-8">
            <Button asChild size="lg" className="rounded-full px-10 text-base shadow-lg shadow-primary/20">
              <Link href="/creer">
                Créer ma chanson maintenant <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

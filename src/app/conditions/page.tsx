import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function ConditionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <h1 className="font-heading text-3xl font-semibold">Conditions d&apos;utilisation</h1>
          <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : septembre 2026.</p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
            <section>
              <h2 className="font-heading text-lg font-semibold">Le service</h2>
              <p className="mt-2">
                Chante-Moi transforme une histoire que vous nous confiez en chanson personnalisée, générée par
                intelligence artificielle. Vous restez responsable de l&apos;exactitude et de la légalité du
                contenu que vous fournissez (histoire, noms, photos).
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Tarifs et paiement</h2>
              <p className="mt-2">
                Les tarifs affichés au moment de la commande sont ceux applicables. Le paiement est confirmé
                par notre prestataire de paiement avant le déclenchement de toute génération payante.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Remboursement</h2>
              <p className="mt-2">
                Si la génération de votre chanson échoue définitivement après paiement, le crédit correspondant
                vous est automatiquement recrédité. En dehors de ce cas, les créations livrées ne sont pas
                remboursables dès lors que la chanson a été générée avec succès.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Propriété et usage des créations</h2>
              <p className="mt-2">
                Vous pouvez télécharger, écouter et partager les chansons que vous créez. Les droits d&apos;usage
                commercial dépendent des conditions du moteur de génération musicale utilisé — nous vous
                informerons si une restriction s&apos;applique.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Contenu interdit</h2>
              <p className="mt-2">
                Vous ne pouvez pas utiliser Chante-Moi pour créer du contenu diffamatoire, haineux, ou qui
                usurpe l&apos;identité d&apos;un tiers sans son consentement. Nous nous réservons le droit de
                refuser ou de supprimer toute création qui enfreint ces règles.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Disponibilité</h2>
              <p className="mt-2">
                Chante-Moi s&apos;appuie sur des fournisseurs tiers (IA, génération musicale, paiement). Une
                interruption ponctuelle d&apos;un de ces services peut retarder une création — nous mettons tout
                en œuvre pour limiter cet impact.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Modification des conditions</h2>
              <p className="mt-2">
                Ces conditions peuvent évoluer ; la version en vigueur est celle publiée sur cette page.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

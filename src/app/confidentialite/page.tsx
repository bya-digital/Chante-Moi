import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = { title: "Confidentialité" };

export default function ConfidentialitePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <h1 className="font-heading text-3xl font-semibold">Politique de confidentialité</h1>
          <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : septembre 2026.</p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
            <section>
              <h2 className="font-heading text-lg font-semibold">Données que nous collectons</h2>
              <p className="mt-2">
                Compte : email, mot de passe (chiffré), nom si renseigné. Création : l&apos;histoire que vous
                racontez (texte ou enregistrement vocal), vos choix (occasion, émotion, style, voix), les
                paroles générées, la chanson produite. Paiement : nous ne stockons jamais vos coordonnées
                bancaires — elles sont traitées directement par notre prestataire de paiement.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Enregistrements vocaux</h2>
              <p className="mt-2">
                Si vous utilisez le mode &laquo; Parler &raquo;, votre enregistrement est envoyé à un service de
                transcription pour être converti en texte, puis nettoyé par une IA. Il n&apos;est pas utilisé pour
                entraîner des modèles tiers au-delà de cette transcription et reste lié à votre compte.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Utilisation des données</h2>
              <p className="mt-2">
                Vos informations servent à générer votre chanson, gérer votre compte et vos commandes, vous
                envoyer les notifications liées à votre création (paiement, chanson prête), et améliorer le
                service. Nous ne vendons jamais vos données.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Partage avec des tiers</h2>
              <p className="mt-2">
                Certaines données transitent par nos prestataires techniques (génération IA, moteur musical,
                paiement, hébergement) uniquement pour fournir le service — jamais à des fins publicitaires.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Vos droits</h2>
              <p className="mt-2">
                Vous pouvez à tout moment demander l&apos;accès, la correction ou la suppression de vos données et
                de vos créations en nous contactant. La suppression d&apos;un compte entraîne la suppression des
                chansons et fichiers associés, sauf obligation légale de conservation.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Cookies</h2>
              <p className="mt-2">
                Nous utilisons uniquement des cookies nécessaires au fonctionnement du service (session,
                authentification) — aucun cookie publicitaire tiers.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold">Contact</h2>
              <p className="mt-2">
                Pour toute question sur vos données, contactez-nous via les canaux indiqués sur le site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

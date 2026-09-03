import Link from "next/link";
import { Music2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-heading text-lg font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Music2 className="h-3.5 w-3.5" />
              </span>
              MeloKado
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Tu racontes. Nous chantons.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Occasions</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/chanson/anniversaire" className="hover:text-foreground">Chanson anniversaire</Link></li>
              <li><Link href="/chanson/mariage" className="hover:text-foreground">Chanson mariage</Link></li>
              <li><Link href="/chanson/amour" className="hover:text-foreground">Chanson d&apos;amour</Link></li>
              <li><Link href="/chanson/gospel" className="hover:text-foreground">Chanson Gospel</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Produit</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/creer" className="hover:text-foreground">Créer ma chanson</Link></li>
              <li><Link href="/mes-creations" className="hover:text-foreground">Mes créations</Link></li>
              <li><Link href="/parrainage" className="hover:text-foreground">Parrainage</Link></li>
              <li><Link href="/#faq" className="hover:text-foreground">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Légal</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/confidentialite" className="hover:text-foreground">Confidentialité</Link></li>
              <li><Link href="/conditions" className="hover:text-foreground">Conditions d&apos;utilisation</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} MeloKado. Fait avec ❤️ pour l&apos;Afrique francophone.
        </div>
      </div>
    </footer>
  );
}

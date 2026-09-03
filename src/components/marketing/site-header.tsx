import Link from "next/link";
import { Music2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle();
    isAdmin = Boolean(data);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Music2 className="h-4 w-4" />
          </span>
          Chante-Moi
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#comment-ca-marche" className="transition-colors hover:text-foreground">
            Comment ça marche
          </Link>
          <Link href="/#occasions" className="transition-colors hover:text-foreground">
            Occasions
          </Link>
          <Link href="/#styles" className="transition-colors hover:text-foreground">
            Styles musicaux
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
          {user ? (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/mes-creations">Mes créations</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/connexion">Connexion</Link>
            </Button>
          )}
          <Button asChild size="sm" className="rounded-full px-5">
            <Link href="/creer">Créer ma chanson</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

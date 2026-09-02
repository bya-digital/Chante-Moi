import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense>
          <AuthForm mode="connexion" />
        </Suspense>
      </main>
    </>
  );
}

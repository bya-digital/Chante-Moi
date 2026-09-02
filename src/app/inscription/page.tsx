import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Inscription" };

export default function InscriptionPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense>
          <AuthForm mode="inscription" />
        </Suspense>
      </main>
    </>
  );
}

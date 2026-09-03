import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe" };

export default function ReinitialiserMotDePassePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ResetPasswordForm />
      </main>
    </>
  );
}

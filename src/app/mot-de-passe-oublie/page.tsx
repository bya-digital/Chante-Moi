import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOubliePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ForgotPasswordForm />
      </main>
    </>
  );
}

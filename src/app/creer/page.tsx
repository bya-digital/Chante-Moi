import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { CreationWizard } from "@/components/creation/creation-wizard";
import { getCountries, getEmotions, getMusicStyles, getOccasions, getVoices } from "@/lib/data/reference";

export const metadata: Metadata = {
  title: "Créer ma chanson",
};

export default async function CreerPage() {
  const [occasions, emotions, musicStyles, voices, countries] = await Promise.all([
    getOccasions(),
    getEmotions(),
    getMusicStyles(),
    getVoices(),
    getCountries(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-secondary/20">
        <Suspense>
          <CreationWizard
            occasions={occasions}
            emotions={emotions}
            musicStyles={musicStyles}
            voices={voices}
            countries={countries}
          />
        </Suspense>
      </main>
    </>
  );
}

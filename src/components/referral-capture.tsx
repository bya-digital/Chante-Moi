"use client";

import { useEffect } from "react";

/**
 * Capture un ?ref=CODE présent sur n'importe quelle page (lien de parrainage partagé, section 33)
 * et le garde en localStorage jusqu'à l'inscription — pas besoin d'un hook réactif, une lecture
 * ponctuelle de l'URL au montage suffit.
 */
export function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      try {
        localStorage.setItem("chantemoi_ref", ref);
      } catch {
        // stockage indisponible (navigation privée) — le parrainage ne sera simplement pas attribué
      }
    }
  }, []);

  return null;
}

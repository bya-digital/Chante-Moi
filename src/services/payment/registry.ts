import "server-only";
import { CinetPayProvider } from "./providers/cinetpay";
import { StripeProvider } from "./providers/stripe";
import { PaystackProvider } from "./providers/paystack";
import { FlutterwaveProvider } from "./providers/flutterwave";
import { UnverifiedPaymentProvider, type PaymentProvider } from "./types";

/**
 * Registre central de tous les providers de paiement connus. Un provider "non vérifié" reste
 * ici pour que l'architecture (routage, admin, kill switch) le voie exister, mais il refusera
 * toute opération réelle tant qu'il n'a pas reçu une implémentation validée contre sa doc à
 * jour — voir src/services/payment/providers/README.md.
 */
export function getAllPaymentProviders(): PaymentProvider[] {
  return [
    new CinetPayProvider(),
    new StripeProvider(),
    new PaystackProvider(),
    new FlutterwaveProvider(),
    new UnverifiedPaymentProvider("paydunya", "PayDunya", ["CI", "SN", "BJ", "TG", "BF", "ML"], [
      "orange_money",
      "mtn_momo",
      "moov_money",
      "card",
    ], ["PAYDUNYA_MASTER_KEY"]),
    new UnverifiedPaymentProvider("kkiapay", "Kkiapay", ["BJ", "CI", "TG", "SN"], [
      "orange_money",
      "mtn_momo",
      "moov_money",
      "card",
    ], ["KKIAPAY_PRIVATE_KEY"]),
    new UnverifiedPaymentProvider("ikepay", "IkePay", ["CI"], ["orange_money", "mtn_momo", "moov_money"], [
      "IKEPAY_API_KEY",
    ]),
    new UnverifiedPaymentProvider("paypal", "PayPal", ["*"], ["paypal"], ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"]),
  ];
}

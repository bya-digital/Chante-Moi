# Payment providers — statut réel

| Provider | Statut | Notes |
|---|---|---|
| CinetPay | Implémenté (à smoke-tester en sandbox) | Agrégateur prioritaire — Côte d'Ivoire + UEMOA |
| Stripe | Implémenté (à smoke-tester) | Carte bancaire internationale, utile diaspora |
| Paystack | Implémenté (à smoke-tester) | Nigeria/Ghana/Afrique australe |
| Flutterwave | Implémenté (à smoke-tester) | Webhook nécessite `FLUTTERWAVE_WEBHOOK_SECRET_HASH` |
| PayDunya | **Non implémenté** — stub `UnverifiedPaymentProvider` | Vérifier doc officielle avant intégration |
| Kkiapay | **Non implémenté** — stub | Vérifier doc officielle avant intégration |
| IkePay | **Non implémenté** — stub | Vérifier doc officielle avant intégration |
| PayPal | **Non implémenté** — stub | Vérifier doc officielle avant intégration |

Aucun de ces providers n'a été testé contre un vrai compte marchand (aucune clé API n'existe
encore pour MeloKado). Même les providers "implémentés" doivent être validés en sandbox avant
tout paiement réel — ne jamais considérer un paiement comme réussi sans passer par
`verifyPayment()` côté serveur (voir règle section 16 du cahier des charges).

Pour activer un provider "non implémenté" : écrire un nouveau fichier sur le modèle de
`cinetpay.ts`, après avoir lu sa documentation officielle à jour (endpoints, auth, webhooks).
Puis le remplacer dans `registry.ts`.

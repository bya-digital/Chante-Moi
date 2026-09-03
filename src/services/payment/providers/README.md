# Payment providers — statut réel

| Provider | Statut | Notes |
|---|---|---|
| CinetPay | Implémenté (à smoke-tester en sandbox) | Agrégateur solide pour la zone UEMOA |
| Stripe | Implémenté (à smoke-tester) | Carte bancaire internationale, utile diaspora |
| Paystack | Implémenté (à smoke-tester) | Nigeria/Ghana/Afrique australe |
| Flutterwave | Implémenté (à smoke-tester) | Webhook nécessite `FLUTTERWAVE_WEBHOOK_SECRET_HASH` |
| PayDunya | **Non implémenté** — stub `UnverifiedPaymentProvider` | Vérifier doc officielle avant intégration |
| Kkiapay | **Non implémenté** — stub | Vérifier doc officielle avant intégration |
| IkePay | **Non implémenté** — stub | Vérifier doc officielle avant intégration |
| PayPal | **Non implémenté** — stub | Vérifier doc officielle avant intégration |
| Chariow | **Non implémenté** — stub | Vérifier doc officielle avant intégration |
| Maketou | **Non implémenté** — stub | Vérifier doc officielle avant intégration |

Aucun de ces providers n'a été testé contre un vrai compte marchand (aucune clé API n'existe
encore pour Chante-Moi). Même les providers "implémentés" doivent être validés en sandbox avant
tout paiement réel — ne jamais considérer un paiement comme réussi sans passer par
`verifyPayment()` côté serveur (voir règle section 16 du cahier des charges).

## Activer un provider "non implémenté" (dès que l'approbation + l'accès API arrivent)

L'architecture est justement pensée pour que ça ne demande jamais de retoucher le reste de
l'app — orders, payments, le tunnel de création ne parlent qu'à l'interface `PaymentProvider`
(`../types.ts`), jamais à un provider concret. Pour brancher un vrai provider :

1. Copier `_TEMPLATE.ts` vers `<provider-id>.ts` (ex. `chariow.ts`).
2. Lire sa doc officielle à jour (endpoints, auth, webhooks, format des réponses) et remplir le
   modèle — c'est la seule étape qui demande du vrai code, parce que chaque agrégateur a un
   format différent ; on ne peut pas faire un adaptateur 100% générique sans risquer de mal
   interpréter un statut de paiement.
3. Dans `registry.ts`, remplacer la ligne `new UnverifiedPaymentProvider("chariow", ...)` par
   `new ChariowProvider()`.
4. Ajouter la vraie clé dans `.env.local` — jamais commitée, jamais collée dans le chat.
5. Smoke-tester en sandbox avant toute mise en production.

Ce cycle (copier le template → coller la doc → remplacer dans registry.ts → clé dans
`.env.local`) est volontairement le seul geste nécessaire — aucune autre partie du produit
(routage, admin, kill switch, webhook) n'a besoin d'être retouchée.

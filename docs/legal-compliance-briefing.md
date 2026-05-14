# DressArt — Briefing Conformité & Légal

> Document de cadrage à destination du **Délégué à la Protection des Données (DPO)** et du **conseil juridique** pour l'audit de conformité de la plateforme DressArt.
>
> **Date** : 2026-05-01
> **Version** : 1.0
> **Périmètre** : Plateforme DressArt (marketplace + dashboard pro)
> **Juridictions principales** : Bénin (APDP) — UEMOA/CEDEAO — RGPD si clients UE
> **Contact technique** : équipe développement DressArt

---

## 1. Vue d'ensemble de la plateforme

DressArt est une plateforme couture B2B2C qui orchestre 5 rôles distincts dans un même système :

| Rôle | Description | Volume données traitées |
|---|---|---|
| **Client** (marketplace) | Particulier qui passe commande sur le site public | Élevé (identité + paiement + adresse + mesures) |
| **Couturier** (pro) | Réalise les commandes | Accès aux données clients de ses commandes |
| **Agent** (pro) | Enregistre les clients en boutique, prend leurs mesures | Crée des fiches clients, saisit mesures |
| **Vendeur** (pro) | Catalogue de tissus utilisés dans les commandes | Voit les commandes utilisant ses tissus |
| **Livreur** (pro / sous-traitant) | Acheminement physique | Adresse, contact destinataire (via Tassi) |
| **Admin** | Supervision plateforme | Accès complet |

**Architecture technique** : application Next.js + base PostgreSQL Supabase + Row-Level Security par rôle + intégrations FedaPay (paiement), Resend (email), Evolution API (notifications WhatsApp), Tassi.pro (livraison).

---

## 2. Inventaire des données personnelles traitées

### 2.1 Données collectées

| Catégorie | Champs | Stockage | Sensibilité |
|---|---|---|---|
| **Identifiants** | email, téléphone, nom complet | `auth.users`, `clients` | Standard |
| **Authentification** | hash mot de passe, OTP SMS, sessions JWT | Supabase Auth | Élevée |
| **Coordonnées** | adresse postale, ville, code postal | `clients`, `orders.location` | Standard |
| **Mesures corporelles** | tour de poitrine, taille, hanches, longueur dos, longueur manche, etc. | `orders.measurements` (JSONB) | **🔴 Sensible** |
| **Données financières** | montant commandes, statut paiement, transaction_id FedaPay | `orders` | Élevée |
| **Métadonnées rôle** | rôle applicatif (admin/couturier/agent/livreur/vendeur/client) | `auth.users.app_metadata.role` | Interne |
| **Liens transactionnels** | snapshots `customer_name`, `customer_phone` sur chaque commande | `orders` | Snapshot historique |
| **Contenu produit** | photos, modèles, tissus | `modeles`, `tissus` | Œuvre / IP |
| **Téléphones normalisés** | digits-only pour réconciliation marketplace ↔ CRM | trigger SQL | Cross-référencement |
| **KYC marketplace** | docs RCCM, IFU, signature, ID représentant | côté Tassi (`/me`) | Élevée |

### 2.2 Données particulièrement sensibles

Les **mesures corporelles** (tour de poitrine, taille, hanches…) sont à considérer avec attention :

- Pas de classification explicite « données de santé » au sens strict du RGPD art. 9
- Mais **caractéristiques physiques précises** dont la divulgation peut porter atteinte à la dignité ou à la vie privée
- L'APDP Bénin (Loi 2017-20) couvre ces données via la définition large de « données à caractère personnel »
- **Recommandation** : traiter comme données sensibles → consentement explicite + traçabilité d'accès renforcée

---

## 3. Bases légales du traitement (à formaliser)

Pour chaque traitement, identifier la base légale (RGPD art. 6 / Loi 2017-20 art. 34) :

| Traitement | Base légale proposée | Justification |
|---|---|---|
| Création compte client (marketplace) | **Contrat** | Nécessaire pour commande |
| Création fiche client par agent en boutique | **Consentement explicite** ou **Intérêt légitime** | À débattre — si offline, agent doit informer le client et recueillir son accord |
| Stockage mesures corporelles | **Consentement explicite** | Sensibles, opt-in à matérialiser |
| Notifications transactionnelles (commande, livraison) | **Exécution du contrat** | Info essentielle |
| Notifications marketing WhatsApp/SMS | **Consentement opt-in** | Obligatoire CCP/RGPD |
| Réconciliation phone clients ↔ auth.users | **Intérêt légitime** | Continuité parcours mais à informer dans la politique de confidentialité |
| Partage avec Tassi (livreur) | **Exécution du contrat** + **DPA sous-traitant** | À matérialiser via DPA Tassi |
| Audit logs de connexion / accès | **Obligation légale** + **Intérêt légitime sécurité** | Traçabilité des accès aux données sensibles |
| Conservation post-livraison | **Obligation légale comptable** (10 ans factures) | À limiter aux données strictement nécessaires |

---

## 4. Risques légaux identifiés (avec localisation dans le code)

| # | Risque | Sévérité | Localisation |
|---|---|---|---|
| 1 | **Création client offline par agent sans consentement explicite** : aucune checkbox, aucune doc remise au client | 🔴 | `src/app/actions/couturier-clients.ts` (`createClient`) |
| 2 | **Réconciliation phone automatique** : trigger SQL lie `clients.user_id` à `auth.users.id` sans information de l'utilisateur | 🟠 | `supabase/migrations/20260430_phone_reconciliation.sql` |
| 3 | **Mesures corporelles** stockées en JSONB sans accès tracé | 🟠 | `orders.measurements` |
| 4 | **Aucun audit log** des accès/modifications | 🔴 | absent du schéma |
| 5 | **Snapshots persistants** : `orders.customer_name/phone/email` survivent à la suppression du client | 🟡 | RLS DELETE sur `clients` ne propage pas |
| 6 | **Pas d'UI pour droits des personnes** (accès, portabilité, effacement, opposition) | 🔴 | absent |
| 7 | **Webhook Tassi sans signature confirmée** par doc officielle | 🟡 | `src/app/api/webhooks/tassi/route.ts` (algo HMAC supposé) |
| 8 | **Transferts internationaux non documentés** : Supabase US par défaut, Resend US, Tassi/Evolution inconnus | 🟠 | `.env.local` |
| 9 | **Politique de mot de passe** : 8 caractères minimum côté UI, à durcir | 🟡 | `src/app/reset-password/page.tsx` |
| 10 | **Partage de `auth.users`** entre marketplace et dashboard sans cloisonnement strict | 🟡 | architecture |

---

## 5. Sécurité — état des lieux

### 5.1 Acquis (déjà implémenté)

| Mesure | Implémentation |
|---|---|
| **HTTPS bout-en-bout** | hébergeur (Cloudflare frontal pour Tassi) |
| **Row-Level Security PostgreSQL** | policies actives sur `clients`, `tissus`, `deliveries` (filtre par rôle + ownership) |
| **Authentification Bearer côté serveur** | clés API Tassi/FedaPay/Supabase admin jamais exposées au client |
| **HMAC-SHA256 timing-safe** | webhook Tassi (`src/app/api/webhooks/tassi/route.ts`) |
| **Secrets en variables d'environnement** | aucun secret hardcodé (validé par grep) |
| **Normalisation téléphones** | `normalizePhone(p) = p.replace(/\D/g, '')` côté DB et code |
| **Defense-in-depth webhooks** | signature vérifiée AVANT parsing JSON |
| **Anti user-enumeration** | `/forgot-password` annonce succès même si compte inconnu |
| **RBAC double couche** | gate frontend (DashboardLayout) + RLS serveur |
| **Forçage de propriété** | RLS INSERT exige `professional_id = auth.uid()` (couturier) ou `created_by_agent_id = auth.uid()` (agent) ou `vendor_id = auth.uid()` (vendeur) |
| **Rebrand cohérent** | UI, métadonnées, i18n FR/EN |

### 5.2 À ajouter pour conformité APDP/RGPD

| Mesure | Priorité | Effort |
|---|---|---|
| **Audit log table** : `audit_logs(user_id, action, resource_type, resource_id, ip, user_agent, created_at)` | 🔴 | 1 jour |
| **Middleware audit** sur lectures/modifications de données sensibles | 🔴 | 2 jours |
| **Procédure data breach** documentée (72 h notification APDP/users) | 🔴 | 0.5 jour |
| **Rate limiting** sur `/login`, `/api/webhooks/*` | 🟠 | 0.5 jour (Cloudflare ou middleware Next) |
| **Politique mots de passe** : 12 caractères + complexité | 🟡 | 0.5 jour (config Supabase Auth) |
| **Rotation périodique des clés API** : procédure et ownership | 🟡 | doc |
| **Tests d'intrusion** annuels | 🟡 | externe |
| **Chiffrement at-rest** : Supabase chiffre par défaut, mais à confirmer dans le contrat |  | confirmation |

---

## 6. Sous-traitants & transferts internationaux

Liste exhaustive (à publier dans la politique de confidentialité, art. 28 RGPD / art. 53 Loi 2017-20) :

| Sous-traitant | Rôle | Données traitées | Hébergement | Statut DPA |
|---|---|---|---|---|
| **Supabase** | Base de données + auth | Tout (BDD principale) | US par défaut, EU configurable | À vérifier la région + signer addendum DPA |
| **FedaPay** | Paiement | Données paiement, montants, transaction_id | Bénin (UEMOA) | Contrat marchand existant — vérifier clauses RGPD |
| **Tassi.pro** | Livraison logistique | Adresse + nom + phone destinataires | À confirmer (Cloudflare frontal) | Pas encore de DPA — à demander |
| **Resend** | Email transactionnel | Email + nom + contenu | US | DPA standard disponible publiquement |
| **Evolution API** | Notifications WhatsApp | Phone + contenu | À confirmer | À demander |
| **Cloudflare** (probable) | CDN / DNS | IPs visiteurs | Global | DPA standard |
| **Vercel** (si déploiement Next) | Hébergement | Logs requêtes | US | DPA disponible |

**Action immédiate** : recenser dans `.env.local` toutes les variables d'intégration → établir la liste exhaustive → demander DPA à chaque fournisseur → mécanisme de recours en cas de transfert hors UE/CEDEAO (clauses contractuelles types).

---

## 7. Documents légaux à produire

| Document | Cible | Statut | Priorité |
|---|---|---|---|
| **Politique de confidentialité** | Public (visible avant signup) | ❌ absent | 🔴 |
| **CGU** (Conditions générales d'utilisation) | Tous utilisateurs | ❌ absent | 🔴 |
| **CGV** (vente marketplace) | Clients finaux | ❌ absent | 🔴 |
| **CGV B2B couturier/vendeur/agent** | Pros sur la plateforme | ❌ absent | 🔴 |
| **Contrat sous-traitance livraison** | Tassi (DPA) | ❌ absent | 🔴 |
| **Mentions légales** (RCCM, IFU, contact DPO, hébergeur) | Footer site | ❌ absent | 🔴 |
| **Politique cookies + bannière consentement** | Public | ❌ absent | 🟠 |
| **Charte d'accès aux données** (interne) | Équipe DressArt | ❌ absent | 🟠 |
| **Registre des traitements** (art. 30 RGPD / Loi 2017-20) | Interne, exigible APDP | ❌ absent | 🔴 |
| **PIA / AIPD** (Analyse d'Impact) | Interne, recommandée vu mesures corporelles | ❌ absent | 🔴 |
| **Procédure data breach** | Interne | ❌ absent | 🔴 |
| **DPA Supabase** | Interne | ✅ disponible | À signer |
| **DPA FedaPay / Resend / Evolution / Tassi** | Interne | ❌ à demander | 🔴 |
| **Contrat de travail / mission DPO** (interne ou externalisé) | Légal Bénin | ❌ à clarifier | 🟠 |

---

## 8. Droits des personnes — à implémenter

Une page dédiée **`/me/data`** (ou équivalent) accessible à tout utilisateur authentifié, exposant ces 6 droits :

| Droit | Référence légale | Implémentation suggérée |
|---|---|---|
| **Accès** | RGPD art. 15 / Loi 2017-20 art. 39 | Bouton « Télécharger mes données » → export JSON/CSV de `auth.users` + `clients` + `orders` matchant l'utilisateur courant |
| **Rectification** | RGPD art. 16 / Loi 2017-20 art. 40 | Existe partiellement (CRM clients) — à étendre au self-service profil |
| **Effacement** | RGPD art. 17 / Loi 2017-20 art. 41 | Bouton « Supprimer mon compte » → soft-delete + anonymisation des snapshots `orders.customer_*` (`anonymized_user_<hash>`) |
| **Portabilité** | RGPD art. 20 | Format JSON ou CSV structuré téléchargeable |
| **Opposition** | RGPD art. 21 / Loi 2017-20 art. 43 | Toggle « Recevoir des communications marketing » |
| **Limitation** | RGPD art. 18 | Toggle « Pause traitement » → bloque accès couturier via flag RLS |

**Délai de réponse légal** :
- 🇪🇺 RGPD : 1 mois (extensible à 3 mois)
- 🇧🇯 Loi 2017-20 : 1 mois

**Suivi des demandes** : table dédiée `data_subject_requests(user_id, type, status, requested_at, resolved_at, resolution_notes)`.

---

## 9. Spécificités juridiques Bénin / DressArt

### 9.1 Conformité linguistique
- Tous documents légaux **en français** (Loi 2017-20)
- Si traduction EN/autre : seule la version FR fait foi

### 9.2 APDP (Autorité de Protection des Données Personnelles)
- **Déclaration préalable** ou **demande d'autorisation** selon régime applicable au traitement (à vérifier — les mesures corporelles peuvent relever du régime d'autorisation préalable)
- Désignation d'un **DPO obligatoire** dès lors qu'on traite des données sensibles à grande échelle
- **Notification incident** : 72h vers APDP + utilisateurs concernés

### 9.3 Loi sur le commerce électronique
- Affichage clair des prix TTC (FCFA + indication TVA si applicable)
- **Droit de rétractation** : couture sur mesure = **exception possible** (article 16-c RGPD pour confection sur spécifications du consommateur), mais à formaliser dans les CGV
- Conservation factures : 10 ans (obligation comptable)

### 9.4 Régulation des paiements
- **BCEAO/UEMOA** : régulation des établissements de paiement
- **FedaPay** est l'établissement agréé → DressArt agit en tant que marchand
- Règles AML/KYC : déléguées à FedaPay côté client final, mais responsabilité résiduelle DressArt sur les **paiements sortants vers couturiers/vendeurs** (à examiner)

### 9.5 Statut juridique des intervenants
- **Couturier indépendant** : statut juridique à clarifier (auto-entrepreneur ? SARL ?) — impact fiscal et social
- **Agent** : commission sur ventes → statut intermédiaire à formaliser
- **Vendeur tissus** : marchand sur marketplace → CGV B2B

---

## 10. Contrats B2B à rédiger

| Rôle | Type de contrat | Points clés à couvrir |
|---|---|---|
| **Couturier** | Contrat de partenariat / prestation | Commissions, exclusivité éventuelle, qualité, délais, propriété intellectuelle des modèles, responsabilité produit |
| **Agent** | Mandat de prospection commerciale | Commission par client/commande, **clause RGPD spécifique** (collecte mesures), confidentialité, territoire |
| **Vendeur tissus** | CGV marketplace + contrat de référencement | Stock, prix, retrait, qualité produit, livraison vers le couturier, retours |
| **Livreur** | Sous-traitance via Tassi (DPA) | Délégué à Tassi, mais DressArt reste responsable côté client final → clause de recours |

---

## 11. Plan d'action prioritisé

### 🔴 Bloquant avant ouverture publique (semaine 1-2)

1. Politique de confidentialité + CGU + CGV (FR)
2. Mentions légales (RCCM, IFU, contact DPO, hébergeur)
3. Bannière consentement cookies
4. Désignation et formalisation du DPO
5. Déclaration APDP du traitement
6. Audit log technique en place sur `clients`, `orders`, `auth`
7. Page `/me/data` (accès + effacement minimum)
8. Demander DPA aux 5+ sous-traitants
9. PIA sur traitement « mesures corporelles »
10. Procédure data breach interne (template + chaîne d'escalade)

### 🟠 Sous 30 jours après ouverture

11. Contrats B2B finalisés (couturier / agent / vendeur)
12. Rate limiting actif (login, webhooks, API publiques)
13. Politique de durée de conservation par catégorie de données
14. Mécanisme d'export portabilité automatisé
15. Clause de droit de rétractation conforme dans les CGV (incluant exception couture sur mesure)

### 🟡 Sous 90 jours

16. Tests d'intrusion / pentest externe
17. Rotation programmée des clés API
18. Formation équipe sur protection des données (RH)
19. Plan de continuité d'activité (PCA) et plan de reprise (PRA)
20. Audit de conformité externe (par cabinet spécialisé Bénin)

---

## 12. Annexes

### Annexe A — Architecture des données (résumé)

```
auth.users (Supabase Auth)
  ├─ app_metadata.role : admin | couturier | agent | livreur | vendeur | client
  ├─ phone (E.164), email, encrypted_password
  └─ liens : orders.user_id (commandes online), clients.user_id (réconciliation phone)

clients (CRM dashboard)
  ├─ professional_id → auth.users (couturier propriétaire)
  ├─ created_by_agent_id → auth.users (agent qui a saisi)
  ├─ user_id → auth.users (réconciliation marketplace, nullable)
  └─ name, phone, email, address, city, postal_code, notes, status

orders (partagée marketplace ↔ dashboard)
  ├─ user_id → auth.users (commande online, nullable)
  ├─ client_id → clients (commande offline, nullable)
  ├─ model_id → modeles (couturier implicite via modeles.professional_id)
  ├─ fabric_id → tissus (vendeur implicite via tissus.vendor_id)
  ├─ customer_name/phone/email (snapshots)
  ├─ measurements JSONB (sensible)
  ├─ status : 8 valeurs (confirmed → paid → measurements_validated → sewing → finishing → ready_for_delivery → delivered/cancelled)
  └─ payment_status, total_amount, paid_amount, transaction_id

deliveries
  ├─ order_id → orders
  ├─ driver_id → auth.users (livreur)
  ├─ customer_name/phone/address (snapshots résistant aux modifs)
  ├─ tassi_package_id, tassi_tracking_number, tassi_payload (intégration Tassi)
  └─ status : 6 valeurs

tissus
  ├─ vendor_id → auth.users (vendeur propriétaire)
  └─ nom, texture, couleur, prix_metre, stock_disponible
```

### Annexe B — Variables d'environnement (sous-traitants)

```env
# Supabase (BDD + Auth)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# FedaPay (paiement)
FEDAPAY_API_KEY
FEDAPAY_ENVIRONMENT
FEDAPAY_WEBHOOK_SECRET
FEDAPAY_CALLBACK_URL

# Evolution API (notifications WhatsApp)
EVOLUTION_API_URL
EVOLUTION_API_KEY
EVOLUTION_INSTANCE
ADMIN_WHATSAPP_PHONE

# Supabase Auth SMS (OTP séparé des notifications)
SUPABASE_SMS_HOOK_SECRET

# Resend (email)
RESEND_API_KEY
RESEND_FROM

# Tassi (livraison)
TASSI_API_URL
TASSI_API_KEY
TASSI_WEBHOOK_SECRET

# Admin
ADMIN_SECRET_KEY
NEXT_PUBLIC_SITE_URL
```

### Annexe C — Migrations SQL (état des lieux des traitements)

| Migration | Effet juridique notable |
|---|---|
| `20260429_orders_lifecycle_and_assignments.sql` | Définit le cycle de vie des commandes (8 statuts) — référentiel pour les CGV |
| `20260429_rls_clients.sql` | Cloisonnement par rôle (RLS PostgreSQL) sur les clients CRM |
| `20260429_deliveries.sql` | Création table livraisons + RLS livreur |
| `20260430_phone_reconciliation.sql` | **Trigger automatique** liant `clients.user_id` à `auth.users.id` par téléphone — à mentionner dans politique de confidentialité |
| `20260430_tissus_vendor_rls.sql` | RLS catalogue tissus (lecture partagée, écriture par vendeur uniquement) |
| `20260501_auto_delivery_on_ready.sql` | **Trigger automatique** créant une livraison à la transition d'état `ready_for_delivery` |
| `20260501_deliveries_tassi_link.sql` | Liaison technique avec sous-traitant Tassi |

### Annexe D — Liens utiles

- **APDP Bénin** : https://apdp.bj
- **Loi n°2017-20 du 20 avril 2018 portant Code du numérique** (texte officiel Bénin)
- **Acte additionnel CEDEAO A/SA.1/01/10** sur la protection des données personnelles
- **Règlement (UE) 2016/679 — RGPD** : https://eur-lex.europa.eu/eli/reg/2016/679/oj
- **CCP Loi 27/2008 (Bénin)** sur les communications électroniques

---

## 13. Validation et signatures

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Direction DressArt | _________________ | __/__/____ | _________________ |
| DPO / Conseil juridique | _________________ | __/__/____ | _________________ |
| Responsable technique | _________________ | __/__/____ | _________________ |

---

*Document généré pour briefing DPO/avocat. Mise à jour requise à chaque évolution majeure du système ou du cadre légal applicable.*

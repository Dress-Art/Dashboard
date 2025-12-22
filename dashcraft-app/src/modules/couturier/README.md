# Module Couturier

Gestion des clients pour les services de couture/retouche.

## APIs Utilisées

Le module Couturier utilise les API Supabase Functions suivantes:

### 1. Lister les clients
```
POST https://krwsuyitcdigvazltpom.supabase.co/functions/v1/pro-list-clients
```
**Body:**
```json
{
  "search": "terme de recherche (optionnel)"
}
```

**Response:**
```json
{
  "clients": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "city": "string",
      "postal_code": "string",
      "status": "active|inactive|suspended",
      "total_orders": "number",
      "total_spent": "number",
      "created_at": "ISO date",
      "last_order_at": "ISO date"
    }
  ],
  "total": "number"
}
```

### 2. Créer un client
```
POST https://krwsuyitcdigvazltpom.supabase.co/functions/v1/pro-create-client
```
**Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "phone": "string (required)",
  "address": "string (optional)",
  "city": "string (optional)",
  "postal_code": "string (optional)"
}
```

### 3. Mettre à jour un client
```
POST https://krwsuyitcdigvazltpom.supabase.co/functions/v1/pro-update-client
```
**Body:**
```json
{
  "id": "string (required)",
  "name": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "address": "string (optional)",
  "city": "string (optional)",
  "postal_code": "string (optional)",
  "status": "active|inactive|suspended (optional)"
}
```

### 4. Lire un client
```
POST https://krwsuyitcdigvazltpom.supabase.co/functions/v1/pro-get-client
```
**Body:**
```json
{
  "id": "string (required)"
}
```

## Composants

### CoutureClientsPage
Page principale pour la gestion des clients couture.
- Recherche et filtrage des clients
- Création de nouveaux clients
- Onglets par statut (Actifs, Inactifs)

### ClientsTable
Tableau affichant la liste des clients avec:
- Informations de contact (email, téléphone)
- Localisation (ville, code postal)
- Statut (Actif, Inactif, Suspendu)
- Nombre de commandes et dépenses totales
- Actions (Consulter, Modifier, Supprimer)

## Fonctionnalités

- ✅ Afficher la liste des clients
- ✅ Rechercher des clients par nom
- ✅ Créer un nouveau client
- ✅ Afficher les statuts des clients
- ⏳ Modifier un client (API connectée)
- ⏳ Supprimer un client (API connectée)
- ⏳ Consulter les détails d'un client (API connectée)

## Intégration

Le module est accessible via:
- **URL:** `/modules/couturier`
- **Sidebar:** Menu "Couturier" avec icône IdentificationIcon
- **Redux:** Gestion de la visibilité via `moduleVisibility.couturier`

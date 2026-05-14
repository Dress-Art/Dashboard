# DressArt — Intégration Evolution API v1.8.6
## Guide pour Claude Code

---

## Contexte

- **Projet** : DressArt — marketplace mode sur-mesure (Next.js 14 + TypeScript + Supabase)
- **Repo Marketplace** : `github.com/Dress-Art/Marketplace`
- **Repo Dashboard** : `github.com/Dress-Art/Dashboard`
- **Evolution API** : v1.8.6, hébergée sur Google Cloud VM `35.209.56.149:8080`
- **Instance WhatsApp** : `dressart-main` (déjà connectée, numéro `2290192465084`)
- **Architecture** : deux surfaces distinctes — la config WhatsApp client reste sur la **Marketplace**, les notifications couturier passent sur le **Dashboard** via Evolution API

---

## Variables d'environnement

### À ajouter dans Supabase (Settings → Edge Functions → Secrets)
```
EVOLUTION_API_URL=http://35.209.56.149:8080
EVOLUTION_API_KEY=dressart_secret_2026
EVOLUTION_INSTANCE=dressart-main
```

### À ajouter dans Vercel (Settings → Environment Variables) — Marketplace
```
EVOLUTION_API_URL=http://35.209.56.149:8080
EVOLUTION_API_KEY=dressart_secret_2026
EVOLUTION_INSTANCE=dressart-main
```

---

## Fichiers intégrés

```
supabase/
  functions/
    _shared/
      evolution.ts        ← client Evolution API v1
      templates.ts        ← templates messages DressArt
    notify-client/
      index.ts            ← notifications → acheteurs
    notify-couturier/
      index.ts            ← notifications → vendeurs

src/lib/
  notifications/index.ts   ← wrapper Next.js serveur (appels depuis Server Actions)
```

---

## 1. Client Evolution API v1

```typescript
// supabase/functions/_shared/evolution.ts

const BASE_URL = Deno.env.get('EVOLUTION_API_URL')!
const API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const INSTANCE = Deno.env.get('EVOLUTION_INSTANCE')!

export async function sendText(to: string, text: string) {
  const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY
    },
    body: JSON.stringify({
      number: to,
      options: {
        delay: 500,
        presence: 'composing'
      },
      textMessage: {
        text
      }
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Evolution API error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export async function sendImage(to: string, imageUrl: string, caption: string) {
  const res = await fetch(`${BASE_URL}/message/sendMedia/${INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY
    },
    body: JSON.stringify({
      number: to,
      options: { delay: 500 },
      mediaMessage: {
        mediatype: 'image',
        media: imageUrl,
        caption
      }
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Evolution API error: ${JSON.stringify(err)}`)
  }

  return res.json()
}
```

---

## 2. Templates DressArt

```typescript
// supabase/functions/_shared/templates.ts
import { sendText, sendImage } from './evolution.ts'

// ─── ACHETEUR ────────────────────────────────────────────

// Commande confirmée + paiement reçu
export async function msgOrderConfirmed(
  phone: string,
  orderId: string,
  couturierName: string
) {
  return sendText(
    phone,
    `✅ *Commande #${orderId} confirmée !*\n\n` +
    `Bonjour 👋 Votre paiement a bien été reçu.\n` +
    `Votre tenue est entre les mains de *${couturierName}*.\n\n` +
    `📱 Suivez l'avancement : dressart.studio/orders/${orderId}\n` +
    `_L'équipe DressArt_`
  )
}

// Option B — Confirmation rendez-vous agent mesures
export async function msgAgentAppointmentBooked(
  phone: string,
  orderId: string,
  appointmentDate: string,
  appointmentTime: string
) {
  return sendText(
    phone,
    `📏 *Rendez-vous de mesures confirmé*\n\n` +
    `Commande *#${orderId}*\n` +
    `📅 *${appointmentDate}* à *${appointmentTime}*\n\n` +
    `Notre agent se déplacera chez vous pour prendre vos mesures.\n` +
    `_En cas d'empêchement, contactez-nous au plus tôt._\n\n` +
    `_DressArt_`
  )
}

// Commande en cours de confection
export async function msgOrderInProgress(
  phone: string,
  orderId: string,
  couturierName: string,
  estimatedDays: number
) {
  return sendText(
    phone,
    `🪡 *Votre tenue est en confection !*\n\n` +
    `Commande *#${orderId}* — ${couturierName}\n` +
    `⏱ Délai estimé : *${estimatedDays} jours*\n\n` +
    `Nous vous prévenons dès qu'elle est prête 🎉\n` +
    `_DressArt_`
  )
}

// Commande prête à récupérer
export async function msgOrderReady(
  phone: string,
  orderId: string,
  couturierName: string
) {
  return sendText(
    phone,
    `🎉 *Votre tenue est prête !*\n\n` +
    `Commande *#${orderId}*\n` +
    `Prenez contact avec *${couturierName}* pour la récupérer.\n\n` +
    `Merci de votre confiance 🙏\n` +
    `_DressArt_`
  )
}

// ─── VENDEUR / COUTURIER ─────────────────────────────────

// Nouvelle commande reçue
export async function msgNewOrderForCouturier(
  phone: string,
  orderId: string,
  clientName: string,
  modelName: string,
  measurementMethod: 'self' | 'agent'
) {
  const measureNote =
    measurementMethod === 'agent'
      ? `📏 *Mesures : Agent programmé* — les mesures seront transmises après le RDV.`
      : `📏 *Mesures : Formulaire client* — les mesures sont disponibles dans votre espace.`

  return sendText(
    phone,
    `🛍️ *Nouvelle commande sur DressArt !*\n\n` +
    `Commande *#${orderId}*\n` +
    `Client : *${clientName}*\n` +
    `Modèle : *${modelName}*\n\n` +
    `${measureNote}\n\n` +
    `👉 Consultez le dossier : dressart.studio/vendeur/orders/${orderId}\n` +
    `_DressArt_`
  )
}

// Mesures reçues (Option A — formulaire)
export async function msgMeasuresReceived(
  phone: string,
  orderId: string,
  clientName: string
) {
  return sendText(
    phone,
    `📐 *Mesures reçues !*\n\n` +
    `*${clientName}* a soumis ses mesures pour la commande *#${orderId}*.\n\n` +
    `👉 Voir les mesures : dressart.studio/vendeur/orders/${orderId}\n` +
    `_DressArt_`
  )
}

// Mesures agent transmises (Option B — après visite)
export async function msgAgentMeasuresTransmitted(
  phone: string,
  orderId: string,
  clientName: string
) {
  return sendText(
    phone,
    `📐 *Mesures agent disponibles !*\n\n` +
    `Les mesures de *${clientName}* ont été relevées pour la commande *#${orderId}*.\n\n` +
    `👉 Démarrer la confection : dressart.studio/vendeur/orders/${orderId}\n` +
    `_DressArt_`
  )
}
```

---

## 3. Edge Function — notify-client

```typescript
// supabase/functions/notify-client/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  msgOrderConfirmed,
  msgAgentAppointmentBooked,
  msgOrderInProgress,
  msgOrderReady
} from '../_shared/templates.ts'

serve(async (req) => {
  const { event, payload } = await req.json()

  try {
    switch (event) {
      case 'order.confirmed':
        await msgOrderConfirmed(
          payload.clientPhone,
          payload.orderId,
          payload.couturierName
        )
        break

      case 'agent.appointment.booked':
        await msgAgentAppointmentBooked(
          payload.clientPhone,
          payload.orderId,
          payload.appointmentDate,
          payload.appointmentTime
        )
        break

      case 'order.in_progress':
        await msgOrderInProgress(
          payload.clientPhone,
          payload.orderId,
          payload.couturierName,
          payload.estimatedDays
        )
        break

      case 'order.ready':
        await msgOrderReady(
          payload.clientPhone,
          payload.orderId,
          payload.couturierName
        )
        break

      default:
        return new Response(`Event "${event}" non géré`, { status: 400 })
    }

    return new Response(JSON.stringify({ ok: true, event }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[notify-client]', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

---

## 4. Edge Function — notify-couturier

```typescript
// supabase/functions/notify-couturier/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  msgNewOrderForCouturier,
  msgMeasuresReceived,
  msgAgentMeasuresTransmitted
} from '../_shared/templates.ts'

serve(async (req) => {
  const { event, payload } = await req.json()

  try {
    switch (event) {
      case 'order.new':
        await msgNewOrderForCouturier(
          payload.couturierPhone,
          payload.orderId,
          payload.clientName,
          payload.modelName,
          payload.measurementMethod
        )
        break

      case 'measures.received':
        await msgMeasuresReceived(
          payload.couturierPhone,
          payload.orderId,
          payload.clientName
        )
        break

      case 'agent.measures.transmitted':
        await msgAgentMeasuresTransmitted(
          payload.couturierPhone,
          payload.orderId,
          payload.clientName
        )
        break

      default:
        return new Response(`Event "${event}" non géré`, { status: 400 })
    }

    return new Response(JSON.stringify({ ok: true, event }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[notify-couturier]', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

---

## 5. Wrapper Next.js — lib/notifications.ts

```typescript
// lib/notifications.ts
// Utilisé depuis les Server Actions / API routes existantes

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function invokeFunction(fnName: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[notifications] ${fnName} failed:`, err)
  }

  return res.json()
}

export const notify = {

  // Appeler après confirmPayment() FedaPay réussi
  orderConfirmed: (clientPhone: string, orderId: string, couturierName: string) =>
    invokeFunction('notify-client', {
      event: 'order.confirmed',
      payload: { clientPhone, orderId, couturierName }
    }),

  // Appeler après confirmation RDV agent (Option B)
  agentBooked: (clientPhone: string, orderId: string, date: string, time: string) =>
    invokeFunction('notify-client', {
      event: 'agent.appointment.booked',
      payload: { clientPhone, orderId, appointmentDate: date, appointmentTime: time }
    }),

  // Appeler quand le couturier démarre la confection
  orderInProgress: (clientPhone: string, orderId: string, couturierName: string, days: number) =>
    invokeFunction('notify-client', {
      event: 'order.in_progress',
      payload: { clientPhone, orderId, couturierName, estimatedDays: days }
    }),

  // Appeler quand le couturier marque la commande prête
  orderReady: (clientPhone: string, orderId: string, couturierName: string) =>
    invokeFunction('notify-client', {
      event: 'order.ready',
      payload: { clientPhone, orderId, couturierName }
    }),

  // Appeler après création commande + paiement FedaPay validé
  newOrderToCouturier: (
    couturierPhone: string,
    orderId: string,
    clientName: string,
    modelName: string,
    measurementMethod: 'self' | 'agent'
  ) =>
    invokeFunction('notify-couturier', {
      event: 'order.new',
      payload: { couturierPhone, orderId, clientName, modelName, measurementMethod }
    }),

  // Appeler après soumission formulaire mesures (Option A)
  measuresReceived: (couturierPhone: string, orderId: string, clientName: string) =>
    invokeFunction('notify-couturier', {
      event: 'measures.received',
      payload: { couturierPhone, orderId, clientName }
    }),

  // Appeler après visite agent + saisie mesures (Option B)
  agentMeasuresTransmitted: (couturierPhone: string, orderId: string, clientName: string) =>
    invokeFunction('notify-couturier', {
      event: 'agent.measures.transmitted',
      payload: { couturierPhone, orderId, clientName }
    }),
}
```

---

## 6. Points d'intégration dans le code existant

Brancher les appels `notify.xxx()` aux endroits suivants **sans modifier la logique métier** :

| Événement | Fichier probable | Appel |
|---|---|---|
| Paiement FedaPay confirmé | `app/orders/confirm/` ou action paiement | `notify.orderConfirmed()` + `notify.newOrderToCouturier()` |
| Soumission formulaire mesures (Option A) | `app/orders/[id]/measurements/` | `notify.measuresReceived()` |
| Confirmation RDV agent (Option B) | `app/orders/[id]/agent/` | `notify.agentBooked()` |
| Couturier démarre confection | Dashboard vendeur | `notify.orderInProgress()` |
| Couturier marque commande prête | Dashboard vendeur | `notify.orderReady()` |
| Agent saisit mesures (Option B) | Dashboard vendeur / agent | `notify.agentMeasuresTransmitted()` |

---

## 7. Déploiement Edge Functions

```bash
supabase functions deploy notify-client --no-verify-jwt
supabase functions deploy notify-couturier --no-verify-jwt
```

---

## 8. Test rapide après déploiement

```bash
curl -X POST https://TON_PROJECT.supabase.co/functions/v1/notify-client \
  -H "Authorization: Bearer TON_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.confirmed",
    "payload": {
      "clientPhone": "22961XXXXXX",
      "orderId": "CMD-2026-0001",
      "couturierName": "Modiste Cotonou"
    }
  }'
```

---

## Notes importantes

- **Format numéro** : sans `+`, sans espaces. Ex: `22961XXXXXX` (Bénin)
- **order_number** : récupéré via `.select('order_number').single()` après insert dans `orders`
- **Surface Marketplace** : garde la logique client existante, y compris l'OTP Supabase si elle reste configurée
- **Surface Dashboard** : gère les notifications couturier via Evolution API
- **Evolution API** tourne en continu sur la VM Google Cloud — ne pas éteindre la VM
- **Evolution API** remplace MsgFlash pour les notifications du Dashboard

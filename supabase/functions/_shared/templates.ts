import {sendText, sendImage} from './evolution.ts'

export async function msgOrderConfirmed(
  phone: string,
  orderId: string,
  couturierName: string,
) {
  return sendText(
    phone,
    `✅ *Commande #${orderId} confirmée !*\n\n` +
      `Bonjour 👋 Votre paiement a bien été reçu.\n` +
      `Votre tenue est entre les mains de *${couturierName}*.\n\n` +
      `📱 Suivez l'avancement : dressart.studio/orders/${orderId}\n` +
      `_L'équipe DressArt_`,
  )
}

export async function msgAgentAppointmentBooked(
  phone: string,
  orderId: string,
  appointmentDate: string,
  appointmentTime: string,
) {
  return sendText(
    phone,
    `📏 *Rendez-vous de mesures confirmé*\n\n` +
      `Commande *#${orderId}*\n` +
      `📅 *${appointmentDate}* à *${appointmentTime}*\n\n` +
      `Notre agent se déplacera chez vous pour prendre vos mesures.\n` +
      `_En cas d'empêchement, contactez-nous au plus tôt._\n\n` +
      `_DressArt_`,
  )
}

export async function msgOrderInProgress(
  phone: string,
  orderId: string,
  couturierName: string,
  estimatedDays: number,
) {
  return sendText(
    phone,
    `🪡 *Votre tenue est en confection !*\n\n` +
      `Commande *#${orderId}* — ${couturierName}\n` +
      `⏱ Délai estimé : *${estimatedDays} jours*\n\n` +
      `Nous vous prévenons dès qu'elle est prête 🎉\n` +
      `_DressArt_`,
  )
}

export async function msgOrderReady(
  phone: string,
  orderId: string,
  couturierName: string,
) {
  return sendText(
    phone,
    `🎉 *Votre tenue est prête !*\n\n` +
      `Commande *#${orderId}*\n` +
      `Prenez contact avec *${couturierName}* pour la récupérer.\n\n` +
      `Merci de votre confiance 🙏\n` +
      `_DressArt_`,
  )
}

export async function msgNewOrderForCouturier(
  phone: string,
  orderId: string,
  clientName: string,
  modelName: string,
  measurementMethod: 'self' | 'agent',
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
      `_DressArt_`,
  )
}

export async function msgMeasuresReceived(
  phone: string,
  orderId: string,
  clientName: string,
) {
  return sendText(
    phone,
    `📐 *Mesures reçues !*\n\n` +
      `*${clientName}* a soumis ses mesures pour la commande *#${orderId}*.\n\n` +
      `👉 Voir les mesures : dressart.studio/vendeur/orders/${orderId}\n` +
      `_DressArt_`,
  )
}

export async function msgAgentMeasuresTransmitted(
  phone: string,
  orderId: string,
  clientName: string,
) {
  return sendText(
    phone,
    `📐 *Mesures agent disponibles !*\n\n` +
      `Les mesures de *${clientName}* ont été relevées pour la commande *#${orderId}*.\n\n` +
      `👉 Démarrer la confection : dressart.studio/vendeur/orders/${orderId}\n` +
      `_DressArt_`,
  )
}

export async function msgCouturierReminder(
  phone: string,
  orderNumber: string,
  couturierName: string | null | undefined,
  modelName: string,
  statusLabel: string,
) {
  return sendText(
    phone,
    [
      `DressArt: rappel pour la commande ${orderNumber}.`,
      couturierName ? `Bonjour ${couturierName},` : null,
      `Modèle: ${modelName}`,
      `Statut actuel: ${statusLabel}`,
      'Merci de faire le point sur l’avancement.',
    ]
      .filter(Boolean)
      .join('\n'),
  )
}

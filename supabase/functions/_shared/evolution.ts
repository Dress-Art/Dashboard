const BASE_URL = Deno.env.get('EVOLUTION_API_URL')!
const API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const INSTANCE = Deno.env.get('EVOLUTION_INSTANCE')!

function normalizePhone(phone: string, countryCode = '229'): string {
    let digits = phone.replace(/[^\d]/g, '')
    if (digits.startsWith('00')) digits = digits.slice(2)
    if (digits.startsWith('0')) digits = countryCode + digits.slice(1)
    if (!digits.startsWith(countryCode) && digits.length <= 10) {
        digits = countryCode + digits
    }
    return digits
}

export async function sendText(to: string, text: string) {
    const number = normalizePhone(to)
  const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      number,
      options: {
        delay: 500,
        presence: 'composing',
      },
      textMessage: {
        text,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution API error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export async function sendImage(to: string, imageUrl: string, caption: string) {
  const res = await fetch(`${BASE_URL}/message/sendMedia/${INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      number: to,
      options: {delay: 500},
      mediaMessage: {
        mediatype: 'image',
        media: imageUrl,
        caption,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution API error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

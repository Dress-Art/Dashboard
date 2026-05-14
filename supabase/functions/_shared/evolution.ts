const BASE_URL = Deno.env.get('EVOLUTION_API_URL')!
const API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const INSTANCE = Deno.env.get('EVOLUTION_INSTANCE')!

export async function sendText(to: string, text: string) {
  const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      number: to,
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

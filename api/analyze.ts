import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-2.5-flash'

interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

// Vercel Serverless Function (Node.js runtime)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { type, prompt, systemContext, messages } = req.body ?? {}

  const genAI = new GoogleGenerativeAI(apiKey)

  try {
    // ── 一括分析（AiSummary用） ──────────────────────────
    if (type === 'analyze') {
      if (!prompt) return res.status(400).json({ error: 'prompt required' })
      const model = genAI.getGenerativeModel({ model: MODEL })
      const result = await model.generateContent(prompt as string)
      return res.json({ text: result.response.text() })
    }

    // ── チャット（AiChat用） ─────────────────────────────
    if (type === 'chat') {
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages required' })
      }
      const chatMessages = messages as ChatMessage[]
      const lastMessage = chatMessages[chatMessages.length - 1]

      const model = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: systemContext ?? '',
      })

      // 直前までの履歴をセット
      const history = chatMessages.slice(0, -1).map((m: ChatMessage) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }))

      const chat = model.startChat({ history })
      const result = await chat.sendMessage(lastMessage.text)
      return res.json({ text: result.response.text() })
    }

    return res.status(400).json({ error: 'type must be analyze or chat' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
}

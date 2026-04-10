import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText, streamText } from 'ai'

export const runtime = 'nodejs'

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'default-user'

async function ensureDefaultUser() {
  const user = await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: { id: DEFAULT_USER_ID, name: 'ユーザー' },
  })
  return user
}

const app = new Hono().basePath('/api')

// GET /api/conversations
app.get('/conversations', async (c) => {
  await ensureDefaultUser()
  const conversations = await prisma.conversation.findMany({
    where: { userId: DEFAULT_USER_ID },
    include: { company: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  })
  return c.json(conversations)
})

// POST /api/conversations
app.post('/conversations', async (c) => {
  await ensureDefaultUser()
  const body = await c.req.json()
  const { title, companyId } = body
  const conversation = await prisma.conversation.create({
    data: {
      title: title || '新しい会話',
      userId: DEFAULT_USER_ID,
      companyId: companyId || null,
    },
    include: { company: true },
  })
  return c.json(conversation, 201)
})

// GET /api/conversations/:id/messages
app.get('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id')
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(messages)
})

// POST /api/chat
app.post('/chat', async (c) => {
  await ensureDefaultUser()
  const body = await c.req.json()
  const { conversationId, message, documentContext } = body

  if (!conversationId || !message) {
    return c.json({ error: 'conversationId and message are required' }, 400)
  }

  // Save user message
  await prisma.message.create({
    data: {
      role: 'user',
      content: message,
      conversationId,
    },
  })

  // Build conversation history
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  })

  const systemPrompt = `あなたは新卒VCのための財務・企業分析の学習コーチです。

## あなたの役割
- ユーザーが企業の決算書・株主説明会資料を分析できるよう指導する
- 簿記2級レベルの知識を前提に、より深い企業分析の視点を教える
- 質問への回答後、必ず関連する深堀り質問を1〜2問提示する

## 学習スタイル
- 回答は分かりやすく、具体的な数字や事例を用いる
- 単なる説明に留まらず、「なぜそれが重要か」「VCとしてどう判断するか」の視点を加える

## 深堀り質問のルール
回答の最後に必ず以下の形式で深堀り質問を提示する:

---
**次に考えてみましょう:**
1. [深堀り質問1]
2. [深堀り質問2（任意）]

${documentContext ? `\n## アップロードされた資料の内容\n${documentContext}` : ''}`

  const messages = history.slice(0, -1).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  messages.push({ role: 'user', content: message })

  const result = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages,
  })

  const assistantContent = result.text

  // Save assistant message
  const assistantMessage = await prisma.message.create({
    data: {
      role: 'assistant',
      content: assistantContent,
      conversationId,
    },
  })

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  return c.json({ message: assistantMessage })
})

// GET /api/companies
app.get('/companies', async (c) => {
  await ensureDefaultUser()
  const companies = await prisma.company.findMany({
    where: { userId: DEFAULT_USER_ID },
    include: { documents: true, _count: { select: { conversations: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  return c.json(companies)
})

// POST /api/companies
app.post('/companies', async (c) => {
  await ensureDefaultUser()
  const body = await c.req.json()
  const { name, ticker, industry, notes } = body
  const company = await prisma.company.create({
    data: {
      name,
      ticker: ticker || null,
      industry: industry || null,
      notes: notes || null,
      userId: DEFAULT_USER_ID,
    },
  })
  return c.json(company, 201)
})

// POST /api/analyze-company
app.post('/analyze-company', async (c) => {
  await ensureDefaultUser()
  const body = await c.req.json()
  const { companyId, documentContent, question } = body

  if (!companyId) {
    return c.json({ error: 'companyId is required' }, 400)
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) {
    return c.json({ error: 'Company not found' }, 404)
  }

  const prompt = question || `${company.name}の財務状況を分析してください。`

  const result = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: `あなたは新卒VCのための企業分析コーチです。提供された資料をもとに、具体的で学習になる分析と深堀り質問を提供してください。`,
    messages: [
      {
        role: 'user',
        content: documentContent
          ? `以下の資料を分析してください:\n\n${documentContent}\n\n質問: ${prompt}`
          : prompt,
      },
    ],
  })

  return c.json({ analysis: result.text })
})

// POST /api/documents
app.post('/documents', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const companyId = formData.get('companyId') as string

  if (!file || !companyId) {
    return c.json({ error: 'file and companyId are required' }, 400)
  }

  const content = await file.text()

  const document = await prisma.document.create({
    data: {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      content: content.substring(0, 50000),
      companyId,
    },
  })

  return c.json(document, 201)
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)

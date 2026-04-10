import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText, streamText } from 'ai'
import Anthropic from '@anthropic-ai/sdk'
import YahooFinanceLib from 'yahoo-finance2'

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const yahooFinance = new (YahooFinanceLib as any)({ suppressNotices: ['yahooSurvey'] })

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

// DELETE /api/companies/:id
app.delete('/companies/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.message.deleteMany({ where: { conversation: { companyId: id } } })
  await prisma.conversation.deleteMany({ where: { companyId: id } })
  await prisma.document.deleteMany({ where: { companyId: id } })
  await prisma.company.delete({ where: { id } })
  return c.json({ success: true })
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

const FINANCIAL_EXTRACT_PROMPT = `あなたは財務分析の専門家です。アップロードされた有価証券報告書から財務データを抽出し、以下のJSON形式で返してください。

## 重要なルール
- 最大5期分のデータを古い順に並べて含めてください（例：2021年3月期〜2025年3月期）
- 金額はすべて「百万円」単位に変換して数値のみ（カンマなし）で返してください
  - 報告書が「千円」単位の場合 → 1000で割って百万円に変換（例：31,855,320千円 → 31,855百万円）
  - 報告書が「百万円」単位の場合 → そのまま使用
  - 報告書が「億円」単位の場合 → 100を掛けて百万円に変換
- データが見つからない場合はnullにしてください
- %（パーセント）の値はそのまま数値で（例：19.5）

{
  "companyName": "会社名",
  "unit": "千円または百万円（報告書の元の単位を記載）",
  "fiscalYears": ["2021年7月期", "2022年7月期", "2023年7月期", "2024年7月期", "2025年7月期"],
  "pl": {
    "revenue": [売上高の配列],
    "grossProfit": [売上総利益の配列],
    "operatingIncome": [営業利益の配列],
    "ordinaryIncome": [経常利益の配列],
    "netIncome": [当期純利益の配列],
    "grossMargin": [売上総利益率%の配列],
    "operatingMargin": [営業利益率%の配列],
    "netMargin": [当期純利益率%の配列]
  },
  "bs": {
    "totalAssets": [総資産の配列],
    "currentAssets": [流動資産の配列],
    "fixedAssets": [固定資産の配列],
    "currentLiabilities": [流動負債の配列],
    "fixedLiabilities": [固定負債の配列],
    "netAssets": [純資産の配列],
    "equityRatio": [自己資本比率%の配列]
  },
  "cf": {
    "operatingCF": [営業CFの配列],
    "investingCF": [投資CFの配列],
    "financingCF": [財務CFの配列],
    "freeCF": [フリーCFの配列（営業CF+投資CF）]
  },
  "metrics": {
    "roe": [ROE%の配列],
    "roa": [ROA%の配列],
    "currentRatio": [流動比率%の配列],
    "debtEquityRatio": [D/Eレシオの配列],
    "eps": [EPS円の配列]
  }
}

JSONのみ返答してください。\`\`\`json などの記号は不要です。`

// POST /api/documents
app.post('/documents', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const companyId = formData.get('companyId') as string

  if (!file || !companyId) {
    return c.json({ error: 'file and companyId are required' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // PDF テキスト抽出
  let content = ''
  try {
    if (file.type === 'application/pdf') {
      const pdfParse = require('pdf-parse')
      const parsed = await pdfParse(buffer)
      content = parsed.text
    } else {
      content = await file.text()
    }
  } catch (e) {
    console.error('[PDF extract error]', e)
    // 抽出失敗でも続行（ドキュメント自体は保存する）
  }

  const nonWhitespace = content.replace(/\s/g, '').length
  console.log(`[PDF] extracted ${content.length} chars, non-whitespace: ${nonWhitespace}`)

  const truncatedContent = content.substring(0, 80000)

  // 財務データ抽出（Claude Files API経由でPDFをネイティブ読み込み）
  let financialData: string | null = null
  try {
    console.log('[Claude] uploading PDF to Files API...')
    // Files API にアップロード
    const uploadedFile = await anthropicClient.beta.files.upload({
      file: new File([buffer], file.name, { type: 'application/pdf' }),
    })
    console.log('[Claude] file uploaded, id:', uploadedFile.id)

    // メッセージでファイルを参照（Files API beta）
    const response = await (anthropicClient.beta.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: FINANCIAL_EXTRACT_PROMPT,
      betas: ['files-api-2025-04-14'],
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'file', file_id: uploadedFile.id },
          },
          {
            type: 'text',
            text: '上記PDFから財務データを抽出してください。',
          },
        ],
      }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('[Claude] response length:', rawText.length)
    console.log('[Claude] response preview:', rawText.substring(0, 300))

    // ```json ... ``` ブロックを除去
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    JSON.parse(cleaned)
    financialData = cleaned
    console.log('[Claude] financial data extracted successfully')

    // アップロードしたファイルを削除（不要になったら）
    await anthropicClient.beta.files.delete(uploadedFile.id).catch(() => {})
  } catch (e) {
    console.error('[Claude extract error]', e)
    financialData = null
  }

  const document = await prisma.document.create({
    data: {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      content: truncatedContent,
      financialData,
      companyId,
    },
  })

  return c.json({ ...document, hasFinancialData: !!financialData }, 201)
})

// GET /api/documents/:id/financials
app.get('/documents/:id/financials', async (c) => {
  const id = c.req.param('id')
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return c.json({ error: 'Not found' }, 404)
  if (!doc.financialData) return c.json({ error: 'No financial data' }, 404)
  return c.json(JSON.parse(doc.financialData))
})

// GET /api/stock/:ticker
app.get('/stock/:ticker', async (c) => {
  const ticker = c.req.param('ticker')
  // 数字のみ（日本株）の場合は .T を付与
  const symbol = /^\d+$/.test(ticker) ? `${ticker}.T` : ticker
  try {
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, { modules: ['assetProfile'] }).catch(() => null),
    ])
    const profile = (summary as any)?.assetProfile
    return c.json({
      symbol: quote.symbol,
      longName: quote.longName,
      shortName: quote.shortName,
      currency: quote.currency,
      marketState: quote.marketState,
      exchangeTimezoneName: quote.exchangeTimezoneName,
      // 現在値
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketChange: quote.regularMarketChange,
      regularMarketChangePercent: quote.regularMarketChangePercent,
      regularMarketPreviousClose: quote.regularMarketPreviousClose,
      regularMarketOpen: quote.regularMarketOpen,
      regularMarketDayHigh: quote.regularMarketDayHigh,
      regularMarketDayLow: quote.regularMarketDayLow,
      regularMarketVolume: quote.regularMarketVolume,
      averageDailyVolume3Month: quote.averageDailyVolume3Month,
      bid: quote.bid,
      ask: quote.ask,
      // 時価・規模
      marketCap: quote.marketCap,
      sharesOutstanding: quote.sharesOutstanding,
      // バリュエーション
      trailingPE: quote.trailingPE,
      forwardPE: quote.forwardPE,
      priceToBook: quote.priceToBook,
      epsTrailingTwelveMonths: quote.epsTrailingTwelveMonths,
      epsForward: quote.epsForward,
      bookValue: quote.bookValue,
      // 配当
      trailingAnnualDividendRate: quote.trailingAnnualDividendRate,
      trailingAnnualDividendYield: quote.trailingAnnualDividendYield,
      // 移動平均
      fiftyDayAverage: quote.fiftyDayAverage,
      twoHundredDayAverage: quote.twoHundredDayAverage,
      // 52週
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      fiftyTwoWeekChangePercent: quote.fiftyTwoWeekChangePercent,
      // 企業プロフィール
      industry: profile?.industry ?? null,
      sector: profile?.sector ?? null,
      website: profile?.website ?? null,
      fullTimeEmployees: profile?.fullTimeEmployees ?? null,
      ...await (async () => {
        const isJapanese = symbol.endsWith('.T')
        if (!isJapanese) return {}
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=ja&region=JP&quotesCount=1`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          )
          const json = await res.json() as any
          const hit = json?.quotes?.[0]
          if (!hit) return {}
          return {
            jaName: hit.longname || hit.shortname || null,
            jaSector: hit.sectorDisp || hit.sector || null,
            jaIndustry: hit.industryDisp || hit.industry || null,
          }
        } catch {
          return {}
        }
      })(),
    })
  } catch {
    return c.json({ error: '株価を取得できませんでした' }, 404)
  }
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)

'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ---------- 型定義 ----------
type Company = {
  id: string
  name: string
  ticker: string | null
  industry: string | null
  notes: string | null
  documents: { id: string; fileName: string; fileSize: number; createdAt: string; financialData?: string | null }[]
}

type Conversation = {
  id: string
  title: string
  updatedAt: string
}

type StockQuote = {
  symbol: string; longName?: string; shortName?: string; currency?: string; marketState?: string
  regularMarketPrice?: number; regularMarketChange?: number; regularMarketChangePercent?: number
  regularMarketPreviousClose?: number; regularMarketOpen?: number; regularMarketDayHigh?: number
  regularMarketDayLow?: number; regularMarketVolume?: number; averageDailyVolume3Month?: number
  bid?: number; ask?: number; marketCap?: number; sharesOutstanding?: number
  trailingPE?: number; forwardPE?: number; priceToBook?: number
  epsTrailingTwelveMonths?: number; epsForward?: number; bookValue?: number
  trailingAnnualDividendRate?: number; trailingAnnualDividendYield?: number
  fiftyDayAverage?: number; twoHundredDayAverage?: number
  fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number; fiftyTwoWeekChangePercent?: number
  error?: string
}

type FinancialData = {
  companyName: string
  fiscalYears: string[]
  pl: { revenue: (number|null)[]; grossProfit: (number|null)[]; operatingIncome: (number|null)[]; ordinaryIncome: (number|null)[]; netIncome: (number|null)[]; grossMargin: (number|null)[]; operatingMargin: (number|null)[]; netMargin: (number|null)[] }
  bs: { totalAssets: (number|null)[]; currentAssets: (number|null)[]; fixedAssets: (number|null)[]; currentLiabilities: (number|null)[]; fixedLiabilities: (number|null)[]; netAssets: (number|null)[]; equityRatio: (number|null)[] }
  cf: { operatingCF: (number|null)[]; investingCF: (number|null)[]; financingCF: (number|null)[]; freeCF: (number|null)[] }
  metrics: { roe: (number|null)[]; roa: (number|null)[]; currentRatio: (number|null)[]; debtEquityRatio: (number|null)[]; eps: (number|null)[] }
}

// ---------- 財務テーブル ----------
function FinancialTables({ data }: { data: FinancialData }) {
  const years = data.fiscalYears
  // v は百万円単位
  const fmt = (v: number | null) => {
    if (v == null) return <span className="text-gray-300">—</span>
    const abs = Math.abs(v)
    let str: string
    let unit: string
    if (abs >= 1000000) {
      // 1兆円 = 1,000,000百万円
      str = (v / 1000000).toFixed(1)
      unit = '兆円'
    } else if (abs >= 10000) {
      // 1億円 = 100百万円 → 1000億 = 100,000百万円
      str = Math.round(v / 100).toLocaleString()
      unit = '億円'
    } else if (abs >= 100) {
      str = (v / 100).toFixed(1)
      unit = '億円'
    } else {
      str = v.toLocaleString()
      unit = '百万円'
    }
    return <span className={v < 0 ? 'text-red-500' : ''}>{str}<span className="text-gray-400 text-xs ml-0.5">{unit}</span></span>
  }
  const fmtPct = (v: number | null) => v == null ? <span className="text-gray-300">—</span> : <span className={v < 0 ? 'text-red-500' : 'text-blue-600'}>{v.toFixed(1)}%</span>
  const fmtNum = (v: number | null, unit = '') => v == null ? <span className="text-gray-300">—</span> : <span>{v.toFixed(1)}{unit}</span>

  const trend = (arr: (number|null)[]) => {
    const vals = arr.filter((v): v is number => v != null)
    if (vals.length < 2) return null
    const diff = vals[vals.length - 1] - vals[vals.length - 2]
    const pct = (diff / Math.abs(vals[vals.length - 2])) * 100
    return <span className={`text-xs ml-1 ${pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>{pct >= 0 ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%</span>
  }

  const Table = ({ title, rows }: { title: string; rows: { label: string; values: (number|null)[]; render: (v: number|null) => React.ReactNode }[] }) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-40">項目</th>
              {years.map(y => <th key={y} className="text-right px-3 py-2 text-xs font-medium text-gray-500">{y}</th>)}
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-20">前年比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.label} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600 text-xs">{row.label}</td>
                {row.values.map((v, i) => <td key={i} className="px-3 py-2 text-right font-mono text-xs">{row.render(v)}</td>)}
                <td className="px-3 py-2 text-right">{trend(row.values)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        財務サマリー
      </h3>

      <Table title="損益計算書（PL）" rows={[
        { label: '売上高', values: data.pl.revenue, render: (v) => fmt(v) },
        { label: '売上総利益', values: data.pl.grossProfit, render: (v) => fmt(v) },
        { label: '営業利益', values: data.pl.operatingIncome, render: (v) => fmt(v) },
        { label: '経常利益', values: data.pl.ordinaryIncome, render: (v) => fmt(v) },
        { label: '当期純利益', values: data.pl.netIncome, render: (v) => fmt(v) },
        { label: '売上総利益率', values: data.pl.grossMargin, render: fmtPct },
        { label: '営業利益率', values: data.pl.operatingMargin, render: fmtPct },
        { label: '純利益率', values: data.pl.netMargin, render: fmtPct },
      ]} />

      <Table title="貸借対照表（BS）" rows={[
        { label: '総資産', values: data.bs.totalAssets, render: (v) => fmt(v) },
        { label: '流動資産', values: data.bs.currentAssets, render: (v) => fmt(v) },
        { label: '固定資産', values: data.bs.fixedAssets, render: (v) => fmt(v) },
        { label: '流動負債', values: data.bs.currentLiabilities, render: (v) => fmt(v) },
        { label: '固定負債', values: data.bs.fixedLiabilities, render: (v) => fmt(v) },
        { label: '純資産', values: data.bs.netAssets, render: (v) => fmt(v) },
        { label: '自己資本比率', values: data.bs.equityRatio, render: fmtPct },
      ]} />

      <Table title="キャッシュフロー（CF）" rows={[
        { label: '営業CF', values: data.cf.operatingCF, render: (v) => fmt(v) },
        { label: '投資CF', values: data.cf.investingCF, render: (v) => fmt(v) },
        { label: '財務CF', values: data.cf.financingCF, render: (v) => fmt(v) },
        { label: 'フリーCF', values: data.cf.freeCF, render: (v) => fmt(v) },
      ]} />

      <Table title="財務指標" rows={[
        { label: 'ROE', values: data.metrics.roe, render: fmtPct },
        { label: 'ROA', values: data.metrics.roa, render: fmtPct },
        { label: '流動比率', values: data.metrics.currentRatio, render: fmtPct },
        { label: 'D/Eレシオ', values: data.metrics.debtEquityRatio, render: (v) => fmtNum(v, '倍') },
        { label: 'EPS', values: data.metrics.eps, render: (v) => fmtNum(v, '円') },
      ]} />
    </div>
  )
}

// ---------- 株価カード ----------
function StockCard({ ticker }: { ticker: string }) {
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stock/${ticker}`).then(r => r.json()).then(setQuote).finally(() => setLoading(false))
  }, [ticker])

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 animate-pulse">
      <div className="h-8 w-40 bg-gray-100 rounded mb-3" />
      <div className="grid grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}</div>
    </div>
  )
  if (!quote || quote.error) return null

  const isUp = (quote.regularMarketChange ?? 0) >= 0
  const p = (v?: number) => v == null ? '-' : quote.currency === 'JPY' ? `¥${v.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}` : `$${v.toFixed(2)}`
  const pct = (v?: number) => v == null ? '-' : `${v.toFixed(2)}%`
  const vol = (v?: number) => v == null ? '-' : v >= 1e8 ? `${(v/1e8).toFixed(1)}億` : v >= 1e4 ? `${(v/1e4).toFixed(1)}万` : v.toLocaleString()
  const cap = (v?: number) => v == null ? '-' : v >= 1e12 ? `${(v/1e12).toFixed(1)}兆円` : v >= 1e8 ? `${(v/1e8).toFixed(0)}億円` : `${(v/1e6).toFixed(0)}百万円`
  const Item = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
  const rangePercent = quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow && quote.regularMarketPrice
    ? ((quote.regularMarketPrice - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100 : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl font-bold text-gray-900">{p(quote.regularMarketPrice)}</span>
            <span className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full ${isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(quote.regularMarketChange ?? 0).toFixed(0)}（{Math.abs(quote.regularMarketChangePercent ?? 0).toFixed(2)}%）
            </span>
          </div>
          <p className="text-xs text-gray-400">前日終値: {p(quote.regularMarketPreviousClose)}　Bid: {p(quote.bid)} / Ask: {p(quote.ask)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-500">{quote.symbol}</p>
          <p className={`text-xs mt-0.5 font-medium ${quote.marketState === 'REGULAR' ? 'text-green-500' : 'text-gray-400'}`}>
            {quote.marketState === 'REGULAR' ? '● 取引中' : '○ 取引時間外'}
          </p>
        </div>
      </div>
      {rangePercent != null && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>52週安値 {p(quote.fiftyTwoWeekLow)}</span>
            <span>52週高値 {p(quote.fiftyTwoWeekHigh)}</span>
          </div>
          <div className="relative h-1.5 bg-gray-200 rounded-full">
            <div className="absolute h-1.5 bg-blue-500 rounded-full" style={{ width: `${rangePercent}%` }} />
            <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white shadow top-1/2 -translate-y-1/2" style={{ left: `calc(${rangePercent}% - 5px)` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">52週騰落: {pct(quote.fiftyTwoWeekChangePercent)}</p>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        <Item label="始値" value={p(quote.regularMarketOpen)} />
        <Item label="高値" value={p(quote.regularMarketDayHigh)} />
        <Item label="安値" value={p(quote.regularMarketDayLow)} />
        <Item label="出来高" value={vol(quote.regularMarketVolume)} sub={`3M平均 ${vol(quote.averageDailyVolume3Month)}`} />
        <Item label="時価総額" value={cap(quote.marketCap)} />
        <Item label="発行済株式数" value={quote.sharesOutstanding ? `${vol(quote.sharesOutstanding)}株` : '-'} />
        <Item label="PER（実績）" value={quote.trailingPE ? `${quote.trailingPE.toFixed(1)}倍` : '-'} />
        <Item label="PER（予想）" value={quote.forwardPE ? `${quote.forwardPE.toFixed(1)}倍` : '-'} />
        <Item label="PBR" value={quote.priceToBook ? `${quote.priceToBook.toFixed(2)}倍` : '-'} />
        <Item label="EPS（実績）" value={p(quote.epsTrailingTwelveMonths)} />
        <Item label="BPS" value={p(quote.bookValue)} />
        <Item label="配当利回り" value={quote.trailingAnnualDividendYield ? pct(quote.trailingAnnualDividendYield * 100) : '-'} sub={quote.trailingAnnualDividendRate ? `${p(quote.trailingAnnualDividendRate)}/株` : undefined} />
        <Item label="50日移動平均" value={p(quote.fiftyDayAverage)} />
        <Item label="200日移動平均" value={p(quote.twoHundredDayAverage)} />
      </div>
    </div>
  )
}

// ---------- メインページ ----------
export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [creatingConvo, setCreatingConvo] = useState(false)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    const [companiesRes, convosRes] = await Promise.all([
      fetch('/api/companies').then(r => r.json()),
      fetch('/api/conversations').then(r => r.json()),
    ])
    const found = companiesRes.find((c: Company) => c.id === id)
    setCompany(found || null)
    setConversations(convosRes.filter((c: any) => c.companyId === id))

    // 財務データがあれば取得
    if (found?.documents?.length > 0) {
      const docWithFinancial = found.documents.find((d: any) => d.financialData)
      if (docWithFinancial) {
        try {
          const fd = JSON.parse(docWithFinancial.financialData)
          setFinancialData(fd)
        } catch {}
      }
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('companyId', id)
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      const doc = await res.json()
      await fetchData()
      if (doc.hasFinancialData) {
        // 財務データが取れた場合は取得
        const fd = await fetch(`/api/documents/${doc.id}/financials`).then(r => r.json())
        if (!fd.error) setFinancialData(fd)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const startConversation = async () => {
    if (conversations.length > 0) {
      router.push(`/conversations/${conversations[0].id}`)
      return
    }
    setCreatingConvo(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${company?.name}の分析`, companyId: id }),
      })
      const convo = await res.json()
      router.push(`/conversations/${convo.id}`)
    } finally {
      setCreatingConvo(false)
    }
  }

  const deleteCompany = async () => {
    if (!confirm(`「${company?.name}」を削除しますか？会話・資料もすべて削除されます。`)) return
    setDeleting(true)
    await fetch(`/api/companies/${id}`, { method: 'DELETE' })
    router.push('/companies')
  }

  if (!company) return <div className="p-8 text-gray-400">読み込み中...</div>

  const hasDocuments = company.documents.length > 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-gray-900">{company.name}</h2>
            {company.ticker && <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{company.ticker}</span>}
          </div>
          {company.industry && <p className="text-gray-500 mt-1">{company.industry}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={deleteCompany} disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? '削除中...' : '削除'}
          </button>
          {hasDocuments && (
            <button onClick={startConversation} disabled={creatingConvo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {creatingConvo ? '作成中...' : conversations.length > 0 ? '会話を続ける' : 'AIと分析を開始'}
            </button>
          )}
        </div>
      </div>

      {/* 株価カード */}
      {company.ticker && <StockCard ticker={company.ticker} />}

      {/* 有価証券報告書アップロード（未アップロード時のメインCTA） */}
      {!hasDocuments && (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-10 text-center mb-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">有価証券報告書をアップロード</h3>
          <p className="text-sm text-gray-500 mb-5">PDFをアップロードすると、PL・BS・CF・ROEなどの財務データを自動で抽出します</p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {uploading ? '処理中（少し時間がかかります）...' : 'PDFを選択'}
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      )}

      {/* 財務テーブル */}
      {financialData && <FinancialTables data={financialData} />}

      {/* アップロード済みの場合の資料・会話エリア */}
      {hasDocuments && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">アップロード資料</h3>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? '処理中...' : '追加'}
                <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            <ul className="space-y-2">
              {company.documents.map(doc => (
                <li key={doc.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{doc.fileName}</span>
                  {doc.financialData && <span className="text-xs text-green-600 shrink-0">財務データ✓</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-medium text-gray-900 mb-4">会話履歴</h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">会話がありません</p>
            ) : (
              <ul className="space-y-2">
                {conversations.map(convo => (
                  <li key={convo.id}>
                    <a href={`/conversations/${convo.id}`} className="block text-sm text-gray-700 hover:text-blue-600 truncate">{convo.title}</a>
                    <p className="text-xs text-gray-400">{new Date(convo.updatedAt).toLocaleDateString('ja-JP')}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

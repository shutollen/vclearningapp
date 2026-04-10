'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function NewCompanyPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', ticker: '', industry: '' })
  const [loading, setLoading] = useState(false)
  const [tickerSearching, setTickerSearching] = useState(false)
  const [tickerError, setTickerError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchByTicker = async (ticker: string) => {
    if (!ticker.trim()) return
    setTickerSearching(true)
    setTickerError('')
    try {
      const res = await fetch(`/api/stock/${ticker.trim()}`)
      const data = await res.json()
      if (data.error) {
        setTickerError('銘柄が見つかりませんでした')
      } else {
        setForm((prev) => ({
          ...prev,
          name: prev.name || data.jaName || data.longName || data.shortName || '',
          industry: prev.industry || data.jaSector || data.sector || data.industry || '',
        }))
      }
    } catch {
      setTickerError('検索に失敗しました')
    } finally {
      setTickerSearching(false)
    }
  }

  const handleTickerChange = (value: string) => {
    setForm((prev) => ({ ...prev, ticker: value }))
    setTickerError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length >= 4) {
      debounceRef.current = setTimeout(() => searchByTicker(value), 600)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const company = await res.json()
      router.push(`/companies/${company.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">企業を追加</h2>
        <p className="text-gray-500 mt-1">証券コードを入力すると企業名・業種を自動取得します</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {/* ティッカー */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            証券コード・ティッカー
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.ticker}
              onChange={(e) => handleTickerChange(e.target.value)}
              placeholder="例: 7342（日本株）/ AAPL（米国株）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            />
            {tickerSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
          {tickerError ? (
            <p className="text-xs text-red-500 mt-1">{tickerError}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">4文字以上入力すると自動検索します</p>
          )}
        </div>

        {/* 企業名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            企業名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例: トヨタ自動車"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 業種 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            業種・セクター
          </label>
          <input
            type="text"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            placeholder="自動取得または手入力"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading || tickerSearching}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '作成中...' : '企業を追加'}
          </button>
        </div>
      </form>
    </div>
  )
}

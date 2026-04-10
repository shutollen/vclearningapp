'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Company = {
  id: string
  name: string
  ticker: string | null
  industry: string | null
  updatedAt: string
  _count: { conversations: number }
  documents: { id: string }[]
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((data) => setCompanies(data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">企業一覧</h2>
          <p className="text-gray-500 mt-1">学習した企業の一覧</p>
        </div>
        <Link
          href="/companies/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          企業を追加
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">まだ企業が登録されていません</p>
          <Link
            href="/companies/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            最初の企業を追加
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{company.name}</h3>
                    {company.ticker && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {company.ticker}
                      </span>
                    )}
                  </div>
                  {company.industry && (
                    <p className="text-sm text-gray-500 mt-0.5">{company.industry}</p>
                  )}
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>{company._count.conversations}件の会話</p>
                  <p>{company.documents.length}件の資料</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                更新: {new Date(company.updatedAt).toLocaleDateString('ja-JP')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

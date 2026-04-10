'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'

type Company = {
  id: string
  name: string
  ticker: string | null
  industry: string | null
  notes: string | null
  documents: { id: string; fileName: string; fileSize: number; createdAt: string }[]
}

type Conversation = {
  id: string
  title: string
  updatedAt: string
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [uploading, setUploading] = useState(false)
  const [creatingConvo, setCreatingConvo] = useState(false)

  useEffect(() => {
    fetch(`/api/companies`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.find((c: Company) => c.id === id)
        setCompany(found || null)
      })
    fetch(`/api/conversations`)
      .then((r) => r.json())
      .then((data) => {
        setConversations(data.filter((c: any) => c.companyId === id))
      })
  }, [id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('companyId', id)
    try {
      await fetch('/api/documents', { method: 'POST', body: formData })
      // Refresh company data
      const data = await fetch('/api/companies').then((r) => r.json())
      setCompany(data.find((c: Company) => c.id === id) || null)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const startConversation = async () => {
    setCreatingConvo(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${company?.name}の分析`,
          companyId: id,
        }),
      })
      const convo = await res.json()
      router.push(`/conversations/${convo.id}`)
    } finally {
      setCreatingConvo(false)
    }
  }

  if (!company) return <div className="p-8 text-gray-400">読み込み中...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-gray-900">{company.name}</h2>
              {company.ticker && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{company.ticker}</span>
              )}
            </div>
            {company.industry && <p className="text-gray-500 mt-1">{company.industry}</p>}
            {company.notes && <p className="text-sm text-gray-400 mt-2">{company.notes}</p>}
          </div>
          <button
            onClick={startConversation}
            disabled={creatingConvo}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {creatingConvo ? '作成中...' : '分析を開始'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">アップロード資料</h3>
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {uploading ? 'アップロード中...' : 'アップロード'}
              <input type="file" accept=".pdf,.txt,.csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
          {company.documents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">資料がありません</p>
          ) : (
            <ul className="space-y-2">
              {company.documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{doc.fileName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-medium text-gray-900 mb-4">会話履歴</h3>
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">会話がありません</p>
          ) : (
            <ul className="space-y-2">
              {conversations.map((convo) => (
                <li key={convo.id}>
                  <a
                    href={`/conversations/${convo.id}`}
                    className="block text-sm text-gray-700 hover:text-blue-600 truncate"
                  >
                    {convo.title}
                  </a>
                  <p className="text-xs text-gray-400">
                    {new Date(convo.updatedAt).toLocaleDateString('ja-JP')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

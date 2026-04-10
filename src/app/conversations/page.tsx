'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Conversation = {
  id: string
  title: string
  updatedAt: string
  company: { name: string } | null
  messages: { content: string }[]
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((data) => setConversations(data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">会話一覧</h2>
        <p className="text-gray-500 mt-1">過去の学習スレッド</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">まだ会話がありません</p>
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            企業を選んで分析を始める
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((convo) => (
            <Link
              key={convo.id}
              href={`/conversations/${convo.id}`}
              className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{convo.title}</h3>
                  {convo.company && (
                    <p className="text-xs text-blue-600 mt-0.5">{convo.company.name}</p>
                  )}
                  {convo.messages[0] && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{convo.messages[0].content}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 shrink-0 ml-4">
                  {new Date(convo.updatedAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

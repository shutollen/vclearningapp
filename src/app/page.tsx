import Link from 'next/link'

export default function Home() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">VC Learning App</h2>
        <p className="text-gray-500 mt-1">決算書・株主説明会資料を分析して、企業分析力を高めましょう</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link
          href="/companies/new"
          className="p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900">企業を追加</h3>
          <p className="text-sm text-gray-500 mt-1">新しい企業の決算書を登録して分析を始める</p>
        </Link>

        <Link
          href="/conversations"
          className="p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900">会話を再開</h3>
          <p className="text-sm text-gray-500 mt-1">過去の学習スレッドを確認・再開する</p>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">学習の流れ</h3>
        <ol className="space-y-3">
          {[
            { step: '1', title: '企業を登録', desc: '分析したい企業名と業種を入力' },
            { step: '2', title: '資料をアップロード', desc: '決算書・株主説明会資料のPDFをアップロード' },
            { step: '3', title: 'AIと対話', desc: 'AIコーチが資料をもとに深堀り質問を出題' },
            { step: '4', title: '進捗を確認', desc: '分析した企業の一覧で学習の進捗を管理' },
          ].map((item) => (
            <li key={item.step} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center shrink-0 mt-0.5">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

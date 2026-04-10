import Link from 'next/link'

export default function Home() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">

      {/* ヒーロー */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-2">VC Learning App</div>
        <h1 className="text-3xl font-bold mb-3">新卒VCのための<br />企業分析トレーニング</h1>
        <p className="text-blue-100 text-sm leading-relaxed max-w-xl">
          有価証券報告書をアップロードするだけで、財務データを自動抽出。
          AIコーチと対話しながら、決算書の読み方・企業分析の視点を身につけましょう。
        </p>
        <div className="flex gap-3 mt-6">
          <Link
            href="/companies/new"
            className="px-5 py-2.5 bg-white text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            企業を追加して始める
          </Link>
          <Link
            href="/companies"
            className="px-5 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-400 transition-colors"
          >
            企業一覧を見る
          </Link>
        </div>
      </div>

      {/* 使い方ステップ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">使い方</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              step: '1',
              title: '企業を登録する',
              desc: '証券コード（例：7342）を入力すると企業名・業種が自動入力されます。米国株のティッカー（例：AAPL）にも対応。',
              color: 'bg-blue-600',
              link: '/companies/new',
              linkText: '企業を追加',
            },
            {
              step: '2',
              title: '有価証券報告書をアップロード',
              desc: 'EDINETからダウンロードしたPDFをアップロードすると、AIがPL・BS・CF・財務指標を自動抽出します（1〜2分）。最大5期分の推移を表示。',
              color: 'bg-violet-600',
              link: null,
              linkText: null,
            },
            {
              step: '3',
              title: 'AIコーチと対話して深める',
              desc: '財務データをもとにAIが解説・深堀り質問を提示します。「なぜ営業利益率が低いのか」「この会社のビジネスモデルのリスクは？」など自由に質問できます。',
              color: 'bg-green-600',
              link: null,
              linkText: null,
            },
            {
              step: '4',
              title: '複数企業を比較・管理',
              desc: 'サイドバーから企業一覧にアクセス。分析した企業をポートフォリオのように管理し、複数企業の学習を並行して進められます。',
              color: 'bg-orange-500',
              link: '/companies',
              linkText: '企業一覧へ',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
              <span className={`w-8 h-8 ${item.color} text-white text-sm font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5`}>
                {item.step}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                {item.link && (
                  <Link href={item.link} className="inline-block mt-2 text-xs text-blue-600 hover:underline font-medium">
                    {item.linkText} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 機能一覧 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">主な機能</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              ),
              title: 'リアルタイム株価',
              desc: '証券コード登録で株価・PER・PBR・配当利回りなどを自動表示',
            },
            {
              icon: (
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: '財務データ自動抽出',
              desc: 'PDFからPL・BS・CF・ROE・ROAなどを5期分自動抽出し表で表示',
            },
            {
              icon: (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              ),
              title: 'AIコーチとの対話',
              desc: '簿記2級以上の視点で企業分析を深める質問・解説を提供',
            },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <p className="text-sm font-medium text-gray-900">{f.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ヒント */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-900">PDFアップロードのコツ</p>
            <p className="text-sm text-amber-700 mt-1 leading-relaxed">
              EDINETの「有価証券報告書」PDFが最適です。テキスト形式・画像（スキャン）形式どちらも対応。
              抽出完了まで1〜2分かかります。抽出後は財務サマリーが自動表示されます。
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

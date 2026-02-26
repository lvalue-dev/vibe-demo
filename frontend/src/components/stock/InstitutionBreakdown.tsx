import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import type { InstitutionTypeSummary, InstitutionDailyRow, InstitutionPlayer } from '../../types'
import { formatFlow } from '../../utils/format'

interface Props {
  summary: InstitutionTypeSummary[]
  daily: InstitutionDailyRow[]
  players: InstitutionPlayer[]
  market: string
}

const TYPE_META: Record<string, { color: string; desc: string }> = {
  '금융투자': { color: '#3b82f6', desc: '증권사·투자은행' },
  '투신':     { color: '#8b5cf6', desc: '뮤추얼펀드·자산운용' },
  '연기금':   { color: '#10b981', desc: '국민연금·공제회 등' },
  '보험':     { color: '#f59e0b', desc: '생명보험·손해보험' },
  '은행':     { color: '#ec4899', desc: '시중은행·지방은행' },
  '기타법인': { color: '#9ca3af', desc: '기타 법인 투자자' },
}

type SubTab = 'type' | 'player' | 'trend'

export default function InstitutionBreakdown({ summary, daily, players, market }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('player')

  if (!summary.length) return null

  const maxAbs = Math.max(...summary.map(s => Math.abs(s.cumFlow)), 1)
  const sorted = [...summary].sort((a, b) => b.cumFlow - a.cumFlow)

  return (
    <div className="space-y-4">
      {/* Sub-탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {([
          { key: 'player', label: '기관별 상세' },
          { key: 'type',   label: '유형별 요약' },
          { key: 'trend',  label: '20일 추이' },
        ] as { key: SubTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
              subTab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 기관별 상세 ── */}
      {subTab === 'player' && (
        <div>
          <p className="text-xs text-gray-400 mb-3">20일 누적 · 순매수 기준 정렬 · 상위 15개 기관</p>
          {/* 헤더 */}
          <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-2 px-2 pb-1 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            <span>#</span>
            <span>기관명</span>
            <span className="text-right">매수</span>
            <span className="text-right">매도</span>
            <span className="text-right">순매수</span>
          </div>
          <div className="divide-y divide-gray-50">
            {players.slice(0, 15).map((p, i) => {
              const meta = TYPE_META[p.type]
              const isPos = p.netAmount >= 0
              return (
                <div
                  key={p.name}
                  className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-2 items-center px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="text-xs text-gray-300 font-mono">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                    <span
                      className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5"
                      style={{ backgroundColor: meta.color + '20', color: meta.color }}
                    >
                      {p.type}
                    </span>
                  </div>
                  <span className="text-xs text-blue-500 font-medium text-right whitespace-nowrap">
                    {formatFlow(p.buyAmount, market)}
                  </span>
                  <span className="text-xs text-red-400 font-medium text-right whitespace-nowrap">
                    {formatFlow(-p.sellAmount, market)}
                  </span>
                  <span className={`text-xs font-bold text-right whitespace-nowrap ${isPos ? 'text-blue-700' : 'text-red-600'}`}>
                    {formatFlow(p.netAmount, market)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 text-right">
            * 거래량·가격 기반 추정치. 실제 기관 신고 데이터와 다를 수 있음.
          </p>
        </div>
      )}

      {/* ── 유형별 요약 ── */}
      {subTab === 'type' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 mb-1">20일 누적 · 유형별 누적 순매수</p>
          {sorted.map(({ name, todayFlow, cumFlow }) => {
            const meta = TYPE_META[name]
            const barPct = (Math.abs(cumFlow) / maxAbs) * 100
            const isPos = cumFlow >= 0
            const isTodayPos = todayFlow >= 0
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{name}</span>
                      <span className="text-[10px] text-gray-400 ml-1.5 hidden sm:inline">{meta.desc}</span>
                    </div>
                  </div>
                  <div className="text-right leading-tight">
                    <p className={`text-sm font-bold ${isPos ? 'text-blue-600' : 'text-red-500'}`}>
                      {formatFlow(cumFlow, market)}
                    </p>
                    <p className={`text-[11px] ${isTodayPos ? 'text-green-600' : 'text-red-500'}`}>
                      오늘 {formatFlow(todayFlow, market)}
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barPct}%`, backgroundColor: meta.color, opacity: 0.7 }}
                  />
                </div>
              </div>
            )
          })}
          <p className="text-[10px] text-gray-400 text-right pt-1">
            * 거래량·가격 기반 추정치. 실제 기관 신고 데이터와 다를 수 있음.
          </p>
        </div>
      )}

      {/* ── 20일 추이 차트 ── */}
      {subTab === 'trend' && (
        <div>
          <p className="text-xs text-gray-400 mb-3">유형별 일별 순매수 추이 (20거래일)</p>
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={daily} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatFlow(v, market)} width={64} />
              <Tooltip formatter={(v: number, name: string) => [formatFlow(v, market), name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
              {Object.entries(TYPE_META).map(([type, { color }]) => (
                <Line key={type} type="monotone" dataKey={type} stroke={color} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 text-right mt-1">
            * 거래량·가격 기반 추정치. 실제 기관 신고 데이터와 다를 수 있음.
          </p>
        </div>
      )}
    </div>
  )
}

interface Props {
  score: number
}

export default function ScoreBar({ score }: Props) {
  const color =
    score >= 80 ? '#16a34a' :
    score >= 60 ? '#22c55e' :
    score >= 40 ? '#f59e0b' :
    '#ef4444'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

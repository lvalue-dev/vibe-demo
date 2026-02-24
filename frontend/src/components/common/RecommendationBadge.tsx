import type { Recommendation } from '../../types'
import { RECOMMENDATION_COLORS, RECOMMENDATION_BG } from '../../utils/format'

interface Props {
  recommendation: Recommendation | null
  label: string
  size?: 'sm' | 'md' | 'lg'
}

export default function RecommendationBadge({ recommendation, label, size = 'md' }: Props) {
  const color = recommendation ? RECOMMENDATION_COLORS[recommendation] : '#6b7280'
  const bg = recommendation ? RECOMMENDATION_BG[recommendation] : '#f3f4f6'

  const sizeClass = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2 font-bold',
  }[size]

  return (
    <span
      className={`inline-block rounded-full font-semibold ${sizeClass}`}
      style={{ color, backgroundColor: bg, border: `1.5px solid ${color}` }}
    >
      {label}
    </span>
  )
}

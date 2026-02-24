import type { RiskLevel } from '../../types'
import { RISK_COLORS } from '../../utils/format'

interface Props {
  risk: RiskLevel | null
  label: string
}

export default function RiskBadge({ risk, label }: Props) {
  const color = risk ? RISK_COLORS[risk] : '#6b7280'

  return (
    <span className="text-xs font-medium" style={{ color }}>
      위험도: {label}
    </span>
  )
}

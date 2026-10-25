import type { DataStatus } from '../types'

const STATUS_LABELS: Record<DataStatus, string> = {
  verified: 'Đã xác minh',
  needs_review: 'Cần rà soát',
  simulated: 'Dữ liệu mô phỏng',
}

export function DataStatusBadge({ status }: { status: DataStatus }) {
  return (
    <span className={`data-status data-status--${status}`} role="status">
      {STATUS_LABELS[status]}
    </span>
  )
}

import { useMemo } from 'react'
import {
  integratedRuleComparisonService,
} from '../services/integratedRuleComparisonService'
import type {
  AdmissionRuleVersion,
  RuleComparisonResult,
} from '../logic/ruleComparison'

interface RuleComparisonPanelProps {
  before?: AdmissionRuleVersion | null
  after?: AdmissionRuleVersion | null
}

export function RuleComparisonPanel({
  before = null,
  after = null,
}: RuleComparisonPanelProps) {
  const result: RuleComparisonResult | null = useMemo(() => {
    if (!before || !after) return null
    return integratedRuleComparisonService.compare(before, after)
  }, [before, after])

  return (
    <section className="data-note" aria-labelledby="rule-comparison-title">
      <span className="data-note-icon">↔</span>
      <div>
        <strong id="rule-comparison-title">So sánh thay đổi quy định tuyển sinh</strong>
        {!result ? (
          <p>
            Chưa có đủ hai phiên bản quy định được lưu trữ với nguồn và năm áp dụng.
            Hệ thống chưa thể kết luận có thay đổi. Khi có hai snapshot hợp lệ,
            module sẽ hiển thị trường thay đổi, ngành bị ảnh hưởng và mức độ tác động.
          </p>
        ) : (
          <>
            <p>{result.explanation.summary}</p>
            <p><strong>Mức độ ảnh hưởng:</strong> {result.explanation.impactLevel}</p>
            <ul>
              {result.explanation.whatChanged.map((change, index) => (
                <li key={index}>{change}</li>
              ))}
            </ul>
            {result.explanation.limitations.map((limitation, index) => (
              <p key={index}>{limitation}</p>
            ))}
            <p><strong>Trạng thái dữ liệu:</strong> {result.comparison.dataStatus}</p>
          </>
        )}
      </div>
    </section>
  )
}

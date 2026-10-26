import { useMemo, useState } from 'react'
import demoRules from '../../data/admission-rule-comparison/demo-rules.json'
import {
  toAdmissionRuleVersionPair,
  validateAdmissionRuleVersions,
} from '../adapters/admissionRuleVersionAdapter'
import { integratedRuleComparisonService } from '../services/integratedRuleComparisonService'

const rawVersions: unknown = demoRules.versions
const fixtureValidation = validateAdmissionRuleVersions(rawVersions)
const versions = fixtureValidation.ok ? fixtureValidation.value : []

function ResultList({ title, items, emptyMessage }: {
  title: string
  items: string[]
  emptyMessage: string
}) {
  return (
    <details className="comparison-detail">
      <summary>{title}</summary>
      <div className="comparison-detail-content">
        {items.length > 0 ? (
          <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
        ) : <p>{emptyMessage}</p>}
      </div>
    </details>
  )
}

export function RuleComparisonPanel() {
  const [beforeId, setBeforeId] = useState(versions[0]?.id ?? '')
  const [afterId, setAfterId] = useState(versions[1]?.id ?? '')

  const result = useMemo(() => {
    if (!fixtureValidation.ok) return { error: fixtureValidation.error } as const
    if (versions.length < 2) {
      return { error: 'Cần ít nhất hai snapshot quy định hợp lệ để so sánh.' } as const
    }
    if (!beforeId || !afterId) return { error: 'Chưa có đủ phiên bản hợp lệ để so sánh.' } as const
    if (beforeId === afterId) return { error: 'Hãy chọn hai phiên bản khác nhau: một phiên bản trước và một phiên bản sau.' } as const
    const before = versions.find((version) => version.id === beforeId)
    const after = versions.find((version) => version.id === afterId)
    const pair = toAdmissionRuleVersionPair(before, after)
    if (!pair.ok) return { error: pair.error } as const
    return {
      value: integratedRuleComparisonService.compare(pair.value.before, pair.value.after),
    } as const
  }, [beforeId, afterId])

  return (
    <section className="data-note" aria-labelledby="rule-comparison-title">
      <span className="data-note-icon" aria-hidden="true">↔</span>
      <div>
        <h3 id="rule-comparison-title">So sánh thay đổi quy định tuyển sinh</h3>
        <p role="note">
          Kịch bản bên dưới được cung cấp bởi module Member 4 và mang trạng thái simulated.
          Đây không phải quy định tuyển sinh chính thức, không có nguồn pháp lý được xác minh.
        </p>

        {!fixtureValidation.ok || versions.length < 2 ? <p className="no-results" role="status">Không thể mở bộ so sánh vì dữ liệu snapshot không hợp lệ hoặc chưa có đủ hai phiên bản. Cần cập nhật fixture từ nguồn dữ liệu có provenance rõ ràng.</p> : null}

        <div className="form-grid">
          <label className="field">
            <span className="field-label">Phiên bản trước</span>
            <select value={beforeId} disabled={!fixtureValidation.ok || versions.length < 2} onChange={(event) => setBeforeId(event.target.value)}>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.source.version} — {version.source.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Phiên bản sau</span>
            <select value={afterId} disabled={!fixtureValidation.ok || versions.length < 2} onChange={(event) => setAfterId(event.target.value)}>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.source.version} — {version.source.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {'error' in result ? (
          <p role="alert">{result.error}</p>
        ) : (
          <div aria-live="polite">
            <section aria-label="Tổng quan mức độ ảnh hưởng">
              <h4>Tổng quan tác động</h4>
              <p><strong>Mức độ ảnh hưởng:</strong> {result.value.explanation.impactLevel}</p>
              <p>{result.value.explanation.summary}</p>
              <p>{result.value.explanation.impactAssessment}</p>
              <p><strong>Trạng thái dữ liệu:</strong> {result.value.comparison.dataStatus}</p>
            </section>

            <ResultList
              title="Những điểm thay đổi"
              items={result.value.explanation.whatChanged}
              emptyMessage="Không phát hiện thay đổi trong các trường dữ liệu được so sánh."
            />

            <ResultList
              title="Chương trình có thể bị ảnh hưởng"
              items={result.value.explanation.potentiallyAffected}
              emptyMessage="Chưa đủ căn cứ xác định chương trình liên quan."
            />

            <ResultList
              title="Tác động học phí"
              items={result.value.explanation.tuitionImpact}
              emptyMessage="Chưa có dữ liệu học phí để đánh giá."
            />

            <ResultList
              title="Việc học sinh nên làm tiếp theo"
              items={result.value.explanation.nextSteps}
              emptyMessage="Chưa có khuyến nghị tiếp theo."
            />

            <ResultList
              title="Nguồn dữ liệu"
              items={result.value.explanation.sourceDisclosure}
              emptyMessage="Không có thông tin nguồn được cung cấp."
            />

            <ResultList
              title="Thông tin chưa xác định"
              items={result.value.explanation.unknowns}
              emptyMessage="Không có thông tin chưa xác định được ghi nhận."
            />

            <ResultList
              title="Giới hạn của kết quả"
              items={result.value.explanation.limitations}
              emptyMessage="Không có giới hạn bổ sung được ghi nhận."
            />
          </div>
        )}
      </div>
    </section>
  )
}

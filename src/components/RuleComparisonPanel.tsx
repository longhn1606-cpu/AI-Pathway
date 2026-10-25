import { useMemo, useState } from 'react'
import demoRules from '../../data/admission-rule-comparison/demo-rules.json'
import { toAdmissionRuleVersionPair } from '../adapters/admissionRuleVersionAdapter'
import { integratedRuleComparisonService } from '../services/integratedRuleComparisonService'
import type { AdmissionRuleVersion } from '../logic/ruleComparison'

const versions = demoRules.versions as AdmissionRuleVersion[]

function ResultList({ title, items, emptyMessage }: {
  title: string
  items: string[]
  emptyMessage: string
}) {
  return (
    <section aria-label={title}>
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
      ) : <p>{emptyMessage}</p>}
    </section>
  )
}

export function RuleComparisonPanel() {
  const [beforeId, setBeforeId] = useState(versions[0]?.id ?? '')
  const [afterId, setAfterId] = useState(versions[1]?.id ?? '')

  const result = useMemo(() => {
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

        <div className="form-grid">
          <label className="field">
            <span className="field-label">Phiên bản trước</span>
            <select value={beforeId} onChange={(event) => setBeforeId(event.target.value)}>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.source.version} — {version.source.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Phiên bản sau</span>
            <select value={afterId} onChange={(event) => setAfterId(event.target.value)}>
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

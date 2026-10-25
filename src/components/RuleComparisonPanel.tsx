import { useMemo, useState } from 'react'
import demoRules from '../../data/admission-rule-comparison/demo-rules.json'
import { toAdmissionRuleVersionPair } from '../adapters/admissionRuleVersionAdapter'
import { integratedRuleComparisonService } from '../services/integratedRuleComparisonService'
import type { AdmissionRuleVersion } from '../logic/ruleComparison'

const versions = demoRules.versions as AdmissionRuleVersion[]

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
      <span className="data-note-icon">↔</span>
      <div>
        <strong id="rule-comparison-title">So sánh thay đổi quy định tuyển sinh</strong>
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
            <p><strong>Mức độ ảnh hưởng:</strong> {result.value.explanation.impactLevel}</p>
            <p>{result.value.explanation.summary}</p>
            <p>{result.value.explanation.impactAssessment}</p>
            <p><strong>Trạng thái dữ liệu:</strong> {result.value.comparison.dataStatus}</p>
            <strong>Trường dữ liệu thay đổi</strong>
            {result.value.comparison.changes.length ? (
              <ul>
                {result.value.comparison.changes.map((change, index) => (
                  <li key={`${change.field}-${index}`}>
                    <strong>{change.field}</strong> — {change.changeType}: {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                  </li>
                ))}
              </ul>
            ) : <p>Không phát hiện khác biệt trong các trường được so sánh.</p>}
            <strong>Chương trình có thể liên quan</strong>
            <p>{result.value.comparison.affectedPrograms.length
              ? result.value.comparison.affectedPrograms.join(', ')
              : 'Chưa đủ căn cứ định danh chương trình cụ thể.'}</p>
            <strong>Nguồn và giới hạn</strong>
            <ul>
              {result.value.explanation.sourceDisclosure.map((item, index) => <li key={index}>{item}</li>)}
              {result.value.explanation.unknowns.map((item, index) => <li key={`unknown-${index}`}>{item}</li>)}
              {result.value.explanation.limitations.map((item, index) => <li key={`limit-${index}`}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

import { useMemo, useState } from 'react'
import demoRules from '../../data/admission-rule-comparison/demo-rules.json'
import { toAdmissionRuleVersionPair } from '../adapters/admissionRuleVersionAdapter'
import { compareAdmissionRuleVersions } from '../services/admissionRuleComparisonService'
import type { AdmissionRuleVersion } from '../logic/ruleComparison'

const versions = demoRules.versions as AdmissionRuleVersion[]

export default function RuleComparisonPanel() {
  const [beforeId, setBeforeId] = useState(versions[0]?.id ?? '')
  const [afterId, setAfterId] = useState(versions[1]?.id ?? '')

  const result = useMemo(() => {
    const before = versions.find((version) => version.id === beforeId)
    const after = versions.find((version) => version.id === afterId)
    const pair = toAdmissionRuleVersionPair(before, after)
    if (!pair.ok) return { error: pair.error } as const
    return { value: compareAdmissionRuleVersions(pair.value.before, pair.value.after) } as const
  }, [beforeId, afterId])

  return (
    <section className="section-wrap" aria-labelledby="rule-comparison-title" style={{ paddingTop: 48, paddingBottom: 64 }}>
      <div className="section-intro">
        <div>
          <span className="eyebrow">BƯỚC 02 / THEO DÕI THAY ĐỔI</span>
          <h2 id="rule-comparison-title">So sánh hai phiên bản quy định.</h2>
        </div>
        <p>Chỉ so sánh khi có đủ hai snapshot độc lập, mỗi snapshot có định danh và provenance riêng.</p>
      </div>

      <div className="form-card" style={{ display: 'grid', gap: 18 }}>
        <p role="note" style={{ margin: 0, padding: 12, borderRadius: 8, background: '#fff4df', color: '#704b12' }}>
          Dữ liệu bên dưới là kịch bản mô phỏng nội bộ, không phải quy định tuyển sinh chính thức.
        </p>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Phiên bản trước</span>
            <select value={beforeId} onChange={(event) => setBeforeId(event.target.value)}>
              {versions.map((version) => <option key={version.id} value={version.id}>{version.source.version} — {version.source.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Phiên bản sau</span>
            <select value={afterId} onChange={(event) => setAfterId(event.target.value)}>
              {versions.map((version) => <option key={version.id} value={version.id}>{version.source.version} — {version.source.name}</option>)}
            </select>
          </label>
        </div>

        {'error' in result ? (
          <p role="alert">{result.error}</p>
        ) : (
          <div aria-live="polite" style={{ display: 'grid', gap: 12 }}>
            <div>
              <strong>{result.value.explanation.impactLevel.toUpperCase()}</strong>
              <p>{result.value.explanation.summary}</p>
              <p>{result.value.explanation.impactAssessment}</p>
            </div>
            <div>
              <h3>Trường dữ liệu thay đổi</h3>
              {result.value.comparison.changes.length ? (
                <ul>{result.value.comparison.changes.map((change, index) => (
                  <li key={`${change.field}-${index}`}>
                    <strong>{change.field}</strong> — {change.changeType}: {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                  </li>
                ))}</ul>
              ) : <p>Không phát hiện khác biệt trong các trường được so sánh.</p>}
            </div>
            <div>
              <h3>Chương trình có thể liên quan</h3>
              <p>{result.value.comparison.affectedPrograms.length
                ? result.value.comparison.affectedPrograms.join(', ')
                : 'Chưa đủ căn cứ định danh chương trình cụ thể.'}</p>
            </div>
            <div>
              <h3>Nguồn và giới hạn</h3>
              <ul>
                {result.value.explanation.sourceDisclosure.map((item, index) => <li key={index}>{item}</li>)}
                {result.value.explanation.unknowns.map((item, index) => <li key={`unknown-${index}`}>{item}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

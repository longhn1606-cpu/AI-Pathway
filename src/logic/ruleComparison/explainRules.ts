import type { RuleChange, RuleComparison, RuleExplanation, RuleValue } from './types'

function formatValue(value: RuleValue | undefined): string {
  if (value === undefined) return 'không có trường dữ liệu'
  if (value === null) return 'null (không có dữ liệu)'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function describeChange(change: RuleChange): string {
  if (change.changeType === 'added') return `Thêm “${change.field}” với giá trị ${formatValue(change.newValue)}.`
  if (change.changeType === 'removed') return `Xóa “${change.field}” (giá trị trước đó: ${formatValue(change.oldValue)}).`
  return `“${change.field}” thay đổi từ ${formatValue(change.oldValue)} thành ${formatValue(change.newValue)}.`
}

function formatVnd(value: number | null): string {
  return value === null ? 'chưa có dữ liệu' : `${new Intl.NumberFormat('vi-VN').format(value)} đồng/năm`
}

function assessImpact(comparison: RuleComparison): { level: 'high' | 'medium' | 'low' | 'requires_review'; assessment: string } {
  if (!comparison.comparableScope) {
    return { level: 'requires_review', assessment: 'Không thể đánh giá tác động vì hai snapshot không cùng phạm vi trường/ngành.' }
  }
  const tuitionChanged = comparison.changes.some((change) => change.field === 'tuition' || change.field.startsWith('tuition.'))
  const tuitionSnapshots = [comparison.tuition.old, comparison.tuition.new]
  const tuitionEvidenceNeedsReview = tuitionChanged && (
    comparison.tuitionStatus !== 'verified'
    || tuitionSnapshots.some((snapshot) => !snapshot || snapshot.dataStatus !== 'verified'
      || snapshot.appliedYear === null || !snapshot.sourceUrl
      || snapshot.minVndPerYear === null || snapshot.maxVndPerYear === null)
  )
  const needsReview = comparison.dataStatus !== 'verified'
    || comparison.sources.some((source) => !source.url || source.appliedYear === null)
    || tuitionEvidenceNeedsReview
  if (needsReview) {
    return { level: 'requires_review', assessment: 'Cần rà soát nguồn và năm áp dụng trước khi kết luận mức độ ảnh hưởng. Kết quả hiện chỉ phản ánh dữ liệu đầu vào.' }
  }

  const fields = comparison.changes.map((change) => change.field.toLowerCase())
  if (fields.some((field) => field === 'admissionmethod' || field.includes('minimumscore')
    || field.includes('requiredsubject') || field.includes('scorescale') || field.includes('priorityrules'))) {
    return { level: 'high', assessment: 'Có thay đổi ở phương thức hoặc điều kiện có thể liên quan trực tiếp đến tiêu chí xét tuyển. Cần đối chiếu điều kiện cụ thể trong văn bản nguồn.' }
  }
  if (fields.some((field) => field === 'tuition' || field.startsWith('tuition.')
    || field.includes('combination') || field.includes('priority') || field.startsWith('conditions.'))) {
    return { level: 'medium', assessment: 'Có thay đổi ở thông tin tuyển sinh hoặc học phí cần được kiểm tra trước khi lựa chọn phương thức hay lập kế hoạch tài chính.' }
  }
  return {
    level: 'low',
    assessment: comparison.changes.length === 0
      ? 'Không phát hiện thay đổi trong các trường dữ liệu được so sánh; điều này không chứng minh toàn bộ văn bản không thay đổi.'
      : 'Các khác biệt phát hiện được chủ yếu nằm ở metadata hoặc định danh; vẫn cần kiểm tra văn bản nguồn.',
  }
}

/** Deterministic explanation derived from the comparison result; no external inference. */
export function explainRules(comparison: RuleComparison): RuleExplanation {
  const whatChanged = comparison.changes.map(describeChange)
  if (comparison.changes.length === 0 && comparison.comparableScope) {
    whatChanged.push('Không phát hiện thay đổi trong các trường dữ liệu được đưa vào so sánh.')
  }

  const potentiallyAffected: string[] = []
  if (!comparison.affectedMajors.length) {
    potentiallyAffected.push('Chưa đủ ID khớp để xác định ngành/chương trình cụ thể bị ảnh hưởng.')
  } else {
    potentiallyAffected.push(`Ngành/chương trình có programId ${comparison.affectedMajors[0]} được định danh ở cả hai phiên bản.`)
  }
  if (comparison.affectedUniversities.length) {
    potentiallyAffected.push(`Trường có institutionId ${comparison.affectedUniversities[0]} được định danh ở cả hai phiên bản.`)
  }
  if (!comparison.affectedUniversities.length && !comparison.affectedMajors.length) {
    potentiallyAffected.push('Chưa đủ ID khớp để xác định trường cụ thể bị ảnh hưởng.')
  }

  const tuitionChanges = comparison.changes.filter((change) => change.field === 'tuition' || change.field.startsWith('tuition.'))
  const tuitionImpact = !comparison.comparableScope
    ? ['Không so sánh tác động học phí vì hai snapshot không cùng phạm vi trường/ngành.']
    : tuitionChanges.length
      ? tuitionChanges.map(describeChange)
      : comparison.tuitionStatus === null
        ? ['Chưa có snapshot học phí để so sánh. Không thể kết luận học phí giữ nguyên.']
        : ['Không phát hiện thay đổi trong các trường học phí được cung cấp.']

  if (comparison.comparableScope) {
    for (const [label, snapshot] of [['Phiên bản cũ', comparison.tuition.old], ['Phiên bản mới', comparison.tuition.new]] as const) {
      tuitionImpact.push(!snapshot
        ? `${label}: chưa có snapshot học phí.`
        : `${label}: ${formatVnd(snapshot.minVndPerYear)} – ${formatVnd(snapshot.maxVndPerYear)}; năm áp dụng: ${snapshot.appliedYear ?? 'chưa rõ'}; trạng thái: ${snapshot.dataStatus}.`)
    }
  }
  if (comparison.tuitionStatus === 'simulated') tuitionImpact.push('Dữ liệu học phí đang ở trạng thái simulated; chỉ dùng để minh họa.')
  if (comparison.tuitionStatus === 'needs_review') tuitionImpact.push('Dữ liệu học phí cần được rà soát trước khi sử dụng.')
  if (comparison.tuitionStatus === null) tuitionImpact.push('Không có dữ liệu học phí đủ điều kiện để đưa ra nhận định định lượng.')

  const nextSteps = [
    'Mở và đối chiếu tài liệu nguồn của cả hai phiên bản trước khi sử dụng kết quả.',
    'Kiểm tra năm áp dụng, đối tượng áp dụng và phương thức tuyển sinh trong văn bản gốc.',
    'Đối chiếu học phí theo đúng năm học, chương trình đào tạo và hình thức đào tạo; hỏi bộ phận tuyển sinh nếu còn thiếu.',
    'Xác minh thay đổi với đơn vị tuyển sinh của trường nếu thông tin ảnh hưởng đến quyết định đăng ký.',
  ]
  const sourceDisclosure = comparison.sources.map((source) => {
    const year = source.appliedYear === null ? 'chưa xác định năm áp dụng' : `năm áp dụng ${source.appliedYear}`
    return `${source.name} — ${year} — phiên bản ${source.version} — trạng thái ${source.dataStatus} — ${source.url ?? 'không có URL'}.`
  })
  const unknowns = [
    ...comparison.limitations,
    'Module không tự xác minh hiệu lực pháp lý của văn bản hoặc tính chính xác của URL nguồn.',
    'Module không suy ra điều kiện trúng tuyển, khả năng trúng tuyển hoặc tác động ngoài các trường dữ liệu được cung cấp.',
  ]
  const impact = assessImpact(comparison)

  return {
    mode: 'template',
    impactLevel: impact.level,
    impactAssessment: impact.assessment,
    summary: comparison.dataStatus === 'simulated'
      ? 'Đây là kết quả so sánh dữ liệu mô phỏng, không phải kết luận về quy định tuyển sinh chính thức.'
      : 'Đây là bản giải thích theo mẫu dựa trên dữ liệu so sánh được cung cấp; cần đọc nguồn gốc trước khi áp dụng.',
    whatChanged,
    potentiallyAffected,
    tuitionImpact,
    nextSteps,
    unknowns,
    sourceDisclosure,
    limitations: [...comparison.limitations],
  }
}

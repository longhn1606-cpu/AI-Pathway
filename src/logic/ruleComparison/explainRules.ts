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
  if (value === null) return 'chưa có dữ liệu'
  return `${new Intl.NumberFormat('vi-VN').format(value)} đồng/năm`
}

function assessImpact(comparison: RuleComparison): { level: 'high' | 'medium' | 'low' | 'requires_review'; assessment: string } {
  const needsReview = comparison.dataStatus !== 'verified'
    || comparison.sources.some((source) => !source.url || source.appliedYear === null)
  if (needsReview) {
    return {
      level: 'requires_review',
      assessment: 'Cần rà soát nguồn và năm áp dụng trước khi kết luận mức độ ảnh hưởng. Kết quả hiện chỉ phản ánh dữ liệu đầu vào.',
    }
  }

  const fields = comparison.changes.map((change) => change.field.toLowerCase())
  const highImpact = fields.some((field) =>
    field === 'admissionmethod'
    || field.includes('minimumscore')
    || field.includes('requiredsubject')
    || field.includes('requiredsubjects')
    || field.includes('scorescale')
    || field.includes('priorityrules'),
  )
  if (highImpact) {
    return {
      level: 'high',
      assessment: 'Có thay đổi ở phương thức hoặc điều kiện có thể liên quan trực tiếp đến khả năng đáp ứng tiêu chí xét tuyển. Học sinh cần đối chiếu điều kiện cụ thể của mình.',
    }
  }

  const mediumImpact = fields.some((field) =>
    field.startsWith('tuition.')
    || field.includes('combination')
    || field.includes('priority')
    || field.startsWith('conditions.'),
  )
  if (mediumImpact) {
    return {
      level: 'medium',
      assessment: 'Có thay đổi về thông tin cần được học sinh kiểm tra trước khi lựa chọn phương thức hoặc lập kế hoạch tài chính.',
    }
  }

  return {
    level: 'low',
    assessment: comparison.changes.length === 0
      ? 'Không phát hiện thay đổi trong các trường dữ liệu được so sánh; điều này không chứng minh toàn bộ văn bản không thay đổi.'
      : 'Các khác biệt phát hiện được chủ yếu nằm ở thông tin định danh hoặc metadata. Vẫn cần kiểm tra văn bản nguồn.',
  }
}

/** Deterministic, source-bounded explanation. This function does not call an AI API. */
export function explainRules(comparison: RuleComparison): RuleExplanation {
  const whatChanged = comparison.changes.map(describeChange)
  const potentiallyAffected = comparison.affectedPrograms.length > 0
    ? comparison.affectedPrograms.map((programId) => `Chương trình có programId ${programId} được định danh ở cả hai phiên bản.`)
    : ['Chưa xác định được chương trình cụ thể bị ảnh hưởng từ các ID hiện có.']

  const tuitionChanges = comparison.changes.filter((change) => change.field.startsWith('tuition'))
  const tuitionImpact = tuitionChanges.length
    ? tuitionChanges.map(describeChange)
    : comparison.tuitionStatus === null
      ? ['Chưa có snapshot học phí để so sánh. Không thể kết luận học phí giữ nguyên.']
      : ['Không phát hiện thay đổi trong các trường học phí được cung cấp.']

  for (const [label, snapshot] of [['Phiên bản cũ', comparison.tuition.old], ['Phiên bản mới', comparison.tuition.new]] as const) {
    if (!snapshot) {
      tuitionImpact.push(`${label}: chưa có snapshot học phí.`)
      continue
    }
    tuitionImpact.push(
      `${label}: ${formatVnd(snapshot.minVndPerYear)} – ${formatVnd(snapshot.maxVndPerYear)}; năm áp dụng: ${snapshot.appliedYear ?? 'chưa rõ'}; trạng thái: ${snapshot.dataStatus}.`,
    )
  }

  const nextSteps = [
    'Mở và đối chiếu tài liệu nguồn của cả hai phiên bản trước khi sử dụng kết quả.',
    'Kiểm tra năm áp dụng, đối tượng áp dụng và phương thức tuyển sinh trong văn bản gốc.',
    'Đối chiếu học phí theo đúng năm học, chương trình đào tạo và hình thức đào tạo; hỏi bộ phận tuyển sinh nếu còn thiếu.',
    'Xác minh thay đổi với đơn vị tuyển sinh của trường nếu thông tin ảnh hưởng đến quyết định đăng ký.',
  ]

  const sourceDisclosure = comparison.sources.map((source) => {
    const year = source.appliedYear === null ? 'chưa xác định năm áp dụng' : `năm áp dụng ${source.appliedYear}`
    const url = source.url ?? 'không có URL'
    return `${source.name} — ${year} — phiên bản ${source.version} — trạng thái ${source.dataStatus} — ${url}.`
  })

  const unknowns = [
    ...comparison.limitations,
    'Module không tự xác minh hiệu lực pháp lý của văn bản hoặc tính chính xác của URL nguồn.',
    'Module không suy ra điều kiện trúng tuyển, khả năng trúng tuyển hoặc tác động ngoài các trường dữ liệu được cung cấp.',
  ]

  if (comparison.changes.length === 0) whatChanged.push('Không phát hiện thay đổi trong các trường dữ liệu được đưa vào so sánh.')
  if (comparison.tuitionStatus === 'simulated') tuitionImpact.push('Dữ liệu học phí đang ở trạng thái simulated; chỉ dùng để minh họa.')
  if (comparison.tuitionStatus === 'needs_review') tuitionImpact.push('Dữ liệu học phí cần được rà soát trước khi sử dụng.')
  if (comparison.tuitionStatus === null) tuitionImpact.push('Không có dữ liệu học phí đủ điều kiện để đưa ra nhận định định lượng.')

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

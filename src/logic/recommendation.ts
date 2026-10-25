import type {
  AdmissionMethod,
  DataStatus,
  GeographicRegion,
  RecommendationResult,
  StudentProfile,
  University,
  UniversityProgram,
} from '../types'

export interface RecommendationInput {
  profile: StudentProfile
  universities: University[]
  programs: UniversityProgram[]
}

export interface ExcludedProgram {
  programId: string
  reasons: string[]
}

export interface RecommendationResponse {
  results: RecommendationResult[]
  excluded: ExcludedProgram[]
  warnings: string[]
}

export interface RecommendationComparison {
  added: RecommendationResult[]
  removed: RecommendationResult[]
  retained: RecommendationResult[]
}

type EvaluatedProgram = {
  result: RecommendationResult
  rankScore: number
}

const REGION_LABELS: Record<Exclude<GeographicRegion, 'nationwide'>, string> = {
  north: 'miền Bắc',
  central: 'miền Trung',
  south: 'miền Nam',
}

const METHOD_LABELS: Record<AdmissionMethod, string> = {
  high_school_exam: 'thi tốt nghiệp THPT',
  academic_record: 'học bạ',
  competency_assessment: 'đánh giá năng lực',
  direct_admission: 'xét tuyển thẳng',
  other: 'phương thức khác',
}

const MAJOR_ALIASES: Record<string, string> = {
  'technology': 'technology',
  'tech': 'technology',
  'engineering': 'technology',
  'cong nghe': 'technology',
  'cong nghe va ky thuat': 'technology',
  'ky thuat': 'technology',
  'it': 'technology',
  'cntt': 'technology',
  'computer science': 'technology',
  'khoa hoc may tinh': 'technology',
  'business': 'business',
  'economics': 'business',
  'kinh te': 'business',
  'kinh doanh': 'business',
  'kinh te va kinh doanh': 'business',
  'health': 'health',
  'healthcare': 'health',
  'y te': 'health',
  'suc khoe': 'health',
  'y te va suc khoe': 'health',
  'education': 'education',
  'giao duc': 'education',
  'giao duc va xa hoi': 'education',
  'arts': 'arts',
  'art': 'arts',
  'design': 'arts',
  'nghe thuat': 'arts',
  'sang tao': 'arts',
  'nghe thuat va sang tao': 'arts',
  'other': 'other',
  'khac': 'other',
  'nhom nganh khac': 'other',
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function canonicalMajor(value: string): string {
  const normalized = normalizeText(value)
  return MAJOR_ALIASES[normalized] ?? normalized
}

function regionMatches(
  preferredRegions: GeographicRegion[],
  region: University['region'],
): boolean {
  if (preferredRegions.length === 0 || preferredRegions.includes('nationwide')) return true
  return preferredRegions.includes(region)
}

function effectiveDataStatus(statuses: Array<DataStatus | undefined>): DataStatus {
  if (statuses.includes('simulated')) return 'simulated'
  if (statuses.includes('needs_review') || statuses.some((status) => status === undefined)) {
    return 'needs_review'
  }
  return 'verified'
}

/**
 * Checks whether a source URL is structurally usable.
 * This is syntax validation only; it does not fetch the URL or prove ownership.
 */
function isUsableSourceUrl(value: string): boolean {
  if (!value.trim()) return false

  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol)) return false
    if (!url.hostname || url.username || url.password) return false

    const hostname = url.hostname.toLowerCase()
    if (
      hostname === 'example.com' ||
      hostname === 'example.net' ||
      hostname === 'example.org' ||
      hostname.endsWith('.invalid') ||
      hostname.endsWith('.example')
    ) return false

    return true
  } catch {
    return false
  }
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' VND/năm'
}

function getMethodStatuses(program: UniversityProgram): DataStatus[] {
  return program.admissionMethods.flatMap((method) => [
    method.status,
    ...program.sources
      .filter((source) => method.sourceIds.includes(source.title))
      .map((source) => source.status),
  ])
}

function evaluateProgram(
  input: RecommendationInput,
  program: UniversityProgram,
  university: University,
): { evaluated?: EvaluatedProgram; exclusion?: ExcludedProgram; globalWarnings: string[] } {
  const { profile } = input
  const reasons: string[] = []
  const warnings: string[] = []
  const exclusionReasons: string[] = []
  const globalWarnings: string[] = []
  let rankScore = 0

  if (!regionMatches(profile.preferredRegions, university.region)) {
    exclusionReasons.push(`Trường thuộc ${REGION_LABELS[university.region]}, ngoài khu vực ưu tiên.`)
  } else if (profile.preferredRegions.length > 0) {
    reasons.push(profile.preferredRegions.includes('nationwide')
      ? 'Phù hợp lựa chọn khu vực toàn quốc.'
      : `Trường thuộc khu vực ưu tiên: ${REGION_LABELS[university.region]}.`)
    rankScore += 2
  }

  const interests = profile.interests.map(canonicalMajor).filter(Boolean)
  if (interests.length > 0) {
    const programMajor = canonicalMajor(program.majorGroup)
    if (interests.includes(programMajor)) {
      reasons.push(`Nhóm ngành “${program.majorGroup}” khớp sở thích đã khai báo.`)
      rankScore += 5
    } else {
      exclusionReasons.push(`Nhóm ngành “${program.majorGroup}” không khớp nhóm ngành quan tâm đã khai báo.`)
    }
  }

  if (profile.annualBudgetVnd !== null) {
    const minTuition = program.tuitionMinVndPerYear
    const maxTuition = program.tuitionMaxVndPerYear
    if (minTuition === null || maxTuition === null) {
      warnings.push('Chưa đủ dữ liệu học phí tối thiểu/tối đa để đánh giá đầy đủ ngân sách.')
    } else if (minTuition > profile.annualBudgetVnd) {
      exclusionReasons.push(
        `Học phí tối thiểu ${formatVnd(minTuition)} vượt ngân sách ${formatVnd(profile.annualBudgetVnd)}.`,
      )
    } else if (maxTuition > profile.annualBudgetVnd) {
      reasons.push(`Học phí tối thiểu nằm trong ngân sách ${formatVnd(profile.annualBudgetVnd)}.`)
      warnings.push(
        `Rủi ro chi phí: học phí có thể lên tới ${formatVnd(maxTuition)}, vượt ngân sách ${formatVnd(profile.annualBudgetVnd)}.`,
      )
      rankScore += 1
    } else {
      reasons.push('Khoảng học phí đã ghi nhận nằm trong ngân sách năm.')
      rankScore += 3
    }
    if (program.tuitionYear === null) {
      warnings.push('Chưa có năm áp dụng của dữ liệu học phí; cần xác minh trước khi quyết định.')
    }
  } else {
    warnings.push('Chưa cung cấp ngân sách năm; chưa thể đánh giá mức phù hợp chi phí.')
  }

  if (profile.expectedScore === null || profile.scoreScale === null) {
    warnings.push('Thiếu điểm dự kiến hoặc thang điểm; chưa thể đối chiếu điểm chuẩn lịch sử.')
  } else if (
    program.historicalCutoff === null ||
    program.cutoffYear === null ||
    program.cutoffScale === null
  ) {
    warnings.push('Chưa đủ dữ liệu điểm chuẩn lịch sử, năm áp dụng hoặc thang điểm để đối chiếu.')
  } else if (profile.scoreScale !== program.cutoffScale) {
    warnings.push(
      `Không so sánh điểm trực tiếp: hồ sơ dùng thang ${profile.scoreScale}, điểm chuẩn lịch sử dùng thang ${program.cutoffScale}.`,
    )
  } else {
    if (profile.expectedScore >= program.historicalCutoff) {
      reasons.push(
        `Điểm dự kiến đang bằng hoặc cao hơn điểm chuẩn tham khảo năm ${program.cutoffYear}; đây không phải cam kết tuyển sinh.`,
      )
      rankScore += 2
    } else {
      warnings.push(
        `Điểm dự kiến thấp hơn điểm chuẩn tham khảo năm ${program.cutoffYear}; điểm chuẩn lịch sử không dự đoán chắc chắn kết quả năm tới.`,
      )
    }
  }

  if (profile.preferredMethods.length > 0) {
    if (program.admissionMethods.length === 0) {
      warnings.push('Chưa có dữ liệu phương thức tuyển sinh để đối chiếu lựa chọn ưu tiên.')
    } else {
      const methods = new Set(program.admissionMethods.map((item) => item.method))
      const matchingMethods = profile.preferredMethods.filter((method) => methods.has(method))
      if (matchingMethods.length > 0) {
        reasons.push(`Có phương thức tuyển sinh ưu tiên: ${matchingMethods.map((method) => METHOD_LABELS[method]).join(', ')}.`)
        rankScore += 3
      } else {
        warnings.push('Chưa ghi nhận phương thức tuyển sinh nào trùng lựa chọn ưu tiên; cần kiểm tra đề án tuyển sinh.')
      }
    }
  }

  if (program.tuitionMinVndPerYear === null || program.tuitionMaxVndPerYear === null) {
    if (!warnings.some((warning) => warning.includes('dữ liệu học phí'))) {
      warnings.push('Thiếu dữ liệu học phí; không thể kết luận chương trình phù hợp ngân sách.')
    }
  }

  const allSources = [...university.sources, ...program.sources]
  const hasMissingSourceCoverage =
    university.sources.length === 0 ||
    program.sources.length === 0 ||
    program.admissionMethods.some((method) =>
      method.sourceIds.length === 0 ||
      method.sourceIds.some((sourceId) =>
        !program.sources.some((source) => source.title === sourceId),
      ),
    )
  const hasInvalidSourceUrl = allSources.some((source) => !isUsableSourceUrl(source.url))

  if (hasMissingSourceCoverage) {
    warnings.push(
      'Thiếu hoặc chưa liên kết đầy đủ nguồn dữ liệu của trường/chương trình/phương thức; cần rà soát nguồn chính thức.',
    )
  }
  if (hasInvalidSourceUrl) {
    warnings.push(
      'Có URL nguồn dữ liệu trống hoặc không hợp lệ; trạng thái xác minh cần được rà soát.',
    )
  }

  const dataStatus = effectiveDataStatus([
    university.status,
    ...university.sources.map((source) => source.status),
    program.status,
    ...program.sources.map((source) => source.status),
    ...getMethodStatuses(program),
    ...(hasMissingSourceCoverage || hasInvalidSourceUrl ? ['needs_review' as const] : []),
  ])

  if (dataStatus === 'simulated') {
    warnings.push('Có dữ liệu mô phỏng phục vụ demo; không phải thông tin tuyển sinh chính thức.')
  } else if (dataStatus === 'needs_review') {
    warnings.push('Một phần dữ liệu đang cần rà soát; hãy kiểm tra nguồn chính thức trước khi sử dụng.')
  }

  if (exclusionReasons.length > 0) {
    return {
      exclusion: { programId: program.id, reasons: exclusionReasons },
      globalWarnings,
    }
  }

  if (reasons.length === 0) {
    reasons.push('Chưa có tiêu chí đủ dữ liệu để xác nhận mức phù hợp; kết quả được giữ lại để người dùng xem xét.')
  }

  return {
    evaluated: {
      result: {
        programId: program.id,
        suitabilityReasons: reasons,
        warnings,
        dataStatus,
      },
      rankScore,
    },
    globalWarnings,
  }
}

/**
 * Recommends programs using only the supplied structured data.
 * It does not mutate input arrays/objects and never treats historical cutoffs as guarantees.
 */
export function recommendPrograms(input: RecommendationInput): RecommendationResponse {
  const warnings: string[] = []
  let evaluationInput = input
  let safeProfile = input.profile

  const scoreScale = input.profile.scoreScale
  const expectedScore = input.profile.expectedScore
  const invalidScale = scoreScale !== null
    && (!Number.isFinite(scoreScale) || scoreScale <= 0)
  const invalidScore = expectedScore !== null && scoreScale !== null
    && (!Number.isFinite(expectedScore) || expectedScore < 0 || expectedScore > scoreScale)

  if (invalidScale || invalidScore) {
    safeProfile = { ...safeProfile, expectedScore: null, scoreScale: null }
    warnings.push('Điểm dự kiến hoặc thang điểm không hợp lệ (điểm phải nằm trong khoảng 0 đến thang điểm dương); đã bỏ đối chiếu điểm chuẩn.')
  }

  if (input.profile.annualBudgetVnd !== null
    && (!Number.isFinite(input.profile.annualBudgetVnd) || input.profile.annualBudgetVnd < 0)) {
    safeProfile = { ...safeProfile, annualBudgetVnd: null }
    warnings.push('Ngân sách năm không hợp lệ; đã bỏ đánh giá ngân sách thay vì diễn giải thành 0.')
  }

  if (safeProfile !== input.profile) {
    evaluationInput = { ...input, profile: safeProfile }
  }

  const universityById = new Map<string, University>()

  for (const university of input.universities) {
    if (universityById.has(university.id)) {
      warnings.push(`ID trường bị trùng: “${university.id}”; chỉ bản ghi đầu tiên được dùng.`)
      continue
    }
    universityById.set(university.id, university)
  }

  const results: EvaluatedProgram[] = []
  const excluded: ExcludedProgram[] = []
  const seenProgramIds = new Set<string>()

  for (const program of input.programs) {
    if (seenProgramIds.has(program.id)) {
      warnings.push(`ID chương trình bị trùng: “${program.id}”; bản ghi trùng đã bị bỏ qua.`)
      continue
    }
    seenProgramIds.add(program.id)

    const university = universityById.get(program.universityId)
    if (!university) {
      excluded.push({
        programId: program.id,
        reasons: [`Không tìm thấy trường có ID “${program.universityId}”; cần sửa liên kết dữ liệu.`],
      })
      continue
    }

    const evaluated = evaluateProgram(evaluationInput, program, university)
    if (evaluated.exclusion) excluded.push(evaluated.exclusion)
    if (evaluated.evaluated) results.push(evaluated.evaluated)
    warnings.push(...evaluated.globalWarnings)
  }

  results.sort((a, b) => b.rankScore - a.rankScore || a.result.programId.localeCompare(b.result.programId))

  if (input.programs.length === 0) {
    warnings.push('Chưa có chương trình nào trong nguồn dữ liệu để đánh giá.')
  } else if (results.length === 0) {
    warnings.push('Không có chương trình nào đáp ứng các tiêu chí lọc hiện tại; hãy cân nhắc mở rộng khu vực hoặc nhóm ngành.')
  }

  return {
    results: results.map((item) => item.result),
    excluded,
    warnings: [...new Set(warnings)],
  }
}

/**
 * Compares recommendation membership before and after a profile change.
 * Retained entries contain the after-state result for each program still recommended.
 */
export function compareRecommendations(
  before: RecommendationInput,
  after: RecommendationInput,
): RecommendationComparison {
  const beforeResults = recommendPrograms(before).results
  const afterResults = recommendPrograms(after).results
  const beforeById = new Map(beforeResults.map((result) => [result.programId, result]))
  const afterById = new Map(afterResults.map((result) => [result.programId, result]))

  return {
    added: afterResults.filter((result) => !beforeById.has(result.programId)),
    removed: beforeResults.filter((result) => !afterById.has(result.programId)),
    retained: afterResults.filter((result) => beforeById.has(result.programId)),
  }
}

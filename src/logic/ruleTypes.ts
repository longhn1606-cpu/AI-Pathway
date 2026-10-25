/**
 * Type riêng của module so sánh quy định (Thành viên 4).
 * Không định nghĩa lại type của schema chung — chỉ import DataStatus / AdmissionMethod từ src/types.
 * Nếu schema chung thêm/đổi giá trị enum, các Record nhãn bên dưới sẽ báo lỗi biên dịch (chủ ý).
 */
import type { AdmissionMethod, DataStatus } from '../types'

export type { AdmissionMethod, DataStatus }

// ---------------------------------------------------------------------------
// Giá trị dữ liệu (JSON-like)
// ---------------------------------------------------------------------------

/** Giá trị JSON hợp lệ. `null` nghĩa là "chưa có dữ liệu" — KHÔNG phải 0. */
export type RuleValue =
  | string
  | number
  | boolean
  | null
  | RuleValue[]
  | { [key: string]: RuleValue | undefined }

/** Object JSON. Thuộc tính `undefined` được coi như không tồn tại. */
export type RuleObject = { [key: string]: RuleValue | undefined }

// ---------------------------------------------------------------------------
// Dữ liệu phiên bản quy định
// ---------------------------------------------------------------------------

export interface RuleSource {
  name: string
  url: string | null
  appliedYear: number | null
  version: string
  checkedAt: string | null
  dataStatus: DataStatus
}

/**
 * Điều kiện của một phiên bản quy định.
 * Các khóa đã biết được định kiểu cụ thể; khóa lạ (dữ liệu mới của Thành viên 1)
 * vẫn so sánh được nhờ index signature kiểu RuleValue (không dùng `unknown`).
 */
export interface RuleConditions {
  minimumScore?: number | null
  /** Thang điểm của minimumScore (ví dụ 30). Không tự suy ra khi thiếu. */
  scoreScale?: number | null
  subjectCombination?: string[]
  interviewRequired?: boolean | null
  foreignLanguageCertificateRequired?: boolean | null
  notes?: string | null
  [extraCondition: string]: RuleValue | undefined
}

export interface AdmissionRuleVersion {
  id: string
  institutionId: string
  institutionName: string
  programId: string | null
  programName: string | null
  source: RuleSource
  admissionMethod: AdmissionMethod | null
  conditions: RuleConditions
}

// ---------------------------------------------------------------------------
// Kết quả so sánh
// ---------------------------------------------------------------------------

export type RuleChangeType = 'added' | 'removed' | 'modified'

/** Phần tử thêm/bỏ khi so sánh hai mảng như hai tập hợp. */
export interface ArrayDelta {
  added: RuleValue[]
  removed: RuleValue[]
}

export interface RuleChange {
  /** Đường dẫn dạng chấm, ví dụ "conditions.minimumScore". */
  field: string
  changeType: RuleChangeType
  /** `undefined` = trường không tồn tại ở phiên bản cũ. `null` = tồn tại nhưng chưa có dữ liệu. */
  oldValue: RuleValue | undefined
  /** `undefined` = trường không tồn tại ở phiên bản mới. `null` = tồn tại nhưng chưa có dữ liệu. */
  newValue: RuleValue | undefined
  /** Chỉ có khi cả hai giá trị là mảng. */
  arrayDelta?: ArrayDelta
}

/** Đối tượng bị ảnh hưởng đã được XÁC ĐỊNH bằng mã định danh (không dùng tên gần giống). */
export interface AffectedTarget {
  institutionId: string
  institutionName: string
  programId: string
  programName: string | null
  /** Căn cứ xác định, để UI/giải thích hiển thị nguyên văn. */
  basis: string
}

export type AffectedStatus = 'determined' | 'undetermined' | 'not_applicable'

export interface RuleComparison {
  oldVersionId: string
  newVersionId: string
  changes: RuleChange[]
  /** Danh sách programId đã xác định được (suy ra từ affectedTargets). */
  affectedPrograms: string[]
  affectedTargets: AffectedTarget[]
  affectedStatus: AffectedStatus
  /** Lý do cho affectedStatus (luôn có). */
  affectedReason: string
  /** Dòng nguồn của hai phiên bản, theo sau là một dòng cho mỗi thay đổi. */
  evidence: string[]
  /** Mọi điều chưa đủ dữ liệu / cảnh báo. Banner giả lập/cần rà soát nằm đầu danh sách. */
  limitations: string[]
  oldSource: RuleSource
  newSource: RuleSource
  /** Trạng thái yếu nhất trong hai phiên bản (simulated < needs_review < verified). Không bao giờ tự nâng cấp. */
  overallDataStatus: DataStatus
}

// ---------------------------------------------------------------------------
// Nhãn hiển thị (Record đầy đủ => TypeScript báo lỗi nếu schema thêm/đổi enum)
// ---------------------------------------------------------------------------

export const DATA_STATUS_LABEL_VI: Record<DataStatus, string> = {
  verified: 'Đã xác minh',
  needs_review: 'Cần kiểm tra thêm',
  simulated: 'Giả lập',
}

export const ADMISSION_METHOD_LABEL_VI: Record<AdmissionMethod, string> = {
  high_school_exam: 'Xét điểm thi tốt nghiệp THPT',
  academic_record: 'Xét học bạ',
  competency_assessment: 'Xét điểm đánh giá năng lực',
  direct_admission: 'Xét tuyển thẳng',
  other: 'Phương thức khác',
}

export const CHANGE_TYPE_LABEL_VI: Record<RuleChangeType, string> = {
  added: 'Thêm',
  removed: 'Bỏ',
  modified: 'Sửa',
}

/** Danh sách giá trị hợp lệ suy ra từ Record ở trên (một nguồn sự thật duy nhất). */
export const DATA_STATUS_VALUES = Object.keys(DATA_STATUS_LABEL_VI) as DataStatus[]
export const ADMISSION_METHOD_VALUES = Object.keys(ADMISSION_METHOD_LABEL_VI) as AdmissionMethod[]

/** Thứ hạng độ tin cậy: số nhỏ = yếu hơn. */
export const DATA_STATUS_RANK: Record<DataStatus, number> = {
  simulated: 0,
  needs_review: 1,
  verified: 2,
}

export const SIMULATED_BANNER = 'TÌNH HUỐNG GIẢ LẬP — KHÔNG PHẢI QUY ĐỊNH TUYỂN SINH THẬT.'
export const NEEDS_REVIEW_BANNER =
  'DỮ LIỆU CẦN KIỂM TRA THÊM — chưa phải dữ liệu đã được xác minh từ nguồn chính thức.'

const FIELD_LABEL_VI: Readonly<Record<string, string>> = {
  admissionMethod: 'Phương thức tuyển sinh',
  'conditions.minimumScore': 'Điểm tối thiểu',
  'conditions.scoreScale': 'Thang điểm',
  'conditions.subjectCombination': 'Tổ hợp môn',
  'conditions.interviewRequired': 'Yêu cầu phỏng vấn',
  'conditions.foreignLanguageCertificateRequired': 'Yêu cầu chứng chỉ ngoại ngữ',
  'conditions.notes': 'Ghi chú điều kiện',
}

/** Nhãn dễ đọc; trường chưa có nhãn giữ nguyên đường dẫn gốc (không tự diễn giải). */
export function fieldLabel(field: string): string {
  const label = FIELD_LABEL_VI[field]
  return label === undefined ? field : `${label} (${field})`
}

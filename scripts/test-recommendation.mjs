import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function importTypeScript(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: true,
    },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}

const [{ recommendPrograms, compareRecommendations }, { universities }, { programs }] =
  await Promise.all([
    importTypeScript('src/logic/recommendation.ts'),
    importTypeScript('src/data/universities.ts'),
    importTypeScript('src/data/programs.ts'),
  ])

const baseProfile = {
  expectedScore: 24,
  scoreScale: 30,
  interests: [],
  preferredRegions: ['nationwide'],
  annualBudgetVnd: null,
  preferredMethods: [],
}

function input(overrides = {}, universityRecords = universities, programRecords = programs) {
  return {
    profile: { ...baseProfile, ...overrides },
    universities: universityRecords,
    programs: programRecords,
  }
}

let passed = 0
function test(name, callback) {
  try {
    callback()
    passed += 1
    process.stdout.write(`✓ ${name}\n`)
  } catch (error) {
    process.stderr.write(`✗ ${name}\n`)
    throw error
  }
}

test('hồ sơ hợp lệ có nhiều chương trình khi không áp bộ lọc hẹp', () => {
  const result = recommendPrograms(input())
  assert.equal(result.results.length, programs.length)
  assert.equal(result.excluded.length, 0)
})

test('không có chương trình phù hợp trả về mảng rỗng và cảnh báo', () => {
  const result = recommendPrograms(input({ interests: ['vũ trụ học không có trong dữ liệu'] }))
  assert.equal(result.results.length, 0)
  assert.ok(result.warnings.some((warning) => warning.includes('Không có chương trình nào')))
})

test('thiếu điểm dự kiến không làm chương trình bị loại chỉ vì thiếu điểm', () => {
  const result = recommendPrograms(input({ expectedScore: null }))
  assert.ok(result.results.length > 0)
  assert.ok(result.results.every((item) => item.warnings.some((warning) => warning.includes('Thiếu điểm dự kiến'))))
})

test('thiếu học phí không bị coi là chi phí bằng 0 hoặc tự động phù hợp ngân sách', () => {
  const result = recommendPrograms(input({ interests: ['arts'], annualBudgetVnd: 10000000 }))
  assert.equal(result.results.length, 1)
  assert.ok(result.results[0].warnings.some((warning) => warning.includes('dữ liệu học phí') && warning.includes('đánh giá')))
})

test('ngân sách thấp hơn học phí tối thiểu loại chương trình và nêu rõ lý do', () => {
  const result = recommendPrograms(input({ interests: ['technology'], annualBudgetVnd: 10000000 }))
  assert.equal(result.results.length, 0)
  assert.ok(result.excluded.some((item) => item.programId === 'demo-program-technology-north'
    && item.reasons.some((reason) => reason.includes('vượt ngân sách'))))
})

test('khu vực ưu tiên loại chương trình ở khu vực khác', () => {
  const result = recommendPrograms(input({ preferredRegions: ['north'] }))
  assert.ok(result.results.every((item) => item.programId.includes('north')))
  assert.ok(result.excluded.length > 0)
})

test('phương thức tuyển sinh không khớp tạo cảnh báo, không tự loại chương trình', () => {
  const result = recommendPrograms(input({ preferredMethods: ['direct_admission'] }))
  assert.ok(result.results.length > 0)
  assert.ok(result.results.some((item) => item.warnings.some((warning) => warning.includes('nào trùng lựa chọn ưu tiên'))))
})

test('khác thang điểm thì không so sánh trực tiếp khi đủ dữ liệu điểm chuẩn', () => {
  const comparablePrograms = programs.filter((program) =>
    program.historicalCutoff !== null && program.cutoffScale !== null && program.cutoffYear !== null)
  const result = recommendPrograms(input({ scoreScale: 100 }, universities, comparablePrograms))
  assert.ok(result.results.length > 0)
  assert.ok(result.results.every((item) => item.warnings.some((warning) => warning.includes('Không so sánh điểm trực tiếp'))))
})

test('ID trường không tồn tại khiến chương trình bị loại với lý do', () => {
  const orphan = { ...programs[0], id: 'orphan-program', universityId: 'missing-university' }
  const result = recommendPrograms(input({}, universities, [orphan]))
  assert.equal(result.results.length, 0)
  assert.equal(result.excluded[0].programId, 'orphan-program')
  assert.ok(result.excluded[0].reasons[0].includes('Không tìm thấy trường'))
})

test('dữ liệu mô phỏng được gắn trạng thái và cảnh báo rõ ràng', () => {
  const result = recommendPrograms(input())
  assert.ok(result.results.every((item) => item.dataStatus === 'simulated'))
  assert.ok(result.results.every((item) => item.warnings.some((warning) => warning.includes('dữ liệu mô phỏng'))))
})

test('so sánh trước/sau nhận diện chương trình thêm, bỏ và giữ lại', () => {
  const before = input({ preferredRegions: ['north'] })
  const after = input({ preferredRegions: ['south'] })
  const comparison = compareRecommendations(before, after)
  assert.ok(comparison.added.length > 0)
  assert.ok(comparison.removed.length > 0)
  assert.equal(comparison.retained.length, 0)
})

test('cùng đầu vào cho kết quả xác định và không sửa dữ liệu đầu vào', () => {
  const source = input({ interests: ['technology'] })
  const snapshot = JSON.stringify(source)
  const first = recommendPrograms(source)
  const second = recommendPrograms(source)
  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(source), snapshot)
})

test('preferredRegions có nationwide nghĩa là không giới hạn khu vực', () => {
  const result = recommendPrograms(input({ preferredRegions: ['north', 'nationwide'] }))
  assert.equal(result.results.length, programs.length)
})

process.stdout.write(`\nKết quả: ${passed} kiểm thử passed.\n`)

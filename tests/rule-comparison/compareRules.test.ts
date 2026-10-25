import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareRules } from '../../src/logic/compareRules'
import { NEEDS_REVIEW_BANNER, SIMULATED_BANNER } from '../../src/logic/ruleTypes'
import type { RuleConditions } from '../../src/logic/ruleTypes'
import { deepFreeze, jsonClone, makeVersion, simulatedSource } from './fixtures'

const versions = (oldConditions: RuleConditions, newConditions: RuleConditions) => ({
  oldRule: makeVersion({ id: 'old', conditions: oldConditions }),
  newRule: makeVersion({ id: 'new', conditions: newConditions, source: { version: 'v2', appliedYear: 2026 } }),
})

const fieldsOf = (conditions: RuleConditions, other: RuleConditions) => {
  const { oldRule, newRule } = versions(conditions, other)
  return compareRules(oldRule, newRule).changes.map((change) => `${change.changeType}:${change.field}`)
}

describe('compareRules — phát hiện thay đổi', () => {
  it('1. hai phiên bản giống nhau → không có thay đổi', () => {
    const { oldRule, newRule } = versions(
      { minimumScore: 24, subjectCombination: ['A00'] },
      { minimumScore: 24, subjectCombination: ['A00'] },
    )
    const result = compareRules(oldRule, newRule)
    assert.deepEqual(result.changes, [])
    assert.equal(result.affectedStatus, 'not_applicable')
    assert.deepEqual(result.affectedPrograms, [])
    assert.equal(result.oldVersionId, 'old')
    assert.equal(result.newVersionId, 'new')
  })

  it('2. trường mới → added (oldValue = undefined)', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24 }, { minimumScore: 24, interviewRequired: true })
    const { changes } = compareRules(oldRule, newRule)
    assert.equal(changes.length, 1)
    assert.deepEqual(changes[0], {
      field: 'conditions.interviewRequired',
      changeType: 'added',
      oldValue: undefined,
      newValue: true,
    })
  })

  it('3. trường bị xóa → removed (newValue = undefined)', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24, interviewRequired: true }, { minimumScore: 24 })
    const { changes } = compareRules(oldRule, newRule)
    assert.equal(changes.length, 1)
    assert.deepEqual(changes[0], {
      field: 'conditions.interviewRequired',
      changeType: 'removed',
      oldValue: true,
      newValue: undefined,
    })
  })

  it('4. trường bị sửa → modified, giữ nguyên giá trị cũ và mới', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24 }, { minimumScore: 25 })
    const { changes } = compareRules(oldRule, newRule)
    assert.deepEqual(changes, [
      { field: 'conditions.minimumScore', changeType: 'modified', oldValue: 24, newValue: 25 },
    ])
  })

  it('ví dụ kỹ thuật trong prompt: minimumScore và subjectCombination đều modified', () => {
    const { oldRule, newRule } = versions(
      { minimumScore: 24, subjectCombination: ['A00'] },
      { minimumScore: 25, subjectCombination: ['A00', 'D01'] },
    )
    const { changes } = compareRules(oldRule, newRule)
    assert.deepEqual(
      changes.map((change) => [change.field, change.changeType]),
      [
        ['conditions.minimumScore', 'modified'],
        ['conditions.subjectCombination', 'modified'],
      ],
    )
    assert.deepEqual(changes[1]?.arrayDelta, { added: ['D01'], removed: [] })
  })

  it('5. nhiều thay đổi đồng thời, thứ tự ổn định, không bỏ sót', () => {
    const oldRule = makeVersion({
      id: 'old',
      admissionMethod: 'academic_record',
      conditions: { minimumScore: 24, scoreScale: 30, subjectCombination: ['A00', 'B00'], interviewRequired: true, notes: 'a' },
    })
    const newRule = makeVersion({
      id: 'new',
      admissionMethod: 'high_school_exam',
      conditions: {
        minimumScore: 25,
        scoreScale: 30,
        subjectCombination: ['A00', 'D01'],
        foreignLanguageCertificateRequired: true,
        notes: 'a',
      },
    })
    const result = compareRules(oldRule, newRule)
    assert.deepEqual(result.changes.map((c) => `${c.changeType}:${c.field}`), [
      'modified:admissionMethod',
      'modified:conditions.minimumScore',
      'modified:conditions.subjectCombination',
      'removed:conditions.interviewRequired',
      'added:conditions.foreignLanguageCertificateRequired',
    ])
    assert.deepEqual(result.changes[2]?.arrayDelta, { added: ['D01'], removed: ['B00'] })
  })
})

describe('compareRules — null, undefined, lồng nhau, mảng', () => {
  it('6. null là "chưa có dữ liệu": null → 25 là modified, không bị coi là 0', () => {
    const { oldRule, newRule } = versions({ minimumScore: null, scoreScale: 30 }, { minimumScore: 25, scoreScale: 30 })
    const result = compareRules(oldRule, newRule)
    assert.equal(result.changes.length, 1)
    assert.equal(result.changes[0]?.changeType, 'modified')
    assert.strictEqual(result.changes[0]?.oldValue, null)
    assert.ok(result.limitations.some((text) => text.includes('null') && text.includes('không coi null là 0')))
  })

  it('null và 0 là hai giá trị khác nhau; null → null không phải thay đổi', () => {
    assert.deepEqual(fieldsOf({ minimumScore: 0 }, { minimumScore: null }), ['modified:conditions.minimumScore'])
    assert.deepEqual(fieldsOf({ minimumScore: null }, { minimumScore: null }), [])
  })

  it('trường vắng mặt khác null; undefined được coi như vắng mặt', () => {
    assert.deepEqual(fieldsOf({}, { notes: null }), ['added:conditions.notes'])
    assert.deepEqual(fieldsOf({ notes: null }, {}), ['removed:conditions.notes'])
    assert.deepEqual(fieldsOf({ notes: undefined }, {}), [])
    assert.deepEqual(fieldsOf({}, { notes: undefined }), [])
    assert.deepEqual(fieldsOf({ notes: undefined }, { notes: 'x' }), ['added:conditions.notes'])
  })

  it('admissionMethod null → giá trị là modified (null không bị bỏ qua)', () => {
    const oldRule = makeVersion({ id: 'old', admissionMethod: null })
    const newRule = makeVersion({ id: 'new', admissionMethod: 'academic_record' })
    const result = compareRules(oldRule, newRule)
    assert.deepEqual(result.changes.map((c) => [c.field, c.changeType, c.oldValue]), [['admissionMethod', 'modified', null]])
    assert.ok(result.limitations.some((text) => text.includes('Phương thức tuyển sinh bị thiếu')))
  })

  it('object lồng nhau: báo đúng đường dẫn lá thay đổi, mảng đổi thứ tự không tính', () => {
    const oldC: RuleConditions = { extra: { a: { b: 1, c: [1, 2] }, d: 'x' } }
    const newC: RuleConditions = { extra: { a: { b: 2, c: [2, 1] }, d: 'x' } }
    assert.deepEqual(fieldsOf(oldC, newC), ['modified:conditions.extra.a.b'])
  })

  it('object lồng nhau: thêm/xóa khóa con và đổi kiểu object ↔ giá trị thường', () => {
    assert.deepEqual(fieldsOf({ extra: { a: 1 } }, { extra: { a: 1, b: 2 } }), ['added:conditions.extra.b'])
    assert.deepEqual(fieldsOf({ extra: { a: 1, b: 2 } }, { extra: { a: 1 } }), ['removed:conditions.extra.b'])
    assert.deepEqual(fieldsOf({ extra: { a: 1 } }, { extra: 5 }), ['modified:conditions.extra'])
  })

  it('7. mảng so như tập hợp: đổi thứ tự và phần tử trùng KHÔNG phải thay đổi', () => {
    assert.deepEqual(fieldsOf({ subjectCombination: ['A00', 'D01'] }, { subjectCombination: ['D01', 'A00'] }), [])
    assert.deepEqual(fieldsOf({ subjectCombination: ['A00', 'A00'] }, { subjectCombination: ['A00'] }), [])
  })

  it('mảng chứa object so theo nội dung, không phụ thuộc thứ tự khóa/phần tử', () => {
    const a: RuleConditions = { extra: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }
    const b: RuleConditions = { extra: [{ y: 4, x: 3 }, { y: 2, x: 1 }] }
    assert.deepEqual(fieldsOf(a, b), [])
  })

  it('trường mảng được khai báo nhạy thứ tự: đổi thứ tự là modified (delta rỗng)', () => {
    const { oldRule, newRule } = versions({ subjectCombination: ['A00', 'D01'] }, { subjectCombination: ['D01', 'A00'] })
    const result = compareRules(oldRule, newRule, { orderSensitiveFields: ['conditions.subjectCombination'] })
    assert.equal(result.changes.length, 1)
    assert.deepEqual(result.changes[0]?.arrayDelta, { added: [], removed: [] })
  })

  it('so sánh phân biệt kiểu: "25" khác 25, true khác "true"', () => {
    // Dữ liệu JSON sai kiểu lúc chạy: ép kiểu tường minh vì TypeScript đã chặn ở compile-time.
    assert.deepEqual(
      fieldsOf({ minimumScore: 25 }, { minimumScore: '25' as unknown as number }),
      ['modified:conditions.minimumScore'],
    )
    assert.deepEqual(fieldsOf({ flag: true }, { flag: 'true' }), ['modified:conditions.flag'])
  })
})

describe('compareRules — bất biến và độc lập dữ liệu', () => {
  it('không sửa dữ liệu đầu vào (đầu vào bị freeze vẫn chạy được)', () => {
    const oldRule = deepFreeze(makeVersion({ id: 'old', conditions: { minimumScore: 24, subjectCombination: ['A00'] } }))
    const newRule = deepFreeze(makeVersion({ id: 'new', conditions: { minimumScore: 25, subjectCombination: ['A00', 'D01'] } }))
    const snapshot = jsonClone([oldRule, newRule])
    const result = compareRules(oldRule, newRule)
    assert.equal(result.changes.length, 2)
    assert.deepEqual(jsonClone([oldRule, newRule]), snapshot)
  })

  it('kết quả là bản sao: sửa kết quả không làm đổi đầu vào', () => {
    const oldRule = makeVersion({ id: 'old', conditions: { subjectCombination: ['A00'] } })
    const newRule = makeVersion({ id: 'new', conditions: { subjectCombination: ['A00', 'D01'] } })
    const result = compareRules(oldRule, newRule)
    ;(result.changes[0]?.newValue as string[]).push('HACK')
    result.oldSource.name = 'HACK'
    assert.deepEqual(newRule.conditions.subjectCombination, ['A00', 'D01'])
    assert.equal(oldRule.source.name, 'Nguồn thử nghiệm')
  })

  it('gọi lại nhiều lần cho kết quả giống nhau (tái lập)', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24, interviewRequired: true }, { minimumScore: 25 })
    assert.deepEqual(compareRules(oldRule, newRule), compareRules(oldRule, newRule))
  })
})

describe('compareRules — nguồn và trạng thái dữ liệu', () => {
  it('8. thiếu nguồn: không URL/năm/ngày kiểm tra → cảnh báo, trạng thái không bị nâng cấp', () => {
    const oldRule = makeVersion({ id: 'old', conditions: { minimumScore: 24 }, source: { url: null, appliedYear: null, checkedAt: null, dataStatus: 'needs_review' } })
    const newRule = makeVersion({ id: 'new', conditions: { minimumScore: 25 }, source: { url: null, appliedYear: null, checkedAt: null, dataStatus: 'needs_review' } })
    const result = compareRules(oldRule, newRule)
    const text = result.limitations.join('\n')
    assert.match(text, /Phiên bản cũ: không có URL nguồn/)
    assert.match(text, /Phiên bản mới: không có URL nguồn/)
    assert.match(text, /Phiên bản cũ: thiếu năm áp dụng/)
    assert.match(text, /không xác định được thứ tự thời gian/)
    assert.equal(result.overallDataStatus, 'needs_review')
    assert.match(result.evidence[0] ?? '', /URL: không có/)
  })

  it('verified nhưng thiếu URL / ngày kiểm tra → cảnh báo mâu thuẫn, vẫn giữ nguyên trạng thái verified', () => {
    const oldRule = makeVersion({ id: 'old', source: { url: null, checkedAt: null } })
    const newRule = makeVersion({ id: 'new', source: { appliedYear: 2026 } })
    const result = compareRules(oldRule, newRule)
    const text = result.limitations.join('\n')
    assert.match(text, /Phiên bản cũ: đánh dấu "verified" nhưng không có URL nguồn/)
    assert.match(text, /Phiên bản cũ: đánh dấu "verified" nhưng không có ngày kiểm tra/)
    assert.equal(result.oldSource.dataStatus, 'verified')
  })

  it('9. dữ liệu simulated → banner đứng đầu và status simulated', () => {
    const oldRule = makeVersion({ id: 'old', conditions: { minimumScore: 24 }, source: simulatedSource(2025) })
    const newRule = makeVersion({ id: 'new', conditions: { minimumScore: 25 }, source: simulatedSource(2026) })
    const result = compareRules(oldRule, newRule)
    assert.equal(result.overallDataStatus, 'simulated')
    assert.equal(result.limitations[0], SIMULATED_BANNER)
  })

  it('simulated có URL → cảnh báo không dùng làm căn cứ chính thức', () => {
    const oldRule = makeVersion({ id: 'old', source: { dataStatus: 'simulated' } })
    const newRule = makeVersion({ id: 'new', source: { ...simulatedSource(2026) } })
    const text = compareRules(oldRule, newRule).limitations.join('\n')
    assert.match(text, /dữ liệu giả lập nhưng có URL/)
  })

  it('10. needs_review → banner cần kiểm tra', () => {
    const oldRule = makeVersion({ id: 'old', conditions: { minimumScore: 24 }, source: { dataStatus: 'needs_review' } })
    const newRule = makeVersion({ id: 'new', conditions: { minimumScore: 25 }, source: { appliedYear: 2026 } })
    const result = compareRules(oldRule, newRule)
    assert.equal(result.overallDataStatus, 'needs_review')
    assert.equal(result.limitations[0], NEEDS_REVIEW_BANNER)
  })

  it('trạng thái tổng hợp luôn là trạng thái YẾU NHẤT, không bao giờ tự nâng lên verified', () => {
    const status = (a: 'verified' | 'needs_review' | 'simulated', b: 'verified' | 'needs_review' | 'simulated') =>
      compareRules(
        makeVersion({ id: 'old', source: { dataStatus: a } }),
        makeVersion({ id: 'new', source: { dataStatus: b, appliedYear: 2026 } }),
      ).overallDataStatus
    assert.equal(status('verified', 'verified'), 'verified')
    assert.equal(status('verified', 'needs_review'), 'needs_review')
    assert.equal(status('needs_review', 'verified'), 'needs_review')
    assert.equal(status('verified', 'simulated'), 'simulated')
    assert.equal(status('simulated', 'needs_review'), 'simulated')
  })

  it('cả hai verified, đủ nguồn → không có banner', () => {
    const result = compareRules(
      makeVersion({ id: 'old', conditions: { minimumScore: 24, scoreScale: 30 } }),
      makeVersion({ id: 'new', conditions: { minimumScore: 25, scoreScale: 30 }, source: { appliedYear: 2026 } }),
    )
    assert.ok(!result.limitations.includes(SIMULATED_BANNER))
    assert.ok(!result.limitations.includes(NEEDS_REVIEW_BANNER))
  })

  it('evidence gồm hai dòng nguồn rồi một dòng cho mỗi thay đổi', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24 }, { minimumScore: 25 })
    const { evidence } = compareRules(oldRule, newRule)
    assert.equal(evidence.length, 3)
    assert.match(evidence[0] ?? '', /Phiên bản cũ \[old\].*năm áp dụng: 2025.*Đã xác minh \(verified\)/)
    assert.match(evidence[2] ?? '', /conditions\.minimumScore.*24 → 25/)
  })
})

describe('compareRules — đối tượng liên quan (chỉ theo mã định danh)', () => {
  const changed = { oldC: { minimumScore: 24 }, newC: { minimumScore: 25 } }
  const run = (
    oldOverrides: Parameters<typeof makeVersion>[0],
    newOverrides: Parameters<typeof makeVersion>[0],
  ) =>
    compareRules(
      makeVersion({ id: 'old', conditions: changed.oldC, ...oldOverrides }),
      makeVersion({ id: 'new', conditions: changed.newC, source: { appliedYear: 2026 }, ...newOverrides }),
    )

  it('11a. cùng institutionId + programId → xác định, kèm căn cứ', () => {
    const result = run({}, {})
    assert.equal(result.affectedStatus, 'determined')
    assert.deepEqual(result.affectedPrograms, ['prog-1'])
    assert.equal(result.affectedTargets[0]?.institutionId, 'inst-1')
    assert.match(result.affectedTargets[0]?.basis ?? '', /institutionId "inst-1" và programId "prog-1"/)
    assert.match(result.affectedTargets[0]?.basis ?? '', /không theo tên/)
  })

  it('11b. liên kết theo id, không theo tên: tên khác nhau nhưng cùng id vẫn liên kết', () => {
    const result = run({ programName: 'Tên cũ' }, { programName: 'Tên mới' })
    assert.equal(result.affectedStatus, 'determined')
    assert.equal(result.affectedTargets[0]?.programName, 'Tên mới')
  })

  it('11c. tên giống hệt nhưng programId khác → KHÔNG liên kết', () => {
    const result = run({ programId: 'prog-1', programName: 'CNTT' }, { programId: 'prog-2', programName: 'CNTT' })
    assert.equal(result.affectedStatus, 'undetermined')
    assert.deepEqual(result.affectedPrograms, [])
    assert.match(result.affectedReason, /hai programId khác nhau/)
    assert.ok(result.limitations.includes(result.affectedReason))
  })

  it('11d. thiếu programId → chưa xác định, không suy ra cho toàn trường', () => {
    const result = run({ programId: null, programName: null }, { programId: null, programName: null })
    assert.equal(result.affectedStatus, 'undetermined')
    assert.deepEqual(result.affectedTargets, [])
    assert.match(result.affectedReason, /không suy ra thay đổi áp dụng cho toàn trường/)
  })

  it('11e. một bên thiếu programId → chưa xác định', () => {
    const result = run({}, { programId: null })
    assert.equal(result.affectedStatus, 'undetermined')
    assert.match(result.affectedReason, /Thiếu programId ở phiên bản mới/)
  })

  it('11f. khác institutionId → chưa xác định, không suy từ trường này sang trường khác', () => {
    const result = run({ institutionId: 'inst-1' }, { institutionId: 'inst-2' })
    assert.equal(result.affectedStatus, 'undetermined')
    assert.match(result.affectedReason, /hai institutionId khác nhau/)
  })
})

describe('compareRules — giới hạn về điểm, phương thức, thời gian', () => {
  const lim = (result: ReturnType<typeof compareRules>) => result.limitations.join('\n')

  it('khác phương thức → không so sánh trực tiếp, không quy đổi điểm', () => {
    const result = compareRules(
      makeVersion({ id: 'old', admissionMethod: 'academic_record' }),
      makeVersion({ id: 'new', admissionMethod: 'competency_assessment', source: { appliedYear: 2026 } }),
    )
    assert.match(lim(result), /academic_record → competency_assessment.*không tự quy đổi điểm/)
  })

  it('điểm tối thiểu đổi nhưng thiếu thang điểm → không kết luận tăng/giảm', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24 }, { minimumScore: 25 })
    assert.match(lim(compareRules(oldRule, newRule)), /thiếu thang điểm \(scoreScale\) ở phiên bản cũ và phiên bản mới/)
  })

  it('điểm tối thiểu đổi và hai thang điểm khác nhau → cảnh báo, không quy đổi', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24, scoreScale: 30 }, { minimumScore: 80, scoreScale: 100 })
    assert.match(lim(compareRules(oldRule, newRule)), /hai thang điểm khác nhau \(30 và 100\).*không tự quy đổi/)
  })

  it('điểm tối thiểu đổi, cùng thang điểm → không cảnh báo thang điểm', () => {
    const { oldRule, newRule } = versions({ minimumScore: 24, scoreScale: 30 }, { minimumScore: 25, scoreScale: 30 })
    assert.doesNotMatch(lim(compareRules(oldRule, newRule)), /thang điểm/)
  })

  it('thứ tự năm: mới sớm hơn cũ / cùng năm / thiếu năm', () => {
    const years = (oldYear: number | null, newYear: number | null) =>
      lim(
        compareRules(
          makeVersion({ id: 'old', source: { appliedYear: oldYear } }),
          makeVersion({ id: 'new', source: { appliedYear: newYear } }),
        ),
      )
    assert.match(years(2026, 2025), /sớm hơn phiên bản "cũ"/)
    assert.match(years(2025, 2025), /cùng năm áp dụng \(2025\)/)
    assert.match(years(null, 2025), /Thiếu năm áp dụng ở phiên bản cũ/)
  })

  it('hai phiên bản cùng id → cảnh báo', () => {
    const a = makeVersion({ id: 'same' })
    assert.match(lim(compareRules(a, makeVersion({ id: 'same', source: { appliedYear: 2026 } }))), /cùng id "same"/)
  })

  it('luôn có giới hạn: không có ngày hiệu lực và không phải kết luận trúng tuyển', () => {
    const { oldRule, newRule } = versions({}, {})
    const text = lim(compareRules(oldRule, newRule))
    assert.match(text, /không có ngày hiệu lực/)
    assert.match(text, /không phải kết luận học sinh đủ điều kiện hay trúng tuyển/)
  })
})

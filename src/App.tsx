import { useMemo, useState, type FormEvent } from 'react'
import type { RecommendationResponse } from './logic/recommendation'
import { integratedRecommendationService } from './services/integratedRecommendationService'
import { toRecommendationProfile } from './adapters/recommendationProfileAdapter'
import { validateUiProfile } from './adapters/profileAdapter'
import type { DataSource, DataStatus, University, UniversityProgram } from './types'
import universitiesJson from '../data/admissions-seed-2026/universities.json'
import programsJson from '../data/admissions-seed-2026/programs.json'
import cutoffsJson from '../data/admissions-seed-2026/historical_cutoffs.json'

type Interest = 'technology' | 'undecided'
type Region = 'north' | 'central' | 'south' | 'anywhere'
type Budget = 'under20' | '20to40' | '40to70' | 'over70' | 'flexible'
type Profile = { score: string; interest: Interest | ''; region: Region | ''; budget: Budget | ''; keywords: string }
type CutoffRecord = { id: string; programId: string; universityId: string; year: number; method: string; cutoffScore: number | null; scoreScale: number | null; sourceUrl: string; checkedAt: string; status: DataStatus; notes: string }
type CutoffDataset = { title: string; years: number[]; checkedAt: string; scoringPolicy: string; records: CutoffRecord[] }
type DemoProgram = { id: string; school: string; program: string; group: Interest[]; region: Exclude<Region, 'anywhere'>; tags: string[]; description: string; status: DataStatus; sources: DataSource[]; tuitionMinVndPerYear: number | null; tuitionMaxVndPerYear: number | null; admissionMethods: UniversityProgram['admissionMethods']; cutoffs: CutoffRecord[] }

const initialProfile: Profile = { score: '', interest: '', region: '', budget: '', keywords: '' }
const universities = universitiesJson as unknown as University[]
const programs = programsJson as unknown as UniversityProgram[]
const cutoffDataset = cutoffsJson as unknown as CutoffDataset
const universityById = new Map(universities.map((university) => [university.id, university] as const))
const methodLabels: Record<string, string> = { high_school_exam: 'Thi tốt nghiệp THPT', academic_record: 'Học bạ', competency_assessment: 'Đánh giá năng lực/tư duy', direct_admission: 'Xét tuyển thẳng', other: 'Xét tuyển tổng hợp / phương thức khác' }
const statusLabels: Record<DataStatus, string> = { verified: 'Đã xác minh', needs_review: 'Cần xác minh', simulated: 'Mô phỏng' }

// Dùng trực tiếp dữ liệu của repository; không tạo trường/ngành giả để làm đầy giao diện.
const demoPrograms: DemoProgram[] = programs.map((program) => {
  const university = universityById.get(program.universityId)
  return {
    id: program.id, school: university?.name ?? program.universityId, program: program.name,
    group: ['technology'] as Interest[], region: university?.region ?? 'central',
    tags: program.majorGroup === 'information_technology' ? ['Công nghệ thông tin', 'Máy tính'] : ['Kỹ thuật', 'Công nghệ'],
    description: 'Thông tin chương trình được lấy từ bộ dữ liệu demo của dự án. Hãy mở nguồn chính thức và kiểm tra trạng thái trước khi sử dụng.',
    status: program.status, sources: program.sources,
    tuitionMinVndPerYear: program.tuitionMinVndPerYear, tuitionMaxVndPerYear: program.tuitionMaxVndPerYear,
    admissionMethods: program.admissionMethods,
    cutoffs: cutoffDataset.records.filter((record) => record.programId === program.id).sort((a, b) => b.year - a.year || a.method.localeCompare(b.method)),
  }
})
const interestLabels: Record<Interest, string> = { technology: 'Công nghệ và kỹ thuật', undecided: 'Chưa xác định' }
const regionLabels: Record<Region, string> = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam', anywhere: 'Toàn quốc' }
const budgetLabels: Record<Budget, string> = { under20: 'Dưới 20 triệu/năm', '20to40': '20–40 triệu/năm', '40to70': '40–70 triệu/năm', over70: 'Trên 70 triệu/năm', flexible: 'Linh hoạt / cần tư vấn' }

function App() {
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [submittedProfile, setSubmittedProfile] = useState<Profile | null>(null)
  const [saved, setSaved] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [recommendationResponse, setRecommendationResponse] = useState<RecommendationResponse | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)

  const visiblePrograms = useMemo(() => {
    if (!submittedProfile || !recommendationResponse) return []
    const recommendedIds = new Set(recommendationResponse.results.map((result) => result.programId))
    const keyword = submittedProfile.keywords.trim().toLocaleLowerCase('vi')
    return demoPrograms.filter((item) => {
      const searchableText = [item.school, item.program, ...item.tags].join(' ').toLocaleLowerCase('vi')
      return recommendedIds.has(item.id) && (!keyword || searchableText.includes(keyword))
    })
  }, [submittedProfile, recommendationResponse])

  const programsToShow = showAll ? visiblePrograms : visiblePrograms.slice(0, 3)

  function updateProfile<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validateUiProfile(profile)
    if (validationErrors.length > 0) {
      setRecommendationError(validationErrors.join(' '))
      return
    }

    setSubmittedProfile(profile)
    setRecommendationResponse(null)
    setRecommendationError(null)
    setRecommendationLoading(true)
    setSaved(false)
    setShowAll(false)
    document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    try {
      const domainProfile = toRecommendationProfile(profile)
      const response = await integratedRecommendationService.recommend({ profile: domainProfile })
      setRecommendationResponse(response)
    } catch (error) {
      setRecommendationError(error instanceof Error ? error.message : 'Không thể tạo gợi ý lúc này.')
    } finally {
      setRecommendationLoading(false)
    }
  }

  function resetProfile() {
    setProfile(initialProfile)
    setSubmittedProfile(null)
    setRecommendationResponse(null)
    setRecommendationError(null)
    setRecommendationLoading(false)
    setSaved(false)
    setShowAll(false)
  }

  function saveProfile() {
    setSaved(true)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="AI Pathway - về đầu trang"><span className="brand-mark">A</span><span>AI Pathway</span></a>
        <button className="menu-toggle" type="button" aria-expanded={mobileMenuOpen} aria-label="Mở menu" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? 'Đóng' : 'Menu'} <span aria-hidden="true">☰</span></button>
        <nav className={mobileMenuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label="Điều hướng chính">
          <a href="#explore" onClick={() => setMobileMenuOpen(false)}>Khám phá ngành học</a>
          <a href="#recommendations" onClick={() => setMobileMenuOpen(false)}>Gợi ý</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>Cách hoạt động</a>
        </nav>
        <a className="topbar-cta" href="#explore">Bắt đầu <span aria-hidden="true">↗</span></a>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> ĐỊNH HƯỚNG ĐẠI HỌC CÙNG BẠN</div>
            <h1>Chọn ngành đúng.<br /><span>Mở lối tương lai.</span></h1>
            <p className="hero-description">Khám phá 6 chương trình demo tại HUST, DUT và HCMUT theo nhóm ngành, khu vực và từ khóa. Điểm và ngân sách chỉ là thông tin tham khảo, chưa dùng để dự đoán trúng tuyển.</p>
            <div className="hero-actions"><a className="button button-primary" href="#explore">Tạo hồ sơ định hướng <span aria-hidden="true">→</span></a><a className="text-link" href="#how-it-works">Tìm hiểu cách hoạt động <span aria-hidden="true">↓</span></a></div>
            <div className="hero-trust"><span className="trust-icon">✓</span><span>Thông tin minh bạch · Bạn là người quyết định</span></div>
          </div>
          <div className="hero-art" aria-label="Minh họa các lựa chọn học tập">
            <div className="art-glow" /><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" />
            <div className="art-center"><span className="art-star">✳</span><strong>Tương lai</strong><small>do bạn lựa chọn</small></div>
            <div className="floating-card float-top"><span className="mini-icon blue">⌕</span><span><strong>Khám phá</strong><small>Ngành học phù hợp</small></span></div>
            <div className="floating-card float-bottom"><span className="mini-icon mint">↗</span><span><strong>Lập lộ trình</strong><small>Từng bước rõ ràng</small></span></div>
            <span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span>
          </div>
          <div className="hero-bottom-note"><span className="note-line" /> MỘT HÀNH TRÌNH CỦA RIÊNG BẠN</div>
        </section>

        <section className="explore-section section-wrap" id="explore">
          <div className="section-intro"><div><span className="eyebrow">BƯỚC 01 <span className="eyebrow-slash">/</span> HỒ SƠ CỦA BẠN</span><h2>Bắt đầu từ điều<br className="desktop-break" /> bạn quan tâm.</h2></div><p>Không cần biết chính xác mình muốn học gì. Hãy cho AI Pathway biết đôi chút về bạn để bắt đầu khám phá.</p></div>
          <div className="form-layout">
            <div className="form-side-note"><div className="step-bubble">01</div><h3>Hiểu mình<br />trước khi chọn ngành.</h3><p>Những lựa chọn tốt bắt đầu từ các ưu tiên của bạn, không phải từ một bảng xếp hạng chung.</p><div className="side-note-bottom"><span className="side-check">✓</span> Không có lựa chọn đúng cho tất cả mọi người</div></div>
            <div className="form-card"><div className="form-card-heading"><div><span className="form-kicker">HỒ SƠ ĐỊNH HƯỚNG</span><h3>Điều gì quan trọng với bạn?</h3></div><span className="required-note"><i /> Trường bắt buộc</span></div>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label className="field"><span className="field-label">Điểm dự kiến <span className="required-star">*</span></span><div className="input-wrap"><input type="number" min="0" max="30" step="0.1" inputMode="decimal" placeholder="Ví dụ: 24.5" value={profile.score} onChange={(event) => updateProfile('score', event.target.value)} required aria-describedby="score-hint" /><span className="input-suffix">/ 30</span></div><span className="field-hint" id="score-hint">Điểm chỉ được hiển thị trong hồ sơ demo; chưa dùng để xếp hạng hay dự đoán trúng tuyển.</span></label>
                  <label className="field"><span className="field-label">Nhóm ngành quan tâm <span className="required-star">*</span></span><select value={profile.interest} onChange={(event) => updateProfile('interest', event.target.value as Profile['interest'])} required><option value="">Chọn nhóm ngành</option><option value="technology">Công nghệ và kỹ thuật</option><option value="undecided">Chưa xác định</option></select></label>
                  <label className="field"><span className="field-label">Khu vực mong muốn <span className="required-star">*</span></span><select value={profile.region} onChange={(event) => updateProfile('region', event.target.value as Profile['region'])} required><option value="">Chọn khu vực</option><option value="north">Miền Bắc</option><option value="central">Miền Trung</option><option value="south">Miền Nam</option><option value="anywhere">Toàn quốc</option></select></label>
                  <label className="field"><span className="field-label">Ngân sách học phí mỗi năm <span className="required-star">*</span></span><select value={profile.budget} onChange={(event) => updateProfile('budget', event.target.value as Profile['budget'])} required><option value="">Chọn mức ngân sách</option><option value="under20">Dưới 20 triệu đồng</option><option value="20to40">20–40 triệu đồng</option><option value="40to70">40–70 triệu đồng</option><option value="over70">Trên 70 triệu đồng</option><option value="flexible">Linh hoạt / cần tư vấn</option></select></label>
                  <label className="field field-full"><span className="field-label">Từ khóa bạn muốn tìm <span className="optional-label">Không bắt buộc</span></span><div className="input-wrap search-input"><span className="search-glyph" aria-hidden="true">⌕</span><input type="search" placeholder="Ví dụ: sáng tạo, dữ liệu, cộng đồng..." value={profile.keywords} onChange={(event) => updateProfile('keywords', event.target.value)} /></div></label>
                </div>
                <div className="form-actions"><p><span className="privacy-icon">◇</span> Thông tin chỉ dùng để tạo trải nghiệm demo trên trang này.</p><button className="button button-primary submit-button" type="submit">Khám phá lựa chọn <span aria-hidden="true">→</span></button></div>
              </form>
            </div>
          </div>
        </section>

        <section className="recommend-section" id="recommendations">
          <div className="section-wrap"><div className="section-intro results-intro"><div><span className="eyebrow">BƯỚC 02 <span className="eyebrow-slash">/</span> MỞ RỘNG LỰA CHỌN</span><h2>Những hướng đi<br className="desktop-break" /> đáng để khám phá.</h2></div><p>Đừng giới hạn bản thân quá sớm. Hãy xem nhiều hướng đi, tìm hiểu nguồn chính thức và cân nhắc điều phù hợp với bạn.</p></div>
            {!submittedProfile ? <div className="results-empty"><div className="empty-illustration"><div className="empty-paper"><span>✳</span><i /><i /><i /></div><div className="empty-search">⌕</div></div><div className="empty-copy"><span className="empty-label">KHỞI ĐẦU HÀNH TRÌNH</span><h3>Gợi ý của bạn sẽ xuất hiện ở đây</h3><p>Hoàn thành hồ sơ định hướng để xem giao diện gợi ý ngành học theo sở thích và khu vực bạn chọn.</p><a className="text-link" href="#explore">Điền hồ sơ của bạn <span aria-hidden="true">↑</span></a></div></div> : <>
              <div className="results-toolbar"><div><span className="result-count">{visiblePrograms.length} <span>chương trình được recommendation engine trả về</span></span><p>Kết quả được tính từ hồ sơ và dữ liệu canonical; không phải xác suất trúng tuyển.</p></div><button className="button button-quiet" type="button" onClick={resetProfile}>↺ Làm lại hồ sơ</button></div>
              <div className="profile-summary"><span className="summary-label">HỒ SƠ ĐANG XEM</span><span className="summary-chip">Điểm: {profile.score}/30</span>{profile.interest && <span className="summary-chip">{interestLabels[profile.interest]}</span>}{profile.region && <span className="summary-chip">{regionLabels[profile.region]}</span>}{profile.budget && <span className="summary-chip">{budgetLabels[profile.budget]}</span>}</div>
              <div className="demo-warning"><span aria-hidden="true">ⓘ</span><p><strong>Dữ liệu có nguồn và trạng thái riêng.</strong> Các chương trình lấy từ dataset canonical. Điểm chuẩn hoặc học phí còn thiếu sẽ tiếp tục hiển thị là chưa có dữ liệu; dữ liệu mô phỏng không phải số liệu chính thức. Kết quả gợi ý không phải dự đoán đỗ/trượt.</p></div>
              {recommendationResponse?.warnings.map((warning, index) => <p className="field-hint" role="status" key={index}>{warning}</p>)}
              {recommendationLoading ? <div className="no-results" role="status"><h3>Đang phân tích hồ sơ…</h3><p>Đang đối chiếu chương trình với tiêu chí bạn đã nhập.</p></div> : recommendationError ? <div className="no-results" role="alert"><h3>Chưa thể tạo gợi ý</h3><p>{recommendationError}</p></div> : visiblePrograms.length ? <div className="program-grid">{programsToShow.map((item, index) => <article className="program-card" key={item.id}><div className={`program-art program-art-${index % 3}`}><span className="program-art-label">HƯỚNG ĐI {String(index + 1).padStart(2, '0')}</span><span className="program-art-symbol">{index % 3 === 0 ? '✳' : index % 3 === 1 ? '↗' : '◇'}</span><span className="program-art-caption">AI PATHWAY <i>·</i> DEMO</span></div><div className="program-content"><div className="program-tags">{item.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div><h3>{item.program}</h3><p className="program-school">{item.school}</p><p className="program-description">{item.description}</p>{recommendationResponse?.results.find((result) => result.programId === item.id)?.suitabilityReasons.map((reason, reasonIndex) => <p className="program-description" key={reasonIndex}><strong>Lý do gợi ý:</strong> {reason}</p>)}{recommendationResponse?.results.find((result) => result.programId === item.id)?.warnings.map((warning, warningIndex) => <p className="program-description" key={warningIndex}><strong>Lưu ý:</strong> {warning}</p>)}<p className="program-description"><strong>Học phí:</strong> {item.tuitionMinVndPerYear == null || item.tuitionMaxVndPerYear == null ? 'Chưa có dữ liệu đã xác minh' : item.tuitionMinVndPerYear.toLocaleString('vi-VN') + '–' + item.tuitionMaxVndPerYear.toLocaleString('vi-VN') + ' đồng/năm'}</p><div className="program-description"><strong>Điểm chuẩn lịch sử (demo):</strong> {item.cutoffs.slice(0, 3).map((cutoff) => <span key={cutoff.id}>{cutoff.year} {methodLabels[cutoff.method] ?? cutoff.method}: {cutoff.cutoffScore == null ? 'chưa có điểm' : cutoff.cutoffScore + '/' + (cutoff.scoreScale ?? '?')} [{statusLabels[cutoff.status]}] <a href={cutoff.sourceUrl} target="_blank" rel="noreferrer">{cutoff.status === 'simulated' ? 'nguồn ngữ cảnh (không xác minh số liệu)' : 'nguồn'}</a>{' · '}</span>)}</div><div className="program-meta"><span>⌖ {regionLabels[item.region]}</span><span className="demo-tag">{statusLabels[recommendationResponse?.results.find((result) => result.programId === item.id)?.dataStatus ?? item.status]}</span></div><a className="program-link" href={item.sources[0]?.url ?? '#data-note'} target="_blank" rel="noreferrer">Mở nguồn tham khảo <span aria-hidden="true">↗</span></a></div></article>)}</div> : <div className="no-results"><span>⌕</span><h3>Chưa có lựa chọn khớp với từ khóa</h3><p>Thử bỏ bớt từ khóa hoặc chọn “Toàn quốc” để mở rộng kết quả.</p><button className="button button-secondary" type="button" onClick={() => { updateProfile('keywords', ''); setSubmittedProfile({ ...profile, keywords: '' }) }}>Xóa từ khóa</button></div>}
              {visiblePrograms.length > 3 && <div className="show-more-wrap"><button className="button button-secondary" type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Thu gọn danh sách' : `Xem thêm ${visiblePrograms.length - 3} lựa chọn`} <span aria-hidden="true">{showAll ? '↑' : '↓'}</span></button></div>}
              <div className="save-profile"><div><span className="save-icon">✓</span><span><strong>Muốn tiếp tục tinh chỉnh?</strong><small>Hồ sơ hiện chỉ được giữ trong trạng thái trang khi bạn đang mở demo.</small></span></div><button className="button button-primary" type="button" onClick={saveProfile}>{saved ? 'Đã ghi nhận ✓' : 'Ghi nhận hồ sơ'}</button></div>{saved && <p className="save-confirmation" role="status">Đã ghi nhận hồ sơ trong giao diện demo. Thông tin chưa được gửi lên máy chủ.</p>}
            </>}
            <div className="data-note" id="data-note"><span className="data-note-icon">i</span><div><strong>Minh bạch về dữ liệu</strong><p>Bộ dữ liệu demo gồm các chương trình được chọn để thử nghiệm. Các điểm chuẩn có nhãn mô phỏng là số liệu giả lập; chỉ so sánh khi cùng chương trình, năm, phương thức và thang điểm. Nguồn, học phí và phương thức có thể còn cần xác minh. Không dùng bản demo này để quyết định tuyển sinh thực tế.</p></div></div>
          </div>
        </section>

        <section className="how-section section-wrap" id="how-it-works"><div className="how-heading"><span className="eyebrow">BƯỚC 03 <span className="eyebrow-slash">/</span> TỪ KHÁM PHÁ ĐẾN LỰA CHỌN</span><h2>Đi từng bước.<br /><span>Chọn theo cách của bạn.</span></h2><p>AI Pathway hỗ trợ bạn đặt câu hỏi tốt hơn và nhìn rõ lựa chọn — không quyết định thay bạn.</p></div><div className="steps-grid"><article className="step-card"><span className="step-index">01 <i>—</i> KHÁM PHÁ</span><div className="step-graphic graphic-explore"><span className="graphic-ring ring-one"/><span className="graphic-ring ring-two"/><span className="graphic-center">⌕</span><span className="graphic-dot dot-one"/><span className="graphic-dot dot-two"/></div><h3>Hiểu điều bạn cần</h3><p>Ghi nhận sở thích, điểm dự kiến, khu vực và ngân sách để bắt đầu hành trình.</p></article><article className="step-card"><span className="step-index">02 <i>—</i> ĐỐI CHIẾU</span><div className="step-graphic graphic-compare"><span className="compare-sheet sheet-one"><i/><i/><i/></span><span className="compare-sheet sheet-two"><i/><i/><i/></span><span className="compare-check">✓</span></div><h3>Tìm hiểu có căn cứ</h3><p>Đối chiếu chương trình, điều kiện xét tuyển và nguồn thông tin chính thức.</p></article><article className="step-card"><span className="step-index">03 <i>—</i> ĐIỀU CHỈNH</span><div className="step-graphic graphic-plan"><span className="plan-line line-one"/><span className="plan-line line-two"/><span className="plan-node node-one">01</span><span className="plan-node node-two">02</span><span className="plan-node node-three">03</span></div><h3>Chủ động lựa chọn</h3><p>So sánh ưu tiên và điều chỉnh kế hoạch khi mục tiêu hoặc điều kiện thay đổi.</p></article></div></section>

        <section className="closing-cta"><div className="closing-mark">✳</div><div><span className="eyebrow">BẠN KHÔNG CẦN CÓ TẤT CẢ CÂU TRẢ LỜI NGAY HÔM NAY</span><h2>Mỗi lựa chọn tốt bắt đầu<br />từ một câu hỏi đúng.</h2></div><a className="button button-light" href="#explore">Bắt đầu với hồ sơ của bạn <span aria-hidden="true">↑</span></a></section>
      </main>
      <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark">A</span><span>AI Pathway</span></a><p>Định hướng, không quyết định thay bạn.</p><span className="footer-copyright">© 2026 AI Pathway · Bản demo giao diện</span></footer>
    </div>
  )
}

export default App

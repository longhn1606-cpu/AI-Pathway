import { useMemo, useState, type FormEvent } from 'react'
import { toStudentProfile } from './adapters/frontendProfileAdapter'

type Interest = 'technology' | 'business' | 'health' | 'education' | 'arts' | 'other' | 'undecided'
type Region = 'north' | 'central' | 'south' | 'anywhere'
type Budget = 'under20' | '20to40' | '40to70' | 'over70' | 'flexible'
type Profile = { score: string; interest: Interest | ''; region: Region | ''; budget: Budget | ''; keywords: string }
type DemoProgram = { id: string; school: string; program: string; group: Interest[]; region: Exclude<Region, 'anywhere'>; tags: string[]; description: string }

const initialProfile: Profile = { score: '', interest: '', region: '', budget: '', keywords: '' }

// Dữ liệu minh họa giao diện, KHÔNG phải dữ liệu tuyển sinh chính thức.
const demoPrograms: DemoProgram[] = [
  { id: 'demo-01', school: 'Trường đại học minh họa A', program: 'Công nghệ thông tin', group: ['technology'], region: 'north', tags: ['Công nghệ', 'Phân tích dữ liệu'], description: 'Ví dụ giao diện cho chương trình thuộc nhóm công nghệ và kỹ thuật.' },
  { id: 'demo-02', school: 'Trường đại học minh họa B', program: 'Quản trị kinh doanh', group: ['business'], region: 'south', tags: ['Kinh doanh', 'Quản lý'], description: 'Ví dụ giao diện cho chương trình thuộc nhóm kinh tế và kinh doanh.' },
  { id: 'demo-03', school: 'Trường đại học minh họa C', program: 'Thiết kế truyền thông', group: ['arts'], region: 'central', tags: ['Sáng tạo', 'Truyền thông'], description: 'Ví dụ giao diện cho chương trình thuộc nhóm nghệ thuật và sáng tạo.' },
  { id: 'demo-04', school: 'Trường đại học minh họa D', program: 'Giáo dục học', group: ['education'], region: 'north', tags: ['Giáo dục', 'Cộng đồng'], description: 'Ví dụ giao diện cho chương trình thuộc nhóm giáo dục và xã hội.' },
  { id: 'demo-05', school: 'Trường đại học minh họa E', program: 'Khoa học sức khỏe', group: ['health'], region: 'south', tags: ['Sức khỏe', 'Khoa học'], description: 'Ví dụ giao diện cho chương trình thuộc nhóm y tế và sức khỏe.' },
  { id: 'demo-06', school: 'Trường đại học minh họa F', program: 'Kỹ thuật ứng dụng', group: ['technology', 'other'], region: 'central', tags: ['Kỹ thuật', 'Thực hành'], description: 'Ví dụ giao diện cho chương trình thuộc nhóm kỹ thuật ứng dụng.' },
]

const interestLabels: Record<Interest, string> = {
  technology: 'Công nghệ và kỹ thuật', business: 'Kinh tế và kinh doanh', health: 'Y tế và sức khỏe',
  education: 'Giáo dục và xã hội', arts: 'Nghệ thuật và sáng tạo', other: 'Nhóm ngành khác', undecided: 'Chưa xác định',
}
const regionLabels: Record<Region, string> = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam', anywhere: 'Toàn quốc' }
const budgetLabels: Record<Budget, string> = { under20: 'Dưới 20 triệu/năm', '20to40': '20–40 triệu/năm', '40to70': '40–70 triệu/năm', over70: 'Trên 70 triệu/năm', flexible: 'Linh hoạt / cần tư vấn' }

function App() {
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [submittedProfile, setSubmittedProfile] = useState<Profile | null>(null)
  const [saved, setSaved] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const visiblePrograms = useMemo(() => {
    if (!submittedProfile) return []
    const interest = submittedProfile.interest
    const region = submittedProfile.region
    const keyword = submittedProfile.keywords.trim().toLocaleLowerCase('vi')
    return demoPrograms.filter((item) => {
      const interestMatches = !interest || interest === 'undecided' || item.group.includes(interest)
      const regionMatches = !region || region === 'anywhere' || item.region === region
      const keywordMatches = !keyword || `${item.school} ${item.program} ${item.tags.join(' ')}`.toLocaleLowerCase('vi').includes(keyword)
      return interestMatches && regionMatches && keywordMatches
    })
  }, [submittedProfile])

  const programsToShow = showAll ? visiblePrograms : visiblePrograms.slice(0, 3)
  // Convert the submitted UI form through member 3's shared-domain adapter.
  // The visible cards remain explicitly demo fixtures until canonical data is wired.
  const normalizedProfile = useMemo(
    () => submittedProfile ? toStudentProfile(submittedProfile) : null,
    [submittedProfile],
  )

  function updateProfile<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedProfile(profile)
    setSaved(false)
    setShowAll(false)
    document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function resetProfile() {
    setProfile(initialProfile)
    setSubmittedProfile(null)
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
            <p className="hero-description">Khám phá ngành học và trường đại học trên khắp Việt Nam dựa trên sở thích, năng lực và điều kiện của chính bạn.</p>
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
                  <label className="field"><span className="field-label">Điểm dự kiến <span className="required-star">*</span></span><div className="input-wrap"><input type="number" min="0" max="30" step="0.1" inputMode="decimal" placeholder="Ví dụ: 24.5" value={profile.score} onChange={(event) => updateProfile('score', event.target.value)} required aria-describedby="score-hint" /><span className="input-suffix">/ 30</span></div><span className="field-hint" id="score-hint">Nhập điểm tham khảo trên thang 30. Chưa dùng để kết luận đỗ/trượt.</span></label>
                  <label className="field"><span className="field-label">Nhóm ngành quan tâm <span className="required-star">*</span></span><select value={profile.interest} onChange={(event) => updateProfile('interest', event.target.value as Profile['interest'])} required><option value="">Chọn nhóm ngành</option><option value="technology">Công nghệ và kỹ thuật</option><option value="business">Kinh tế và kinh doanh</option><option value="health">Y tế và sức khỏe</option><option value="education">Giáo dục và xã hội</option><option value="arts">Nghệ thuật và sáng tạo</option><option value="other">Nhóm ngành khác</option><option value="undecided">Chưa xác định</option></select></label>
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
              <div className="results-toolbar"><div><span className="result-count">{visiblePrograms.length} <span>lựa chọn minh họa</span></span><p>Phù hợp với một số tiêu chí bạn đã chọn</p></div><button className="button button-quiet" type="button" onClick={resetProfile}>↺ Làm lại hồ sơ</button></div>
              <div className="profile-summary"><span className="summary-label">HỒ SƠ ĐANG XEM</span><span className="summary-chip">Schema: {normalizedProfile ? 'StudentProfile' : 'Chưa tạo'}</span><span className="summary-chip">Điểm: {profile.score}/30</span>{profile.interest && <span className="summary-chip">{interestLabels[profile.interest]}</span>}{profile.region && <span className="summary-chip">{regionLabels[profile.region]}</span>}{profile.budget && <span className="summary-chip">{budgetLabels[profile.budget]}</span>}</div>
              <div className="demo-warning"><span aria-hidden="true">ⓘ</span><p><strong>Đây là dữ liệu minh họa giao diện.</strong> Tên trường và chương trình dưới đây không phải dữ liệu tuyển sinh thực tế. Chưa có kết luận về điểm chuẩn hoặc khả năng trúng tuyển.</p></div>
              {visiblePrograms.length ? <div className="program-grid">{programsToShow.map((item, index) => <article className="program-card" key={item.id}><div className={`program-art program-art-${index % 3}`}><span className="program-art-label">HƯỚNG ĐI {String(index + 1).padStart(2, '0')}</span><span className="program-art-symbol">{index % 3 === 0 ? '✳' : index % 3 === 1 ? '↗' : '◇'}</span><span className="program-art-caption">AI PATHWAY <i>·</i> DEMO</span></div><div className="program-content"><div className="program-tags">{item.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div><h3>{item.program}</h3><p className="program-school">{item.school}</p><p className="program-description">{item.description}</p><div className="program-meta"><span>⌖ {regionLabels[item.region]}</span><span className="demo-tag">Dữ liệu demo</span></div><button type="button" className="program-link" onClick={() => document.getElementById('data-note')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Tìm hiểu tiêu chí <span aria-hidden="true">↗</span></button></div></article>)}</div> : <div className="no-results"><span>⌕</span><h3>Chưa có lựa chọn khớp với từ khóa</h3><p>Thử bỏ bớt từ khóa hoặc chọn “Toàn quốc” để mở rộng kết quả minh họa.</p><button className="button button-secondary" type="button" onClick={() => { updateProfile('keywords', ''); setSubmittedProfile({ ...profile, keywords: '' }) }}>Xóa từ khóa</button></div>}
              {visiblePrograms.length > 3 && <div className="show-more-wrap"><button className="button button-secondary" type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Thu gọn danh sách' : `Xem thêm ${visiblePrograms.length - 3} lựa chọn`} <span aria-hidden="true">{showAll ? '↑' : '↓'}</span></button></div>}
              <div className="save-profile"><div><span className="save-icon">✓</span><span><strong>Muốn tiếp tục tinh chỉnh?</strong><small>Hồ sơ hiện chỉ được giữ trong trạng thái trang khi bạn đang mở demo.</small></span></div><button className="button button-primary" type="button" onClick={saveProfile}>{saved ? 'Đã ghi nhận ✓' : 'Ghi nhận hồ sơ'}</button></div>{saved && <p className="save-confirmation" role="status">Đã ghi nhận hồ sơ trong giao diện demo. Thông tin chưa được gửi lên máy chủ.</p>}
            </>}
            <div className="data-note" id="data-note"><span className="data-note-icon">i</span><div><strong>Minh bạch về dữ liệu</strong><p>Bản giao diện này dùng dữ liệu minh họa để kiểm tra trải nghiệm. Khi tích hợp dữ liệu thật, mỗi chương trình cần có nguồn chính thức, năm áp dụng và trạng thái xác minh. AI Pathway không cam kết kết quả tuyển sinh.</p></div></div>
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

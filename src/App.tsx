
import { useState } from 'react'

type StudentProfile = {
  score: string
  interest: string
  location: string
  budget: string
}

const initialProfile: StudentProfile = {
  score: '',
  interest: '',
  location: '',
  budget: '',
}

function App() {
  const [profile, setProfile] = useState(initialProfile)
  const [submitted, setSubmitted] = useState(false)

  function updateProfile(
    field: keyof StudentProfile,
    value: string,
  ) {
    setProfile((current) => ({ ...current, [field]: value }))
    setSubmitted(false)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark">A</span>
          <span>AI Pathway</span>
        </a>

        <nav>
          <a href="#explore">Khám phá ngành học</a>
          <a href="#how-it-works">Cách hoạt động</a>
        </nav>

        <span className="version-label">DEMO</span>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">LỘ TRÌNH ĐẠI HỌC CỦA BẠN</span>
            <h1>
              Chọn ngành đúng.
              <br />
              <span>Mở lối tương lai.</span>
            </h1>
            <p>
              Khám phá ngành học và trường đại học phù hợp với
              năng lực, sở thích và điều kiện của bạn trên khắp
              Việt Nam.
            </p>
            <a className="primary-link" href="#explore">
              Bắt đầu khám phá <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="hero-visual" aria-label="Minh họa lộ trình học tập">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="visual-center">
              <span className="visual-icon">✳</span>
              <strong>Tương lai</strong>
              <span>do bạn lựa chọn</span>
            </div>
            <div className="floating-note note-top">01 · Khám phá</div>
            <div className="floating-note note-bottom">02 · Lập lộ trình</div>
          </div>
        </section>

        <section className="explore-section" id="explore">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BƯỚC 01</span>
              <h2>Hồ sơ định hướng của bạn</h2>
              <p>
                Cung cấp một vài thông tin để bắt đầu xây dựng
                lộ trình tham khảo.
              </p>
            </div>
            <span className="step-count">01 / 03</span>
          </div>

          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Điểm dự kiến
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    placeholder="Ví dụ: 24.5 / 30"
                    value={profile.score}
                    onChange={(event) =>
                      updateProfile('score', event.target.value)
                    }
                    required
                  />
                  <span className="field-hint">
                    Thang điểm cần được xác nhận theo phương thức xét tuyển.
                  </span>
                </label>

                <label>
                  Nhóm ngành quan tâm
                  <select
                    value={profile.interest}
                    onChange={(event) =>
                      updateProfile('interest', event.target.value)
                    }
                    required
                  >
                    <option value="">Chọn nhóm ngành</option>
                    <option value="technology">Công nghệ và kỹ thuật</option>
                    <option value="business">Kinh tế và kinh doanh</option>
                    <option value="health">Y tế và sức khỏe</option>
                    <option value="education">Giáo dục và xã hội</option>
                    <option value="arts">Nghệ thuật và sáng tạo</option>
                    <option value="other">Nhóm ngành khác</option>
                    <option value="undecided">Chưa xác định</option>
                  </select>
                </label>

                <label>
                  Khu vực mong muốn
                  <select
                    value={profile.location}
                    onChange={(event) =>
                      updateProfile('location', event.target.value)
                    }
                    required
                  >
                    <option value="">Chọn khu vực</option>
                    <option value="north">Miền Bắc</option>
                    <option value="central">Miền Trung</option>
                    <option value="south">Miền Nam</option>
                    <option value="anywhere">Toàn quốc</option>
                  </select>
                </label>

                <label>
                  Ngân sách học phí mỗi năm
                  <select
                    value={profile.budget}
                    onChange={(event) =>
                      updateProfile('budget', event.target.value)
                    }
                    required
                  >
                    <option value="">Chọn ngân sách</option>
                    <option value="under20">Dưới 20 triệu đồng</option>
                    <option value="20to40">20–40 triệu đồng</option>
                    <option value="40to70">40–70 triệu đồng</option>
                    <option value="over70">Trên 70 triệu đồng</option>
                    <option value="flexible">Linh hoạt / cần tư vấn</option>
                  </select>
                </label>
              </div>

              <button className="submit-button" type="submit">
                Lưu hồ sơ định hướng <span aria-hidden="true">→</span>
              </button>

              {submitted && (
                <p className="form-message" role="status">
                  Đã ghi nhận thông tin trên giao diện. Bước tiếp theo
                  sẽ kết nối dữ liệu tuyển sinh để tạo gợi ý có căn cứ.
                </p>
              )}
            </form>
          </div>
        </section>

        <section className="results-section" id="recommendations">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BƯỚC 02</span>
              <h2>Gợi ý dành cho bạn</h2>
              <p>
                Khám phá các chương trình đại học dựa trên hồ sơ,
                sở thích và điều kiện học tập của bạn.
              </p>
            </div>
            <span className="step-count">02 / 03</span>
          </div>

          <div className="empty-state">
            <div className="empty-icon">✳</div>
            <h3>Lộ trình của bạn sẽ xuất hiện tại đây</h3>
            <p>
              Sau khi kết nối dữ liệu tuyển sinh đã xác minh,
              AI Pathway sẽ hiển thị các chương trình phù hợp,
              học phí, phương thức xét tuyển và nguồn tham khảo.
            </p>
            <span className="status-pill">Đang chờ kết nối dữ liệu</span>
          </div>
        </section>

        <section className="comparison-section" id="compare">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BƯỚC 03</span>
              <h2>So sánh và điều chỉnh</h2>
              <p>
                Đặt các lựa chọn cạnh nhau để cân nhắc trước
                khi đưa ra quyết định.
              </p>
            </div>
          </div>

          <div className="comparison-grid">
            <article className="comparison-card">
              <span className="comparison-symbol">↔</span>
              <h3>So sánh chương trình</h3>
              <p>
                Đối chiếu ngành học, học phí, địa điểm và
                phương thức xét tuyển.
              </p>
              <span className="card-status">Chờ dữ liệu chương trình</span>
            </article>

            <article className="comparison-card">
              <span className="comparison-symbol">◎</span>
              <h3>Mô phỏng lộ trình</h3>
              <p>
                Xem xét các kịch bản khi điểm dự kiến,
                ngân sách hoặc khu vực mong muốn thay đổi.
              </p>
              <span className="card-status">Chờ tích hợp logic</span>
            </article>

            <article className="comparison-card">
              <span className="comparison-symbol">✓</span>
              <h3>Kiểm tra nguồn</h3>
              <p>
                Xem năm áp dụng, nguồn chính thức và trạng thái
                xác minh của thông tin tuyển sinh.
              </p>
              <span className="card-status">Chờ tích hợp nguồn</span>
            </article>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <span className="eyebrow">TỪ THÔNG TIN ĐẾN LỰA CHỌN</span>
          <h2>Một lộ trình, ba bước</h2>

          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-number">01</span>
              <h3>Khám phá</h3>
              <p>
                Xác định sở thích, năng lực, khu vực và ngân sách
                học tập của bạn.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-number">02</span>
              <h3>Đối chiếu</h3>
              <p>
                Đối chiếu chương trình học với dữ liệu tuyển sinh
                và nguồn thông tin chính thức.
              </p>
            </article>

            <article className="feature-card">
              <span className="feature-number">03</span>
              <h3>Điều chỉnh</h3>
              <p>
                Thử các kịch bản điểm số và ngân sách để cân nhắc
                những lựa chọn phù hợp hơn.
              </p>
            </article>
          </div>
        </section>
        
        <section className="recommend-section">
          <div className="section-heading">
            <p className="eyebrow">GỢI Ý DÀNH CHO BẠN</p>
            <h2>Khám phá ngành học và trường đại học</h2>
            <p>
              Tìm hiểu các lựa chọn phù hợp với sở thích,
              năng lực và ngân sách của bạn.
            </p>
          </div>

          <div className="recommend-empty">
            <h3>Không gian gợi ý trường đại học</h3>
            <p>
              Danh sách chương trình sẽ hiển thị tại đây
              khi dữ liệu tuyển sinh được tích hợp.
            </p>
          </div>
        </section>

        <footer className="footer">
          <span>AI Pathway · Định hướng, không quyết định thay bạn.</span>
          <span>Dữ liệu và gợi ý sẽ được bổ sung trong bản demo.</span>
        </footer>
      </main>
    </div>
  )
}

export default App

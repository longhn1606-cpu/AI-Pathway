import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

await mkdir('artifacts/responsive', { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const scenarios = Array.from({ length: 20 }, (_, index) => ({
  score: String(18 + (index % 12)),
  interest: index % 4 === 0 ? 'undecided' : 'technology',
  region: ['north', 'central', 'south', 'anywhere'][index % 4],
  budget: ['under20', '20to40', '40to70', 'over70', 'flexible'][index % 5],
}))

try {
  let serverReady = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:5173')
      if (response.ok) {
        serverReady = true
        break
      }
    } catch {
      // Vite may still be starting; retry on the next iteration.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  assert.equal(serverReady, true, 'Vite dev server did not become ready')
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' })
  assert.match(await page.title(), /AI Pathway/i)

  // Render a real recommendation result before taking responsive screenshots.
  const scoreInput = page.locator('input[type="number"]')
  const profileSelects = page.locator('form select')
  await scoreInput.fill('30')
  await profileSelects.nth(0).selectOption('undecided')
  await profileSelects.nth(1).selectOption('anywhere')
  await profileSelects.nth(2).selectOption('flexible')
  await page.locator('.method-option').filter({ hasText: 'Thi tốt nghiệp THPT' }).locator('input').check()
  await page.getByRole('button', { name: /Khám phá lựa chọn/ }).click()
  await page.waitForFunction(
    () => {
      const heading = document.querySelector('.no-results[role="status"] h3')?.textContent ?? ''
      return !heading.includes('Đang phân tích hồ sơ')
        && (document.querySelectorAll('.program-card').length > 0
          || document.querySelector('.no-results[role="status"]'))
    },
    undefined,
    { timeout: 15000 },
  )
  assert.ok(await page.locator('.program-card').count() > 0, 'Responsive screenshots require a populated recommendation result, not an empty state')
  await page.locator('.program-card').first().waitFor({ state: 'visible' })
  await page.locator('.profile-summary').waitFor({ state: 'visible' })

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.waitForTimeout(150)
    const resultLayout = await page.evaluate(() => {
      const selectors = [
        '.topbar .brand', '.menu-toggle', '.topbar-cta', '.hero-copy',
        '.form-card', '.profile-summary', '.results-toolbar', '.program-grid',
        '.program-card', '.data-note', '#recommendations section[aria-labelledby="rule-comparison-title"]',
        '.footer',
      ]
      const visible = (element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden'
          && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0
      }
      const boxes = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            selector,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          }
        }))
      const overflowingDescendants = [...document.querySelectorAll('body *')]
        .filter(visible)
        .flatMap((element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          // Decorative art (orbits, glows and floating cards) is intentionally clipped
          // by its own container on narrow screens. Do not treat that clipping as
          // content loss; still fail on overflowing text/control nodes and on any
          // element that visibly escapes all clipping ancestors.
          const textOrControl = element.matches(
            'p,h1,h2,h3,h4,small,strong,a,button,span,label,input,select,textarea',
          )
          const hasInternalOverflow = element.scrollWidth > element.clientWidth + 1
            && (style.overflowX === 'visible' || textOrControl)
          const clippedByAncestor = (() => {
            let ancestor = element.parentElement
            while (ancestor && ancestor !== document.body) {
              const ancestorStyle = getComputedStyle(ancestor)
              const ancestorRect = ancestor.getBoundingClientRect()
              if (['hidden', 'clip'].includes(ancestorStyle.overflowX)
                && (rect.left < ancestorRect.left - 1 || rect.right > ancestorRect.right + 1)) {
                return true
              }
              ancestor = ancestor.parentElement
            }
            return false
          })()
          const outsideViewport = !clippedByAncestor
            && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1)
          return (hasInternalOverflow || outsideViewport) ? [{
            tag: element.tagName,
            className: typeof element.className === 'string' ? element.className : '',
            text: (element.innerText || element.textContent || '').trim().slice(0, 100),
            left: Math.round(rect.left * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            overflowX: style.overflowX,
          }] : []
        })
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        boxes,
        overflowingDescendants,
        programCardCount: document.querySelectorAll('.program-card').length,
        resultHeadingFontSize: getComputedStyle(document.querySelector('.program-card h3')).fontSize,
      }
    })
    assert.ok(resultLayout.programCardCount > 0, `Viewport ${width}px must show populated program cards`)
    assert.equal(resultLayout.documentWidth, resultLayout.viewportWidth, `Mobile viewport ${width}px must not horizontally scroll`)
    for (const box of resultLayout.boxes) {
      assert.ok(box.left >= -1 && box.right <= width + 1,
        `${box.selector} must fit within ${width}px viewport: ${JSON.stringify(box)}`)
      assert.ok(box.scrollWidth <= box.clientWidth + 1,
        `${box.selector} must not clip its own content at ${width}px: ${JSON.stringify(box)}`)
    }
    assert.ok(Number.parseFloat(resultLayout.resultHeadingFontSize) >= 16,
      `Program-card headings must remain readable at ${width}px`)
    assert.deepEqual(resultLayout.overflowingDescendants, [],
      `No visible element may overflow its container/viewport at ${width}px: ${JSON.stringify(resultLayout.overflowingDescendants)}`)

    await page.screenshot({ path: `artifacts/responsive/results-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: /Mở menu/ }).click()
    assert.equal(await page.getByRole('navigation', { name: 'Điều hướng chính' }).isVisible(), true, 'Mobile navigation must open')
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Gợi ý' }).click()
    assert.equal(await page.getByRole('navigation', { name: 'Điều hướng chính' }).isVisible(), false, 'Mobile navigation must close after selection')
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: 'artifacts/responsive/desktop-1280.png', fullPage: true })
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  assert.equal(desktopOverflow, false, 'Desktop viewport must not overflow horizontally')

  // Reset the completed responsive scenario before asserting empty-profile validation.
  // Otherwise the valid profile used to generate screenshots would still be populated.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await scoreInput.waitFor({ state: 'visible' })

  // The UI owns required-field validation; an empty submit must report all
  // missing fields together and must not be mistaken for a service error.
  await page.getByRole('button', { name: /Khám phá lựa chọn/ }).click()
  const profileValidationAlert = page.getByRole('alert').filter({ hasText: 'Vui lòng kiểm tra lại hồ sơ' })
  await profileValidationAlert.waitFor({ timeout: 5000 })
  assert.equal(await profileValidationAlert.locator('li').count(), 4, 'Empty profile must report all four required fields')

  // Invalid numeric input is caught by the same runtime validator and must
  // clear stale results rather than leaving the previous recommendation visible.
  await scoreInput.fill('31')
  await page.getByRole('button', { name: /Khám phá lựa chọn/ }).click()
  await page.getByRole('alert').filter({ hasText: 'Điểm dự kiến phải nằm trong khoảng 0–30.' }).waitFor({ timeout: 5000 })
  assert.equal(await page.locator('.program-card').count(), 0, 'Invalid submission must clear stale recommendation cards')
  assert.equal(await page.locator('.profile-summary').count(), 0, 'Invalid submission must clear the previously submitted profile summary')
  await page.getByText('Gợi ý của bạn sẽ xuất hiện ở đây').waitFor({ timeout: 5000 })
  assert.equal(await page.locator('.results-empty').count(), 1, 'Invalid submission must return the results area to its initial empty state')

  await scoreInput.fill('24.55')
  await page.getByRole('button', { name: /Khám phá lựa chọn/ }).click()
  await page.getByRole('alert').filter({ hasText: 'tối đa một chữ số thập phân' }).waitFor({ timeout: 5000 })
  assert.equal(await page.locator('.results-empty').count(), 1, 'Over-precision score must not create a submitted profile')

  await page.locator('.method-option').filter({ hasText: 'Thi tốt nghiệp THPT' }).locator('input').check()

  const ruleSelects = page.locator('#recommendations section[aria-labelledby="rule-comparison-title"] select')
  const firstRuleVersion = await ruleSelects.nth(0).inputValue()
  await ruleSelects.nth(1).selectOption(firstRuleVersion)
  await page.getByRole('alert').filter({ hasText: 'Hãy chọn hai phiên bản khác nhau' }).waitFor({ timeout: 5000 })
  assert.equal(await page.getByRole('region', { name: 'Tác động học phí' }).count(), 0, 'Same-version comparison must not render a misleading impact report')
  await ruleSelects.nth(1).selectOption({ index: 1 })

  for (const [index, scenario] of scenarios.entries()) {
    const selects = page.locator('form select')

    await scoreInput.fill(scenario.score)
    await selects.nth(0).selectOption(scenario.interest)
    await selects.nth(1).selectOption(scenario.region)
    await selects.nth(2).selectOption(scenario.budget)
    await page.getByRole('button', { name: /Khám phá lựa chọn/ }).click()

    await page.waitForFunction(
      () => {
        const statusHeading = document.querySelector('.no-results[role="status"] h3')?.textContent ?? ''
        const stillLoading = statusHeading.includes('Đang phân tích hồ sơ')
        return !stillLoading && (document.querySelector('.program-card') || document.querySelector('.no-results'))
      },
      undefined,
      { timeout: 10000 },
    )

    const error = await page.locator('.no-results[role="alert"]').count()
    assert.equal(error, 0, `Scenario ${index + 1}: recommendation service returned an error`)

    assert.equal(await page.locator('.profile-summary').filter({ hasText: 'Thi tốt nghiệp THPT' }).count(), 1, 'Selected admission method should remain visible in the submitted profile')

    const cardCount = await page.locator('.program-card').count()
    if (index === 0 && cardCount > 0) {
      const cardText = await page.locator('.program-card').allInnerTexts()
      assert.ok(
        cardText.some((text) => /điểm dự kiến (đang bằng hoặc cao hơn|thấp hơn) điểm chuẩn tham khảo năm/i.test(text)),
        'A /30 THPT score must be compared with a verified same-program THPT cutoff when one exists',
      )
    }
    if (cardCount === 0) {
      const noMatchState = page.locator('.no-results[role="status"]').filter({ hasText: 'Chưa có chương trình phù hợp với tiêu chí hiện tại' })
      assert.equal(await noMatchState.count(), 1, `Scenario ${index + 1}: empty recommendations must show a valid criteria-based empty state for ${JSON.stringify(scenario)}`)
    }

    if (index % 4 === 0 && Number(scenario.score) < 30) {
      await page.getByRole('button', { name: 'Mô phỏng +1 điểm' }).click()
      const simulationSummary = page.locator('.profile-summary').filter({ hasText: 'KỊCH BẢN MÔ PHỎNG' })
      await simulationSummary.waitFor({ timeout: 10000 })
      assert.equal(await scoreInput.inputValue(), scenario.score, 'Simulation must not mutate the baseline form score')
    }

    const simulatedNotice = page.getByText(/Kịch bản bên dưới được cung cấp bởi module Member 4/)
    assert.equal(await simulatedNotice.count(), 1, 'Rule comparison fixture must be explicitly labelled simulated')
    assert.equal(await page.getByText(/Mức độ ảnh hưởng:/).count(), 1)
    assert.ok(await page.getByText(/conditions.minimumScore/).count() > 0, 'Rule comparison should render changed fields')
    const tuitionDisclosure = page.locator('.comparison-detail').filter({ has: page.locator('summary', { hasText: 'Tác động học phí' }) })
    const nextStepsDisclosure = page.locator('.comparison-detail').filter({ has: page.locator('summary', { hasText: 'Việc học sinh nên làm tiếp theo' }) })
    assert.equal(await tuitionDisclosure.count(), 1, 'Tuition impact must be available as a collapsible detail')
    assert.equal(await nextStepsDisclosure.count(), 1, 'Next steps must be available as a collapsible detail')
    await tuitionDisclosure.locator('summary').click()
    const tuitionDisclosureText = await tuitionDisclosure.innerText()
    assert.match(tuitionDisclosureText, /chưa có dữ liệu|needs_review|cần được rà soát/i, 'Null tuition amounts must remain visibly unknown')
    assert.doesNotMatch(tuitionDisclosureText, /0 đồng\/năm/, 'Null tuition must never be rendered as zero')
  }

  process.stdout.write('Frontend E2E profiles completed: 20/20\n')
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { chromium } from 'playwright'

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

  for (const [index, scenario] of scenarios.entries()) {
    const scoreInput = page.locator('input[type="number"]')
    const selects = page.locator('form select')

    await scoreInput.fill(scenario.score)
    await selects.nth(0).selectOption(scenario.interest)
    await selects.nth(1).selectOption(scenario.region)
    await selects.nth(2).selectOption(scenario.budget)
    await page.getByRole('button', { name: /Khám phá lựa chọn/ }).click()

    await page.waitForFunction(
      () => !document.querySelector('.no-results[role="status"]')
        && (document.querySelector('.program-card') || document.querySelector('.no-results')),
      undefined,
      { timeout: 10000 },
    )

    const error = await page.locator('.no-results[role="alert"]').count()
    assert.equal(error, 0, `Scenario ${index + 1}: recommendation service returned an error`)

    const cardCount = await page.locator('.program-card').count()
    assert.ok(cardCount > 0, `Scenario ${index + 1}: no recommendation cards for ${JSON.stringify(scenario)}`)

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
    assert.equal(await page.getByRole('region', { name: 'Tác động học phí' }).count(), 1)
    assert.equal(await page.getByRole('region', { name: 'Việc học sinh nên làm tiếp theo' }).count(), 1)
    assert.ok(await page.getByText(/chưa có snapshot học phí/i).count() > 0, 'Unverified null tuition must be disclosed as unknown')
  }

  process.stdout.write('Frontend E2E profiles completed: 20/20\n')
} finally {
  await browser.close()
}

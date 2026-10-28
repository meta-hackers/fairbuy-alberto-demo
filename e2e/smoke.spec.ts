import { expect, test, type Page } from '@playwright/test'

const FIRST_MESSAGE = 'I need a PC for competitive and AAA gaming'
const SECOND_MESSAGE = 'Budget CHF 2,000, 1440p; GPU and RAM matter'

async function freezeClock(page: Page) {
  const time = new Date('2026-01-01T00:00:00Z')
  await page.clock.install({ time })
  await page.clock.pauseAt(time)
}

async function revealCharacteristics(page: Page) {
  await page.goto('/')
  const input = page.getByTestId('ask-input')
  await input.fill(FIRST_MESSAGE)
  await input.press('Enter')
  await input.fill(SECOND_MESSAGE)
  await input.press('Enter')
  await expect(page.getByTestId('characteristics-panel')).toBeVisible()
}

async function startDiscovery(page: Page) {
  await revealCharacteristics(page)
  await page.getByTestId('go-configure').click()
  await expect(page.getByTestId('configure-page')).toBeVisible()
  await page.getByTestId('start-discovery').click()
  await expect(page.getByTestId('discover-page')).toBeVisible()
}

const cards = (page: Page) => page.locator('[data-testid^="product-card-"]')

test('configure and discover are locked until two messages reveal characteristics', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('rail-configure').click()
  await expect(page.getByText(/Send two messages in ASK first/)).toBeVisible()
  await expect(page.getByTestId('configure-page')).toHaveCount(0)
  await expect(page.getByTestId('ask-locked')).toBeVisible()

  await page.getByTestId('rail-discover').click()
  await expect(page.getByTestId('discover-page')).toHaveCount(0)
  await expect(page.getByTestId('stage-configure')).toBeDisabled()
  await expect(page.getByTestId('stage-discover')).toBeDisabled()

  const input = page.getByTestId('ask-input')
  await input.fill(FIRST_MESSAGE)
  await input.press('Enter')
  await input.fill(SECOND_MESSAGE)
  await input.press('Enter')

  await expect(page.getByTestId('stage-configure')).toBeEnabled()
  await expect(page.getByTestId('stage-discover')).toBeEnabled()
  await expect(page.getByTestId('go-configure')).toBeVisible()
})

test('six stages remain visible/readable with no horizontal overflow at 320, 360, 390 and desktop', async ({ page }) => {
  for (const width of [320, 360, 390, 1280]) {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/')
    for (const stage of ['ask', 'configure', 'discover', 'learn', 'product', 'compare']) {
      const button = page.getByTestId(`stage-${stage}`)
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
    if (width < 400 || width === 1280) await page.screenshot({ path: `artifacts/screenshots/stages-${width}.png`, fullPage: true })
  }
})

test('PC cards are compact by default, keyboard expandable, and dismissal is reversible', async ({ page }) => {
  await freezeClock(page)
  await startDiscovery(page)
  await page.clock.runFor(2000)
  const card = page.getByTestId('product-card-nova')
  const summary = page.getByTestId('expand-nova')
  await expect(summary).toHaveAttribute('aria-expanded', 'false')
  await expect(summary).toContainText('NOVA Forge 4070 SUPER')
  await expect(card.getByTestId('dismiss-nova')).not.toBeVisible()
  const collapsed = await card.boundingBox()
  expect(collapsed!.height).toBeLessThan(75)
  await page.screenshot({ path: 'artifacts/screenshots/pc-card-collapsed.png', fullPage: true })
  await summary.focus(); await summary.press('Enter')
  await expect(summary).toHaveAttribute('aria-expanded', 'true')
  await expect(card.getByTestId('dismiss-nova')).toBeVisible()
  await page.screenshot({ path: 'artifacts/screenshots/pc-card-expanded.png', fullPage: true })

  await card.getByTestId('dismiss-nova').click()
  await expect(page.getByTestId('dismiss-modal')).toBeVisible()
  await page.getByTestId('dismiss-modal').getByRole('button', { name: 'Cancel' }).click()
  await expect(card).toBeVisible()
  await card.getByTestId('dismiss-nova').click()
  await page.getByRole('button', { name: 'Too expensive' }).click()
  await page.getByTestId('dismiss-apply').click()
  await expect(card).toHaveCount(0)
  await expect(page.locator('[data-product-id="nova"]').filter({ hasText: 'Too expensive' })).toBeVisible()
  await page.getByTestId('rail-ask').click()
  await page.getByTestId('rail-discover').click()
  await expect(page.getByTestId('product-card-nova')).toHaveCount(0)
  await page.getByTestId('price-min').focus()
  await page.getByTestId('price-min').press('ArrowRight')
  await expect(page.getByTestId('product-card-nova')).toHaveCount(0)
  await page.getByTestId('stage-learn').click()
  await expect(page.locator('[data-product-id="nova"]').filter({ hasText: 'Too expensive' })).toBeVisible()
  await page.getByTestId('undo-nova').click()
  await page.getByTestId('rail-discover').click()
  await expect(page.getByTestId('product-card-nova')).toHaveCount(0)
  await page.clock.runFor(2000)
  await expect(page.getByTestId('product-card-nova')).toBeVisible()
  if (await page.getByTestId('expand-nova').getAttribute('aria-expanded') === 'false') await page.getByTestId('expand-nova').click()
  await page.getByTestId('dismiss-nova').click()
  await page.getByTestId('dismiss-skip').click()
  await expect(page.getByTestId('product-card-nova')).toHaveCount(0)
  await expect(page.locator('[data-product-id="nova"]').filter({ hasText: 'No reason given' })).toBeVisible()
})

test('explicit preferred clarification updates the visible characteristic without a hard mode', async ({ page }) => {
  await freezeClock(page); await startDiscovery(page); await page.clock.runFor(2000)
  await page.getByTestId('expand-nova').click()
  await page.getByTestId('dismiss-nova').click()
  await page.getByRole('button', { name: 'Insufficient RAM (32 GB)' }).click()
  await page.getByRole('radio', { name: 'Preference only' }).check()
  await page.getByTestId('dismiss-apply').click()
  await expect(page.getByText('RAM: 32 GB · preference only').first()).toBeVisible()
  await expect(page.locator('[data-product-id="nova"]').filter({ hasText: 'RAM: 32 GB · preference only' })).toBeVisible()
})

test('dismissal custom note saves feedback without silently changing characteristics', async ({ page }) => {
  await freezeClock(page); await startDiscovery(page); await page.clock.runFor(2000)
  const card = page.getByTestId('product-card-nova')
  await page.getByTestId('expand-nova').click()
  await card.getByTestId('dismiss-nova').click()
  await page.getByTestId('dismiss-modal').getByLabel(/Or add a note/).fill('I prefer a compact case')
  await page.getByTestId('dismiss-apply').click()
  await expect(page.locator('[data-product-id="nova"]').filter({ hasText: 'I prefer a compact case' })).toBeVisible()
  await expect(page.getByTestId('characteristic-item')).toHaveCount(5)
})

test('dual-thumb price slider is keyboard accessible, visible and cannot cross', async ({ page }) => {
  await revealCharacteristics(page)
  await page.getByTestId('go-configure').click()

  const min = page.getByTestId('price-min')
  const max = page.getByTestId('price-max')
  await expect(min).toHaveAttribute('type', 'range')
  await expect(min).toHaveAttribute('aria-label', 'Minimum price')
  await expect(max).toHaveAttribute('aria-label', 'Maximum price')
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'000")
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 3'000")

  await min.focus()
  await min.press('ArrowRight')
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'100")

  await max.focus()
  for (let i = 0; i < 10; i += 1) await max.press('ArrowLeft')
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 2'000")

  await min.focus()
  await min.press('End')
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 2'000")
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 2'000")
  expect(Number(await min.inputValue())).toBeLessThanOrEqual(Number(await max.inputValue()))

  await max.focus()
  await max.press('End')
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 3'000")
  await min.focus()
  await min.press('Home')
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'000")

  await page.getByTestId('start-discovery').click()
  await expect(page.getByTestId('discover-page')).toBeVisible()
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'000")
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 3'000")
})

test('discover inserts one product at 2s and 4s, keeps filters and resumes without duplicates', async ({ page }) => {
  await freezeClock(page)
  await revealCharacteristics(page)
  await page.getByTestId('go-configure').click()

  await page.getByTestId('custom-characteristic-input').fill('Wi-Fi 7')
  await page.getByTestId('add-characteristic').click()
  await expect(page.getByTestId('unsupported-note')).toBeVisible()

  await page.getByTestId('start-discovery').click()
  await expect(page.getByTestId('discover-page')).toBeVisible()
  await expect(page.getByTestId('price-slider')).toBeVisible()
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'000")
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 3'000")
  await expect(page.getByTestId('characteristic-item')).toHaveCount(6)
  await expect(page.getByTestId('unsupported-banner')).toContainText('Wi-Fi 7')
  await expect(page.getByTestId('searching-indicator')).toContainText('Searching...')
  await expect(page.getByTestId('search-status')).toHaveText('Searching...')
  await expect(cards(page)).toHaveCount(0)

  await page.clock.runFor(1999)
  await expect(cards(page)).toHaveCount(0)
  await page.clock.runFor(1)
  await expect(cards(page)).toHaveCount(1)
  await expect(page.getByTestId('product-card-nova')).toBeVisible()
  await expect(page.getByTestId('product-card-vortex')).toHaveCount(0)

  await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(2)
  await expect(page.getByTestId('product-card-vortex')).toBeVisible()

  await page.getByTestId('rail-ask').click()
  await expect(page.getByTestId('message-user')).toHaveCount(2)
  await expect(page.getByTestId('characteristic-item')).toHaveCount(6)
  await expect(page.getByText('Wi-Fi 7')).toBeVisible()

  await page.clock.runFor(6000)
  await page.getByTestId('rail-discover').click()
  await expect(cards(page)).toHaveCount(2)
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'000")
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 3'000")
  await expect(page.getByTestId('characteristic-item')).toHaveCount(6)

  await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(3)

  for (let i = 0; i < 3; i += 1) await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(6)
  const ids = await cards(page).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid')))
  expect(ids).toEqual([
    'product-card-nova',
    'product-card-vortex',
    'product-card-vega',
    'product-card-aero',
    'product-card-orbit-pro',
    'product-card-titan',
  ])
  expect(new Set(ids).size).toBe(6)
  await expect(page.getByTestId('searching-indicator')).toHaveCount(0)
  await expect(page.getByTestId('search-status')).toHaveText('Discovery complete')
  await expect(page.getByTestId('search-complete')).toContainText('6 products matching')
})

test('changing filters cleans the timer and restarts with the new price and features', async ({ page }) => {
  await freezeClock(page)
  await startDiscovery(page)

  await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(1)

  await page.getByRole('button', { name: 'Remove characteristic: Condition: new only' }).click()
  await expect(cards(page)).toHaveCount(0)
  await expect(page.getByTestId('searching-indicator')).toBeVisible()
  await expect(page.getByTestId('discover-count')).toContainText('6 match')

  await page.clock.runFor(1999)
  await expect(cards(page)).toHaveCount(0)
  await page.clock.runFor(1)
  await expect(cards(page)).toHaveCount(1)

  await page.getByTestId('custom-characteristic-input').fill('Silenzioso')
  await page.getByTestId('add-characteristic').click()
  await expect(cards(page)).toHaveCount(0)
  await expect(page.getByTestId('searching-indicator')).toBeVisible()
  await expect(page.getByTestId('unsupported-banner')).toContainText('Silenzioso')
  await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(1)

  const min = page.getByTestId('price-min')
  const max = page.getByTestId('price-max')
  await min.focus()
  for (let i = 0; i < 8; i += 1) await min.press('ArrowRight')
  await max.focus()
  for (let i = 0; i < 10; i += 1) await max.press('ArrowLeft')
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'800")
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 2'000")
  await expect(page.getByTestId('discover-count')).toContainText('3 match')
  await expect(cards(page)).toHaveCount(0)

  await page.clock.runFor(2000)
  await page.clock.runFor(2000)
  await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(3)
  const ids = await cards(page).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid')))
  expect(ids).toEqual(['product-card-nova', 'product-card-aero', 'product-card-orbit-pro'])
})

test('empty result state is immediate, sensible and can be reset', async ({ page }) => {
  await freezeClock(page)
  await revealCharacteristics(page)
  await page.getByTestId('go-configure').click()

  await page.getByTestId('price-min').focus()
  await page.getByTestId('price-min').press('End')
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 3'000")
  await page.getByTestId('start-discovery').click()

  await expect(page.getByTestId('empty-state')).toBeVisible()
  await expect(page.getByTestId('empty-state')).toContainText('No products match these filters')
  await expect(page.getByTestId('searching-indicator')).toHaveCount(0)
  await expect(page.getByTestId('search-status')).toHaveText('Discovery complete')
  await expect(cards(page)).toHaveCount(0)

  await page.getByTestId('reset-filters').click()
  await expect(page.getByTestId('price-min-value')).toHaveText("CHF 1'000")
  await expect(page.getByTestId('price-max-value')).toHaveText("CHF 3'000")
  await expect(page.getByTestId('searching-indicator')).toBeVisible()
  await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(1)
})

test('offers, comparison and favorites remain usable from the new discovery flow', async ({ page }) => {
  await freezeClock(page)
  await startDiscovery(page)
  await page.clock.runFor(2000)

  await page.getByTestId('expand-nova').click()
  await page.getByTestId('product-card-nova').getByRole('button', { name: /View exact offers/ }).click()
  await expect(page.getByTestId('seller-view')).toBeVisible()
  await expect(page.getByTestId('seller-nova-g')).toContainText('Galaxus')
  await expect(page.getByTestId('seller-nova-g')).toContainText(/1.899/)
  await expect(page.getByTestId('seller-unknown-nova-p')).toBeVisible()
  await page.getByRole('button', { name: /Retailer details/ }).first().click()
  await expect(page.getByRole('dialog')).toContainText('No purchase has been made')
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: '← Back to products' }).click()
  await expect(page.getByTestId('discover-page')).toBeVisible()
  await page.clock.runFor(2000)
  await expect(page.getByTestId('product-card-vortex')).toBeVisible()

  await page.getByTestId('expand-vortex').click()
  await page.getByTestId('product-card-nova').getByRole('checkbox').check()
  await page.getByTestId('product-card-vortex').getByRole('checkbox').check()
  await page.getByTestId('open-compare').click()
  await expect(page.getByTestId('compare-modal')).toContainText('NOVA Forge 4070 SUPER')
  await expect(page.getByTestId('compare-modal')).toContainText('VORTEX Elite 4080 SUPER')
  await page.getByRole('button', { name: 'Close comparison' }).click()

  await page.getByTestId('favorite-nova').click()
  await expect(page.getByTestId('favorites-count')).toContainText('1')
  const stored = await page.evaluate(() => localStorage.getItem('fairbuy-demo-favorites-v1'))
  expect(stored).toContain('nova')

  await page.getByTestId('reset-demo').click()
  await expect(page.getByTestId('favorites-count')).toContainText('0')
  await expect(page.getByTestId('chat-empty')).toBeVisible()
  await expect(page.getByTestId('message-user')).toHaveCount(0)
})

test('mobile configure and discover keep filters usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await freezeClock(page)
  await revealCharacteristics(page)
  await page.getByTestId('go-configure').click()

  await expect(page.getByTestId('price-slider')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)

  await page.getByTestId('start-discovery').click()
  await expect(page.getByTestId('discover-page')).toBeVisible()
  await expect(page.getByTestId('searching-indicator')).toBeVisible()
  await expect(page.getByTestId('price-slider')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)

  await page.clock.runFor(2000)
  await expect(page.getByTestId('product-card-nova')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.locator('.app-rail')).toHaveClass(/is-open/)
  await page.screenshot({ path: 'artifacts/screenshots/mobile-flow-discover.png', fullPage: true })
})

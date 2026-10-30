import { expect, test, type Page } from '@playwright/test'

const cards = (page: Page) => page.locator('[data-testid^="product-card-"]')
const fixtureCopy = /synthetic|fictional|mock|scripted/i

async function clock(page: Page) {
  const time = new Date('2026-10-28T12:00:00Z')
  await page.clock.install({ time })
  await page.clock.pauseAt(time)
}

async function request(page: Page, category: 'pc' | 'relay') {
  await page.goto('/')
  if (category === 'pc') {
    await page.getByTestId('ask-input').fill('I need a computer for gaming and photo editing')
    await page.getByTestId('ask-input').press('Enter')
    await page.getByTestId('ask-input').fill('Budget CHF 2000, 1440p, 32 GB RAM, prefer quiet')
  } else {
    await page.getByTestId('ask-input').fill('I need a smart switch for my 18 W neon light')
    await page.getByTestId('ask-input').press('Enter')
    await page.getByTestId('ask-input').fill('Hue Bridge, 230 V with neutral, ceiling junction box, budget CHF 60')
  }
  await page.getByTestId('ask-input').press('Enter')
  await expect(page.getByTestId('stage-configure')).toBeEnabled()
}

async function revealAll(page: Page, category: 'pc' | 'relay') {
  await page.getByTestId('stage-discover').click()
  const expected = category === 'pc' ? 5 : 3
  for (let index = 0; index < expected; index++) await page.clock.runFor(2000)
  await expect(cards(page)).toHaveCount(expected)
}

async function assertMinimal(page: Page) {
  await expect(page.getByRole('navigation')).toHaveCount(1)
  await expect(page.getByRole('navigation').getByRole('button')).toHaveText(['Ask', 'Configure', 'Discover', 'Learn', 'Buy'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await expect(page.locator('[data-testid^="rail-"], [data-testid*="compare"]')).toHaveCount(0)
  expect(await page.locator('body').ariaSnapshot()).not.toMatch(/\b(compare|comparison)\b/i)
}

async function scoreSnapshot(page: Page) {
  return cards(page).evaluateAll((nodes) => Object.fromEntries(nodes.map((node) => [
    node.getAttribute('data-testid')!.replace('product-card-', ''),
    Number((node as HTMLElement).dataset.score),
  ])))
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const category of ['pc', 'relay'] as const) {
      test(`${category}: Ask → Configure → progressive Discover ↔ Learn → Buy and back`, async ({ page }) => {
        const mutations: string[] = []
        page.on('request', (req) => { if (!['GET', 'HEAD'].includes(req.method())) mutations.push(req.url()) })
        await clock(page)
        await request(page, category)
        await assertMinimal(page)
        await expect(page.getByTestId('stage-learn')).toBeDisabled()

        await page.getByTestId('stage-configure').click()
        await expect(page.getByTestId('price-slider')).toHaveCount(1)
        await expect(page.getByTestId('characteristics-panel')).toHaveCount(1)
        await expect(page.getByTestId('configure-continue')).toBeVisible()
        await expect(page.getByTestId('soft-note')).toContainText('soft preferences')
        if (category === 'pc') {
          await expect(page.getByTestId('characteristics-panel')).toContainText('Use: gaming')
          await expect(page.getByTestId('characteristics-panel')).toContainText('RAM: 32 GB')
          await expect(page.getByTestId('price-max-value')).toHaveText("CHF 2'000")
        } else {
          await expect(page.getByTestId('characteristics-panel')).toContainText('Philips Hue Bridge compatible')
          await expect(page.getByTestId('characteristics-panel')).toContainText('230 V AC')
          await expect(page.getByTestId('characteristics-panel')).toContainText('18 W')
          await expect(page.getByTestId('relay-price-max-value')).toHaveText('CHF 60')
        }
        await assertMinimal(page)
        await page.screenshot({ path: `artifacts/screenshots/new-flow-${category}-${viewport.name}-configure.png`, fullPage: true })

        await page.getByTestId('stage-discover').click()
        await expect(cards(page)).toHaveCount(0)
        const loading = page.getByTestId('discover-loading')
        await expect(loading).toBeVisible()
        await expect(loading).toContainText('Loading products')
        await expect(loading.locator('.loading-spinner')).toBeVisible()
        await page.clock.runFor(1999)
        await expect(cards(page)).toHaveCount(0)
        await expect(loading).toBeVisible()
        await page.clock.runFor(1)
        await expect(cards(page)).toHaveCount(1)
        const expected = category === 'pc' ? 5 : 3
        for (let index = 1; index < expected; index++) await page.clock.runFor(2000)
        await expect(cards(page)).toHaveCount(expected)
        await expect(loading).toHaveCount(0)
        await expect(page.getByTestId('search-status')).toHaveText(`${expected} ranked options found`)

        const ranking = await cards(page).evaluateAll((nodes) => nodes.map((node) => ({
          id: node.getAttribute('data-testid')!.replace('product-card-', ''),
          score: Number((node as HTMLElement).dataset.score),
          label: node.querySelector('.match-score')?.getAttribute('data-label'),
        })))
        expect(ranking.map((item) => item.score)).toEqual([...ranking.map((item) => item.score)].sort((a, b) => b - a))
        for (const item of ranking) {
          expect(item.label).toBe(item.score >= 85 ? 'Strong match' : item.score >= 60 ? 'Good match' : 'Poor match')
          const price = page.getByTestId(`price-${item.id}`)
          expect(await price.innerText()).toMatch(/^CHF [\d'.,]+[–-][\d'.,]+$/)
          const retailerTags = page.getByTestId(`retailers-${item.id}`).locator('.retailer-tag')
          expect(await retailerTags.count()).toBeGreaterThanOrEqual(1)
          for (const tag of await retailerTags.all()) await expect(tag).not.toHaveText('')
          const badge = page.getByTestId(`match-${item.id}`)
          await expect(badge).toBeVisible()
          await expect(badge).toHaveAttribute('data-label', item.label!)
          await expect(badge).toContainText(item.label!)
          await expect(badge).toContainText('%')
        }

        const firstId = ranking[0].id
        await page.getByTestId(`expand-${firstId}`).click()
        await expect(page.getByTestId(`reasons-${firstId}`).locator('li')).not.toHaveCount(0)
        expect(await page.getByTestId(`reasons-${firstId}`).innerText()).toMatch(/preference|match|offer|target|request|supports|meets|rated/i)
        await assertMinimal(page)
        await page.screenshot({ path: `artifacts/screenshots/new-flow-${category}-${viewport.name}-discover.png`, fullPage: true })

        await page.getByTestId(`buy-${firstId}`).click()
        await expect(page.getByTestId('buy-page')).toBeVisible()
        await expect(page.getByTestId('buy-page')).toContainText('Seller options')
        await expect(page.locator(category === 'pc' ? '[data-testid^="seller-"]' : '[data-testid^="relay-offer-"]').first()).toBeVisible()
        await expect(page.getByTestId('buy-page')).toContainText('Checkout is not available')
        const offerLink = page.locator(category === 'pc' ? '[data-testid^="seller-link-"]' : '[data-testid^="relay-offer-link-"]').first()
        await expect(offerLink).toBeVisible()
        await expect(offerLink).toHaveAttribute('href', /^https:\/\/example\.com\//)
        await expect(offerLink).toContainText(/View at .+ \(synthetic demo link\)/)
        await assertMinimal(page)
        await page.screenshot({ path: `artifacts/screenshots/new-flow-${category}-${viewport.name}-buy.png`, fullPage: true })
        await page.getByRole('button', { name: '← Back to Discover' }).click()
        await expect(page.getByTestId(`product-card-${firstId}`)).toBeVisible()
        await expect(page.getByTestId(`expand-${firstId}`)).toHaveAttribute('aria-expanded', 'true')
        await expect(page.getByTestId(`match-${firstId}`)).toContainText('%')
        expect(mutations).toEqual([])
      })

      test(`${category}: Learn modal requires input, cancel is inert, free text is interpreted, apply recomputes ranking and undo restores`, async ({ page }) => {
        await clock(page)
        await request(page, category)
        await revealAll(page, category)
        const before = await scoreSnapshot(page)
        const firstId = Object.keys(before)[0]

        await page.getByTestId(`expand-${firstId}`).click()
        await page.getByTestId(`dismiss-${firstId}`).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await expect(page.getByTestId('dismiss-apply')).toBeDisabled()
        await expect(page.getByTestId('stage-learn')).toHaveAttribute('aria-current', 'step')
        const note = category === 'pc' ? 'I prefer a quieter option' : 'I prefer higher load capacity'
        await page.getByRole('textbox', { name: 'Or add a note' }).fill(note)
        await expect(page.getByTestId('dismiss-apply')).toBeEnabled()
        await expect(page.getByTestId('learned-clarification')).toBeEditable()
        await expect(page.getByTestId('learned-clarification')).not.toHaveValue('')
        await page.getByTestId('dismiss-cancel').click()
        await expect(page.getByTestId(`product-card-${firstId}`)).toBeVisible()
        await expect(page.getByTestId('feedback-log')).toHaveCount(0)
        await page.screenshot({ path: `artifacts/screenshots/new-flow-${category}-${viewport.name}-learn-cancel.png`, fullPage: true })

        await page.getByTestId(`dismiss-${firstId}`).click()
        await page.getByTestId('dismiss-reason-compact').click()
        await expect(page.getByTestId('learn-interpretation')).toContainText('editable')
        await expect(page.getByTestId('learned-clarification')).not.toHaveValue('')
        const learned = await page.getByTestId('learned-clarification').inputValue()
        expect(learned.length).toBeGreaterThan(0)
        await page.getByTestId('dismiss-apply').click()
        const dismissedCard = page.getByTestId(`product-card-${firstId}`)
        await expect(dismissedCard).toBeVisible()
        await expect(dismissedCard).toHaveAttribute('data-dismissed', 'true')
        await expect(page.getByTestId(`dismissed-note-${firstId}`)).toContainText(/Dismissed:/)
        await expect(page.getByTestId(`restore-${firstId}`)).toBeVisible()
        const cardsOrder = await cards(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')!.replace('product-card-', '')))
        expect(cardsOrder[cardsOrder.length - 1]).toBe(firstId)
        const nameDecoration = await page.getByTestId(`product-card-${firstId}`).locator('.product-summary__name').evaluate((node) => getComputedStyle(node).textDecorationLine)
        expect(nameDecoration).toContain('line-through')
        const updateIndicator = page.getByTestId('discover-loading')
        await expect(updateIndicator).toBeVisible()
        await expect(updateIndicator).toContainText('Updating results')
        for (let index = 0; index < 5; index++) await page.clock.runFor(2000)
        await expect(updateIndicator).toHaveCount(0)
        const updateBanner = page.getByTestId('matches-updated')
        await expect(updateBanner).toBeVisible()
        await expect(updateBanner).toHaveAttribute('role', 'status')
        await expect(updateBanner).toContainText(/Matches updated/)
        await expect(page.getByTestId('feedback-log')).toContainText(learned)
        await expect(page.getByTestId('feedback-log')).toContainText('Learned preference')
        const after = await scoreSnapshot(page)
        const overlap = Object.keys(after).filter((id) => id in before && id !== firstId)
        expect(overlap.length).toBeGreaterThan(0)
        expect(overlap.some((id) => after[id] !== before[id])).toBe(true)
        for (const card of await cards(page).all()) {
          const id = (await card.getAttribute('data-testid'))!.replace('product-card-', '')
          await expect(page.getByTestId(`personalized-${id}`)).toContainText(/I thought you would like this because/i)
        }
        await assertMinimal(page)
        await page.screenshot({ path: `artifacts/screenshots/new-flow-${category}-${viewport.name}-learn-applied.png`, fullPage: true })

        await page.getByTestId(`restore-${firstId}`).click()
        for (let index = 0; index < 5; index++) await page.clock.runFor(2000)
        await expect(page.getByTestId(`product-card-${firstId}`)).toHaveAttribute('data-dismissed', 'false')
        await expect(page.getByTestId(`restore-${firstId}`)).toHaveCount(0)
        await expect(page.getByTestId('feedback-log')).toContainText('Restored')
        await expect(page.getByTestId(`undo-${firstId}`)).toHaveCount(0)
        await page.getByTestId('stage-configure').click()
        await expect(page.getByText(learned, { exact: true })).toHaveCount(0)
      })
    }

    test('soft budget keeps over-budget TopK results, and discovery never reveals more than five', async ({ page }) => {
      await clock(page)
      await request(page, 'pc')
      await page.getByTestId('stage-configure').click()
      await page.getByTestId('price-max').focus()
      await page.getByTestId('price-max').press('Home')
      await expect(page.getByTestId('price-max-value')).toHaveText("CHF 1'000")
      await page.getByTestId('stage-discover').click()
      for (let index = 0; index < 20; index++) await page.clock.runFor(1000)
      await expect(cards(page)).toHaveCount(5)
      await expect(page.getByTestId('search-status')).toHaveText('5 ranked options found')
      await expect(page.getByTestId('empty-state')).toHaveCount(0)
      for (const card of await cards(page).all()) await card.getByRole('button').first().click()
      await expect(page.locator('[data-testid^="tradeoffs-"]')).toHaveCount(5)
      for (const tradeoff of await page.locator('[data-testid^="tradeoffs-"]').all()) {
        await expect(tradeoff).toContainText('soft ceiling')
      }
      await page.clock.runFor(10_000)
      await expect(cards(page)).toHaveCount(5)
    })
  })
}

test('free-text-only feedback learns for both categories', async ({ page }) => {
  await clock(page)
  for (const category of ['pc', 'relay'] as const) {
    await request(page, category)
    await revealAll(page, category)
    const firstId = await cards(page).first().evaluate((node) => node.getAttribute('data-testid')!.replace('product-card-', ''))
    await page.getByTestId(`expand-${firstId}`).click()
    await page.getByTestId(`dismiss-${firstId}`).click()
    await page.getByRole('textbox', { name: 'Or add a note' }).fill(category === 'pc' ? 'Please make it compact' : 'A smaller unit please')
    await expect(page.getByTestId('learned-clarification')).toHaveValue(/compact/i)
    await page.getByTestId('dismiss-apply').click()
    await page.clock.runFor(10_000)
    await expect(page.getByTestId('feedback-log')).toContainText('Prefer compact products.')
    await expect(page.getByTestId(`product-card-${firstId}`)).toHaveAttribute('data-dismissed', 'true')
    await expect(page.getByTestId(`dismissed-note-${firstId}`)).toContainText(/Dismissed:/)
    await expect(page.getByTestId(`personalized-${firstId}`)).toContainText(/I thought you would like this because/i)
    await expect(page.getByTestId('matches-updated')).toContainText(/Matches updated/)
  }
})

test('mobile navigation and controls are reachable at 320, 360 and 390 px', async ({ page }) => {
  await clock(page)
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await request(page, 'pc')
    await assertMinimal(page)
    for (const stage of ['ask', 'configure', 'discover', 'learn', 'buy']) {
      const button = page.getByTestId(`stage-${stage}`)
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    }
    await page.getByTestId('stage-configure').click()
    await expect(page.getByTestId('price-slider')).toBeVisible()
    await page.getByTestId('stage-discover').click()
    await page.clock.runFor(2000)
    const first = page.locator('[data-testid^="product-card-"]').first()
    const firstId = await first.evaluate((node) => node.getAttribute('data-testid')!.replace('product-card-', ''))
    await page.getByTestId(`expand-${firstId}`).click()
    await page.getByTestId(`dismiss-${firstId}`).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('textbox', { name: 'Or add a note' }).fill('Prefer a quieter option')
    await page.getByTestId('dismiss-apply').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('dismiss-apply')).toBeVisible()
    await expect(page.getByTestId('dismiss-cancel')).toBeVisible()
    await page.getByTestId('dismiss-cancel').click()
    await assertMinimal(page)
  }
})

test('Configure CTA is visible and navigates to Discover at 320, 360 and 390 px for both categories', async ({ page }) => {
  await clock(page)
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const category of ['pc', 'relay'] as const) {
      await request(page, category)
      await page.getByTestId('stage-configure').click()
      const cta = page.getByTestId('configure-continue')
      await expect(cta).toBeVisible()
      await expect(cta).toHaveText('Find products →')
      const ctaBox = await cta.boundingBox()
      const requirementsBox = await page.getByTestId('characteristics-panel').boundingBox()
      expect(ctaBox).not.toBeNull()
      expect(requirementsBox).not.toBeNull()
      expect(ctaBox!.x).toBeGreaterThanOrEqual(0)
      expect(ctaBox!.x + ctaBox!.width).toBeLessThanOrEqual(width + 1)
      expect(ctaBox!.y).toBeGreaterThan(requirementsBox!.y)
      await cta.click()
      await expect(page.getByTestId('discover-page')).toBeVisible()
      await expect(page.getByTestId('stage-discover')).toHaveAttribute('aria-current', 'step')
      await assertMinimal(page)
    }
  }
})

test('every visible Discover card shows match, price range and retailer tags at 320, 360 and 390 px', async ({ page }) => {
  await clock(page)
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const category of ['pc', 'relay'] as const) {
      await request(page, category)
      await revealAll(page, category)
      const visibleCards = cards(page)
      expect(await visibleCards.count()).toBeGreaterThan(0)
      for (const card of await visibleCards.all()) {
        const id = (await card.getAttribute('data-testid'))!.replace('product-card-', '')
        const badge = page.getByTestId(`match-${id}`)
        await expect(badge).toBeVisible()
        const badgeText = await badge.innerText()
        expect(badgeText).toMatch(/^(Strong|Good|Poor) match · \d+(?:\.\d+)?%$/)
        const priceText = await page.getByTestId(`price-${id}`).innerText()
        expect(priceText).toMatch(/^CHF [\d'.,]+[–-][\d'.,]+$/)
        await expect(page.getByTestId(`personalized-${id}`)).toBeVisible()
        await expect(page.getByTestId(`personalized-${id}`)).toContainText(/I thought you would like this because/i)
        const tags = page.getByTestId(`retailers-${id}`).locator('.retailer-tag')
        expect(await tags.count()).toBeGreaterThanOrEqual(1)
        for (const tag of await tags.all()) {
          await expect(tag).toBeVisible()
          const box = await tag.boundingBox()
          expect(box).not.toBeNull()
          expect(box!.x).toBeGreaterThanOrEqual(0)
          expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
        }
      }
      await assertMinimal(page)
    }
  }
})

test('Discover loading indicator announces loading and updating, then disappears', async ({ page }) => {
  await clock(page)
  for (const category of ['pc', 'relay'] as const) {
    await request(page, category)
    await page.getByTestId('stage-discover').click()
    const indicator = page.getByTestId('discover-loading')
    await expect(indicator).toBeVisible()
    await expect(indicator).toHaveAttribute('role', 'status')
    await expect(indicator).toHaveAttribute('data-mode', 'loading')
    await expect(indicator).toContainText('Loading products')
    await expect(indicator.locator('.loading-spinner')).toBeVisible()
    await expect(indicator.locator('.loading-spinner')).toHaveCSS('animation-name', 'loading-spin')
    const expected = category === 'pc' ? 5 : 3
    for (let index = 0; index < expected; index++) await page.clock.runFor(2000)
    await expect(indicator).toHaveCount(0)

    const firstId = await cards(page).first().evaluate((node) => node.getAttribute('data-testid')!.replace('product-card-', ''))
    await page.getByTestId(`expand-${firstId}`).click()
    await page.getByTestId(`dismiss-${firstId}`).click()
    await page.getByTestId('dismiss-reason-compact').click()
    await page.getByTestId('dismiss-apply').click()
    await expect(indicator).toBeVisible()
    await expect(indicator).toHaveAttribute('data-mode', 'updating')
    await expect(indicator).toContainText('Updating results')
    for (let index = 0; index < 5; index++) await page.clock.runFor(2000)
    await expect(indicator).toHaveCount(0)
  }
})

test('ambiguous category clarification routes to the relay flow without a later silent switch', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('ask-input').fill('Nintendo Switch')
  await page.getByTestId('ask-input').press('Enter')
  await expect(page.getByTestId('message-assistant')).toContainText('Do you mean a computer')
  await page.getByTestId('ask-input').fill('A smart relay switch for a neon light, Hue Bridge, budget CHF 50')
  await page.getByTestId('ask-input').press('Enter')
  await expect(page.getByTestId('stage-configure')).toBeEnabled()
  await page.getByTestId('stage-configure').click()
  await expect(page.getByTestId('characteristics-panel')).toContainText('Philips Hue Bridge compatible')
  await page.getByTestId('stage-ask').click()
  await page.getByTestId('ask-input').fill('Actually a PC with 32 GB RAM')
  await page.getByTestId('ask-input').press('Enter')
  await page.getByTestId('stage-configure').click()
  await expect(page.getByTestId('characteristics-panel')).toContainText('ON/OFF only')
  await assertMinimal(page)
})

test('Discover has no Save controls, and New search resets the active flow', async ({ page }) => {
  await clock(page)
  for (const category of ['pc', 'relay'] as const) {
    await request(page, category)
    await revealAll(page, category)
    await expect(page.locator('[data-testid^="favorite-"]')).toHaveCount(0)
    await expect(page.getByTestId('favorites-count')).toHaveCount(0)
    expect(await page.locator('body').innerText()).not.toMatch(/♡ Save|♥ Saved|favorites/i)

    const id = await cards(page).first().evaluate((node) => node.getAttribute('data-testid')!.replace('product-card-', ''))
    await page.getByTestId(`expand-${id}`).click()
    await expect(page.getByTestId(`product-card-${id}`)).toBeVisible()
    await page.getByTestId('new-search').click()
    await expect(page.getByTestId('chat-empty')).toBeVisible()
    await expect(page.getByTestId('stage-ask')).toHaveAttribute('aria-current', 'step')
    await expect(page.getByTestId('stage-configure')).toBeDisabled()
    await expect(page.getByTestId('discover-page')).toHaveCount(0)
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => /favorite/i.test(key)))).toEqual([])
    await page.reload()
    await expect(page.getByTestId('favorites-count')).toHaveCount(0)
    await expect(page.locator('[data-testid^="favorite-"]')).toHaveCount(0)
  }
})

test('feedback modal Escape returns focus and uninterpretable free text stays transparent and editable', async ({ page }) => {
  await clock(page)
  await request(page, 'pc')
  await revealAll(page, 'pc')
  const firstId = await cards(page).first().evaluate((node) => node.getAttribute('data-testid')!.replace('product-card-', ''))
  await page.getByTestId(`expand-${firstId}`).click()
  await page.getByTestId(`dismiss-${firstId}`).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByTestId(`dismiss-${firstId}`)).toBeFocused()
  await page.getByTestId(`dismiss-${firstId}`).click()
  await page.getByRole('textbox', { name: 'Or add a note' }).fill('It must match my curtains')
  await expect(page.getByTestId('learn-interpretation')).toContainText('cannot confidently')
  await expect(page.getByTestId('learned-clarification')).toHaveValue('It must match my curtains')
  await expect(page.getByTestId('dismiss-apply')).toBeEnabled()
  await page.getByTestId('dismiss-cancel').click()
  await expect(page.getByTestId(`product-card-${firstId}`)).toBeVisible()
})

test('synthetic-data disclosure and English copy remain visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.locator('body').innerText()).not.toMatch(/\b(escludi|preferenza|carrello|acquista)\b/i)
  await request(page, 'pc')
  await page.getByTestId('stage-discover').click()
  await expect(page.getByText(fixtureCopy).first()).toBeVisible()
  expect(await page.locator('body').ariaSnapshot()).not.toMatch(/\b(escludi|preferenza|carrello|acquista)\b/i)
})

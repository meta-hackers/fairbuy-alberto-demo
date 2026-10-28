import { expect, test, type Page } from '@playwright/test'

const forbidden = /\b(demo|synthetic|scripted|mock|compare|comparison|choose)\b/i
const fixtureCopy = /synthetic|demo|mock|scripted/i
const cards = (page: Page) => page.locator('[data-testid^="product-card-"]')
const missingCopy = /\bunknown\b|to be confirmed|not listed|unverified|not verified|not established|needs? verification/i

async function assertFilled(page: Page) {
  expect(await page.locator('body').innerText()).not.toMatch(missingCopy)
  expect(await page.locator('body').ariaSnapshot()).not.toMatch(missingCopy)
}

async function assertMinimal(page: Page) {
  await expect(page.getByRole('navigation')).toHaveCount(1)
  await expect(page.getByRole('navigation').getByRole('button')).toHaveText(['Ask', 'Configure', 'Discover', 'Learn', 'Buy'])
  expect(await page.locator('body').innerText()).not.toMatch(forbidden)
  expect(await page.title()).not.toMatch(forbidden)
  const labels = await page.locator('[aria-label], [title]').evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length).map((node) => `${node.getAttribute('aria-label') ?? ''} ${node.getAttribute('title') ?? ''}`).join(' '))
  expect(labels).not.toMatch(forbidden)
  // Accessibility snapshots include computed names (aria-labelledby, labels,
  // descendant text, etc.), including offscreen offer rows in the page.
  expect(await page.locator('body').ariaSnapshot()).not.toMatch(fixtureCopy)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await expect(page.locator('[data-testid^="rail-"], [data-testid*="compare"]')).toHaveCount(0)
}

async function clock(page: Page) {
  const time = new Date('2026-10-28T12:00:00Z')
  await page.clock.install({ time }); await page.clock.pauseAt(time)
}

async function request(page: Page, category: 'pc' | 'relay') {
  await page.goto('/')
  await page.getByTestId('ask-input').fill(category === 'pc' ? 'I need a computer for gaming' : 'I need a smart switch for my neon light')
  await page.getByTestId('ask-input').press('Enter')
  await page.getByTestId('ask-input').fill(category === 'pc' ? 'CHF 2000, 1440p, 32 GB RAM' : 'Hue Bridge, neutral available, budget CHF 60')
  await page.getByTestId('ask-input').press('Enter')
  await expect(page.getByTestId('stage-configure')).toBeEnabled()
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    for (const category of ['pc', 'relay'] as const) {
      const id = category === 'pc' ? 'nova' : 'luma-one'
      test(`${category}: automatic discovery, minimal navigation, selected Buy options and back`, async ({ page }) => {
        const mutations: string[] = []
        page.on('request', (req) => { if (!['GET', 'HEAD'].includes(req.method())) mutations.push(req.url()) })
        await clock(page)
        await page.goto('/')
        await expect(page.getByTestId('chat-empty')).toBeVisible()
        await expect(page.getByTestId('message-user')).toHaveCount(0)
        await expect(page.getByTestId('stage-buy')).toBeDisabled()
        await assertMinimal(page)
        await request(page, category)
        await page.getByTestId('stage-configure').click()
        await expect(page.getByTestId('price-slider')).toHaveCount(1)
        await expect(page.getByTestId('characteristics-panel')).toHaveCount(1)
        await assertMinimal(page)
        await assertFilled(page)
        await page.screenshot({ path: `artifacts/screenshots/minimal-${category}-${viewport.name}-configure.png`, fullPage: true })
        await page.getByTestId('stage-discover').click()
        await expect(page.getByTestId('discover-page')).toBeVisible()
        await expect(page.getByTestId('stage-buy')).toBeDisabled()
        await expect(page.getByTestId('price-slider')).toHaveCount(0)
        await expect(page.getByTestId('characteristics-panel')).toHaveCount(0)
        await expect(page.getByRole('button', { name: /start|search/i })).toHaveText(['New search'])
        await expect(cards(page)).toHaveCount(0)
        await page.clock.runFor(1999)
        await expect(cards(page)).toHaveCount(0)
        await page.clock.runFor(1)
        await expect(cards(page)).toHaveCount(1)
        await page.getByTestId(`expand-${id}`).focus()
        await page.getByTestId(`expand-${id}`).press('Enter')
        await expect(page.getByTestId(`expand-${id}`)).toHaveAttribute('aria-expanded', 'true')
        await expect(page.getByRole('checkbox')).toHaveCount(0)
        await assertMinimal(page)
        await assertFilled(page)
        await page.screenshot({ path: `artifacts/screenshots/minimal-${category}-${viewport.name}-discover.png`, fullPage: true })
        await page.getByTestId(`favorite-${id}`).click()
        await expect(page.getByTestId('favorites-count')).toHaveText('♥ 1')
        await page.getByTestId(`buy-${id}`).click()
        await expect(page.getByTestId('buy-page')).toBeVisible()
        await expect(page.getByTestId('stage-buy')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('price-slider')).toHaveCount(0)
        await expect(page.getByTestId('characteristics-panel')).toHaveCount(0)
        if (category === 'pc') {
          await expect(page.locator('[data-testid^="seller-"]')).toHaveCount(5)
          await expect(page.getByTestId('seller-nova-g')).toContainText("CHF 1'899")
          await expect(page.getByTestId('seller-nova-p')).toContainText("CHF 1'909")
          await expect(page.getByTestId('seller-nova-p')).toContainText('ShippingCHF 49')
          await expect(page.getByTestId('seller-nova-p')).toContainText('FeesCHF 20')
          await expect(page.getByTestId('seller-nova-p')).toContainText('AvailabilityAvailable')
          await expect(page.getByTestId('seller-nova-p')).toContainText('4–6 days')
          await expect(page.getByTestId('offer-basis')).toHaveText('Delivered totals shown · VAT included')
        } else {
          await expect(page.locator('[data-testid^="relay-offer-"]')).toHaveCount(2)
          await expect(page.getByTestId('buy-page')).toContainText('18 W neon scenario')
          await expect(page.getByTestId('buy-page')).toContainText('native Hue Bridge support')
          await expect(page.getByTestId('buy-page')).toContainText('ON/OFF only')
          await expect(page.getByTestId('relay-offer-0')).toContainText('Delivered totalCHF 34.65')
          await expect(page.getByTestId('relay-offer-0')).toContainText('CHF 29.65')
          await expect(page.getByTestId('relay-offer-0')).toContainText('ShippingCHF 5')
          await expect(page.getByTestId('relay-offer-0')).toContainText('FeesCHF 0')
          await expect(page.getByTestId('relay-offer-0')).toContainText('AvailabilityAvailable')
          await expect(page.getByTestId('relay-offer-0')).toContainText('2–3 days')
          await expect(page.getByTestId('buy-page').getByRole('link')).toHaveCount(0)
        }
        await expect(page.getByTestId('buy-page')).toContainText('Checkout is not available')
        await assertMinimal(page)
        await assertFilled(page)
        await page.screenshot({ path: `artifacts/screenshots/minimal-${category}-${viewport.name}-buy.png`, fullPage: true })
        await page.screenshot({ path: `artifacts/screenshots/filled-${category}-${viewport.name}-buy.png`, fullPage: true })
        await page.getByRole('button', { name: '← Back to Discover' }).click()
        await expect(page.getByTestId(`product-card-${id}`)).toBeVisible()
        await expect(page.getByTestId(`favorite-${id}`)).toHaveAttribute('aria-pressed', 'true')
        await page.getByTestId('stage-ask').click()
        await expect(page.getByTestId('message-user')).toHaveCount(2)
        await page.clock.runFor(6000)
        await page.getByTestId('stage-discover').click()
        await expect(cards(page)).toHaveCount(1)
        await page.clock.runFor(2000)
        await expect(cards(page)).toHaveCount(2)
        expect(mutations).toEqual([])
      })

      test(`${category}: every discovered product and Buy offer has clean text and accessible names`, async ({ page }) => {
        await clock(page); await request(page, category)
        await page.getByTestId('stage-discover').click()
        const count = category === 'pc' ? 9 : 3
        for (let i = 0; i < count; i++) await page.clock.runFor(2000)
        await expect(cards(page)).toHaveCount(count)
        const ids = await cards(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')!.replace('product-card-', '')))
        for (const productId of ids) {
          await page.getByTestId(`expand-${productId}`).click()
          await assertMinimal(page)
          await assertFilled(page)
          await page.getByTestId(`buy-${productId}`).click()
          await expect(page.getByTestId('buy-page')).toBeVisible()
          await assertMinimal(page)
          await assertFilled(page)
          const offerRows = page.locator(category === 'pc' ? '[data-testid^="seller-"]' : '[data-testid^="relay-offer-"]')
          expect(await offerRows.count()).toBeGreaterThan(0)
          for (const row of await offerRows.all()) {
            await expect(row).toBeVisible()
            expect(await row.innerText()).not.toMatch(fixtureCopy)
            expect(await row.ariaSnapshot()).not.toMatch(fixtureCopy)
            expect(await row.innerText()).not.toMatch(missingCopy)
            if (category === 'pc') {
              await expect(row.getByTestId('offer-seller')).toHaveText(await row.getByRole('heading').innerText())
            }
          }
          if (category === 'pc') {
            await expect(page.getByTestId('offer-basis')).toBeVisible()
            await expect(page.getByTestId('offer-basis')).toHaveText('Delivered totals shown · VAT included')
            expect(await page.getByTestId('offer-basis').innerText()).not.toMatch(fixtureCopy)
          }
          await page.getByRole('button', { name: '← Back to Discover' }).click()
        }
      })

      test(`${category}: editable requirements persist and feedback is reversible`, async ({ page }) => {
        await clock(page); await request(page, category)
        await page.getByTestId('stage-configure').click()
        await page.getByTestId('custom-characteristic-input').fill('Compact housing')
        await page.getByTestId('add-characteristic').click()
        await expect(page.getByTestId('unsupported-note')).toContainText('do not filter products')
        const min = page.getByTestId('price-min')
        await min.focus(); await min.press('ArrowRight')
        const value = await min.inputValue()
        await page.getByTestId('stage-ask').click()
        await page.getByTestId('ask-input').fill('A quieter option please')
        await page.getByTestId('ask-input').press('Enter')
        await page.getByTestId('stage-configure').click()
        await expect(min).toHaveValue(value)
        await expect(page.getByText('Compact housing', { exact: true })).toBeVisible()
        await page.getByTestId('stage-discover').click(); await page.clock.runFor(2000)
        await page.getByTestId(`expand-${id}`).click()
        await page.getByTestId(`dismiss-${id}`).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await assertMinimal(page)
        await page.keyboard.press('Escape')
        await expect(page.getByTestId(`dismiss-${id}`)).toBeFocused()
        await page.getByTestId(`dismiss-${id}`).click()
        await page.getByRole('button', { name: 'Too expensive', exact: true }).click()
        await page.getByRole('textbox', { name: 'Or add a note' }).fill('Prefer a smaller enclosure')
        await page.getByTestId('dismiss-apply').click()
        await expect(page.getByTestId(`product-card-${id}`)).toHaveCount(0)
        await page.getByTestId('stage-learn').click()
        await expect(page.getByTestId('feedback-log')).toContainText('Prefer a smaller enclosure')
        await assertMinimal(page)
        await page.screenshot({ path: `artifacts/screenshots/minimal-${category}-${viewport.name}-learn.png`, fullPage: true })
        await page.getByTestId(`undo-${id}`).click()
        await page.getByRole('button', { name: '← Back to Discover' }).click()
        await page.clock.runFor(2000)
        await expect(page.getByTestId(`product-card-${id}`)).toBeVisible()
        await page.getByTestId('stage-configure').click()
        await expect(min).toHaveValue(value)
        await expect(page.getByText('Compact housing', { exact: true })).toBeVisible()
      })
    }

    test('required/preferred controls affect discovery; edits restart automatically and empty state has a path back', async ({ page }) => {
      await clock(page); await request(page, 'pc'); await page.getByTestId('stage-configure').click()
      await page.getByLabel('RAM priority').selectOption('required')
      await page.getByLabel('GPU priority').selectOption('required')
      await page.getByTestId('stage-discover').click()
      for (let i = 0; i < 6; i++) await page.clock.runFor(2000)
      await expect(cards(page)).toHaveCount(6)
      await expect(page.getByTestId('search-status')).toHaveText('6 options found')
      await page.getByRole('button', { name: 'Edit in Configure' }).click()
      await page.getByLabel('RAM priority').selectOption('preferred')
      await page.getByLabel('GPU priority').selectOption('preferred')
      await page.getByTestId('stage-discover').click()
      await expect(cards(page)).toHaveCount(0)
      for (let i = 0; i < 9; i++) await page.clock.runFor(2000)
      await expect(cards(page)).toHaveCount(9)
      await expect(page.getByTestId('search-status')).toHaveText('9 options found')
      await page.getByTestId('stage-configure').click()
      await page.getByTestId('price-min').focus(); await page.getByTestId('price-min').press('End')
      await expect(page.getByTestId('price-min')).toHaveValue('3000')
      await page.getByTestId('stage-discover').click()
      await expect(page.getByTestId('empty-state')).toBeVisible()
      await expect(page.getByTestId('searching-indicator')).toHaveCount(0)
      await page.getByRole('button', { name: 'Edit in Configure' }).click()
      await page.getByTestId('price-min').focus(); await page.getByTestId('price-min').press('Home')
      await page.getByTestId('stage-discover').click(); await page.clock.runFor(2000)
      await expect(cards(page)).toHaveCount(1)
      await assertMinimal(page)
    })
  })
}

test('empty initial chat, keyboard composer and compact breadcrumb at narrow widths', async ({ page }) => {
  for (const width of [320, 360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/')
    await expect(page.getByTestId('stage-configure')).toBeDisabled()
    await expect(page.getByTestId('stage-buy')).toBeDisabled()
    await expect(page.getByTestId('ask-send')).toBeDisabled()
    await assertMinimal(page)
    for (const stage of ['ask', 'configure', 'discover', 'learn', 'buy']) await expect(page.getByTestId(`stage-${stage}`)).toBeVisible()
    if (width === 390 || width === 1440) await page.screenshot({ path: `artifacts/screenshots/minimal-ask-${width}.png`, fullPage: true })
  }
  await page.getByTestId('ask-input').fill('Computer')
  await page.getByTestId('ask-input').press('Shift+Enter')
  await page.getByTestId('ask-input').pressSequentially('for gaming')
  await expect(page.getByTestId('ask-input')).toHaveValue('Computer\nfor gaming')
  await page.getByTestId('ask-input').press('Enter')
  await expect(page.getByTestId('message-user')).toHaveCount(1)
  await expect(page.getByTestId('ask-input')).toHaveValue('')
})

test('ambiguous category clarification routes relay without changing later category', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('ask-input').fill('Nintendo Switch'); await page.getByTestId('ask-input').press('Enter')
  await expect(page.getByTestId('message-assistant')).toContainText('Do you mean a computer')
  await page.getByTestId('ask-input').fill('interruttore smart'); await page.getByTestId('ask-input').press('Enter')
  await expect(page.getByTestId('stage-configure')).toBeEnabled()
  await page.getByTestId('ask-input').fill('Actually a PC'); await page.getByTestId('ask-input').press('Enter')
  await page.getByTestId('stage-configure').click()
  await expect(page.getByTestId('configure-page')).toContainText('18 W neon load')
  await assertMinimal(page)
})

test('explicit feedback changes a priority, restore preserves later configuration edits', async ({ page }) => {
  await clock(page); await request(page, 'pc')
  await page.getByTestId('stage-discover').click(); await page.clock.runFor(2000)
  await page.getByTestId('expand-nova').click(); await page.getByTestId('dismiss-nova').click()
  await page.getByRole('button', { name: 'Insufficient RAM (32 GB)' }).click()
  await page.getByRole('radio', { name: 'Required (32 GB minimum)', exact: true }).check()
  await page.getByTestId('dismiss-apply').click()
  await page.getByTestId('stage-configure').click()
  await expect(page.getByLabel('RAM priority')).toHaveValue('required')
  await page.getByLabel('RAM priority').selectOption('preferred')
  await page.getByTestId('custom-characteristic-input').fill('Quiet operation')
  await page.getByTestId('add-characteristic').click()
  await page.getByTestId('stage-learn').click(); await page.getByTestId('undo-nova').click()
  await page.getByTestId('stage-configure').click()
  await expect(page.getByLabel('RAM priority')).toHaveValue('preferred')
  await expect(page.getByText('Quiet operation', { exact: true })).toBeVisible()
  await assertMinimal(page)
})

test('favorites survive a new search and reload in each category', async ({ page }) => {
  await clock(page)
  for (const category of ['pc', 'relay'] as const) {
    const id = category === 'pc' ? 'nova' : 'luma-one'
    await request(page, category); await page.getByTestId('stage-discover').click(); await page.clock.runFor(2000)
    await page.getByTestId(`expand-${id}`).click(); await page.getByTestId(`favorite-${id}`).click()
    await page.getByTestId('new-search').click(); await expect(page.getByTestId('chat-empty')).toBeVisible()
    await page.reload()
    await request(page, category); await page.getByTestId('stage-discover').click(); await page.clock.runFor(2000)
    await page.getByTestId(`expand-${id}`).click()
    await expect(page.getByTestId(`favorite-${id}`)).toHaveAttribute('aria-pressed', 'true')
  }
})

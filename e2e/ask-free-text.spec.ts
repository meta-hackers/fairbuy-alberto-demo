import { test, expect } from '@playwright/test'

test('free text ask roundtrip with mocked reply', async ({ page }) => {
  await page.goto('/')
  const input = page.getByTestId('ask-input')
  await input.fill('budget massimo 1800 CHF')
  await page.getByTestId('ask-send').click()
  await expect(page.locator('.bubble--user').last()).toContainText('budget massimo 1800 CHF')
  await expect(page.locator('.bubble--assistant').last()).toContainText('risposta simulata')
  await expect(page.getByTestId('ask-input')).toHaveValue('')
})

test('empty whitespace cannot be sent', async ({ page }) => {
  await page.goto('/')
  const send = page.getByTestId('ask-send')
  await expect(send).toBeDisabled()
  await page.getByTestId('ask-input').fill('   ')
  await expect(send).toBeDisabled()
})

test('enter sends and shift+enter adds newline', async ({ page }) => {
  await page.goto('/')
  const input = page.getByTestId('ask-input')
  await input.click()
  await page.keyboard.type('riga uno')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('riga due')
  await expect(input).toHaveValue('riga uno' + String.fromCharCode(10) + 'riga due')
  await page.keyboard.press('Enter')
  await expect(page.locator('.bubble--assistant').last()).toContainText('risposta simulata')
})

test('free text on mobile viewport is usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const input = page.getByTestId('ask-input')
  await input.scrollIntoViewIfNeeded()
  await expect(input).toBeVisible()
  await input.fill('voglio giocare a 1440p')
  await page.getByTestId('ask-send').click()
  await expect(page.locator('.bubble--assistant').last()).toContainText('1440p')
})

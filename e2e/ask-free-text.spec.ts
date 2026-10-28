import { expect, test, type Page } from '@playwright/test'

const FIRST_MESSAGE = 'Mi serve un PC per gaming competitivo e AAA'
const SECOND_MESSAGE = 'Budget 2000 CHF, 1440p, GPU e RAM importanti'

async function revealCharacteristics(page: Page) {
  await page.goto('/')
  const input = page.getByTestId('ask-input')
  await input.fill(FIRST_MESSAGE)
  await input.press('Enter')
  await input.fill(SECOND_MESSAGE)
  await input.press('Enter')
  await expect(page.getByTestId('characteristics-panel')).toBeVisible()
}

test('ASK starts genuinely empty and the first message gets one mocked follow-up', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('chat-empty')).toBeVisible()
  await expect(page.getByTestId('message-user')).toHaveCount(0)
  await expect(page.getByTestId('message-assistant')).toHaveCount(0)
  await expect(page.getByTestId('characteristics-panel')).toHaveCount(0)
  await expect(page.getByTestId('go-configure')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'FPS competitivi' })).toHaveCount(0)

  const input = page.getByTestId('ask-input')
  const send = page.getByTestId('ask-send')
  await expect(send).toBeDisabled()
  await input.fill(FIRST_MESSAGE)
  await expect(send).toBeEnabled()
  await input.press('Enter')

  await expect(page.getByTestId('message-user')).toHaveCount(1)
  await expect(page.getByTestId('message-assistant')).toHaveCount(1)
  const reply = page.getByTestId('message-assistant').last()
  await expect(reply).toContainText('budget')
  await expect(reply).toContainText('preferenze')
  await expect(reply.locator('.bubble__sim')).toContainText('nessuna AI')
  await expect(page.getByTestId('characteristics-panel')).toHaveCount(0)
  await expect(page.getByTestId('go-configure')).toHaveCount(0)
  await expect(input).toHaveValue('')
})

test('second user message gets the exact reveal reply and characteristics, then chat stays writable', async ({ page }) => {
  await revealCharacteristics(page)

  const assistantMessages = page.getByTestId('message-assistant')
  await expect(assistantMessages).toHaveCount(2)
  await expect(assistantMessages.last().locator('p')).toHaveText('ok, ho abbastanza informazioni')
  await expect(page.getByTestId('characteristic-item')).toHaveCount(5)
  await expect(page.getByTestId('go-configure')).toBeVisible()

  const input = page.getByTestId('ask-input')
  await input.fill('Mi servono 32 GB di RAM')
  await input.press('Enter')

  await expect(page.getByTestId('message-user')).toHaveCount(3)
  await expect(page.getByTestId('message-assistant').last()).toContainText('caratteristica RAM')
  await expect(page.getByTestId('message-assistant').last()).toContainText('nessuna AI')

  await input.fill('<b>test</b> input sconosciuto')
  await input.press('Enter')
  const lastUser = page.getByTestId('message-user').last()
  await expect(lastUser).toContainText('<b>test</b> input sconosciuto')
  await expect(lastUser.locator('b')).toHaveCount(0)
  await expect(page.getByTestId('message-assistant').last()).toContainText('Non interpreto')
  await expect(page.getByTestId('message-user')).toHaveCount(4)
  await expect(page.getByTestId('characteristic-item')).toHaveCount(5)
  await expect(input).toBeEnabled()
})

test('empty whitespace cannot be sent', async ({ page }) => {
  await page.goto('/')
  const input = page.getByTestId('ask-input')
  const send = page.getByTestId('ask-send')
  await expect(send).toBeDisabled()
  await input.fill('   ')
  await expect(send).toBeDisabled()
  await input.press('Enter')
  await expect(page.getByTestId('message-user')).toHaveCount(0)
  await expect(page.getByTestId('message-assistant')).toHaveCount(0)
})

test('enter sends and shift+enter adds a newline', async ({ page }) => {
  await page.goto('/')
  const input = page.getByTestId('ask-input')
  await input.fill('riga uno')
  await input.press('Shift+Enter')
  await input.type('riga due')
  await expect(input).toHaveValue('riga uno' + String.fromCharCode(10) + 'riga due')
  await input.press('Enter')

  const user = page.getByTestId('message-user').last()
  await expect(user).toContainText('riga uno')
  await expect(user).toContainText('riga due')
  await expect(input).toHaveValue('')
  await expect(page.getByTestId('message-assistant').last()).toContainText(/budget/)
})

test('custom characteristic add/remove persists through Configure and back to ASK', async ({ page }) => {
  await revealCharacteristics(page)

  await page.getByRole('button', { name: 'Rimuovi caratteristica: GPU: RTX 4070 o superiore' }).click()
  await expect(page.getByTestId('characteristic-item')).toHaveCount(4)

  await page.getByTestId('custom-characteristic-input').fill('Wi-Fi 7')
  await page.getByTestId('add-characteristic').click()
  await expect(page.getByTestId('characteristic-item')).toHaveCount(5)
  await expect(page.getByText('Wi-Fi 7')).toBeVisible()
  await expect(page.getByTestId('unsupported-note')).toContainText('non vengono usate per il match')

  await page.getByTestId('go-configure').click()
  await expect(page.getByTestId('configure-page')).toBeVisible()
  await expect(page.getByTestId('characteristic-item')).toHaveCount(5)
  await expect(page.getByText('Wi-Fi 7')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rimuovi caratteristica: GPU: RTX 4070 o superiore' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Rimuovi caratteristica: Wi-Fi 7' }).click()
  await expect(page.getByTestId('characteristic-item')).toHaveCount(4)

  await page.getByTestId('back-to-ask').click()
  await expect(page.getByTestId('message-user')).toHaveCount(2)
  await expect(page.getByTestId('characteristic-item')).toHaveCount(4)
  await expect(page.getByText('Wi-Fi 7')).toHaveCount(0)
  await expect(page.getByTestId('chat-empty')).toHaveCount(0)
})

test('mobile ASK is usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await revealCharacteristics(page)

  const input = page.getByTestId('ask-input')
  await input.scrollIntoViewIfNeeded()
  await expect(input).toBeVisible()
  await expect(page.getByTestId('characteristics-panel')).toBeVisible()

  await input.fill('voglio giocare a 1440p')
  await page.getByTestId('ask-send').click()
  await expect(page.getByTestId('message-assistant').last()).toContainText('1440p')

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

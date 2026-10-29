import { chromium } from 'playwright'

const baseUrl = process.env.EVOFIT_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
try {
  const page = await browser.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  if (!page.url().endsWith('/onboarding')) throw new Error(`expected onboarding, got ${page.url()}`)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: /生成我的一周计划/ }).click()
  await page.waitForURL('**/today')
  await page.getByText('所有能量数字都标注“估算”').waitFor({ state: 'visible' })
  console.log(JSON.stringify({ status: 'passed', scenarios: ['onboarding-to-today'], baseUrl }, null, 2))
} finally {
  await browser.close()
}

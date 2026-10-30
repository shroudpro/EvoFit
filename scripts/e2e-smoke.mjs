import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const baseUrl = process.env.EVOFIT_BASE_URL || 'http://127.0.0.1:5173'
let devServer
let functionServer
if (process.env.EVOFIT_REAL_MODEL_E2E === '1' && !process.env.VITE_API_BASE_URL) {
  process.env.VITE_API_BASE_URL = 'http://127.0.0.1:8888/.netlify/functions'
  functionServer = spawn(process.execPath, ['--experimental-strip-types', 'scripts/local-ai-proxy.mjs'], { cwd: process.cwd(), stdio: 'ignore' })
  const functionDeadline = Date.now() + 15_000
  while (Date.now() < functionDeadline) {
    try { if ((await fetch(`${process.env.VITE_API_BASE_URL}/ai-proxy`, { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173' } })).status === 204) break } catch { await new Promise((resolve) => setTimeout(resolve, 250)) }
  }
}
if (!process.env.EVOFIT_BASE_URL) {
  devServer = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' })
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try { if ((await fetch(baseUrl)).ok) break } catch { await new Promise((resolve) => setTimeout(resolve, 250)) }
  }
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
try {
  const page = await browser.newPage()
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForURL('**/onboarding', { timeout: 10_000 })
  if (!page.url().endsWith('/onboarding')) throw new Error(`expected onboarding, got ${page.url()}`)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: /生成我的一周计划/ }).click()
  await page.waitForURL('**/today')
  await page.getByText('所有能量数字都标注“估算”').waitFor({ state: 'visible' })
  await page.getByRole('link', { name: '饮食' }).click()
  await page.locator('select').nth(1).selectOption('rice')
  await page.locator('input[type="number"]').fill('150')
  await page.getByRole('button', { name: /保存这项餐食/ }).click()
  await page.getByRole('heading', { name: '174 kcal' }).waitFor({ state: 'visible' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: '174 kcal' }).waitFor({ state: 'visible' })
  if (process.env.EVOFIT_REAL_MODEL_E2E === '1') {
    await page.getByRole('checkbox').check()
    const onePixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
    await page.locator('input[type="file"]').setInputFiles({ name: 'meal.png', mimeType: 'image/png', buffer: onePixel })
    await page.getByText('真实模型已返回结构化结果，请检查并确认。').waitFor({ state: 'visible', timeout: 60_000 })
    await page.locator('.candidate-row input').nth(0).fill('米饭')
    await page.locator('.candidate-row input').nth(1).fill('150')
    await page.getByRole('button', { name: /确认并保存/ }).click()
    await page.getByText(/已确认候选并保存/).waitFor({ state: 'visible', timeout: 10_000 })
  }
  await page.getByRole('link', { name: '训练' }).click()
  if (process.env.EVOFIT_REAL_MODEL_E2E === '1') {
    await page.locator('textarea').fill('跑步机 4.5 km/h，10% 坡度，中等强度，45 分钟')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: '解析参数' }).click()
    await page.getByText('真实模型已返回结构化结果，请检查并确认。').waitFor({ state: 'visible', timeout: 60_000 })
    await page.locator('.diff-card input[type="number"]').fill('45')
    await page.locator('.diff-card select').selectOption('moderate')
    await page.getByRole('button', { name: /确认并计算/ }).click()
    await page.getByText(/已保存。净消耗/).waitFor({ state: 'visible', timeout: 10_000 })
  } else {
    await page.getByRole('button', { name: '解析参数' }).click()
    await page.getByText(/需要你的明确同意/).waitFor({ state: 'visible' })
  }
  const completeTask = page.getByRole('button', { name: '标记完成' }).first()
  if (await completeTask.count()) {
    await completeTask.click()
    await page.getByText('已完成', { exact: true }).waitFor({ state: 'visible' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('已完成', { exact: true }).waitFor({ state: 'visible' })
  }
  await page.getByRole('link', { name: '我的' }).click()
  const emptyBackup = { schemaVersion: 1, source: 'evofit-local', createdAt: new Date().toISOString(), mode: 'real', data: { profile: null, plans: [], meals: [], exercises: [], proposals: [], runs: [], traces: [], audit: [] } }
  await page.locator('input[type="file"]').setInputFiles({ name: 'evofit-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(emptyBackup)) })
  await page.getByText('已完成校验，请确认合并。').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: '确认合并当前模式' }).click()
  await page.getByText('导入完成：新增 0 条，跳过冲突 0 条。').waitFor({ state: 'visible' })
  await page.getByRole('link', { name: '今日' }).click()
  if (process.env.EVOFIT_REAL_MODEL_E2E === '1') {
    await page.getByText('演示', { exact: true }).click()
    await page.getByText('演示空间 · 合成数据').waitFor({ state: 'visible', timeout: 10_000 })
    await page.getByRole('link', { name: '成长' }).click()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: '运行周报分析' }).click()
    await page.getByText('真实模型已生成结构化周报，提案仍需你批准。').waitFor({ state: 'visible', timeout: 120_000 })
    const rejectButton = page.getByRole('button', { name: /暂不调整/ })
    if (await rejectButton.count()) { await rejectButton.click(); await page.getByText('已暂不调整，当前计划保持不变。').waitFor({ state: 'visible', timeout: 10_000 }) }
  }
  await page.getByRole('link', { name: '成长' }).click()
  await page.getByText('身体指标').waitFor({ state: 'visible' })
  await page.locator('input[type=number]').first().fill('65')
  await page.getByRole('button', { name: '保存今天指标' }).click()
  await page.getByText(/身体指标已保存/).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'AI 教练', exact: true }).click()
  await page.getByPlaceholder('例如：查昨天蛋白质').waitFor({ state: 'visible' })
  await page.getByLabel('关闭 AI 教练').click()
  await page.getByRole('link', { name: '今日' }).click()
  await page.getByText('今日时间线').waitFor({ state: 'visible' })
  const scenarios = ['complete-p0-profile-goals-food-training-bodymetrics-chat-timeline', 'onboarding-to-today', 'manual-meal-refresh-persistence', 'model-consent-degradation', 'training-task-persistence', 'backup-import-preview']
  if (process.env.EVOFIT_REAL_MODEL_E2E === '1') scenarios.push('real-model-meal-loop', 'real-model-exercise-loop', 'real-model-agent-tools-and-rejection')
  console.log(JSON.stringify({ status: 'passed', scenarios, baseUrl }, null, 2))
} finally {
  await browser.close()
  devServer?.kill()
  functionServer?.kill()
}

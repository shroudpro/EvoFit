/**
 * 校赛完整版本主链路的可审计步骤清单。
 * 实际浏览器执行由 scripts/e2e-smoke.mjs 驱动，避免引入第二套 runner 配置。
 */
export const completeP0Scenario = [
  'profile-and-safety', 'goals-and-seven-day-plan', 'food-search-and-meal-save',
  'image-candidate-confirmation', 'natural-language-exercise-confirmation',
  'training-complete-skip-reschedule', 'today-timeline-and-balance',
  'body-metrics-fourteen-day-trend', 'chat-coach-tools-and-proposal-approval',
  'plan-history-restore', 'backup-preview-and-mode-isolation', 'demo-reset'
] as const

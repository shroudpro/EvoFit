import type { UserProfile } from '../shared/types'

/** 将 v1/v2 profile 补齐为 v3 的安全默认值，不臆造健康指标或目标记录。 */
export function migrateProfile(profile: UserProfile | (Omit<UserProfile, 'activityLevel' | 'availableMinutesPerDay' | 'healthRiskFlags' | 'allergies' | 'mealPreferences'> & Partial<Pick<UserProfile, 'activityLevel' | 'availableMinutesPerDay' | 'healthRiskFlags' | 'allergies' | 'mealPreferences'>>)): UserProfile {
  return { ...profile, activityLevel: profile.activityLevel ?? 'light', availableMinutesPerDay: profile.availableMinutesPerDay ?? 30, healthRiskFlags: profile.healthRiskFlags ?? [], allergies: profile.allergies ?? [], mealPreferences: profile.mealPreferences ?? [] }
}

export function migrateProfiles<T extends { profile?: UserProfile | null }>(record: T): T & { profile?: UserProfile | null } {
  return record.profile ? { ...record, profile: migrateProfile(record.profile) } : record
}

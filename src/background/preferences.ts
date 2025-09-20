import {
  readReaderPreferences,
  writeReaderPreferences,
  type ReaderPreferences
} from '../common/storage'
import { getCachedPreferences, setCachedPreferences } from './state'

export async function ensurePreferencesLoaded (): Promise<ReaderPreferences> {
  const cached = getCachedPreferences()
  if (cached) {
    return cached
  }
  const prefs = await readReaderPreferences()
  setCachedPreferences(prefs)
  return prefs
}

export async function persistPreferences (prefs: ReaderPreferences): Promise<void> {
  setCachedPreferences(prefs)
  await writeReaderPreferences(prefs)
}

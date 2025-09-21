import { getFromStorage } from './storage'

/**
 * Generic helper for reading typed values from storage with validation and defaults
 */
export async function readStorageValue<T>(
  key: string,
  validator: (value: unknown) => value is T,
  defaultValue: T
): Promise<T> {
  const result = await getFromStorage<string>([key])
  const value = result[key]
  return validator(value) ? value : defaultValue
}

/**
 * Generic helper for reading multiple storage values in parallel
 */
export async function readStorageValues<T extends Record<string, unknown>>(
  readers: Record<keyof T, () => Promise<T[keyof T]>>
): Promise<T> {
  const keys = Object.keys(readers) as Array<keyof T>
  const promises = keys.map(key => readers[key]())
  const values = await Promise.all(promises)

  const result = {} as T
  keys.forEach((key, index) => {
    result[key] = values[index]
  })

  return result
}
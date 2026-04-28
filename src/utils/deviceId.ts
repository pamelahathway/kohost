import { generateId } from './generateId'

const KEY = 'kohost-device-id'

let cached: string | null = null

export function getDeviceId(): string {
  if (cached) return cached
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = generateId()
    localStorage.setItem(KEY, id)
  }
  cached = id
  return id
}

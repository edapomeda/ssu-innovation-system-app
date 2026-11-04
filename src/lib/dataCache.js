const cache = new Map()
const pendingRequests = new Map()

export function getCachedData(key) {
  const entry = cache.get(key)

  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }

  return entry.data
}

export function hasCachedData(key) {
  return getCachedData(key) !== undefined
}

export async function getCachedDataOrLoad(key, load, ttl = 30_000) {
  const cachedData = getCachedData(key)
  if (cachedData !== undefined) return cachedData

  const pendingRequest = pendingRequests.get(key)
  if (pendingRequest) return pendingRequest

  let request
  request = Promise.resolve()
    .then(load)
    .then((data) => {
      if (pendingRequests.get(key) === request) {
        for (const [cachedKey, entry] of cache) {
          if (entry.expiresAt <= Date.now()) cache.delete(cachedKey)
        }
        cache.set(key, { data, expiresAt: Date.now() + ttl })
      }
      return data
    })
    .finally(() => {
      if (pendingRequests.get(key) === request) pendingRequests.delete(key)
    })

  pendingRequests.set(key, request)
  return request
}

export function invalidateCache(keyOrPrefix) {
  const keys = new Set([...cache.keys(), ...pendingRequests.keys()])
  for (const key of keys) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cache.delete(key)
      pendingRequests.delete(key)
    }
  }
}

export function clearDataCache() {
  cache.clear()
  pendingRequests.clear()
}

import { IOT_REST_API_BASE } from '../config/iotService.js'

const DEFAULT_TIMEOUT = 20_000

export async function requestIotJson(path, {
  method = 'GET',
  body,
  headers = {},
  auth = true,
  signal,
  timeout = DEFAULT_TIMEOUT,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持接口请求')

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal?.reason)
  if (signal?.aborted) abortFromCaller()
  else signal?.addEventListener('abort', abortFromCaller, { once: true })

  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeout)
  const requestHeaders = { ...headers }
  const token = readAccessToken()
  if (auth && token && !requestHeaders.Authorization) requestHeaders.Authorization = `Bearer ${token}`
  if (body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json;charset=UTF-8'
  }

  try {
    const response = await fetchImpl(`${IOT_REST_API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined || typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal
    })
    const text = await response.text()
    const result = parseJsonValue(text)

    if (!response.ok) {
      const message = getResponseMessage(result) || `接口请求失败（HTTP ${response.status}）`
      const error = new Error(message)
      error.status = response.status
      error.response = result
      throw error
    }
    if (result === null || result === '') throw new Error('接口返回内容为空')
    return result
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (signal?.aborted) throw error
      throw new Error('接口请求超时')
    }
    throw error instanceof Error ? error : new Error('网络请求失败')
  } finally {
    globalThis.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function parseJsonValue(value) {
  if (typeof value !== 'string') return value
  const normalized = value.replace(/^\uFEFF/, '').trim()
  if (!normalized) return ''
  try {
    return JSON.parse(normalized)
  } catch {
    return normalized
  }
}

export function unwrapWcfData(result) {
  if (!result || typeof result !== 'object' || !Object.prototype.hasOwnProperty.call(result, 'data')) {
    return result
  }
  return parseJsonValue(result.data)
}

export function readAccessToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage?.getItem('token') || window.localStorage?.getItem('token') || ''
}

function getResponseMessage(result) {
  if (!result || typeof result !== 'object') return ''
  return result.message || result.Message || result.error || result.Error || ''
}

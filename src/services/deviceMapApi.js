import { IOT_REST_API_BASE, IOT_SERVICE_ROOT } from '../config/iotService'

const API_BASE = IOT_REST_API_BASE

export async function resolveFloorHierarchy(hierarchy) {
  const normalizedHierarchy = String(hierarchy || '').trim()
  if (!normalizedHierarchy) throw new Error('缺少楼层层级路径')
  return requestJson(`/api/maps/floors/resolve?${new URLSearchParams({ hierarchy: normalizedHierarchy })}`)
}

export async function getFloorMapPackage(floorId) {
  return requestJson(`/api/maps/floors/${encodeURIComponent(floorId)}`)
}

export async function uploadFloorSvg(floorId, file) {
  return requestJson(`/api/maps/floors/${encodeURIComponent(floorId)}/svg`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/svg+xml' },
    body: file
  })
}

export async function previewDeviceAttributes(floorId, file) {
  const isLegacyXls = /\.xls$/i.test(file?.name || '')
  return requestJson(`/api/maps/floors/${encodeURIComponent(floorId)}/imports/excel`, {
    method: 'POST',
    headers: {
      'Content-Type': isLegacyXls
        ? 'application/vnd.ms-excel'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    body: file
  })
}

export async function confirmMapImport(importId, payload) {
  const mapName = typeof payload === 'string' ? payload : payload?.map?.mapName
  return requestWrappedJson(`/api/maps/imports/${encodeURIComponent(importId)}/confirm`, {
    map: { mapName: String(mapName || '').trim() }
  })
}

export async function recalculateImportTransform(importId, payload = {}) {
  return requestWrappedJson(`/api/maps/imports/${encodeURIComponent(importId)}/recalculate-transform`, {
    recalculateRelations: true,
    ...payload
  })
}

export async function updateDevicePosition(mapId, deviceId, payload) {
  return requestWrappedJson(
    `/api/maps/${encodeURIComponent(mapId)}/devices/${encodeURIComponent(deviceId)}/position`,
    { coordinate: 'SVG', recalculateRelations: true, ...payload }
  )
}

export async function updateDevicePositions(mapId, devices, updatedBy = '') {
  return requestWrappedJson(`/api/maps/${encodeURIComponent(mapId)}/devices/positions`, {
    coordinate: 'SVG',
    updatedBy,
    recalculateRelations: true,
    devices
  })
}

export async function createMapDevice(mapId, payload) {
  return requestWrappedJson(`/api/maps/${encodeURIComponent(mapId)}/devices`, {
    coordinate: 'SVG',
    recalculateRelations: true,
    ...payload
  })
}

export async function deleteMapDevice(mapId, deviceId, updatedBy = '') {
  return requestWrappedJson(
    `/api/maps/${encodeURIComponent(mapId)}/devices/${encodeURIComponent(deviceId)}/delete`,
    { updatedBy }
  )
}

export function resolveMapSvgUrl(svgUrl, version = '') {
  if (!svgUrl) return ''
  const rawUrl = String(svgUrl)
  const url = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : new URL(rawUrl.replace(/^\/+/, ''), `${IOT_SERVICE_ROOT}/`).toString()
  if (!version) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`
}

async function requestWrappedJson(path, value) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ value: JSON.stringify(value) })
  })
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options)
  const rawText = await response.text()
  const body = parseJson(rawText)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, `请求失败: ${response.status}`))
  }
  if (body?.success === false) {
    throw new Error(getErrorMessage(body, '接口返回失败'))
  }

  return unwrapWcfPayload(body)
}

function unwrapWcfPayload(body) {
  if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'data')) return body
  return parseJson(body.data) ?? body.data
}

function parseJson(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function getErrorMessage(body, fallback) {
  return body?.message || body?.Message || body?.error || body?.Error || fallback
}

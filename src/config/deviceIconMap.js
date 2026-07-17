import cuIconUrl from '../assets/images/devices/CU.svg'
import defaultIconUrl from '../assets/images/devices/default.svg'
import gwIconUrl from '../assets/images/devices/GW.svg'
import mcboxIconUrl from '../assets/images/devices/MCBOX.svg'
import ocsrIconUrl from '../assets/images/devices/OCSR.svg'
import scuFIconUrl from '../assets/images/devices/SCU-F.svg'
import scuIconUrl from '../assets/images/devices/SCU.svg'

const warnedUnmatchedDeviceKeys = new Set()

const DEVICE_ICON_RULES = [
  { key: 'gw', iconUrl: gwIconUrl, category: 'gateway', exact: ['gw', 'gateway', '网关'], keywords: ['gateway', '网关', 'gw'] },
  { key: 'cu', iconUrl: cuIconUrl, category: 'device', exact: ['cu', 'controller', '控制器'], keywords: ['controller', '控制器', 'cu'] },
  { key: 'scu-f', iconUrl: scuFIconUrl, category: 'device', exact: ['scu-f', 'scuf'], keywords: ['scu-f', 'scuf'] },
  { key: 'scu-y', iconUrl: scuIconUrl, category: 'device', exact: ['scu-y', 'scuy'], keywords: ['scu-y', 'scuy'] },
  { key: 'ocsr', iconUrl: ocsrIconUrl, category: 'device', exact: ['ocsr', 'sensor', '传感器'], keywords: ['ocsr', 'sensor', '传感器'] },
  { key: 'mcbox', iconUrl: mcboxIconUrl, category: 'device', exact: ['mcbox'], keywords: ['mcbox'] },
  { key: 'scu', iconUrl: scuIconUrl, category: 'device', exact: ['scu'], keywords: ['scu'] }
]

const DEFAULT_DEVICE_ICON = {
  key: 'default',
  iconUrl: defaultIconUrl,
  category: 'device',
  matchedBy: 'default'
}

export function resolveDeviceIcon(device = {}) {
  const typeCandidates = collectDeviceValues(device, [
    'rawType', 'deviceType', 'DeviceType', 'type', 'Type'
  ])
  const nameCandidates = collectDeviceValues(device, [
    'name', 'Name', 'shortName', 'ShortName', 'uniqueNo', 'UniqueNo'
  ])
  const typeMatch = findDeviceIconRule(typeCandidates, true)
  if (typeMatch) return { ...typeMatch, matchedBy: 'type' }

  const nameMatch = findDeviceIconRule(nameCandidates, true)
  if (nameMatch) return { ...nameMatch, matchedBy: 'name' }

  const fuzzyMatch = findDeviceIconRule([...typeCandidates, ...nameCandidates], false)
  if (fuzzyMatch) return { ...fuzzyMatch, matchedBy: 'keyword' }

  warnUnmatchedDeviceIcon(device, [...typeCandidates, ...nameCandidates])
  return DEFAULT_DEVICE_ICON
}

function collectDeviceValues(device, keys) {
  const sourceFields = device.sourceFields || device.SourceFields || {}
  const sourceValues = Array.isArray(sourceFields)
    ? sourceFields.map((item) => item?.Value)
    : Object.values(sourceFields)
  return [...keys.map((key) => device[key]), ...sourceValues]
    .map(normalizeDeviceValue)
    .filter(Boolean)
}

function findDeviceIconRule(values, exact) {
  for (const rule of DEVICE_ICON_RULES) {
    const matched = values.some((value) => (exact
      ? rule.exact.includes(value)
      : rule.keywords.some((keyword) => value.includes(keyword))))
    if (matched) return rule
  }
  return null
}

function normalizeDeviceValue(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s_]/g, '')
}

function warnUnmatchedDeviceIcon(device, values) {
  const key = String(device.id || device.Id || device.uniqueNo || device.UniqueNo || values.join('|') || 'unknown')
  if (warnedUnmatchedDeviceKeys.has(key)) return
  warnedUnmatchedDeviceKeys.add(key)
  console.warn(`[device-icon] 未匹配设备图标，已使用默认图标：${key}`)
}

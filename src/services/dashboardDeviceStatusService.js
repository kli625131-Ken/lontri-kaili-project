import {
  DEVICE_VISUALIZATION_MAPS,
  DEVICE_VISUALIZATION_MAP_TREE
} from '../config/deviceVisualizationMaps.js'
import { queryAlarms } from './systemLogsApi.js'
import { adaptAlarm } from '../utils/systemLogsAdapters.js'

const DEFAULT_SCOPE = '开利101车间'
const DEFAULT_MAP_ID = 'floor1'

export function createEmptyDashboardDeviceStatus(mapId = DEFAULT_MAP_ID) {
  return {
    scope: { mapId, name: DEFAULT_SCOPE },
    inventory: { total: 0, cu: 0, gw: 0, regions: 0, floors: 0, totalArea: 0 },
    connectivity: { available: false, online: null, offline: null, onlineRate: null },
    alarms: { total: 0, pending: 0, processed: 0, closed: 0, pendingList: [] },
    updatedAt: null,
    errors: { inventory: '', alarms: '' }
  }
}

export function summarizeDeviceInventory(mapData = {}, mapId = DEFAULT_MAP_ID) {
  const devices = getDevices(mapData)
  const regions = getRegions(mapData)
  const byType = devices.reduce((counts, device) => {
    const type = normalizeDeviceType(device)
    if (type === 'cu') counts.cu += 1
    if (type === 'gw') counts.gw += 1
    return counts
  }, { cu: 0, gw: 0 })

  return {
    inventory: {
      total: devices.length,
      cu: byType.cu,
      gw: byType.gw,
      regions: regions.length,
      floors: countProjectFloors(DEVICE_VISUALIZATION_MAP_TREE, mapId),
      totalArea: Math.round(sumRegionArea(regions))
    },
    connectivity: summarizeConnectivity(devices)
  }
}

export function summarizeAlarms(rawAlarms = [], total = rawAlarms.length) {
  const alarms = rawAlarms.map((alarm) => (
    alarm?.raw && typeof alarm.actionable === 'boolean' ? alarm : adaptAlarm(alarm)
  ))
  const pending = alarms.filter((alarm) => alarm.actionable)
  const processed = alarms.filter((alarm) => alarm.status === 'processed').length
  const closed = alarms.filter((alarm) => alarm.status === 'closed').length

  return {
    total: Number(total) || alarms.length,
    pending: pending.length,
    processed,
    closed,
    pendingList: pending
      .sort(comparePendingAlarms)
      .slice(0, 4)
  }
}

export async function loadDashboardDeviceStatus({
  mapId = DEFAULT_MAP_ID,
  fetchImpl = globalThis.fetch,
  queryAlarmsImpl = queryAlarms,
  now = () => new Date()
} = {}) {
  const overview = createEmptyDashboardDeviceStatus(mapId)
  const mapConfig = DEVICE_VISUALIZATION_MAPS[mapId]
  overview.scope = { mapId, name: DEFAULT_SCOPE }

  const inventoryRequest = loadInventory(mapConfig, fetchImpl)
  const alarmsRequest = loadAlarms(queryAlarmsImpl)
  const [inventoryResult, alarmsResult] = await Promise.allSettled([
    inventoryRequest,
    alarmsRequest
  ])

  if (inventoryResult.status === 'fulfilled') {
    overview.inventory = inventoryResult.value.inventory
    overview.connectivity = inventoryResult.value.connectivity
  } else {
    overview.errors.inventory = getErrorMessage(inventoryResult.reason, '设备清单加载失败')
  }

  if (alarmsResult.status === 'fulfilled') {
    overview.alarms = alarmsResult.value
  } else {
    overview.errors.alarms = getErrorMessage(alarmsResult.reason, '设备告警加载失败')
  }

  if (inventoryResult.status === 'fulfilled' || alarmsResult.status === 'fulfilled') {
    overview.updatedAt = now().toISOString()
  }

  return overview
}

async function loadInventory(mapConfig, fetchImpl) {
  if (!mapConfig?.available || !mapConfig.dataUrl) {
    throw new Error('当前项目地图数据不可用')
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('当前环境不支持设备清单请求')
  }

  const response = await fetchImpl(mapConfig.dataUrl)
  if (!response?.ok) {
    throw new Error(mapConfig.errorMessage || `设备清单请求失败（${response?.status || '-'}）`)
  }
  return summarizeDeviceInventory(await response.json(), mapConfig.id)
}

async function loadAlarms(queryAlarmsImpl) {
  const response = await queryAlarmsImpl({ page: 1, pageSize: 100 })
  if (response?.success !== true) {
    throw new Error(response?.message || '设备告警请求失败')
  }
  return summarizeAlarms(Array.isArray(response.data) ? response.data : [], response.total)
}

function summarizeConnectivity(devices) {
  const statuses = devices.map(readExplicitOnlineStatus)
  const available = devices.length > 0 && statuses.every((status) => status !== null)
  if (!available) {
    return { available: false, online: null, offline: null, onlineRate: null }
  }

  const online = statuses.filter(Boolean).length
  const offline = statuses.length - online
  return {
    available: true,
    online,
    offline,
    onlineRate: Math.round((online / statuses.length) * 100)
  }
}

function readExplicitOnlineStatus(device) {
  const candidates = ['online', 'isOnline', 'Online', 'IsOnline']
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(device, key) && typeof device[key] === 'boolean') {
      return device[key]
    }
  }
  return null
}

function getDevices(mapData) {
  if (Array.isArray(mapData.devices)) return mapData.devices
  if (Array.isArray(mapData.Devices)) return mapData.Devices
  return []
}

function getRegions(mapData) {
  if (Array.isArray(mapData.regions)) return mapData.regions
  if (Array.isArray(mapData.Regions)) return mapData.Regions
  return []
}

function countProjectFloors(nodes, mapId) {
  for (const node of nodes) {
    const children = Array.isArray(node.children) ? node.children : []
    const floorNodes = children.filter((child) => child.mapId)
    if (floorNodes.some((floor) => floor.mapId === mapId)) return floorNodes.length

    const nestedCount = countProjectFloors(children, mapId)
    if (nestedCount) return nestedCount
  }
  return 0
}

function sumRegionArea(regions) {
  const squareCadUnits = regions.reduce((sum, region) => {
    const points = Array.isArray(region.points) ? region.points : []
    if (points.length < 3) return sum

    const doubledArea = points.reduce((area, point, index) => {
      const nextPoint = points[(index + 1) % points.length]
      const x = Number(point.x)
      const y = Number(point.y)
      const nextX = Number(nextPoint.x)
      const nextY = Number(nextPoint.y)
      if (![x, y, nextX, nextY].every(Number.isFinite)) return area
      return area + x * nextY - nextX * y
    }, 0)

    return sum + Math.abs(doubledArea) / 2
  }, 0)

  return squareCadUnits / 1_000_000
}

function normalizeDeviceType(device) {
  return String(device?.type ?? device?.deviceType ?? device?.Type ?? device?.DeviceType ?? '')
    .trim()
    .toLowerCase()
}

function comparePendingAlarms(left, right) {
  const levelDifference = getAlarmLevel(left) - getAlarmLevel(right)
  if (levelDifference !== 0) return levelDifference
  return getAlarmTime(right) - getAlarmTime(left)
}

function getAlarmLevel(alarm) {
  const value = Number(String(alarm.levelText || '').replace(/\D/g, ''))
  return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER
}

function getAlarmTime(alarm) {
  const timestamp = Date.parse(alarm.lastOccurTime)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback
}

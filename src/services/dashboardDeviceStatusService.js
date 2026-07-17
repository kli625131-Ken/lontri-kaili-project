import { requestIotJson, unwrapWcfData } from './iotRestClient.js'
import { queryAlarmsFromApi } from './systemLogsApi.js'
import { adaptAlarm } from '../utils/systemLogsAdapters.js'
import { DEVICE_VISUALIZATION_MAPS } from '../config/deviceVisualizationMaps.js'
import { getFloorMapPackage, resolveFloorHierarchy } from './deviceMapApi.js'

export function createEmptyDashboardDeviceStatus() {
  return {
    connectivity: {
      available: false,
      online: null,
      offline: null,
      onlineRate: null,
      gatewayTotal: null,
      gatewayOnline: null,
      deviceTotal: null,
      deviceOnline: null,
      scopeVerified: false,
      scopeNote: ''
    },
    alarms: {
      total: null,
      pending: null,
      processed: null,
      closed: null,
      pendingList: [],
      statusSummaryComplete: false,
      scopeVerified: false,
      scopeNote: ''
    },
    area: {
      available: false,
      totalSquareMeters: null,
      mappedFloors: 0,
      scopeNote: ''
    },
    updatedAt: null,
    errors: { connectivity: '', alarms: '', area: '' }
  }
}

export async function loadDashboardDeviceStatus({
  queryOnlineImpl = loadGatewayAndDevicesOnlineCount,
  queryAlarmsImpl = queryAlarmsFromApi,
  now = () => new Date()
} = {}) {
  const overview = createEmptyDashboardDeviceStatus()
  const [onlineResult, alarmsResult, areaResult] = await Promise.allSettled([
    queryOnlineImpl(),
    loadAlarms(queryAlarmsImpl),
    loadConfiguredMapArea()
  ])

  if (onlineResult.status === 'fulfilled') {
    overview.connectivity = onlineResult.value
  } else {
    overview.errors.connectivity = getErrorMessage(onlineResult.reason, '设备在线状态加载失败')
  }

  if (alarmsResult.status === 'fulfilled') {
    overview.alarms = alarmsResult.value
  } else {
    overview.errors.alarms = getErrorMessage(alarmsResult.reason, '设备告警加载失败')
  }

  if (areaResult.status === 'fulfilled') {
    overview.area = areaResult.value
  } else {
    overview.errors.area = getErrorMessage(areaResult.reason, '数字地图面积计算失败')
  }

  if ([onlineResult, alarmsResult, areaResult].some((result) => result.status === 'fulfilled')) {
    overview.updatedAt = now().toISOString()
  }
  return overview
}

export async function loadConfiguredMapArea() {
  const mapConfigs = Object.values(DEVICE_VISUALIZATION_MAPS)
    .filter((config) => config?.available && config?.hierarchyPath)
  if (!mapConfigs.length) throw new Error('当前项目未配置可用数字地图')

  const mapPackages = await Promise.all(mapConfigs.map(async (config) => {
    const resolved = await resolveFloorHierarchy(config.hierarchyPath)
    const floorId = resolved?.floorId || resolved?.FloorId
    if (!floorId) throw new Error(`${config.name || config.id} 未返回 floorId`)
    return getFloorMapPackage(floorId)
  }))
  const floorAreas = mapPackages.map(calculateMapPackageArea)
  if (floorAreas.some((area) => area === null)) {
    throw new Error('数字地图缺少有效 CAD 尺寸或区域坐标')
  }

  return {
    available: true,
    totalSquareMeters: floorAreas.reduce((sum, area) => sum + area, 0),
    mappedFloors: floorAreas.length,
    scopeNote: `面积由 ${floorAreas.length} 个已配置 SVG 地图的 CAD 尺寸计算`
  }
}

export function calculateMapPackageArea(mapPackage = {}) {
  const cadBounds = mapPackage?.Map?.CoordinateTransform?.CadBounds
    || mapPackage?.Map?.coordinateTransform?.cadBounds
  const width = toNumber(cadBounds?.Width ?? cadBounds?.width)
  const height = toNumber(cadBounds?.Height ?? cadBounds?.height)
  // Digital-map CAD coordinates are millimetres. Convert mm² to m².
  if (width !== null && height !== null && width > 0 && height > 0) {
    return (width * height) / 1_000_000
  }

  const regions = Array.isArray(mapPackage?.Regions)
    ? mapPackage.Regions
    : (Array.isArray(mapPackage?.regions) ? mapPackage.regions : [])
  if (!regions.length) return null
  const squareMillimetres = regions.reduce((sum, region) => {
    const points = Array.isArray(region?.Points)
      ? region.Points
      : (Array.isArray(region?.points) ? region.points : [])
    if (points.length < 3) return sum
    const doubledArea = points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length]
      const x = toNumber(point?.X ?? point?.x)
      const y = toNumber(point?.Y ?? point?.y)
      const nextX = toNumber(next?.X ?? next?.x)
      const nextY = toNumber(next?.Y ?? next?.y)
      if ([x, y, nextX, nextY].some((value) => value === null)) return area
      return area + x * nextY - nextX * y
    }, 0)
    return sum + Math.abs(doubledArea) / 2
  }, 0)
  return squareMillimetres > 0 ? squareMillimetres / 1_000_000 : null
}

export async function loadGatewayAndDevicesOnlineCount() {
  const response = await requestIotJson('/getgatewayanddevicesonlinecount', {
    method: 'POST'
  })
  if (response?.success === false) throw new Error(response.message || '在线设备接口返回失败')

  const raw = unwrapWcfData(response) || {}
  const gatewayTotal = toNumber(raw.gatewayCount)
  const gatewayOnline = toNumber(raw.gatewayOnlineCount)
  const deviceTotal = toNumber(raw.deviceCount)
  const deviceOnline = toNumber(raw.deviceOnlineCount)
  const counts = [gatewayTotal, gatewayOnline, deviceTotal, deviceOnline]
  if (counts.some((value) => value === null)) throw new Error('在线设备接口返回字段缺失')

  const total = gatewayTotal + deviceTotal
  const online = gatewayOnline + deviceOnline
  const offline = Math.max(total - online, 0)
  return {
    available: true,
    online,
    offline,
    onlineRate: total > 0 ? Number(((online / total) * 100).toFixed(1)) : 0,
    gatewayTotal,
    gatewayOnline,
    deviceTotal,
    deviceOnline,
    // The real endpoint has no location parameter. Sending a Lontri id produces
    // the same result, so the backend still needs to confirm its statistics scope.
    scopeVerified: false,
    scopeNote: '在线接口未提供 locationId 参数，当前统计范围待后端确认'
  }
}

export function summarizeAlarms(rawAlarms = [], total = rawAlarms.length) {
  const alarms = rawAlarms.map((alarm) => (
    alarm?.raw && typeof alarm.actionable === 'boolean' ? alarm : adaptAlarm(alarm)
  ))
  const normalizedTotal = toNumber(total) ?? alarms.length
  const statusSummaryComplete = normalizedTotal <= alarms.length
  const pending = alarms.filter((alarm) => alarm.actionable)

  return {
    total: normalizedTotal,
    pending: statusSummaryComplete ? pending.length : null,
    processed: statusSummaryComplete ? alarms.filter((alarm) => alarm.status === 'processed').length : null,
    closed: statusSummaryComplete ? alarms.filter((alarm) => alarm.status === 'closed').length : null,
    pendingList: pending.sort(comparePendingAlarms).slice(0, 4),
    statusSummaryComplete,
    scopeVerified: false,
    scopeNote: '告警接口未提供 locationId 筛选条件，当前统计范围待后端确认'
  }
}

async function loadAlarms(queryAlarmsImpl) {
  const response = await queryAlarmsImpl({ page: 1, pageSize: 100 })
  if (response?.success !== true) throw new Error(response?.message || '设备告警请求失败')
  return summarizeAlarms(Array.isArray(response.data) ? response.data : [], response.total)
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

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback
}

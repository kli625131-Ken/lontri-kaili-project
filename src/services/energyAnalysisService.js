import {
  hasDashboardEnergyData,
  loadDashboardEnergy
} from './dashboardEnergyApi.js'
import { requestIotJson, unwrapWcfData } from './iotRestClient.js'

const DAY_MS = 24 * 60 * 60 * 1000
const SUMMARY_CACHE_TTL = 60_000
const ENV = import.meta.env ?? {}
const AREA_REPORT_PATH = String(
  ENV.VITE_ENERGY_AREA_REPORT_PATH || '/GetReportAreasByLocationID'
).trim()
const dashboardSummaryCache = new Map()

export function parseDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(date) {
  const normalized = parseDate(date)
  const year = normalized.getFullYear()
  const month = String(normalized.getMonth() + 1).padStart(2, '0')
  const day = String(normalized.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date, amount) {
  const next = parseDate(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function subtractCalendarMonths(date, amount) {
  const source = parseDate(date)
  const target = new Date(source.getFullYear(), source.getMonth() - amount, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(source.getDate(), lastDay))
  return target
}

export function getInclusiveDayCount(startDate, endDate) {
  return Math.floor((parseDate(endDate) - parseDate(startDate)) / DAY_MS) + 1
}

export function createPreviousPeriod(startDate, endDate) {
  const dayCount = getInclusiveDayCount(startDate, endDate)
  const previousEnd = addDays(startDate, -1)
  return {
    startDate: addDays(previousEnd, -(dayCount - 1)),
    endDate: previousEnd,
    dayCount
  }
}

export function createEmptyEnergyAnalysisSnapshot(filters = {}) {
  const startDate = parseDate(filters.startDate || new Date())
  const endDate = parseDate(filters.endDate || new Date())
  const previousPeriod = createPreviousPeriod(startDate, endDate)
  return {
    summary: {
      monthKWh: null,
      yearKWh: null,
      yearSavedKWh: null,
      savingRate: null,
      targetValue: null,
      targetUnit: null,
      goalCompletion: null
    },
    trend: [],
    trendGranularity: null,
    trendSourceLabel: '',
    ranking: [],
    rankingSourceLabel: '',
    comparison: {
      currentPeriod: { startDate, endDate, energy: null },
      previousPeriod: { ...previousPeriod, energy: null },
      series: [],
      changeValue: null,
      changeRate: null,
      status: 'unknown',
      comparable: false
    },
    states: {
      summary: createState('loading', '能耗汇总加载中'),
      trend: createState('loading', '能耗趋势加载中'),
      comparison: createState('loading', '环比数据加载中'),
      target: createState('loading', '节能目标加载中'),
      ranking: createState('loading', '区域排行加载中')
    }
  }
}

export async function loadEnergyAnalysisSnapshot(filters, { signal } = {}) {
  const snapshot = createEmptyEnergyAnalysisSnapshot(filters)
  if (!filters?.locationId) throw new Error('未选择有效的能耗统计范围')

  const payload = createAnalysisPayload(filters)
  const summaryRequest = loadCachedDashboardEnergy(filters.locationId, signal)
  const comparisonRequest = requestIotJson('/getenergycomparisonreport', {
    method: 'POST',
    body: payload,
    auth: false,
    signal
  })
  const targetRequest = requestIotJson('/getenergyconservationtarget', {
    method: 'POST',
    body: createAnnualTargetPayload(filters),
    auth: false,
    signal
  })
  const rankingRequest = filters.locationLevel === 'storey' && AREA_REPORT_PATH
    ? requestIotJson(AREA_REPORT_PATH, {
      method: 'POST',
      body: { StoreyID: filters.locationId, Name: '' },
      auth: false,
      signal
    })
    : loadChildLocationRanking(filters, signal)

  const [summaryResult, comparisonResult, targetResult, rankingResult] = await Promise.allSettled([
    summaryRequest,
    comparisonRequest,
    targetRequest,
    rankingRequest
  ])

  applySummaryResult(snapshot, summaryResult, filters)
  applyComparisonResult(snapshot, comparisonResult)
  applyTargetResult(snapshot, targetResult)
  applyRankingResult(snapshot, rankingResult, filters.locationLevel)
  return snapshot
}

async function loadCachedDashboardEnergy(locationId, signal) {
  const cached = dashboardSummaryCache.get(locationId)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  const value = await loadDashboardEnergy({ locationId, signal })
  dashboardSummaryCache.set(locationId, { value, expiresAt: Date.now() + SUMMARY_CACHE_TTL })
  return value
}

function createAnalysisPayload(filters) {
  return {
    start: formatDate(filters.startDate),
    end: formatDate(filters.endDate),
    id: null,
    sid: 'all',
    realLocationId: filters.locationId,
    deviceType: mapDeviceType(filters.deviceType),
    granularity: 'auto',
    initiFlag: false
  }
}

function createAnnualTargetPayload(filters) {
  const today = parseDate(new Date())
  return createAnalysisPayload({
    ...filters,
    startDate: new Date(today.getFullYear(), 0, 1),
    endDate: today
  })
}

async function loadChildLocationRanking(filters, signal) {
  const children = Array.isArray(filters.childLocations)
    ? filters.childLocations.filter((item) => item?.locationId)
    : []
  const metric = getRankingMetric(filters.preset)
  if (!children.length || !metric) {
    return {
      kind: 'children',
      items: [],
      unsupportedPreset: !metric,
      childCount: children.length
    }
  }

  const results = await Promise.allSettled(children.map(async (child) => {
    const energy = await loadCachedDashboardEnergy(child.locationId, signal)
    return {
      id: child.id || child.locationId,
      name: child.label || child.locationId,
      value: energy.metrics[metric.field]
    }
  }))

  return {
    kind: 'children',
    sourceLabel: metric.label,
    childCount: children.length,
    items: results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((item) => Number.isFinite(item.value))
  }
}

function getRankingMetric(preset) {
  if (preset === 'today') return { field: 'todayKWh', label: '下级范围当日能耗' }
  if (preset === 'month-1') return { field: 'monthKWh', label: '下级范围本月能耗' }
  if (preset === 'year-1') return { field: 'yearKWh', label: '下级范围本年能耗' }
  return null
}

function applySummaryResult(snapshot, result, filters) {
  if (result.status === 'rejected') {
    snapshot.states.summary = createState('error', friendlyError(result.reason, '能耗汇总请求失败'))
    snapshot.states.trend = createState('error', friendlyError(result.reason, '能耗趋势请求失败'))
    return
  }

  const energy = result.value
  snapshot.summary.monthKWh = energy.metrics.monthKWh
  snapshot.summary.yearKWh = energy.metrics.yearKWh
  snapshot.summary.yearSavedKWh = energy.metrics.yearSavedKWh
  snapshot.summary.savingRate = energy.metrics.savingRate
  snapshot.states.summary = hasDashboardEnergyData(energy)
    ? createState('success', '')
    : createState('empty', '当前统计范围暂无能耗数据')

  const hourlyTrend = energy.energy.day.xAxisData.map((label, index) => ({
    label,
    value: energy.energy.day.current[index]
  })).filter((item) => Number.isFinite(item.value))
  const recentTrend = energy.trend.days.map((label, index) => ({
    label,
    value: energy.trend.actualKWh[index]
  })).filter((item) => Number.isFinite(item.value))

  if (filters.preset === 'today' && hourlyTrend.length > 1) {
    snapshot.trend = hourlyTrend
    snapshot.trendGranularity = 'hour'
    snapshot.trendSourceLabel = '接口当日24小时数据'
  } else if (recentTrend.length) {
    // /getdashboard 的近 30 天趋势是独立数据源，不依赖环比接口或 JWT。
    snapshot.trend = recentTrend
    snapshot.trendGranularity = 'day'
    snapshot.trendSourceLabel = '接口固定近30天数据'
  } else if (hourlyTrend.length) {
    snapshot.trend = hourlyTrend.map((item) => ({
      label: item.label,
      value: item.value
    }))
    snapshot.trendGranularity = 'hour'
    snapshot.trendSourceLabel = '接口当日24小时数据'
  }

  snapshot.states.trend = snapshot.trend.length
    ? createState('success', '')
    : createState('empty', '后端 /getdashboard 未返回当前统计范围的趋势点')
}

function applyComparisonResult(snapshot, result) {
  if (result.status === 'rejected') {
    snapshot.states.comparison = createState('error', friendlyError(result.reason, '能耗环比请求失败'))
    return
  }

  const data = unwrapWcfData(result.value)
  if (!data || typeof data !== 'object') {
    snapshot.states.comparison = createState('empty', '能耗环比接口未返回有效数据')
    return
  }
  if (data.success === false) {
    snapshot.states.comparison = createState('error', data.message || '能耗环比接口返回失败')
    return
  }

  const currentTotal = toNumber(data.currentTotalKWh)
  const previousTotal = toNumber(data.previousTotalKWh)
  const difference = toNumber(data.differenceKWh)
  const changeRate = toNumber(data.changeRate)
  const series = (Array.isArray(data.points) ? data.points : []).map((point, index) => {
    const currentValue = toNumber(point.currentKWh)
    const previousValue = toNumber(point.previousKWh)
    return {
      label: formatComparisonPointLabel(point.currentStart, index),
      currentLabel: formatComparisonPointLabel(point.currentStart, index),
      previousLabel: formatComparisonPointLabel(point.previousStart, index),
      currentValue,
      previousValue,
      difference: toNumber(point.differenceKWh),
      changeRate: toNumber(point.changeRate)
    }
  })

  snapshot.comparison = {
    currentPeriod: {
      startDate: data.currentStart ? parseDate(data.currentStart) : snapshot.comparison.currentPeriod.startDate,
      endDate: data.currentEnd ? parseDate(data.currentEnd) : snapshot.comparison.currentPeriod.endDate,
      energy: currentTotal
    },
    previousPeriod: {
      startDate: data.previousStart ? parseDate(data.previousStart) : snapshot.comparison.previousPeriod.startDate,
      endDate: data.previousEnd ? parseDate(data.previousEnd) : snapshot.comparison.previousPeriod.endDate,
      energy: previousTotal
    },
    series,
    changeValue: difference,
    changeRate,
    status: changeRate === null ? 'unknown' : changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : 'flat',
    comparable: currentTotal !== null && previousTotal !== null
  }
  snapshot.states.comparison = snapshot.comparison.comparable || series.some((item) => (
    item.currentValue !== null || item.previousValue !== null
  ))
    ? createState('success', '')
    : createState('empty', '当前周期和对比周期均无能耗数据')
}

function formatComparisonPointLabel(value, index) {
  const label = String(value || '').trim()
  return label ? label.slice(5) : `第${index + 1}点`
}

function applyTargetResult(snapshot, result) {
  if (result.status === 'rejected') {
    snapshot.states.target = createState('error', friendlyError(result.reason, '节能目标请求失败'))
    return
  }

  const value = toNumber(unwrapWcfData(result.value))
  if (value === null) {
    snapshot.states.target = createState('empty', '节能目标接口未返回有效数值')
    return
  }

  snapshot.summary.targetValue = value
  snapshot.summary.targetUnit = 'kWh'

  const yearSavedKWh = snapshot.summary.yearSavedKWh
  if (value <= 0) {
    snapshot.summary.goalCompletion = null
    snapshot.states.target = createState('empty', '年度节能目标必须大于 0')
    return
  }

  // 目标接口返回年度节能目标值；完成量使用同一统计范围
  // /getdashboard.YTDSavedkWh，二者单位均按 kWh 计算。
  snapshot.summary.goalCompletion = Number.isFinite(yearSavedKWh)
    ? Number(((yearSavedKWh / value) * 100).toFixed(2))
    : null
  snapshot.states.target = Number.isFinite(yearSavedKWh)
    ? createState('success', '')
    : createState('empty', '当前统计范围未返回年度节约量，无法计算完成度')
}

function applyRankingResult(snapshot, result, locationLevel) {
  if (result.status === 'rejected') {
    snapshot.states.ranking = createState('error', friendlyError(result.reason, '区域能耗接口请求失败'))
    return
  }

  if (result.value?.kind === 'children') {
    if (result.value.unsupportedPreset) {
      snapshot.states.ranking = createState(
        'unsupported',
        '现有接口无法按近3月、近6月或自定义区间生成下级能耗排行'
      )
      return
    }
    if (!result.value.childCount) {
      snapshot.states.ranking = createState('empty', '当前统计范围没有可排行的下级节点')
      return
    }
    snapshot.ranking = normalizeRanking(result.value.items)
    snapshot.rankingSourceLabel = result.value.sourceLabel || ''
    snapshot.states.ranking = snapshot.ranking.length
      ? createState('success', '')
      : createState('empty', `后端未返回 ${result.value.childCount} 个下级范围的能耗数据`)
    return
  }

  if (locationLevel !== 'storey') {
    snapshot.states.ranking = createState(
      'unsupported',
      '现有接口样例只接受 StoreyID，暂不支持当前层级的下级能耗排行'
    )
    return
  }
  if (!AREA_REPORT_PATH) {
    snapshot.states.ranking = createState(
      'unsupported',
      '未配置区域能耗接口路径 VITE_ENERGY_AREA_REPORT_PATH'
    )
    return
  }
  const data = unwrapWcfData(result.value)
  if (!Array.isArray(data) || !data.length) {
    snapshot.states.ranking = createState('empty', '当前楼层暂无区域能耗数据')
    return
  }

  // Apipost has no verified response schema for this endpoint. Preserve the real
  // response boundary and wait for field confirmation instead of guessing values.
  snapshot.states.ranking = createState('unsupported', '区域接口已返回数据，但能耗字段名称尚未确认')
}

function normalizeRanking(items) {
  const sorted = (Array.isArray(items) ? items : [])
    .filter((item) => Number.isFinite(item?.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
  const max = sorted[0]?.value || 0
  return sorted.map((item) => ({
    ...item,
    percent: max > 0 ? Number(((item.value / max) * 100).toFixed(2)) : 0
  }))
}

function mapDeviceType(value) {
  return value === 'lighting' ? 'Light' : String(value || 'Light')
}

function createState(status, message) {
  return { status, message }
}

function friendlyError(error, fallback) {
  if (error?.status === 401) return '接口返回401，请确认后端服务版本或访问策略'
  if (error?.status === 404) return '后端未发布文档中的接口路径（HTTP 404）'
  return error instanceof Error && error.message ? error.message : fallback
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

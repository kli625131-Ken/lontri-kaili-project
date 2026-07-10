const DAY_MS = 24 * 60 * 60 * 1000

const RANKING_NAMES = [
  '照明回路 01',
  '照明回路 02',
  '照明回路 03',
  '照明回路 04',
  '照明回路 05',
  '照明回路 06',
  '照明回路 07',
  '照明回路 08',
  '照明回路 09',
  '照明回路 10'
]

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

export function resolveTrendGranularity(dayCount) {
  if (dayCount <= 31) return 'day'
  if (dayCount <= 180) return 'week'
  return 'month'
}

// 当前仓库没有能耗分析接口；该适配器集中提供可联动的演示数据。
// 后续接入真实接口时，保持返回结构不变即可，无需改动页面筛选和图表逻辑。
export function createEnergyAnalysisSnapshot(filters) {
  const startDate = parseDate(filters.startDate)
  const endDate = parseDate(filters.endDate)
  const previousPeriod = createPreviousPeriod(startDate, endDate)
  const dayCount = getInclusiveDayCount(startDate, endDate)
  const granularity = resolveTrendGranularity(dayCount)
  const currentDaily = createDailySeries(startDate, endDate, filters)
  const previousDaily = createDailySeries(previousPeriod.startDate, previousPeriod.endDate, filters)
  const trend = aggregateTrend(currentDaily, granularity)
  const currentEnergy = sumEnergy(currentDaily)
  const previousEnergy = sumEnergy(previousDaily)
  const changeValue = currentEnergy - previousEnergy
  const changeRate = previousEnergy > 0 ? (changeValue / previousEnergy) * 100 : null

  return {
    trend,
    granularity,
    ranking: createRanking(currentEnergy, filters),
    comparison: {
      currentPeriod: { startDate, endDate, energy: currentEnergy },
      previousPeriod: { ...previousPeriod, energy: previousEnergy },
      changeValue,
      changeRate,
      status: resolveComparisonStatus(changeRate),
      comparable: previousEnergy > 0
    }
  }
}

function createDailySeries(startDate, endDate, filters) {
  const result = []
  const seed = hashString(`${filters.areaId}:${filters.deviceType}`)
  const areaFactor = filters.areaLevel === 'building' ? 2.8 : 1

  for (let cursor = parseDate(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const dayIndex = Math.floor(cursor.getTime() / DAY_MS)
    const weekdayFactor = [0.82, 1.02, 1.08, 1.05, 1.1, 1.04, 0.9][cursor.getDay()]
    const seasonalFactor = 1 + Math.sin((cursor.getMonth() / 12) * Math.PI * 2) * 0.08
    const variation = 0.9 + (((dayIndex * 17 + seed) % 23) / 100)
    const value = Math.round(1120 * areaFactor * weekdayFactor * seasonalFactor * variation)
    result.push({ date: parseDate(cursor), value })
  }

  return result
}

function aggregateTrend(dailySeries, granularity) {
  if (granularity === 'day') {
    return dailySeries.map((item) => ({ label: formatDateLabel(item.date), value: item.value }))
  }

  const buckets = []
  const bucketMap = new Map()

  dailySeries.forEach((item, index) => {
    const key = granularity === 'week'
      ? `week-${Math.floor(index / 7)}`
      : `${item.date.getFullYear()}-${item.date.getMonth() + 1}`
    let bucket = bucketMap.get(key)
    if (!bucket) {
      bucket = { start: item.date, end: item.date, value: 0 }
      bucketMap.set(key, bucket)
      buckets.push(bucket)
    }
    bucket.end = item.date
    bucket.value += item.value
  })

  return buckets.map((bucket) => ({
    label: granularity === 'week'
      ? `${formatDateLabel(bucket.start)}~${formatDateLabel(bucket.end)}`
      : `${bucket.start.getFullYear()}/${String(bucket.start.getMonth() + 1).padStart(2, '0')}`,
    value: bucket.value
  }))
}

function createRanking(totalEnergy, filters) {
  if (!Number.isFinite(totalEnergy) || totalEnergy <= 0) return []
  const seed = hashString(`${filters.areaId}:${filters.deviceType}:${formatDate(filters.startDate)}`)
  const weighted = RANKING_NAMES.map((name, index) => ({
    name,
    value: Math.round(totalEnergy * (0.082 - index * 0.004) * (0.94 + ((seed + index * 7) % 12) / 100))
  })).sort((a, b) => b.value - a.value)
  const maximum = weighted[0]?.value || 1
  return weighted.map((item) => ({ ...item, percent: Math.round((item.value / maximum) * 100) }))
}

function sumEnergy(series) {
  if (!Array.isArray(series) || !series.length) return 0
  return series.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0)
}

function resolveComparisonStatus(rate) {
  if (rate === null || !Number.isFinite(rate)) return 'unavailable'
  if (Math.abs(rate) < 1) return 'flat'
  return rate > 0 ? 'up' : 'down'
}

function formatDateLabel(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function hashString(value) {
  return [...String(value)].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7)
}

import { loadLocalDraft } from './deviceMapLocalService'

const DAY_MS = 24 * 60 * 60 * 1000

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

export async function loadEnergyRankingAreas(scopeNode, mapConfig) {
  const mapNodes = collectMapNodes(scopeNode)
    .filter((node) => mapConfig[node.mapId]?.available !== false)
  const showFloorLabel = mapNodes.length > 1
  const regionGroups = await Promise.all(mapNodes.map(async (mapNode) => {
    const regions = await loadMapRegions(mapNode.mapId, mapConfig[mapNode.mapId])
    return regions.map((region) => ({
      id: `${mapNode.mapId}:${region.id}`,
      name: showFloorLabel ? `${mapNode.label} · ${region.name}` : region.name
    }))
  }))

  const uniqueAreas = new Map()
  regionGroups.flat().forEach((area) => uniqueAreas.set(area.id, area))
  return Array.from(uniqueAreas.values())
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
  const comparisonSeries = createComparisonSeries(currentDaily, previousDaily, granularity)
  const currentEnergy = sumEnergy(currentDaily)
  const previousEnergy = sumEnergy(previousDaily)
  const changeValue = currentEnergy - previousEnergy
  const changeRate = previousEnergy > 0 ? (changeValue / previousEnergy) * 100 : null

  return {
    trend,
    granularity,
    ranking: createRanking(currentEnergy, filters, filters.rankingAreas),
    comparison: {
      currentPeriod: { startDate, endDate, energy: currentEnergy },
      previousPeriod: { ...previousPeriod, energy: previousEnergy },
      series: comparisonSeries,
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

function createComparisonSeries(currentDaily, previousDaily, granularity) {
  const currentBuckets = aggregateTrend(currentDaily, granularity)
  const previousBuckets = aggregateTrend(previousDaily, granularity)
  const bucketCount = Math.max(currentBuckets.length, previousBuckets.length)

  return Array.from({ length: bucketCount }, (_, index) => {
    const current = currentBuckets[index]
    const previous = previousBuckets[index]
    const currentValue = Number.isFinite(current?.value) ? current.value : null
    const previousValue = Number.isFinite(previous?.value) ? previous.value : null
    const difference = currentValue !== null && previousValue !== null
      ? currentValue - previousValue
      : null
    const changeRate = difference !== null && previousValue > 0
      ? (difference / previousValue) * 100
      : null

    return {
      label: current?.label || previous?.label || '',
      currentLabel: current?.label || '--',
      previousLabel: previous?.label || '--',
      currentValue,
      previousValue,
      difference,
      changeRate
    }
  })
}

function createRanking(totalEnergy, filters, rankingAreas = []) {
  if (!Number.isFinite(totalEnergy) || totalEnergy <= 0 || !rankingAreas.length) return []
  const seed = `${filters.areaId}:${filters.deviceType}:${formatDate(filters.startDate)}`
  const weightedAreas = rankingAreas.map((area) => ({
    ...area,
    weight: 0.86 + (hashString(`${seed}:${area.id}`) % 29) / 100
  }))
  const totalWeight = weightedAreas.reduce((sum, area) => sum + area.weight, 0)
  const weighted = weightedAreas.map((area) => ({
    id: area.id,
    name: area.name,
    value: Math.round(totalEnergy * (area.weight / totalWeight))
  })).sort((a, b) => b.value - a.value).slice(0, 10)
  const maximum = weighted[0]?.value || 1
  return weighted.map((item) => ({ ...item, percent: Math.round((item.value / maximum) * 100) }))
}

async function loadMapRegions(mapId, config) {
  if (!mapId || !config?.dataUrl) return []

  const savedRegions = loadLocalDraft(mapId)?.overlay?.regions
  if (Array.isArray(savedRegions) && savedRegions.length) {
    return normalizeRegions(savedRegions)
  }

  try {
    const response = await fetch(config.dataUrl)
    if (!response.ok) throw new Error(`${config.dataUrl} request failed: ${response.status}`)
    const data = await response.json()
    const sourceRegions = Array.isArray(data.regions)
      ? data.regions
      : Array.isArray(data.Regions)
        ? data.Regions.filter((region) => (
          (region.Points || region.SvgPoints || []).length >= 3
        ))
        : []
    return normalizeRegions(sourceRegions)
  } catch (error) {
    console.warn(`读取区域排行数据失败: ${mapId}`, error)
    return []
  }
}

function normalizeRegions(regions) {
  return regions
    .map((region, index) => ({
      id: String(region.id || region.Id || region.code || region.Code || `region-${index + 1}`),
      name: String(region.name || region.Name || region.code || region.Code || '').trim()
    }))
    .filter((region) => region.name)
}

function collectMapNodes(node) {
  if (!node) return []
  if (node.mapId) return [node]
  return (node.children || []).flatMap(collectMapNodes)
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

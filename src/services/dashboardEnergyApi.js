import { requestIotJson } from './iotRestClient.js'

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function createEmptyDashboardEnergy() {
  return {
    metrics: {
      todayKWh: null,
      monthKWh: null,
      quarterKWh: null,
      yearKWh: null,
      todaySavedKWh: null,
      monthSavedKWh: null,
      quarterSavedKWh: null,
      yearSavedKWh: null,
      savedMoneyYuan: null,
      savingRate: null,
      carbonReductionTons: null
    },
    overview: {
      storeys: null,
      cus: null,
      lights: null,
      warnings: null
    },
    energy: {
      day: createEmptySeries(),
      month: createEmptySeries(),
      quarter: createEmptySeries()
    },
    trend: { days: [], actualKWh: [] },
    updatedAt: null
  }
}

export async function loadDashboardEnergy({
  locationId,
  fetchImpl = globalThis.fetch,
  signal,
  now = () => new Date()
} = {}) {
  if (!GUID_PATTERN.test(locationId)) {
    throw new Error('仪表盘能耗统计范围未配置或不是有效 GUID')
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('当前环境不支持能耗数据请求')
  }

  const result = await requestIotJson('/getdashboard', {
    method: 'POST',
    body: { id: locationId },
    auth: false,
    signal,
    fetchImpl
  })
  return adaptDashboardEnergy(result?.data ?? result, now().toISOString())
}

export function adaptDashboardEnergy(raw = {}, updatedAt = new Date().toISOString()) {
  const recentReport = raw.recently30DayskWhReport ?? {}
  const dayReport = raw.the24HoursSavingRatioReport ?? {}

  const todayKWh = toNumber(raw.todaykWh)
  const todaySavedKWh = toNumber(raw.todaySavedkWh)
  const monthKWh = toNumber(raw.MTDkWh ?? raw.currentMonthkWh)
  const monthSavedKWh = toNumber(raw.MTDSavedkWh)
  const quarterKWh = toNumber(raw.QTDkWh)
  const quarterSavedKWh = toNumber(raw.QTDSavedkWh)

  const recentLighting = normalizeStandardSeries(
    recentReport.lightsDates,
    recentReport.lightsActualkWh,
    recentReport.lightsStandardkWh
  )
  const recentAll = normalizeStandardSeries(
    recentReport.Dates,
    recentReport.ActualkWh,
    recentReport.StandardkWh
  )
  const trendSeries = recentLighting.xAxisData.length ? recentLighting : recentAll

  return {
    metrics: {
      todayKWh,
      monthKWh,
      quarterKWh,
      yearKWh: toNumber(raw.YTDkWh ?? raw.currentYearkWh),
      todaySavedKWh,
      monthSavedKWh,
      quarterSavedKWh,
      yearSavedKWh: toNumber(raw.YTDSavedkWh),
      savedMoneyYuan: multiply(toNumber(raw.numOfSavedMoney), 10_000),
      savingRate: toNumber(raw.energySavingRatio),
      carbonReductionTons: toNumber(raw.numOfReductionOfCarbonEmissions)
    },
    overview: {
      storeys: toNumber(raw.numOfStoreys),
      cus: toNumber(raw.numOfCUs),
      lights: toNumber(raw.numOfLights),
      warnings: toNumber(raw.numOfWarnings)
    },
    energy: {
      day: normalizeSavingRateSeries(dayReport.DateHours, dayReport.ActualkWh, dayReport.energySavingRatio, {
        fallbackLabel: '今日',
        fallbackActual: todayKWh,
        fallbackSaved: todaySavedKWh
      }),
      month: createSummarySeries('本月', monthKWh, monthSavedKWh),
      quarter: createSummarySeries('本季度', quarterKWh, quarterSavedKWh)
    },
    trend: {
      days: trendSeries.xAxisData,
      actualKWh: trendSeries.current
    },
    updatedAt
  }
}

export function hasDashboardEnergyData(energy) {
  const metrics = energy?.metrics || {}
  return [
    metrics.todayKWh,
    metrics.monthKWh,
    metrics.quarterKWh,
    metrics.yearKWh,
    metrics.yearSavedKWh,
    metrics.savingRate
  ].some((value) => value !== null)
}

function createEmptySeries() {
  return { xAxisData: [], baseline: [], current: [], saveRate: [] }
}

function normalizeStandardSeries(labels, actualValues, standardValues) {
  const normalizedLabels = normalizeLabels(labels)
  const actual = normalizeNumbers(actualValues)
  const standard = normalizeNumbers(standardValues)
  const length = Math.min(normalizedLabels.length, actual.length, standard.length)
  if (!length) return createEmptySeries()

  const xAxisData = normalizedLabels.slice(-length)
  const current = actual.slice(-length)
  const baseline = standard.slice(-length)

  return {
    xAxisData,
    baseline,
    current,
    saveRate: baseline.map((value, index) => calculateSavingRate(value, current[index]))
  }
}

function normalizeSavingRateSeries(labels, actualValues, rateValues, fallback) {
  const normalizedLabels = normalizeLabels(labels)
  const actual = normalizeNumbers(actualValues)
  const rates = normalizeNumbers(rateValues)
  const length = Math.min(normalizedLabels.length, actual.length, rates.length)

  if (!length) {
    return createSummarySeries(fallback.fallbackLabel, fallback.fallbackActual, fallback.fallbackSaved)
  }

  const xAxisData = normalizedLabels.slice(-length)
  const current = actual.slice(-length)
  const saveRate = rates.slice(-length)
  const baseline = current.map((value, index) => deriveBaseline(value, saveRate[index]))

  return { xAxisData, baseline, current, saveRate }
}

function createSummarySeries(label, actualValue, savedValue) {
  if (actualValue === null && savedValue === null) return createEmptySeries()
  const current = actualValue ?? 0
  const saved = savedValue ?? 0
  const baseline = current + saved

  return {
    xAxisData: [label],
    baseline: [baseline],
    current: [current],
    saveRate: [calculateSavingRate(baseline, current)]
  }
}

function normalizeLabels(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value ?? '').trim()).filter((value) => value && value !== '时间')
    : []
}

function normalizeNumbers(values) {
  return Array.isArray(values) ? values.map(toNumber).filter((value) => value !== null) : []
}

function calculateSavingRate(standard, actual) {
  if (!Number.isFinite(standard) || standard <= 0 || !Number.isFinite(actual)) return 0
  return Number((((standard - actual) / standard) * 100).toFixed(2))
}

function deriveBaseline(actual, savingRate) {
  if (!Number.isFinite(actual) || !Number.isFinite(savingRate) || savingRate >= 100) return actual ?? 0
  return Number((actual / (1 - savingRate / 100)).toFixed(3))
}

function multiply(value, multiplier) {
  return value === null ? null : value * multiplier
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

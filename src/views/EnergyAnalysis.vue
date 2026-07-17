<template>
  <div class="energy-analysis-page">
    <div class="page-content">
      <DataCard title="分析筛选" class="filter-card">
        <div class="filter-section">
          <div class="filter-title"><span class="filter-icon">时</span>时间筛选</div>
          <div class="preset-grid">
            <button
              v-for="preset in timePresets"
              :key="preset.value"
              type="button"
              class="preset-btn"
              :class="{ active: selectedPreset === preset.value }"
              @click="selectedPreset = preset.value"
            >
              {{ preset.label }}
            </button>
          </div>
          <div class="custom-range-title">自定义日期范围</div>
          <div class="custom-range">
            <label>
              <span>开始</span>
              <input v-model="customStartDate" type="date" :max="customEndDate || todayValue" @change="applyCustomRange" />
            </label>
            <span class="range-separator">至</span>
            <label>
              <span>结束</span>
              <input v-model="customEndDate" type="date" :min="customStartDate" :max="todayValue" @change="applyCustomRange" />
            </label>
          </div>
          <p v-if="dateValidationError" class="filter-error">{{ dateValidationError }}</p>
        </div>

        <div class="filter-section">
          <div class="filter-title"><span class="filter-icon">设</span>设备类型</div>
          <div class="device-types">
            <button
              v-for="type in deviceTypes"
              :key="type.value"
              type="button"
              :class="['type-btn', { active: selectedType === type.value }]"
              @click="selectedType = type.value"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <div class="filter-section area-filter-section">
          <div class="filter-title"><span class="filter-icon">区</span>区域导航</div>
          <div class="area-hint">默认 Lontri，可按真实物理层级向下选择</div>
          <p v-if="hierarchyLoading" class="filter-state">物理层级加载中...</p>
          <p v-else-if="hierarchyError" class="filter-error">{{ hierarchyError }}</p>
          <div class="area-tree">
            <EnergyAreaTreeNode
              v-for="project in areaTree"
              :key="project.id"
              :node="project"
              :expanded-ids="expandedTreeIds"
              :selected-id="selectedArea.id"
              :map-config="areaMapConfig"
              @toggle="toggleTreeNode"
              @select="selectArea"
            />
          </div>
        </div>

      </DataCard>

      <div class="right-section">
        <div class="kpi-row">
          <div class="kpi-card">
            <span class="kpi-bg-icon" :style="{ '--kpi-icon-mask': `url(${monthEnergyBackgroundIcon})` }" aria-hidden="true"></span>
            <div class="kpi-header"><span class="kpi-label">本月能耗(kWh)</span></div>
            <div class="kpi-value">{{ formatMetric(analysisSnapshot.summary.monthKWh) }}<span class="kpi-sub">{{ summaryHint }}</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(0)"></div></div></div>
          </div>
          <div class="kpi-card">
            <span class="kpi-bg-icon" :style="{ '--kpi-icon-mask': `url(${yearEnergyBackgroundIcon})` }" aria-hidden="true"></span>
            <div class="kpi-header"><span class="kpi-label">本年能耗(kWh)</span></div>
            <div class="kpi-value">{{ formatMetric(analysisSnapshot.summary.yearKWh) }}<span class="kpi-sub">当前所选范围</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(0)"></div></div></div>
          </div>
          <div class="kpi-card">
            <span class="kpi-bg-icon" :style="{ '--kpi-icon-mask': `url(${savingRateBackgroundIcon})` }" aria-hidden="true"></span>
            <div class="kpi-header"><span class="kpi-label">节约率(%)</span></div>
            <div class="kpi-value">{{ formatPercent(analysisSnapshot.summary.savingRate) }}<span class="kpi-sub">接口原始节约率</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(analysisSnapshot.summary.savingRate || 0)"></div></div></div>
          </div>
          <div class="kpi-card">
            <span class="kpi-bg-icon" :style="{ '--kpi-icon-mask': `url(${goalCompletionBackgroundIcon})` }" aria-hidden="true"></span>
            <div class="kpi-header"><span class="kpi-label">节能目标完成度</span></div>
            <div class="kpi-value"><span :style="kpiGoalValueStyle">{{ formatPercent(analysisSnapshot.summary.goalCompletion) }}</span><span class="kpi-sub">{{ targetHint }}</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(analysisSnapshot.summary.goalCompletion || 0)"></div></div></div>
          </div>
        </div>

        <DataCard title="能耗趋势曲线" class="trend-card module-card">
          <template #header-extra>
            <div class="module-header-extra">
              <span class="filter-chip area-chip" :title="areaRangeLabel">{{ areaTagLabel }}</span>
              <span class="filter-chip">{{ selectedDeviceType?.label || '--' }}</span>
              <span class="filter-chip time-chip" :title="trendTimeLabel">{{ trendTimeLabel }}</span>
              <span class="unit-label">单位: kWh</span>
            </div>
          </template>
          <div v-if="analysisSnapshot.trend.length" ref="trendChart" class="chart-container"></div>
          <div v-else class="empty-state">{{ stateMessage(analysisSnapshot.states.trend, '暂无能耗趋势数据') }}</div>
        </DataCard>

        <div class="bottom-charts">
          <DataCard title="TOP10 区域能耗排行" class="rank-card module-card">
            <template #header-extra>
              <div class="module-header-extra">
                <span class="filter-chip area-chip" :title="areaRangeLabel">{{ areaTagLabel }}</span>
                <span class="filter-chip">{{ selectedDeviceType?.label || '--' }}</span>
                <span class="filter-chip time-chip" :title="rankingTimeLabel">{{ rankingTimeLabel }}</span>
                <span class="unit-label">单位: kWh</span>
              </div>
            </template>
            <div v-if="analysisSnapshot.ranking.length" class="rank-list">
              <div v-for="(item, index) in analysisSnapshot.ranking" :key="item.id" class="rank-item">
                <span class="rank-index" :class="{ highlight: index < 3 }">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="rank-name" :title="item.name">{{ item.name }}</span>
                <div class="rank-bar-wrapper"><div class="rank-bar" :style="rankBarStyle(item.percent)"></div></div>
                <span class="rank-value">{{ formatEnergy(item.value) }}</span>
              </div>
            </div>
            <div v-else class="empty-state">{{ stateMessage(analysisSnapshot.states.ranking, '暂无区域排行数据') }}</div>
          </DataCard>

          <DataCard title="能耗环比分析" class="compare-card module-card">
            <template #header-extra>
              <div class="module-header-extra">
                <span class="filter-chip area-chip" :title="areaRangeLabel">{{ areaTagLabel }}</span>
                <span class="filter-chip">{{ selectedDeviceType?.label || '--' }}</span>
                <span class="filter-chip time-chip" :title="timeRangeLabel">{{ timeRangeTagLabel }}</span>
                <span class="unit-label">单位: kWh</span>
              </div>
            </template>
            <div v-if="comparisonHasData" class="comparison-content">
              <div class="comparison-summary">
                <span :title="currentPeriodLabel">当前周期 <strong>{{ formatEnergy(comparison.currentPeriod.energy) }}</strong> kWh</span>
                <span :title="previousPeriodLabel">对比周期 <strong>{{ formatEnergy(comparison.previousPeriod.energy) }}</strong> kWh</span>
                <span>环比 <strong :class="comparisonStatusClass">{{ comparisonRateText }}</strong></span>
              </div>
              <div ref="compareChart" class="compare-chart"></div>
              <div v-if="currentPeriodIncludesToday" class="comparison-data-note">当前周期数据统计截至当前时间</div>
            </div>
            <div v-else class="empty-state">{{ stateMessage(analysisSnapshot.states.comparison, '暂无可比数据') }}</div>
          </DataCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import DataCard from '../components/DataCard.vue'
import EnergyAreaTreeNode from '../components/energy/EnergyAreaTreeNode.vue'
import monthEnergyBackgroundIcon from '../assets/images/nenghao/本月能耗背景icon.svg'
import yearEnergyBackgroundIcon from '../assets/images/nenghao/本年能耗背景icon.svg'
import savingRateBackgroundIcon from '../assets/images/nenghao/节约率背景icon.svg'
import goalCompletionBackgroundIcon from '../assets/images/nenghao/目标完成度背景icon.svg'
import { ENABLED_PROJECT_DEVICE_TYPES } from '../config/projectCapabilities'
import {
  addDays,
  createEmptyEnergyAnalysisSnapshot,
  formatDate,
  loadEnergyAnalysisSnapshot,
  parseDate,
  subtractCalendarMonths
} from '../services/energyAnalysisService'
import { loadEnergyLocationHierarchy } from '../services/locationHierarchyApi.js'

const ENERGY_ANALYSIS_COLORS = {
  trend: '#55d8ff',
  trendFade: 'rgba(85, 216, 255, 0)',
  rank: '#55d8ff',
  rankAccent: '#4d9fff',
  comparisonCurrent: '#55d8ff',
  comparisonPrevious: '#5ee79a',
  progress: '#55d8ff',
  progressAccent: '#4d9fff',
  axis: '#8fa8c1',
  axisLine: 'rgba(105, 176, 235, 0.24)',
  splitLine: 'rgba(105, 176, 235, 0.10)',
  tooltipBg: 'rgba(7, 24, 42, 0.96)',
  tooltipBorder: 'rgba(85, 216, 255, 0.34)',
  tooltipText: '#e7f2ff'
}

const timePresets = [
  { label: '当日', value: 'today', months: 0 },
  { label: '近1个月', value: 'month-1', months: 1 },
  { label: '近3个月', value: 'month-3', months: 3 },
  { label: '近6个月', value: 'month-6', months: 6 },
  { label: '近1年', value: 'year-1', months: 12 }
]

const today = parseDate(new Date())
const todayValue = formatDate(today)
const selectedPreset = ref('month-1')
const customStartDate = ref(formatDate(addDays(subtractCalendarMonths(today, 1), 1)))
const customEndDate = ref(todayValue)
const appliedCustomRange = ref({ startDate: parseDate(customStartDate.value), endDate: today })
const dateValidationError = ref('')
const deviceTypes = ENABLED_PROJECT_DEVICE_TYPES
const selectedType = ref(deviceTypes[0]?.value || '')
const areaTree = ref([])
const areaMapConfig = {}
const selectedArea = ref(normalizeSelectedArea(null))
const expandedTreeIds = ref(new Set())
const hierarchyLoading = ref(true)
const hierarchyError = ref('')
let analysisRequestId = 0
let analysisAbortController = null

const trendChart = ref(null)
const compareChart = ref(null)
let trendChartInstance = null
let compareChartInstance = null
let chartResizeObserver = null

const selectedDeviceType = computed(() => deviceTypes.find((type) => type.value === selectedType.value) || deviceTypes[0])
const selectedTimePreset = computed(() => timePresets.find((preset) => preset.value === selectedPreset.value))
const dateRange = computed(() => {
  if (selectedPreset.value === 'custom') return appliedCustomRange.value
  const preset = selectedTimePreset.value || timePresets[0]
  if (preset.value === 'today') return { startDate: today, endDate: today }
  return {
    startDate: addDays(subtractCalendarMonths(today, preset.months), 1),
    endDate: today
  }
})
const timeRangeLabel = computed(() => {
  if (selectedPreset.value !== 'custom') return selectedTimePreset.value?.label || '当日'
  return `${formatDate(dateRange.value.startDate)} 至 ${formatDate(dateRange.value.endDate)}`
})
const timeRangeTagLabel = computed(() => {
  if (selectedPreset.value !== 'custom') return timeRangeLabel.value
  const start = formatDate(dateRange.value.startDate).replaceAll('-', '/')
  const end = formatDate(dateRange.value.endDate).replaceAll('-', '/')
  return start.slice(0, 4) === end.slice(0, 4)
    ? `${start}~${end.slice(5)}`
    : `${start}~${end}`
})
const areaRangeLabel = computed(() => (
  selectedArea.value.locationId
    ? `${selectedArea.value.label}（${selectedArea.value.levelLabel}）`
    : '未选择统计范围'
))
const areaTagLabel = computed(() => selectedArea.value.label)
const currentPeriodIncludesToday = computed(() => (
  formatDate(dateRange.value.startDate) <= todayValue && formatDate(dateRange.value.endDate) >= todayValue
))
const analysisSnapshot = ref(createEmptyEnergyAnalysisSnapshot({
  startDate: dateRange.value.startDate,
  endDate: dateRange.value.endDate
}))
const comparison = computed(() => analysisSnapshot.value.comparison)
const comparisonHasData = computed(() => (
  comparison.value.series.some((item) => (
    Number.isFinite(item.currentValue) || Number.isFinite(item.previousValue)
  ))
))
const currentPeriodLabel = computed(() => formatPeriod(comparison.value.currentPeriod))
const previousPeriodLabel = computed(() => formatPeriod(comparison.value.previousPeriod))
const trendGranularityLabel = computed(() => ({ hour: '按小时', day: '按日', week: '按周', month: '按月' }[analysisSnapshot.value.trendGranularity] || ''))
const comparisonStatusClass = computed(() => `status-${comparison.value.status}`)
const comparisonRateText = computed(() => (
  comparison.value.comparable && Number.isFinite(comparison.value.changeRate)
    ? `${comparison.value.changeRate > 0 ? '+' : ''}${comparison.value.changeRate.toFixed(2)}%`
    : '--'
))

const rankBarStyle = (percent) => ({
  width: `${percent}%`,
  background: `linear-gradient(90deg, ${ENERGY_ANALYSIS_COLORS.rankAccent}, ${ENERGY_ANALYSIS_COLORS.rank})`
})
const kpiProgressFillStyle = (percent) => ({
  width: `${Math.min(100, Math.max(0, Number(percent) || 0))}%`,
  background: `linear-gradient(90deg, ${ENERGY_ANALYSIS_COLORS.progressAccent}, ${ENERGY_ANALYSIS_COLORS.progress})`
})
const kpiGoalValueStyle = { color: ENERGY_ANALYSIS_COLORS.progress }
const summaryHint = computed(() => stateMessage(analysisSnapshot.value.states.summary, '当前所选范围'))
const trendTimeLabel = computed(() => analysisSnapshot.value.trendSourceLabel || timeRangeTagLabel.value)
const rankingTimeLabel = computed(() => analysisSnapshot.value.rankingSourceLabel || timeRangeTagLabel.value)
const targetHint = computed(() => {
  const target = analysisSnapshot.value.summary.targetValue
  const yearSaved = analysisSnapshot.value.summary.yearSavedKWh
  if (Number.isFinite(target) && Number.isFinite(yearSaved)) {
    return `年度节约 ${formatMetric(yearSaved)} / 目标 ${formatMetric(target)} kWh`
  }
  if (Number.isFinite(target)) {
    return stateMessage(analysisSnapshot.value.states.target, `年度目标 ${formatMetric(target)} kWh`)
  }
  return stateMessage(analysisSnapshot.value.states.target, '目标值暂无数据')
})

function applyCustomRange() {
  selectedPreset.value = 'custom'
  if (!customStartDate.value || !customEndDate.value) {
    dateValidationError.value = '请选择完整的开始日期和结束日期'
    return
  }
  const startDate = parseDate(customStartDate.value)
  const endDate = parseDate(customEndDate.value)
  if (startDate > endDate) {
    dateValidationError.value = '开始日期不能晚于结束日期'
    return
  }
  if (endDate > today) {
    dateValidationError.value = '结束日期不能晚于今天'
    return
  }
  dateValidationError.value = ''
  appliedCustomRange.value = { startDate, endDate }
}

function selectArea(node) {
  selectedArea.value = normalizeSelectedArea(node)
}

async function initializeHierarchy() {
  hierarchyLoading.value = true
  hierarchyError.value = ''
  try {
    const hierarchy = await loadEnergyLocationHierarchy()
    areaTree.value = hierarchy.tree
    expandedTreeIds.value = new Set(collectExpandableIds(hierarchy.tree))
    selectedArea.value = normalizeSelectedArea(hierarchy.root)
  } catch (error) {
    hierarchyError.value = error?.message || '物理层级加载失败'
  } finally {
    hierarchyLoading.value = false
  }
}

async function refreshAnalysis() {
  if (!selectedArea.value.locationId || dateValidationError.value) return
  const requestId = ++analysisRequestId
  analysisAbortController?.abort()
  analysisAbortController = new AbortController()
  analysisSnapshot.value = createEmptyEnergyAnalysisSnapshot({
    startDate: dateRange.value.startDate,
    endDate: dateRange.value.endDate
  })

  try {
    const snapshot = await loadEnergyAnalysisSnapshot({
      locationId: selectedArea.value.locationId,
      locationLevel: selectedArea.value.level,
      deviceType: selectedType.value,
      childLocations: selectedArea.value.childLocations,
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate,
      preset: selectedPreset.value
    }, { signal: analysisAbortController.signal })
    if (requestId === analysisRequestId) analysisSnapshot.value = snapshot
  } catch (error) {
    if (requestId !== analysisRequestId || error?.name === 'AbortError') return
    const message = error?.message || '能耗分析数据加载失败'
    const failed = createEmptyEnergyAnalysisSnapshot({
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate
    })
    Object.keys(failed.states).forEach((key) => {
      failed.states[key] = { status: 'error', message }
    })
    analysisSnapshot.value = failed
  }
}

function toggleTreeNode(nodeId) {
  const next = new Set(expandedTreeIds.value)
  if (next.has(nodeId)) next.delete(nodeId)
  else next.add(nodeId)
  expandedTreeIds.value = next
}

function normalizeSelectedArea(node) {
  const level = node?.level || ''
  return {
    id: node?.id || '',
    label: node?.label || '请选择范围',
    level,
    levelLabel: ({ company: '公司', site: '站点', building: '建筑', storey: '楼层', area: '区域' })[level] || '物理位置',
    locationId: node?.locationId || '',
    childLocations: Array.isArray(node?.children)
      ? node.children.map((child) => ({
        id: child.id,
        label: child.label,
        locationId: child.locationId
      }))
      : []
  }
}

function collectExpandableIds(nodes) {
  return nodes.flatMap((node) => node.children?.length
    ? [node.id, ...collectExpandableIds(node.children)]
    : [])
}

function formatPeriod(period) {
  return `${formatDate(period.startDate)} 至 ${formatDate(period.endDate)}`
}

function formatEnergy(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 3 }).format(value)
    : '--'
}

function formatMetric(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 3 }).format(value)
    : '--'
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${Number(value).toFixed(1)}%` : '--'
}

function stateMessage(state, fallback) {
  if (state?.status === 'loading') return state.message || '数据加载中...'
  return state?.message || fallback
}

function initTrendChart() {
  if (!window.echarts || !trendChart.value) return
  trendChartInstance = window.echarts.init(trendChart.value)
  updateTrendChart()
}

function initCompareChart() {
  if (!window.echarts || !compareChart.value) return
  compareChartInstance = window.echarts.init(compareChart.value)
  updateCompareChart()
}

function updateTrendChart() {
  if (!trendChartInstance) return
  const trend = analysisSnapshot.value.trend
  trendChartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: ENERGY_ANALYSIS_COLORS.tooltipBg,
      borderColor: ENERGY_ANALYSIS_COLORS.tooltipBorder,
      textStyle: { color: ENERGY_ANALYSIS_COLORS.tooltipText },
      valueFormatter: (value) => `${Number(value).toLocaleString('zh-CN')} kWh`
    },
    grid: { left: '3%', right: '3%', bottom: '4%', top: '9%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map((item) => item.label),
      axisLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.axisLine } },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 11, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
      nameTextStyle: { color: ENERGY_ANALYSIS_COLORS.axis },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.splitLine } },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 11 }
    },
    series: [{
      name: '能耗',
      type: 'line',
      smooth: trend.length <= 31,
      data: trend.map((item) => item.value),
      itemStyle: { color: ENERGY_ANALYSIS_COLORS.trend },
      lineStyle: { width: 2.4, color: ENERGY_ANALYSIS_COLORS.trend },
      symbol: trend.length > 60 ? 'none' : 'circle',
      symbolSize: 6,
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(85, 216, 255, 0.30)' },
            { offset: 1, color: ENERGY_ANALYSIS_COLORS.trendFade }
          ]
        }
      }
    }]
  }, true)
}

function updateCompareChart() {
  if (!compareChartInstance) return
  const series = comparison.value.series
  compareChartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: ENERGY_ANALYSIS_COLORS.tooltipBg,
      borderColor: ENERGY_ANALYSIS_COLORS.tooltipBorder,
      textStyle: { color: ENERGY_ANALYSIS_COLORS.tooltipText },
      formatter(params) {
        const point = series[params[0]?.dataIndex]
        if (!point) return ''
        const differenceText = Number.isFinite(point.difference)
          ? `${point.difference > 0 ? '+' : ''}${formatEnergy(point.difference)} kWh`
          : '--'
        const rateText = Number.isFinite(point.changeRate)
          ? `${point.changeRate > 0 ? '+' : ''}${point.changeRate.toFixed(2)}%`
          : '暂无可比数据'
        const cutoffText = currentPeriodIncludesToday.value ? '<br/>当前周期统计截至当前时间' : ''
        return [
          `<strong>${point.label}</strong>`,
          `<br/>当前周期 (${point.currentLabel}): ${formatEnergy(point.currentValue)} kWh`,
          `<br/>对比周期 (${point.previousLabel}): ${formatEnergy(point.previousValue)} kWh`,
          `<br/>差值: ${differenceText}`,
          `<br/>变化率: ${rateText}`,
          cutoffText
        ].join('')
      }
    },
    legend: {
      top: 0,
      right: 4,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 11 },
      data: ['当前周期', '对比周期']
    },
    grid: { left: '3%', right: '3%', bottom: '4%', top: 34, containLabel: true },
    xAxis: {
      type: 'category',
      data: series.map((item) => item.label),
      axisLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.axisLine } },
      axisTick: { alignWithLabel: true },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 10, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
      nameTextStyle: { color: ENERGY_ANALYSIS_COLORS.axis },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.splitLine } },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 10 }
    },
    series: [
      {
        name: '当前周期',
        type: 'bar',
        data: series.map((item) => item.currentValue),
        barMaxWidth: 26,
        itemStyle: { color: ENERGY_ANALYSIS_COLORS.comparisonCurrent, borderRadius: [2, 2, 0, 0] }
      },
      {
        name: '对比周期',
        type: 'bar',
        data: series.map((item) => item.previousValue),
        barMaxWidth: 26,
        itemStyle: { color: ENERGY_ANALYSIS_COLORS.comparisonPrevious, borderRadius: [2, 2, 0, 0] }
      }
    ]
  }, true)
}

function handleResize() {
  trendChartInstance?.resize()
  compareChartInstance?.resize()
}

function renderCharts() {
  if (analysisSnapshot.value.trend.length && trendChart.value) {
    if (!trendChartInstance) initTrendChart()
    else updateTrendChart()
  } else if (trendChartInstance) {
    trendChartInstance.dispose()
    trendChartInstance = null
  }

  if (comparisonHasData.value && compareChart.value) {
    if (!compareChartInstance) initCompareChart()
    else updateCompareChart()
  } else if (compareChartInstance) {
    compareChartInstance.dispose()
    compareChartInstance = null
  }
}

watch([
  () => selectedArea.value.locationId,
  selectedType,
  selectedPreset,
  () => formatDate(dateRange.value.startDate),
  () => formatDate(dateRange.value.endDate)
], refreshAnalysis)
watch(analysisSnapshot, () => nextTick(renderCharts), { deep: true })

onMounted(() => {
  initializeHierarchy()
  nextTick(() => {
    renderCharts()
    if (window.ResizeObserver) {
      chartResizeObserver = new ResizeObserver(() => requestAnimationFrame(handleResize))
      if (trendChart.value) chartResizeObserver.observe(trendChart.value)
      if (compareChart.value) chartResizeObserver.observe(compareChart.value)
    }
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  analysisAbortController?.abort()
  window.removeEventListener('resize', handleResize)
  chartResizeObserver?.disconnect()
  trendChartInstance?.dispose()
  compareChartInstance?.dispose()
})
</script>

<style scoped>
.energy-analysis-page { width: 100%; height: 100%; min-height: 0; padding: 20px; overflow: auto; }
.page-content { height: 100%; min-height: 600px; display: grid; grid-template-columns: 280px minmax(0, 1fr); align-items: stretch; gap: 16px; }
.filter-card { height: 100%; min-height: 0; }
.filter-card :deep(.card-body) { min-height: 0; padding: 14px; overflow: auto; }
.filter-section { margin-bottom: 16px; padding-bottom: 15px; border-bottom: 1px solid var(--border-subtle); }
.area-filter-section { min-height: 150px; display: flex; flex: 1; flex-direction: column; }
.filter-title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--text-strong); font-size: 14px; font-weight: 500; }
.filter-icon { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--info-soft); color: var(--accent-cyan); font-size: 12px; }
.preset-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.preset-btn, .type-btn { padding: 7px 10px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--control-bg); color: var(--text-tertiary); font-size: 12px; }
.preset-btn:hover, .type-btn:hover { background: var(--control-bg-hover); border-color: var(--border-default); color: var(--text-primary); }
.preset-btn.active, .type-btn.active { background: var(--info-soft); border-color: var(--border-active); color: var(--accent-cyan); }
.custom-range-title { margin: 12px 0 7px; color: var(--text-tertiary); font-size: 11px; }
.custom-range { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 6px; }
.custom-range label { min-width: 0; display: flex; flex-direction: column; gap: 5px; color: var(--text-muted); font-size: 10px; }
.custom-range input { width: 100%; min-width: 0; padding: 7px 5px; border: 1px solid var(--border-default); border-radius: 7px; background: var(--control-bg); color: var(--text-secondary); font-size: 11px; color-scheme: dark; }
.range-separator { padding-bottom: 8px; color: var(--text-muted); font-size: 10px; }
.filter-error { margin-top: 7px; color: var(--danger); font-size: 11px; }
.filter-state { margin: 4px 0 8px 28px; color: var(--text-tertiary); font-size: 11px; }
.device-types { display: flex; flex-wrap: wrap; gap: 8px; }
.type-btn { min-width: 68px; border-radius: 999px; }
.area-hint { margin: -3px 0 7px 28px; color: var(--text-muted); font-size: 10px; }
.area-tree { min-height: 0; flex: 1; overflow: auto; padding-right: 3px; }
.right-section { min-width: 0; min-height: 0; height: 100%; display: flex; flex-direction: column; gap: 16px; }
.kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; flex: 0 0 auto; }
.kpi-card { position: relative; overflow: hidden; background: linear-gradient(180deg, rgba(85, 216, 255, 0.07), var(--card-bg-strong)); border: 1px solid var(--border-default); border-radius: 12px; padding: 16px; box-shadow: inset 0 1px 0 var(--inner-highlight), var(--shadow-panel); }
.kpi-bg-icon { position: absolute; z-index: 0; top: 16px; right: 24px; width: 62px; height: 62px; background-color: #094463; opacity: 0.7; pointer-events: none; user-select: none; -webkit-mask: var(--kpi-icon-mask) center / contain no-repeat; mask: var(--kpi-icon-mask) center / contain no-repeat; }
.kpi-card > :not(.kpi-bg-icon) { position: relative; z-index: 1; }
.kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.kpi-label { color: var(--text-secondary); font-size: 13px; }
.kpi-value { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; color: var(--text-primary); font-family: var(--font-num); font-size: 28px; font-weight: 700; }
.kpi-trend { font-size: 12px; font-weight: 400; }
.kpi-trend.up { color: var(--danger); }
.kpi-trend.down { color: var(--success); }
.kpi-sub { color: var(--text-tertiary); font-size: 12px; font-weight: 400; }
.kpi-progress { height: 4px; overflow: hidden; border-radius: 999px; background: var(--offline-soft); }
.progress-bar, .progress-fill { height: 100%; border-radius: 999px; }
.progress-fill { box-shadow: 0 0 10px rgba(159, 216, 255, 0.18); }
.trend-card { min-height: 200px; flex: 1.08 1 0; }
.trend-card :deep(.card-body), .rank-card :deep(.card-body), .compare-card :deep(.card-body) { min-height: 0; padding-top: 12px; }
.module-card :deep(.card-header) { gap: 8px; }
.module-card :deep(.title-text) { flex: 0 0 auto; letter-spacing: 0; white-space: nowrap; }
.module-header-extra { min-width: 0; flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 6px; overflow: hidden; }
.filter-chip { min-width: 0; max-width: 82px; overflow: hidden; padding: 4px 8px; border: 1px solid rgba(85, 216, 255, 0.2); border-radius: 999px; background: var(--info-soft); color: var(--accent-cyan); font-size: 11px; line-height: 1; text-overflow: ellipsis; white-space: nowrap; }
.filter-chip.area-chip { max-width: 116px; }
.filter-chip.time-chip { max-width: 158px; }
.unit-label { flex: 0 0 auto; margin-left: 2px; color: var(--text-muted); font-size: 11px; white-space: nowrap; }
.chart-container { width: 100%; min-height: 0; flex: 1; }
.bottom-charts { min-height: 260px; display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); gap: 16px; flex: 1 1 0; }
.rank-card, .compare-card { min-width: 0; height: 100%; }
.rank-list { min-height: 0; display: flex; flex: 1; flex-direction: column; gap: 8px; overflow: auto; }
.rank-item { display: flex; align-items: center; gap: 8px; min-height: 18px; }
.rank-index { width: 21px; color: var(--text-muted); font-family: var(--font-num); font-size: 10px; }
.rank-index.highlight { color: var(--accent-gold); }
.rank-name { width: 86px; overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.rank-bar-wrapper { min-width: 42px; height: 7px; flex: 1; overflow: hidden; border-radius: 999px; background: var(--offline-soft); }
.rank-bar { height: 100%; border-radius: 999px; box-shadow: 0 0 10px rgba(105, 224, 255, 0.2); }
.rank-value { width: 62px; color: var(--accent-cyan); font-family: var(--font-num); font-size: 11px; text-align: right; }
.comparison-content { min-height: 0; display: flex; flex: 1; flex-direction: column; gap: 6px; }
.comparison-summary { min-height: 24px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px 16px; color: var(--text-tertiary); font-size: 10px; }
.comparison-summary strong { margin-left: 3px; color: var(--text-primary); font-family: var(--font-num); font-size: 12px; font-weight: 600; }
.compare-chart { width: 100%; min-height: 0; flex: 1; }
.comparison-data-note { color: var(--warning); font-size: 10px; text-align: right; }
.status-up { color: var(--danger) !important; }
.status-down { color: var(--success) !important; }
.status-flat { color: var(--accent-gold) !important; }
.status-unavailable { color: var(--text-muted) !important; }
.empty-state { min-height: 120px; display: flex; flex: 1; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px; }

@media (max-width: 1180px) {
  .page-content { min-height: 654px; grid-template-columns: 250px minmax(0, 1fr); }
  .right-section { gap: 12px; }
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .kpi-value { font-size: 24px; }
  .trend-card { min-height: 165px; }
  .bottom-charts { min-height: 235px; gap: 12px; }
}

@media (max-width: 1400px) {
  .rank-card .module-header-extra { gap: 4px; }
  .rank-card .filter-chip { padding-right: 6px; padding-left: 6px; font-size: 10px; }
  .rank-card .unit-label { display: none; }
}
</style>

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
          <div class="area-hint">可选择整栋建筑或楼层</div>
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

        <div class="active-filter-summary">
          <span>当前分析范围</span>
          <strong>{{ filterSummary }}</strong>
        </div>
      </DataCard>

      <div class="right-section">
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">本月能耗(kWh)</span><span class="kpi-icon">月</span></div>
            <div class="kpi-value">45,280<span class="kpi-trend up">↑1.2%</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(65)"></div></div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">本年能耗(kWh)</span><span class="kpi-icon">年</span></div>
            <div class="kpi-value">520,150<span class="kpi-trend down">↓1.2%</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(78)"></div></div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">节约率(%)</span><span class="kpi-icon green">率</span></div>
            <div class="kpi-value">15.8%<span class="kpi-sub">同比上季度</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(15.8)"></div></div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">节能目标完成度</span><span class="kpi-icon green">标</span></div>
            <div class="kpi-value"><span :style="kpiGoalValueStyle">82%</span><span class="kpi-sub">目标: 630,000</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(82)"></div></div></div>
          </div>
        </div>

        <DataCard title="能耗趋势曲线" class="trend-card">
          <template #header-extra><span class="unit-label">单位: kWh</span></template>
          <div class="module-context">
            <span>{{ filterSummary }}</span>
            <span class="context-tag">{{ trendGranularityLabel }}</span>
          </div>
          <div v-if="analysisSnapshot.trend.length" ref="trendChart" class="chart-container"></div>
          <div v-else class="empty-state">暂无能耗趋势数据</div>
        </DataCard>

        <div class="bottom-charts">
          <DataCard title="TOP10能耗排行榜" class="rank-card">
            <template #header-extra><span class="unit-label">单位: kWh</span></template>
            <div class="module-context"><span>{{ filterSummary }}</span></div>
            <div v-if="analysisSnapshot.ranking.length" class="rank-list">
              <div v-for="(item, index) in analysisSnapshot.ranking" :key="item.name" class="rank-item">
                <span class="rank-index" :class="{ highlight: index < 3 }">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="rank-name">{{ item.name }}</span>
                <div class="rank-bar-wrapper"><div class="rank-bar" :style="rankBarStyle(item.percent)"></div></div>
                <span class="rank-value">{{ formatEnergy(item.value) }}</span>
              </div>
            </div>
            <div v-else class="empty-state">暂无排行数据</div>
          </DataCard>

          <DataCard title="能耗环比分析" class="compare-card">
            <div class="module-context">
              <span>{{ comparisonSummary }}</span>
              <span v-if="currentPeriodIncludesToday" class="context-note">数据统计截至当前时间</span>
            </div>
            <div v-if="comparisonHasData" class="comparison-content">
              <div class="period-row">
                <div class="period-item">
                  <span>当前统计周期</span>
                  <strong>{{ currentPeriodLabel }}</strong>
                </div>
                <div class="period-item">
                  <span>对比统计周期</span>
                  <strong>{{ previousPeriodLabel }}</strong>
                </div>
              </div>
              <div class="comparison-metrics">
                <div class="metric-item">
                  <span>当前周期能耗</span>
                  <strong>{{ formatEnergy(comparison.currentPeriod.energy) }} <small>kWh</small></strong>
                </div>
                <div class="metric-item">
                  <span>上一周期能耗</span>
                  <strong>{{ formatEnergy(comparison.previousPeriod.energy) }} <small>kWh</small></strong>
                </div>
                <div class="metric-item">
                  <span>环比变化值</span>
                  <strong :class="comparisonStatusClass">{{ formatSignedEnergy(comparison.changeValue) }} <small>kWh</small></strong>
                </div>
                <div class="metric-item">
                  <span>环比变化率</span>
                  <strong :class="comparisonStatusClass">{{ comparisonRateText }}</strong>
                </div>
              </div>
              <div class="comparison-footer">
                <span>变化状态</span>
                <strong :class="['status-pill', comparisonStatusClass]">{{ comparisonStatusText }}</strong>
              </div>
            </div>
            <div v-else class="empty-state">暂无可比数据</div>
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
import { ENABLED_PROJECT_DEVICE_TYPES } from '../config/projectCapabilities'
import {
  DEFAULT_DEVICE_VISUALIZATION_MAP_ID,
  DEVICE_VISUALIZATION_MAPS,
  DEVICE_VISUALIZATION_MAP_TREE
} from '../config/deviceVisualizationMaps'
import {
  addDays,
  createEnergyAnalysisSnapshot,
  formatDate,
  parseDate,
  subtractCalendarMonths
} from '../services/energyAnalysisService'

const ENERGY_ANALYSIS_COLORS = {
  trend: '#55d8ff',
  trendFade: 'rgba(85, 216, 255, 0)',
  rank: '#55d8ff',
  rankAccent: '#4d9fff',
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
const selectedPreset = ref('month-6')
const customStartDate = ref(formatDate(addDays(subtractCalendarMonths(today, 1), 1)))
const customEndDate = ref(todayValue)
const appliedCustomRange = ref({ startDate: parseDate(customStartDate.value), endDate: today })
const dateValidationError = ref('')
const deviceTypes = ENABLED_PROJECT_DEVICE_TYPES
const selectedType = ref(deviceTypes[0]?.value || '')
const areaTree = DEVICE_VISUALIZATION_MAP_TREE
const areaMapConfig = DEVICE_VISUALIZATION_MAPS
const initialAreaPath = findNodePath(areaTree, (node) => node.mapId === DEFAULT_DEVICE_VISUALIZATION_MAP_ID)
const initialAreaNode = initialAreaPath.at(-1) || areaTree[0]
const selectedArea = ref(normalizeSelectedArea(initialAreaNode))
const expandedTreeIds = ref(new Set(collectExpandableIds(areaTree)))

const trendChart = ref(null)
let trendChartInstance = null

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
const areaRangeLabel = computed(() => (
  selectedArea.value.level === 'building'
    ? `${selectedArea.value.label}（整栋建筑）`
    : selectedArea.value.label
))
const filterSummary = computed(() => `${areaRangeLabel.value} · ${selectedDeviceType.value?.label || '--'} · ${timeRangeLabel.value}`)
const comparisonSummary = computed(() => `${filterSummary.value} · 对比上一个等长周期`)
const currentPeriodIncludesToday = computed(() => (
  formatDate(dateRange.value.startDate) <= todayValue && formatDate(dateRange.value.endDate) >= todayValue
))
const analysisSnapshot = computed(() => createEnergyAnalysisSnapshot({
  areaId: selectedArea.value.id,
  areaLevel: selectedArea.value.level,
  deviceType: selectedType.value,
  startDate: dateRange.value.startDate,
  endDate: dateRange.value.endDate
}))
const comparison = computed(() => analysisSnapshot.value.comparison)
const comparisonHasData = computed(() => (
  Number.isFinite(comparison.value.currentPeriod.energy) && Number.isFinite(comparison.value.previousPeriod.energy)
))
const currentPeriodLabel = computed(() => formatPeriod(comparison.value.currentPeriod))
const previousPeriodLabel = computed(() => formatPeriod(comparison.value.previousPeriod))
const trendGranularityLabel = computed(() => ({ day: '按日', week: '按周', month: '按月' }[analysisSnapshot.value.granularity]))
const comparisonStatusClass = computed(() => `status-${comparison.value.status}`)
const comparisonStatusText = computed(() => ({
  up: '上升',
  down: '下降',
  flat: '基本持平',
  unavailable: '暂无可比数据'
}[comparison.value.status]))
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
  width: `${percent}%`,
  background: `linear-gradient(90deg, ${ENERGY_ANALYSIS_COLORS.progressAccent}, ${ENERGY_ANALYSIS_COLORS.progress})`
})
const kpiGoalValueStyle = { color: ENERGY_ANALYSIS_COLORS.progress }

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

function toggleTreeNode(nodeId) {
  const next = new Set(expandedTreeIds.value)
  if (next.has(nodeId)) next.delete(nodeId)
  else next.add(nodeId)
  expandedTreeIds.value = next
}

function normalizeSelectedArea(node) {
  return {
    id: node?.id || 'unknown-area',
    label: node?.label || '未知区域',
    level: node?.mapId ? 'floor' : 'building',
    mapId: node?.mapId || ''
  }
}

function collectExpandableIds(nodes) {
  return nodes.flatMap((node) => node.children?.length
    ? [node.id, ...collectExpandableIds(node.children)]
    : [])
}

function findNodePath(nodes, predicate, parentPath = []) {
  for (const node of nodes) {
    const currentPath = [...parentPath, node]
    if (predicate(node)) return currentPath
    if (node.children?.length) {
      const result = findNodePath(node.children, predicate, currentPath)
      if (result.length) return result
    }
  }
  return []
}

function formatPeriod(period) {
  return `${formatDate(period.startDate)} 至 ${formatDate(period.endDate)}`
}

function formatEnergy(value) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString('zh-CN') : '--'
}

function formatSignedEnergy(value) {
  if (!Number.isFinite(value)) return '--'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${Math.round(value).toLocaleString('zh-CN')}`
}

function initTrendChart() {
  if (!window.echarts || !trendChart.value) return
  trendChartInstance = window.echarts.init(trendChart.value)
  updateTrendChart()
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

function handleResize() {
  trendChartInstance?.resize()
}

watch(analysisSnapshot, () => nextTick(updateTrendChart))

onMounted(() => {
  nextTick(initTrendChart)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
})
</script>

<style scoped>
.energy-analysis-page { width: 100%; height: 100%; padding: 20px; overflow: auto; }
.page-content { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px; min-height: 820px; }
.filter-card { height: 100%; }
.filter-card :deep(.card-body) { padding: 14px; overflow: auto; }
.filter-section { margin-bottom: 16px; padding-bottom: 15px; border-bottom: 1px solid var(--border-subtle); }
.area-filter-section { min-height: 0; }
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
.device-types { display: flex; flex-wrap: wrap; gap: 8px; }
.type-btn { min-width: 68px; border-radius: 999px; }
.area-hint { margin: -3px 0 7px 28px; color: var(--text-muted); font-size: 10px; }
.area-tree { max-height: 315px; overflow: auto; padding-right: 3px; }
.active-filter-summary { padding: 11px; border: 1px solid var(--border-default); border-radius: 10px; background: linear-gradient(135deg, var(--info-soft), rgba(77, 159, 255, 0.04)); }
.active-filter-summary span { display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 10px; }
.active-filter-summary strong { display: block; color: var(--text-strong); font-size: 12px; font-weight: 500; line-height: 1.55; }
.right-section { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; flex: 0 0 auto; }
.kpi-card { background: linear-gradient(180deg, rgba(85, 216, 255, 0.07), var(--card-bg-strong)); border: 1px solid var(--border-default); border-radius: 12px; padding: 16px; box-shadow: inset 0 1px 0 var(--inner-highlight), var(--shadow-panel); }
.kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.kpi-label { color: var(--text-secondary); font-size: 13px; }
.kpi-icon { min-width: 28px; height: 20px; padding: 0 7px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(85, 216, 255, 0.2); border-radius: 999px; background: var(--info-soft); color: var(--accent-cyan); font-size: 10px; }
.kpi-icon.green { border-color: var(--success-border); background: var(--success-soft); color: var(--success); }
.kpi-value { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; color: var(--text-primary); font-family: var(--font-num); font-size: 28px; font-weight: 700; }
.kpi-trend { font-size: 12px; font-weight: 400; }
.kpi-trend.up { color: var(--danger); }
.kpi-trend.down { color: var(--success); }
.kpi-sub { color: var(--text-tertiary); font-size: 12px; font-weight: 400; }
.kpi-progress { height: 4px; overflow: hidden; border-radius: 999px; background: var(--offline-soft); }
.progress-bar, .progress-fill { height: 100%; border-radius: 999px; }
.progress-fill { box-shadow: 0 0 10px rgba(159, 216, 255, 0.18); }
.trend-card { flex: 0 0 294px; min-height: 0; }
.trend-card :deep(.card-body), .rank-card :deep(.card-body), .compare-card :deep(.card-body) { padding-top: 12px; }
.module-context { min-height: 29px; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 7px; color: var(--text-tertiary); font-size: 11px; line-height: 1.45; }
.module-context > span:first-child { flex: 1; }
.context-tag, .context-note { flex: 0 0 auto; padding: 3px 7px; border-radius: 999px; background: var(--info-soft); color: var(--accent-cyan); white-space: nowrap; }
.context-note { background: var(--warning-soft); color: var(--warning); }
.unit-label { color: var(--text-muted); font-size: 11px; }
.chart-container { width: 100%; min-height: 200px; flex: 1; }
.bottom-charts { display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); gap: 16px; min-height: 330px; flex: 1; }
.rank-card, .compare-card { min-width: 0; height: 100%; }
.rank-list { display: flex; flex-direction: column; gap: 8px; overflow: auto; }
.rank-item { display: flex; align-items: center; gap: 8px; min-height: 18px; }
.rank-index { width: 21px; color: var(--text-muted); font-family: var(--font-num); font-size: 10px; }
.rank-index.highlight { color: var(--accent-gold); }
.rank-name { width: 86px; overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.rank-bar-wrapper { min-width: 42px; height: 7px; flex: 1; overflow: hidden; border-radius: 999px; background: var(--offline-soft); }
.rank-bar { height: 100%; border-radius: 999px; box-shadow: 0 0 10px rgba(105, 224, 255, 0.2); }
.rank-value { width: 62px; color: var(--accent-cyan); font-family: var(--font-num); font-size: 11px; text-align: right; }
.comparison-content { min-height: 0; display: flex; flex: 1; flex-direction: column; gap: 10px; }
.period-row { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.period-item { padding: 9px 10px; border: 1px solid var(--border-subtle); border-radius: 9px; background: rgba(255, 255, 255, 0.025); }
.period-item span, .metric-item span { display: block; margin-bottom: 4px; color: var(--text-muted); font-size: 10px; }
.period-item strong { color: var(--text-secondary); font-size: 11px; font-weight: 500; }
.comparison-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
.metric-item { padding: 9px 10px; border-radius: 9px; background: rgba(85, 216, 255, 0.045); }
.metric-item strong { color: var(--text-primary); font-family: var(--font-num); font-size: 16px; }
.metric-item small { color: var(--text-muted); font-size: 9px; font-weight: 400; }
.comparison-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 2px; color: var(--text-tertiary); font-size: 11px; }
.status-pill { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 500; }
.status-up { color: var(--danger) !important; }
.status-down { color: var(--success) !important; }
.status-flat { color: var(--accent-gold) !important; }
.status-unavailable { color: var(--text-muted) !important; }
.status-pill.status-up { background: var(--danger-soft); }
.status-pill.status-down { background: var(--success-soft); }
.status-pill.status-flat { background: var(--warning-soft); }
.status-pill.status-unavailable { background: var(--offline-soft); }
.empty-state { min-height: 120px; display: flex; flex: 1; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px; }

@media (max-width: 1180px) {
  .page-content { grid-template-columns: 250px minmax(0, 1fr); }
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .kpi-value { font-size: 24px; }
  .trend-card { flex-basis: 270px; }
}
</style>

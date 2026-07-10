<template>
  <div class="energy-analysis-page">
    <div class="page-content">
      <DataCard class="filter-card">
        <div class="filter-section">
          <div class="filter-title"><span class="filter-icon">时</span>时间筛选</div>
          <div class="datetime-picker">
            <input type="text" v-model="filterDate" class="date-input" readonly />
            <span class="calendar-icon">日</span>
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-title"><span class="filter-icon">设</span>设备类型</div>
          <div class="device-types">
            <button
              v-for="type in deviceTypes"
              :key="type.value"
              :class="['type-btn', { active: selectedType === type.value }]"
              @click="selectedType = type.value"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-title"><span class="filter-icon">区</span>区域导航</div>
          <div class="area-tree">
            <div class="tree-item expanded">
              <div class="tree-node"><span class="arrow">&gt;</span><span>园区</span></div>
              <div class="tree-children">
                <div class="tree-item expanded">
                  <div class="tree-node"><span class="arrow">&gt;</span><span>建筑单体</span></div>
                </div>
                <div class="tree-item">
                  <div class="tree-node"><span class="arrow">&gt;</span><span>建筑单体</span></div>
                </div>
                <div class="tree-item expanded">
                  <div class="tree-node"><span class="arrow">&gt;</span><span>楼层</span></div>
                  <div class="tree-children">
                    <div class="tree-item active"><div class="tree-node"><span>区域1</span></div></div>
                    <div class="tree-item"><div class="tree-node"><span>区域2</span></div></div>
                    <div class="tree-item"><div class="tree-node"><span>区域3</span></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
            <div class="kpi-header"><span class="kpi-label">节约率(%)</span><span class="kpi-icon">率</span></div>
            <div class="kpi-value">15.8%<span class="kpi-sub">同比上季度</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(15.8)"></div></div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">节能目标完成度</span><span class="kpi-icon">标</span></div>
            <div class="kpi-value"><span :style="kpiGoalValueStyle">82%</span><span class="kpi-sub">目标: 630,000</span></div>
            <div class="kpi-progress"><div class="progress-bar"><div class="progress-fill" :style="kpiProgressFillStyle(82)"></div></div></div>
          </div>
        </div>

        <DataCard title="能耗趋势曲线(时间)" class="trend-card">
          <div ref="trendChart" class="chart-container"></div>
        </DataCard>

        <div class="bottom-charts">
          <DataCard title="Top 10能效排行榜" class="rank-card">
            <template #header-extra><span class="unit-label">单位: kWh</span></template>
            <div class="rank-list">
              <div v-for="(item, index) in rankList" :key="index" class="rank-item">
                <span class="rank-name">{{ item.name }}</span>
                <div class="rank-bar-wrapper"><div class="rank-bar" :style="rankBarStyle(item.percent)"></div></div>
                <span class="rank-value">{{ item.value.toLocaleString() }}</span>
              </div>
            </div>
          </DataCard>

          <DataCard title="能耗环比分析" class="compare-card">
            <div ref="compareChart" class="chart-container"></div>
          </DataCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DataCard from '../components/DataCard.vue'

const ENERGY_ANALYSIS_COLORS = {
  trend: '#55d8ff',
  trendFade: 'rgba(85, 216, 255, 0)',
  rank: '#55d8ff',
  rankAccent: '#4d9fff',
  compare: '#5ee79a',
  compareAccent: '#45dfcf',
  compareBase: 'rgba(113, 140, 166, 0.46)',
  progress: '#55d8ff',
  progressAccent: '#4d9fff',
  axis: '#8fa8c1',
  axisLine: 'rgba(105, 176, 235, 0.24)',
  splitLine: 'rgba(105, 176, 235, 0.10)',
  tooltipBg: 'rgba(7, 24, 42, 0.96)',
  tooltipBorder: 'rgba(85, 216, 255, 0.34)',
  tooltipText: '#e7f2ff',
  control: '#55d8ff',
  positive: '#5ee79a',
  negative: '#ff6678'
}

const filterDate = ref('2026-02-28 16:00:00')
const selectedType = ref('CU')
const deviceTypes = [
  { label: 'CU', value: 'CU' },
  { label: 'SCU', value: 'SCU' },
  { label: 'OCSR', value: 'OCSR' }
]
const rankList = [
  { name: '酿造一车间', value: 12450, percent: 100 },
  { name: '包装中心', value: 10200, percent: 82 },
  { name: '仓储区', value: 8900, percent: 71 },
  { name: '办公大楼', value: 5400, percent: 43 },
  { name: '物流中心', value: 4100, percent: 33 }
]

const trendChart = ref(null)
const compareChart = ref(null)
let trendChartInstance = null
let compareChartInstance = null

const rankBarStyle = (percent) => ({
  width: `${percent}%`,
  background: `linear-gradient(90deg, ${ENERGY_ANALYSIS_COLORS.rankAccent}, ${ENERGY_ANALYSIS_COLORS.rank})`
})

const kpiProgressFillStyle = (percent) => ({
  width: `${percent}%`,
  background: `linear-gradient(90deg, ${ENERGY_ANALYSIS_COLORS.progressAccent}, ${ENERGY_ANALYSIS_COLORS.progress})`
})

const kpiGoalValueStyle = {
  color: ENERGY_ANALYSIS_COLORS.progress
}

const initCharts = () => {
  if (!window.echarts) return

  trendChartInstance = window.echarts.init(trendChart.value)
  trendChartInstance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: ENERGY_ANALYSIS_COLORS.tooltipBg, borderColor: ENERGY_ANALYSIS_COLORS.tooltipBorder, textStyle: { color: ENERGY_ANALYSIS_COLORS.tooltipText } },
    grid: { left: '3%', right: '4%', bottom: '2%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['2/4', '2/5', '2/6', '2/7', '2/8', '2/9', '2/10', '2/11', '2/12', '2/13', '2/14', '2/15', '2/16', '2/17', '2/18'],
      axisLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.axisLine } },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.splitLine } },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 11 }
    },
    series: [
      {
        type: 'line',
        data: [3200, 3400, 3100, 3300, 3600, 3500, 3400, 3300, 3500, 3600, 3400, 3300, 3500, 3400, 3200],
        itemStyle: { color: ENERGY_ANALYSIS_COLORS.trend },
        lineStyle: { width: 2.4, color: ENERGY_ANALYSIS_COLORS.trend },
        symbol: 'circle',
        symbolSize: 6,
        emphasis: {
          itemStyle: {
            color: ENERGY_ANALYSIS_COLORS.trend,
            borderColor: '#f4f8ff',
            borderWidth: 2
          }
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(85, 216, 255, 0.30)' },
              { offset: 1, color: ENERGY_ANALYSIS_COLORS.trendFade }
            ]
          }
        }
      }
    ]
  })

  compareChartInstance = window.echarts.init(compareChart.value)
  compareChartInstance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: ENERGY_ANALYSIS_COLORS.tooltipBg, borderColor: ENERGY_ANALYSIS_COLORS.tooltipBorder, textStyle: { color: ENERGY_ANALYSIS_COLORS.tooltipText } },
    grid: { left: '3%', right: '4%', bottom: '2%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12'],
      axisLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.axisLine } },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: ENERGY_ANALYSIS_COLORS.splitLine } },
      axisLabel: { color: ENERGY_ANALYSIS_COLORS.axis, fontSize: 10 }
    },
    series: [
      {
        type: 'bar',
        data: [85, 92, 78, 95, 88, 76, 82, 90, 87, 93, 89, 91],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: ENERGY_ANALYSIS_COLORS.compareAccent },
              { offset: 1, color: ENERGY_ANALYSIS_COLORS.compare }
            ]
          },
          borderRadius: [6, 6, 0, 0]
        },
        barWidth: '40%'
      },
      {
        type: 'bar',
        data: [80, 88, 75, 90, 85, 72, 78, 86, 83, 89, 85, 87],
        itemStyle: {
          color: ENERGY_ANALYSIS_COLORS.compareBase,
          borderRadius: [6, 6, 0, 0]
        },
        barWidth: '40%'
      }
    ]
  })
}

const handleResize = () => {
  trendChartInstance?.resize()
  compareChartInstance?.resize()
}

onMounted(() => {
  setTimeout(initCharts, 100)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  compareChartInstance?.dispose()
})
</script>

<style scoped>
.energy-analysis-page { width: 100%; height: 100%; padding: 20px; }
.page-content { display: grid; grid-template-columns: 240px 1fr; gap: 16px; height: 100%; }
.filter-card { height: 100%; }
.filter-section { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.filter-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: rgba(243, 249, 255, 0.82); margin-bottom: 12px; }
.filter-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(120, 232, 255, 0.12);
  color: #78E8FF;
  font-size: 12px;
}
.datetime-picker { position: relative; }
.date-input {
  width: 100%;
  padding: 10px 36px 10px 12px;
  background: rgba(20, 39, 59, 0.62);
  border: 1px solid rgba(120, 232, 255, 0.22);
  border-radius: 10px;
  color: rgba(243, 249, 255, 0.82);
  font-size: 13px;
}
.calendar-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #78E8FF;
}
.device-types { display: flex; gap: 8px; }
.type-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(186, 214, 235, 0.14);
  border-radius: 999px;
  color: rgba(234, 243, 252, 0.68);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.type-btn:hover { border-color: rgba(120, 232, 255, 0.34); color: rgba(243, 249, 255, 0.92); }
.type-btn.active {
  background: rgba(120, 232, 255, 0.16);
  border-color: rgba(120, 232, 255, 0.34);
  color: #78E8FF;
}
.area-tree { padding-left: 4px; }
.tree-item { margin: 4px 0; }
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
  color: rgba(234, 243, 252, 0.68);
  font-size: 13px;
}
.tree-node:hover { background: rgba(120, 232, 255, 0.1); }
.tree-item.active > .tree-node {
  background: rgba(120, 232, 255, 0.16);
  color: #78E8FF;
}
.arrow { font-size: 10px; color: rgba(234, 243, 252, 0.42); width: 12px; }
.tree-children { padding-left: 16px; }
.right-section { display: flex; flex-direction: column; gap: 16px; height: 100%; overflow: hidden; }
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; flex: 0 0 auto; }
.kpi-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(25, 45, 67, 0.74));
  border: 1px solid rgba(186, 214, 235, 0.18);
  border-radius: 12px;
  padding: 16px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.kpi-label { font-size: 13px; color: rgba(234, 243, 252, 0.68); }
.kpi-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(159, 216, 255, 0.14);
  color: #9FD8FF;
  font-size: 12px;
}
.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  font-family: var(--font-num);
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.kpi-trend { font-size: 12px; font-weight: 400; }
.kpi-trend.up { color: #FF7B8A; }
.kpi-trend.down { color: #8EE88B; }
.kpi-sub { font-size: 12px; color: rgba(234, 243, 252, 0.56); font-weight: 400; }
.kpi-progress { height: 4px; background: rgba(255, 255, 255, 0.12); border-radius: 999px; overflow: hidden; }
.progress-bar { height: 100%; border-radius: 999px; }
.progress-fill { height: 100%; border-radius: 999px; box-shadow: 0 0 10px rgba(159, 216, 255, 0.18); }
.trend-card { flex: 1; min-height: 0; }
.chart-container { width: 100%; height: 100%; min-height: 200px; }
.bottom-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; }
.rank-card, .compare-card { height: 100%; }
.unit-label { font-size: 12px; color: rgba(234, 243, 252, 0.42); }
.rank-list { display: flex; flex-direction: column; gap: 12px; }
.rank-item { display: flex; align-items: center; gap: 12px; }
.rank-name { width: 100px; font-size: 13px; color: rgba(234, 243, 252, 0.72); }
.rank-bar-wrapper {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  overflow: hidden;
}
.rank-bar { height: 100%; border-radius: 999px; box-shadow: 0 0 10px rgba(105, 224, 255, 0.2); }
.rank-value {
  width: 70px;
  text-align: right;
  font-size: 13px;
  color: #69E0FF;
  font-family: var(--font-num);
}

/* Unified deep-sea theme: color-only overrides. */
.filter-section { border-bottom-color: var(--border-subtle); }
.filter-title { color: var(--text-strong); }
.filter-icon { background: var(--info-soft); color: var(--accent-cyan); }
.date-input { background: var(--control-bg); border-color: var(--border-default); color: var(--text-secondary); }
.calendar-icon { color: var(--accent-cyan); }
.type-btn { background: var(--control-bg); border-color: var(--border-subtle); color: var(--text-tertiary); }
.type-btn:hover { background: var(--control-bg-hover); border-color: var(--border-default); color: var(--text-primary); }
.type-btn.active { background: var(--info-soft); border-color: var(--border-active); color: var(--accent-cyan); }
.tree-node { color: var(--text-secondary); }
.tree-node:hover { background: var(--info-soft); }
.tree-item.active > .tree-node { background: rgba(77, 159, 255, 0.15); color: var(--accent-cyan); }
.arrow, .unit-label { color: var(--text-muted); }
.kpi-card { background: linear-gradient(180deg, rgba(85, 216, 255, 0.07), var(--card-bg-strong)); border-color: var(--border-default); box-shadow: inset 0 1px 0 var(--inner-highlight), var(--shadow-panel); }
.kpi-label { color: var(--text-secondary); }
.kpi-icon { background: var(--info-soft); color: var(--accent-cyan); }
.kpi-value { color: var(--text-primary); }
.kpi-trend.up { color: var(--danger); }
.kpi-trend.down { color: var(--success); }
.kpi-sub { color: var(--text-tertiary); }
.kpi-progress, .rank-bar-wrapper { background: var(--offline-soft); }
.rank-name { color: var(--text-secondary); }
.rank-value { color: var(--accent-cyan); }
</style>

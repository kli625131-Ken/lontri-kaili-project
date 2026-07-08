<template>
  <div class="dashboard-page">
    <div class="background-image">
      <img src="../assets/images/park-bg.png" alt="茅台园区照明场景" />
    </div>

    <div class="dashboard-content">
      <div class="left-section">
        <DataCard title="设备概览" class="device-overview">
          <div class="overview-charts">
            <div class="chart-item">
              <div class="ring-chart active">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(89,227,255,0.18)" stroke-width="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#59E3FF" stroke-width="10" stroke-dasharray="251.2" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div class="chart-value">200</div>
              </div>
              <div class="chart-label"><span class="dot active"></span>在线数量</div>
            </div>

            <div class="chart-item">
              <div class="ring-chart inactive">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="10" stroke-dasharray="251.2" stroke-dashoffset="72" stroke-linecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div class="chart-value">56</div>
              </div>
              <div class="chart-label"><span class="dot inactive"></span>离线数量</div>
            </div>
          </div>
        </DataCard>

        <DataCard title="实时照明能耗及节约值" class="energy-chart-card">
          <div class="filter-buttons">
            <button
              v-for="item in filterOptions"
              :key="item.value"
              :class="['filter-btn', { active: selectedFilter === item.value }]"
              @click="changeFilter(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
          <div ref="energyChart" class="energy-chart"></div>
        </DataCard>
      </div>

      <div class="center-section">
        <div class="kpi-row">
          <KPICard
            v-for="item in kpiCards"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :unit="item.unit"
            :sub-value="item.subValue"
            :sub-icon="item.subIcon"
            :value-color="item.valueColor"
          />
        </div>
      </div>

      <div class="right-section">
        <DataCard title="近30天设备类型能耗与节能率趋势" class="trend-chart-card">
          <div ref="trendChart" class="trend-chart"></div>
        </DataCard>

        <DataCard title="室内环境监控" class="environment-card">
          <div class="aqi-section">
            <div class="aqi-label">综合空气质量指数 (AQI)</div>
            <div class="aqi-value">
              <span class="aqi-status">优良</span>
              <div class="aqi-bars">
                <div class="aqi-bar active"></div>
                <div class="aqi-bar active"></div>
                <div class="aqi-bar active"></div>
                <div class="aqi-bar"></div>
                <div class="aqi-bar"></div>
              </div>
            </div>
          </div>

          <div class="env-items">
            <div v-for="item in environmentMetrics" :key="item.name" class="env-item">
              <div class="env-icon-box">
                <span class="env-icon">{{ item.icon }}</span>
              </div>

              <div class="env-info">
                <div class="env-name">{{ item.name }}</div>
                <div class="env-value-row">
                  <div class="env-bar">
                    <div class="env-bar-fill" :style="{ width: `${item.progress}%` }"></div>
                  </div>
                  <span class="env-value">{{ item.value }}</span>
                  <span class="env-status">{{ item.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DataCard from '../components/DataCard.vue'
import KPICard from '../components/KPICard.vue'

const energyChart = ref(null)
const trendChart = ref(null)
let energyChartInstance = null
let trendChartInstance = null

const filterOptions = [
  { label: '当天', value: 'day' },
  { label: '当月', value: 'month' },
  { label: '当季度', value: 'quarter' }
]

const selectedFilter = ref('day')

const kpiCards = [
  {
    label: '累计节约电费',
    value: '45,200',
    unit: '¥',
    subValue: '节约1,500kWh',
    subIcon: '⚡',
    valueColor: '#FFC857'
  },
  {
    label: '照明节能率',
    value: '32.5',
    unit: '%',
    subValue: '+1.5%效率提升',
    subIcon: '↗',
    valueColor: '#35F6D4'
  },
  {
    label: '累计碳排放量',
    value: '38.2',
    unit: 't',
    subValue: '符合ESG标准',
    subIcon: '🌿',
    valueColor: '#59E3FF'
  }
]

const environmentMetrics = [
  { name: 'PM 2.5', icon: 'PM', value: '25 ug/m³', status: '正常', progress: 35 },
  { name: 'CO₂', icon: 'CO', value: '434 ppm', status: '正常', progress: 45 },
  { name: '温度', icon: '温', value: '22 ℃', status: '正常', progress: 55 },
  { name: '湿度', icon: '湿', value: '54 %', status: '正常', progress: 54 }
]

const trendDays = Array.from({ length: 30 }, (_, index) => `${index + 1}日`)

const trendSeries = {
  cu: [122, 146, 135, 118, 140, 142, 111, 112, 116, 138, 145, 128, 116, 114, 144, 140, 146, 151, 120, 118, 142, 143, 114, 119, 145, 132, 126, 138, 123, 112],
  scu: [112, 108, 124, 85, 80, 112, 89, 87, 91, 120, 116, 83, 114, 111, 79, 114, 108, 88, 91, 90, 80, 114, 81, 83, 87, 88, 90, 98, 90, 82],
  ocsr: [83, 74, 85, 84, 80, 66, 62, 60, 61, 79, 82, 61, 84, 82, 72, 90, 84, 85, 74, 86, 87, 74, 77, 79, 83, 85, 72, 62, 60, 61],
  rate: [36, 31, 34, 30, 37, 35, 32, 34, 33, 38, 31, 35, 30, 31, 32, 34, 33, 34, 35, 30, 37, 31, 30, 32, 39, 35, 34, 31, 33, 28]
}

const getChartData = (filterType) => {
  const data = {
    day: {
      xAxisData: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      baseline: [120, 80, 60, 150, 180, 160, 200, 140],
      current: [40, 30, 20, 50, 60, 55, 70, 45],
      saveRate: [25, 27, 25, 25, 25, 26, 26, 24]
    },
    month: {
      xAxisData: ['1日', '5日', '10日', '15日', '20日', '25日', '30日'],
      baseline: [3200, 2800, 3000, 3100, 2900, 3300, 3150],
      current: [950, 820, 880, 920, 850, 980, 930],
      saveRate: [23, 23, 23, 23, 23, 23, 23]
    },
    quarter: {
      xAxisData: ['1月', '2月', '3月'],
      baseline: [95000, 88000, 92000],
      current: [28500, 26400, 27600],
      saveRate: [23, 23, 23]
    }
  }

  return data[filterType]
}

const initEnergyChart = () => {
  if (!energyChart.value || !window.echarts) return
  energyChartInstance = window.echarts.init(energyChart.value)
  updateEnergyChart()
}

const updateEnergyChart = () => {
  if (!energyChartInstance) return

  const chartData = getChartData(selectedFilter.value)
  const echarts = window.echarts

  energyChartInstance.setOption({
    grid: { left: '3%', right: '3%', bottom: '3%', top: '14%', containLabel: true },
    legend: {
      data: ['标准值', '当前值', '节约率'],
      textStyle: { color: 'rgba(234,247,255,0.82)', fontSize: 11 },
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8
    },
    xAxis: {
      type: 'category',
      data: chartData.xAxisData,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: 'rgba(234,247,255,0.5)', fontSize: 10 }
    },
    yAxis: [
      {
        type: 'value',
        name: 'kWh',
        nameTextStyle: { color: 'rgba(234,247,255,0.45)', fontSize: 10 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: 'rgba(234,247,255,0.5)', fontSize: 10 }
      },
      {
        type: 'value',
        name: '%',
        nameTextStyle: { color: 'rgba(234,247,255,0.45)', fontSize: 10 },
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: 'rgba(234,247,255,0.5)', fontSize: 10 }
      }
    ],
    series: [
      {
        name: '标准值',
        type: 'bar',
        data: chartData.baseline,
        itemStyle: { color: 'rgba(122, 162, 255, 0.22)' },
        barWidth: '30%'
      },
      {
        name: '当前值',
        type: 'bar',
        data: chartData.current,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(89, 227, 255, 0.95)' },
            { offset: 1, color: 'rgba(53, 246, 212, 0.72)' }
          ], false)
        },
        barWidth: '30%'
      },
      {
        name: '节约率',
        type: 'line',
        yAxisIndex: 1,
        data: chartData.saveRate,
        itemStyle: { color: '#FFCC58' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 4,
        smooth: true
      }
    ]
  })
}

const changeFilter = (value) => {
  selectedFilter.value = value
  updateEnergyChart()
}

const initTrendChart = () => {
  if (!trendChart.value || !window.echarts) return

  trendChartInstance = window.echarts.init(trendChart.value)
  trendChartInstance.setOption({
    grid: { left: '4%', right: '4%', bottom: '4%', top: '18%', containLabel: true },
    legend: {
      data: ['CU能耗', 'SCU能耗', 'OCSR能耗', '节能率'],
      textStyle: { color: 'rgba(234,247,255,0.7)', fontSize: 10 },
      top: 2,
      left: 'center',
      itemWidth: 10,
      itemHeight: 6
    },
    xAxis: {
      type: 'category',
      data: trendDays,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: 'rgba(234,247,255,0.5)', fontSize: 9, interval: 4 }
    },
    yAxis: [
      {
        type: 'value',
        name: 'kWh',
        nameTextStyle: { color: 'rgba(234,247,255,0.42)', fontSize: 10 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: 'rgba(234,247,255,0.5)', fontSize: 10 }
      },
      {
        type: 'value',
        name: '%',
        min: 0,
        max: 40,
        nameTextStyle: { color: 'rgba(234,247,255,0.42)', fontSize: 10 },
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: 'rgba(234,247,255,0.5)', fontSize: 10 }
      }
    ],
    series: [
      { name: 'CU能耗', type: 'line', data: trendSeries.cu, itemStyle: { color: '#20D7FF' }, lineStyle: { width: 2.2 }, symbol: 'none', smooth: true },
      { name: 'SCU能耗', type: 'line', data: trendSeries.scu, itemStyle: { color: '#21FFE2' }, lineStyle: { width: 2.2 }, symbol: 'none', smooth: true },
      { name: 'OCSR能耗', type: 'line', data: trendSeries.ocsr, itemStyle: { color: '#7165FF' }, lineStyle: { width: 2.2 }, symbol: 'none', smooth: true },
      { name: '节能率', type: 'line', yAxisIndex: 1, data: trendSeries.rate, itemStyle: { color: '#FFCC58' }, lineStyle: { width: 2, type: 'dashed' }, symbol: 'circle', symbolSize: 3, smooth: true }
    ]
  })
}

const handleResize = () => {
  energyChartInstance?.resize()
  trendChartInstance?.resize()
}

onMounted(() => {
  setTimeout(() => {
    initEnergyChart()
    initTrendChart()
  }, 100)

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  energyChartInstance?.dispose()
  trendChartInstance?.dispose()
})
</script>

<style scoped>
.dashboard-page { width: 100%; height: 100%; position: relative; overflow: hidden; }
.background-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
.background-image img { width: 100%; height: 100%; object-fit: cover; opacity: 0.82; filter: saturate(0.88) brightness(0.7); }
.dashboard-content { position: relative; z-index: 1; width: 100%; height: 100%; display: grid; grid-template-columns: 380px 1fr 380px; gap: 16px; padding: 16px; min-height: 0; }
.left-section { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.device-overview { flex: 0 0 auto; }
.overview-charts { display: flex; justify-content: space-around; padding: 20px 0; }
.chart-item { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ring-chart { width: 100px; height: 100px; position: relative; }
.ring-chart svg { width: 100%; height: 100%; }
.chart-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: 700; color: var(--text-1); font-family: var(--font-num); text-shadow: 0 0 12px rgba(89, 227, 255, 0.12); }
.chart-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-2); }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.active { background: var(--accent-cyan); box-shadow: 0 0 10px rgba(89, 227, 255, 0.22); }
.dot.inactive { background: var(--text-3); }

.energy-chart-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.filter-buttons { display: flex; gap: 8px; margin-bottom: 12px; }
.filter-btn { padding: 6px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: rgba(255, 255, 255, 0.6); font-size: 12px; cursor: pointer; transition: all 0.3s ease; }
.filter-btn:hover { border-color: var(--line-strong); color: var(--accent-cyan); }
.filter-btn.active { background: linear-gradient(90deg, var(--accent-cyan), var(--accent-teal)); border-color: var(--accent-cyan); color: #04111f; }
.energy-chart { width: 100%; height: 100%; flex: 1; }

.center-section { display: flex; flex-direction: column; justify-content: flex-start; padding-top: 6px; min-height: 0; }
.kpi-row { display: flex; gap: 16px; justify-content: center; }
.kpi-row :deep(.kpi-card) { flex: 1; max-width: 208px; min-height: 116px; }
.kpi-row :deep(.kpi-label) { font-size: 17px; margin-bottom: 12px; letter-spacing: 0.3px; }
.kpi-row :deep(.kpi-value) { font-size: 44px; line-height: 1; letter-spacing: -1px; text-shadow: 0 0 14px currentColor; }
.kpi-row :deep(.kpi-unit) { margin-left: 8px; font-size: 22px; }
.kpi-row :deep(.kpi-unit) { text-shadow: none; }
.kpi-row :deep(.kpi-sub) { margin-top: 16px; font-size: 15px; font-weight: 500; color: rgba(234, 247, 255, 0.86); }
.kpi-row :deep(.sub-icon) { color: inherit; font-size: 14px; }

.right-section { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.trend-chart-card { flex: 0 0 auto; }
.trend-chart { width: 100%; height: 232px; }

.environment-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.aqi-section { margin-bottom: 14px; }
.aqi-label { font-size: 13px; color: var(--text-2); margin-bottom: 10px; font-weight: 500; }
.aqi-value { display: flex; align-items: center; gap: 12px; }
.aqi-status { font-size: 18px; font-weight: 700; color: var(--accent-teal); text-shadow: 0 0 12px rgba(53, 246, 212, 0.18); }
.aqi-bars { display: flex; gap: 4px; flex: 1; }
.aqi-bar { flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 999px; }
.aqi-bar.active { background: linear-gradient(90deg, var(--accent-cyan), var(--accent-teal)); box-shadow: 0 0 8px rgba(53, 246, 212, 0.14); }

.env-items { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }
.env-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: rgba(255, 255, 255, 0.025); border: 1px solid var(--line-soft); border-radius: 8px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
.env-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.env-icon { font-size: 13px; font-weight: 700; color: var(--text-1); letter-spacing: 0.5px; }
.env-info { flex: 1; }
.env-name { font-size: 14px; color: var(--text-2); margin-bottom: 6px; }
.env-value-row { display: flex; align-items: center; gap: 10px; }
.env-bar { flex: 1; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 999px; overflow: hidden; }
.env-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-teal)); border-radius: 999px; box-shadow: 0 0 8px rgba(89, 227, 255, 0.2); }
.env-value { min-width: 84px; font-size: 15px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-num); }
.env-status { min-width: 36px; text-align: right; font-size: 13px; font-weight: 600; color: var(--accent-teal); }
</style>

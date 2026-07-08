<template>
  <div class="dashboard-page">
    <div class="background-image">
      <img src="../assets/images/park-bg.png" alt="茅台园区照明场景" />
    </div>

    <div class="dashboard-content">
      <div class="left-section">
        <DataCard title="区域导航" class="area-nav-card">
          <div class="area-path">
            <div class="path-label">当前筛选路径</div>
            <div class="path-value">
              <span v-for="(item, index) in currentPathSegments" :key="item" class="path-chip">
                {{ item }}
                <span v-if="index < currentPathSegments.length - 1" class="path-separator">/</span>
              </span>
            </div>
          </div>

          <div class="nav-filters">
            <div class="nav-grid">
              <button class="nav-entry-card" @click="openPicker('campus')">
                <span class="nav-entry-label">园区</span>
                <span class="nav-entry-value">{{ currentCampus?.label }}</span>
                <span class="nav-popup-arrow">▾</span>
              </button>
              <button class="nav-entry-card" @click="openPicker('building')">
                <span class="nav-entry-label">建筑</span>
                <span class="nav-entry-value">{{ currentBuilding?.label || '仅园区级' }}</span>
                <span class="nav-popup-arrow">▾</span>
              </button>
              <button class="nav-entry-card nav-entry-card-area" :disabled="!selectedBuilding" @click="openPicker('area')">
                <span class="nav-entry-label">区域</span>
                <span class="nav-entry-value">{{ currentArea?.label || (selectedBuilding ? '仅建筑级' : '请先选建筑') }}</span>
                <span class="nav-popup-arrow">▾</span>
              </button>
            </div>
            <div class="nav-area-tip">区域为最终筛选项；楼层已收纳到区域弹层中做二次过滤，适配区域数量较多的场景。</div>
          </div>

          <div v-if="activePicker" class="nav-popup-mask" @click.self="closePicker">
            <div class="nav-popup-panel">
              <div class="nav-popup-header">
                <span class="nav-popup-title">选择{{ pickerTitle }}</span>
                <button class="nav-popup-close" @click="closePicker">×</button>
              </div>
              <div class="nav-popup-subtitle">当前：{{ pickerCurrentLabel }}</div>
              <div v-if="activePicker === 'area' && areaFloorOptions.length" class="nav-popup-floors">
                <button class="nav-floor-chip" :class="{ active: popupAreaFloor === '' }" @click="popupAreaFloor = ''">全部楼层</button>
                <button v-for="item in areaFloorOptions" :key="item.value" class="nav-floor-chip" :class="{ active: popupAreaFloor === item.value }" @click="popupAreaFloor = item.value">{{ item.label }}</button>
              </div>
              <div class="nav-popup-options">
                <button
                  v-for="item in pickerOptions"
                  :key="item.value"
                  :class="['nav-popup-option', { active: pickerCurrentValue === item.value }]"
                  @click="choosePickerOption(item.value)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="nav-hint">筛选完成后，页面中的 KPI、能耗图与环境监控会同步切换到对应区域。</div>
        </DataCard>

        <DataCard title="实时照明能耗及节约值" class="energy-chart-card">
          <div class="filter-buttons">
            <button v-for="item in filterOptions" :key="item.value" :class="['filter-btn', { active: selectedFilter === item.value }]" @click="changeFilter(item.value)">{{ item.label }}</button>
          </div>
          <div ref="energyChart" class="energy-chart"></div>
        </DataCard>
      </div>

      <div class="center-section">
        <div class="kpi-row">
          <KPICard v-for="item in currentScene.kpis" :key="item.label" :label="item.label" :value="item.value" :unit="item.unit" :sub-value="item.subValue" :sub-icon="item.subIcon" :value-color="item.valueColor" />
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
              <span class="aqi-status">{{ currentScene.aqi.label }}</span>
              <div class="aqi-bars">
                <div v-for="barIndex in 5" :key="barIndex" :class="['aqi-bar', { active: barIndex <= currentScene.aqi.activeBars }]"></div>
              </div>
            </div>
          </div>

          <div class="env-items">
            <div v-for="item in currentScene.environmentMetrics" :key="item.name" class="env-item">
              <div class="env-icon-box"><span class="env-icon">{{ item.icon }}</span></div>
              <div class="env-info">
                <div class="env-name">{{ item.name }}</div>
                <div class="env-value-row">
                  <div class="env-bar"><div class="env-bar-fill" :style="{ width: `${item.progress}%` }"></div></div>
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
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import DataCard from '../components/DataCard.vue'
import KPICard from '../components/KPICard.vue'

const KPI_COLORS = {
  fee: 'var(--accent-gold)',
  rate: 'var(--accent-green)',
  carbon: 'var(--accent-lime)'
}

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

const navigationTree = [
  { label: '一号园区', value: 'park-1', buildings: [
    { label: '制曲车间', value: 'building-a', floors: [
      { label: '1层', value: 'f1', areas: [{ label: '包装区', value: 'packaging', key: 'packaging' }, { label: '输送区', value: 'conveyor', key: 'conveyor' }] },
      { label: '2层', value: 'f2', areas: [{ label: '仓储区', value: 'storage', key: 'storage' }, { label: '检验区', value: 'inspection', key: 'inspection' }] }
    ] },
    { label: '勾调中心', value: 'building-b', floors: [{ label: '1层', value: 'f1', areas: [{ label: '工艺区', value: 'process', key: 'process' }, { label: '成品区', value: 'finished', key: 'finished' }] }] }
  ] },
  { label: '二号园区', value: 'park-2', buildings: [
    { label: '自动化仓', value: 'building-c', floors: [{ label: '1层', value: 'f1', areas: [{ label: '分拣区', value: 'sorting', key: 'sorting' }, { label: '月台区', value: 'platform', key: 'platform' }] }] }
  ] }
]

const baseEnergy = {
  day: { xAxisData: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'], baseline: [120, 80, 60, 150, 180, 160, 200, 140], current: [40, 30, 20, 50, 60, 55, 70, 45], saveRate: [25, 27, 25, 25, 25, 26, 26, 24] },
  month: { xAxisData: ['1日', '5日', '10日', '15日', '20日', '25日', '30日'], baseline: [3200, 2800, 3000, 3100, 2900, 3300, 3150], current: [950, 820, 880, 920, 850, 980, 930], saveRate: [23, 23, 23, 23, 23, 23, 23] },
  quarter: { xAxisData: ['1月', '2月', '3月'], baseline: [95000, 88000, 92000], current: [28500, 26400, 27600], saveRate: [23, 23, 23] }
}
const baseTrend = {
  days: Array.from({ length: 30 }, (_, index) => `${index + 1}日`),
  cu: [122, 146, 135, 118, 140, 142, 111, 112, 116, 138, 145, 128, 116, 114, 144, 140, 146, 151, 120, 118, 142, 143, 114, 119, 145, 132, 126, 138, 123, 112],
  scu: [112, 108, 124, 85, 80, 112, 89, 87, 91, 120, 116, 83, 114, 111, 79, 114, 108, 88, 91, 90, 80, 114, 81, 83, 87, 88, 90, 98, 90, 82],
  ocsr: [83, 74, 85, 84, 80, 66, 62, 60, 61, 79, 82, 61, 84, 82, 72, 90, 84, 85, 74, 86, 87, 74, 77, 79, 83, 85, 72, 62, 60, 61],
  rate: [36, 31, 34, 30, 37, 35, 32, 34, 33, 38, 31, 35, 30, 31, 32, 34, 33, 34, 35, 30, 37, 31, 30, 32, 39, 35, 34, 31, 33, 28]
}
const shift = (list, delta) => list.map((item, index) => Math.max(0, item + delta + ((index % 3) - 1)))
const shiftRate = (list, delta) => list.map((item, index) => Math.max(12, Math.min(40, item + delta + (index % 2 ? 0 : 1))))
const shiftEnergy = (energy, delta, rateDelta) => ({
  day: { ...energy.day, baseline: shift(energy.day.baseline, delta), current: shift(energy.day.current, Math.round(delta * 0.35)), saveRate: shiftRate(energy.day.saveRate, rateDelta) },
  month: { ...energy.month, baseline: shift(energy.month.baseline, delta * 18), current: shift(energy.month.current, delta * 6), saveRate: shiftRate(energy.month.saveRate, rateDelta) },
  quarter: { ...energy.quarter, baseline: shift(energy.quarter.baseline, delta * 560), current: shift(energy.quarter.current, delta * 190), saveRate: shiftRate(energy.quarter.saveRate, rateDelta) }
})
const makeScene = (config) => ({
  kpis: [
    { label: '累计节约电费', value: config.fee, unit: '¥', subValue: config.subFee, subIcon: '⚡', valueColor: KPI_COLORS.fee },
    { label: '照明节能率', value: config.rate, unit: '%', subValue: config.subRate, subIcon: '↗', valueColor: KPI_COLORS.rate },
    { label: '累计碳排放量', value: config.carbon, unit: 't', subValue: config.subCarbon, subIcon: '🌿', valueColor: KPI_COLORS.carbon }
  ],
  aqi: { label: config.aqiLabel, activeBars: config.activeBars },
  environmentMetrics: [
    { name: 'PM 2.5', icon: 'PM', value: `${config.pm} ug/m³`, status: '正常', progress: config.pmProgress },
    { name: 'CO₂', icon: 'CO', value: `${config.co2} ppm`, status: '正常', progress: config.co2Progress },
    { name: '温度', icon: '温', value: `${config.temperature} ℃`, status: '正常', progress: config.tempProgress },
    { name: '湿度', icon: '湿', value: `${config.humidity} %`, status: '正常', progress: config.humidityProgress }
  ],
  energy: shiftEnergy(baseEnergy, config.energyShift, config.rateShift),
  trend: { ...baseTrend, cu: shift(baseTrend.cu, config.trendShift), scu: shift(baseTrend.scu, config.trendShift - 2), ocsr: shift(baseTrend.ocsr, config.trendShift - 1), rate: shiftRate(baseTrend.rate, config.rateShift) }
})
const sceneMap = {
  packaging: makeScene({ fee: '45,200', rate: '32.5', carbon: '38.2', subFee: '节约1,500kWh', subRate: '+1.5%效率提升', subCarbon: '符合ESG标准', aqiLabel: '优良', activeBars: 3, pm: 25, pmProgress: 35, co2: 434, co2Progress: 45, temperature: 22, tempProgress: 55, humidity: 54, humidityProgress: 54, energyShift: 0, trendShift: 0, rateShift: 0 }),
  conveyor: makeScene({ fee: '39,860', rate: '29.8', carbon: '31.4', subFee: '节约1,320kWh', subRate: '+0.9%效率提升', subCarbon: '联动模式稳定', aqiLabel: '良好', activeBars: 3, pm: 28, pmProgress: 39, co2: 468, co2Progress: 49, temperature: 23, tempProgress: 58, humidity: 56, humidityProgress: 56, energyShift: -8, trendShift: -6, rateShift: -3 }),
  storage: makeScene({ fee: '52,680', rate: '34.1', carbon: '42.7', subFee: '节约1,780kWh', subRate: '+1.8%效率提升', subCarbon: '仓储调光稳定', aqiLabel: '优良', activeBars: 4, pm: 21, pmProgress: 31, co2: 412, co2Progress: 41, temperature: 21, tempProgress: 52, humidity: 51, humidityProgress: 51, energyShift: 14, trendShift: 8, rateShift: 2 }),
  inspection: makeScene({ fee: '36,940', rate: '27.6', carbon: '29.3', subFee: '节约1,180kWh', subRate: '+0.7%效率提升', subCarbon: '检验照度稳定', aqiLabel: '良好', activeBars: 3, pm: 26, pmProgress: 36, co2: 446, co2Progress: 46, temperature: 23, tempProgress: 57, humidity: 52, humidityProgress: 52, energyShift: -16, trendShift: -12, rateShift: -5 }),
  process: makeScene({ fee: '41,300', rate: '30.2', carbon: '33.8', subFee: '节约1,360kWh', subRate: '+1.2%效率提升', subCarbon: '工艺联动正常', aqiLabel: '优良', activeBars: 3, pm: 24, pmProgress: 34, co2: 426, co2Progress: 44, temperature: 22, tempProgress: 54, humidity: 53, humidityProgress: 53, energyShift: -4, trendShift: -3, rateShift: -2 }),
  finished: makeScene({ fee: '47,820', rate: '33.1', carbon: '39.6', subFee: '节约1,620kWh', subRate: '+1.4%效率提升', subCarbon: '成品区节律稳定', aqiLabel: '优良', activeBars: 4, pm: 22, pmProgress: 32, co2: 418, co2Progress: 42, temperature: 21, tempProgress: 52, humidity: 50, humidityProgress: 50, energyShift: 8, trendShift: 4, rateShift: 1 }),
  sorting: makeScene({ fee: '43,680', rate: '31.6', carbon: '35.4', subFee: '节约1,420kWh', subRate: '+1.1%效率提升', subCarbon: '分拣联动平稳', aqiLabel: '良好', activeBars: 3, pm: 27, pmProgress: 38, co2: 452, co2Progress: 47, temperature: 23, tempProgress: 57, humidity: 55, humidityProgress: 55, energyShift: -2, trendShift: -1, rateShift: -1 }),
  platform: makeScene({ fee: '34,560', rate: '26.9', carbon: '27.8', subFee: '节约1,080kWh', subRate: '+0.6%效率提升', subCarbon: '月台模式稳定', aqiLabel: '良好', activeBars: 2, pm: 30, pmProgress: 42, co2: 481, co2Progress: 50, temperature: 24, tempProgress: 60, humidity: 57, humidityProgress: 57, energyShift: -22, trendShift: -18, rateShift: -8 }),
  'park-1': makeScene({ fee: '46,800', rate: '31.9', carbon: '37.4', subFee: '园区综合节约1,540kWh', subRate: '园区能效稳定提升', subCarbon: '园区ESG表现优良', aqiLabel: '优良', activeBars: 3, pm: 24, pmProgress: 34, co2: 428, co2Progress: 44, temperature: 22, tempProgress: 54, humidity: 53, humidityProgress: 53, energyShift: 2, trendShift: 2, rateShift: 0 }),
  'park-2': makeScene({ fee: '39,200', rate: '28.4', carbon: '31.1', subFee: '园区综合节约1,180kWh', subRate: '园区能效平稳运行', subCarbon: '仓储园区表现稳定', aqiLabel: '良好', activeBars: 3, pm: 28, pmProgress: 39, co2: 458, co2Progress: 48, temperature: 23, tempProgress: 58, humidity: 56, humidityProgress: 56, energyShift: -6, trendShift: -5, rateShift: -3 }),
  'building-a': makeScene({ fee: '43,900', rate: '30.8', carbon: '35.2', subFee: '建筑综合节约1,360kWh', subRate: '车间联动效率提升', subCarbon: '建筑节能表现稳定', aqiLabel: '优良', activeBars: 3, pm: 25, pmProgress: 35, co2: 438, co2Progress: 45, temperature: 22, tempProgress: 55, humidity: 54, humidityProgress: 54, energyShift: -1, trendShift: -1, rateShift: -1 }),
  'building-b': makeScene({ fee: '44,600', rate: '31.6', carbon: '36.4', subFee: '建筑综合节约1,420kWh', subRate: '中心调光效率提升', subCarbon: '勾调中心运行平稳', aqiLabel: '优良', activeBars: 4, pm: 23, pmProgress: 33, co2: 422, co2Progress: 43, temperature: 21, tempProgress: 53, humidity: 52, humidityProgress: 52, energyShift: 3, trendShift: 3, rateShift: 1 }),
  'building-c': makeScene({ fee: '38,700', rate: '27.8', carbon: '30.2', subFee: '建筑综合节约1,150kWh', subRate: '仓储照明稳定运行', subCarbon: '自动化仓节能正常', aqiLabel: '良好', activeBars: 2, pm: 29, pmProgress: 40, co2: 470, co2Progress: 49, temperature: 24, tempProgress: 59, humidity: 56, humidityProgress: 56, energyShift: -10, trendShift: -8, rateShift: -4 })
}

const campusOptions = navigationTree
const selectedCampus = ref(campusOptions[0].value)
const buildingOptions = computed(() => navigationTree.find((item) => item.value === selectedCampus.value)?.buildings ?? [])
const selectedBuilding = ref('')
const areaOptions = computed(() => {
  const building = buildingOptions.value.find((item) => item.value === selectedBuilding.value)
  return (building?.floors ?? []).flatMap((floor) =>
    floor.areas.map((area) => ({
      ...area,
      floorValue: floor.value,
      floorLabel: floor.label
    }))
  )
})
const selectedArea = ref('')

const currentCampus = computed(() => campusOptions.find((item) => item.value === selectedCampus.value))
const currentBuilding = computed(() => buildingOptions.value.find((item) => item.value === selectedBuilding.value))
const currentArea = computed(() => areaOptions.value.find((item) => item.value === selectedArea.value))
const currentSceneKey = computed(() => currentArea.value?.key ?? (selectedBuilding.value || selectedCampus.value))
const currentScene = computed(() => sceneMap[currentSceneKey.value])
const currentPathText = computed(() => [currentCampus.value?.label, currentBuilding.value?.label, currentArea.value?.label].filter(Boolean).join(' / '))
const currentPathSegments = computed(() => [currentCampus.value?.label, currentBuilding.value?.label, currentArea.value?.label].filter(Boolean))
const activePicker = ref(null)
const popupAreaFloor = ref('')

const pickerTitleMap = {
  campus: '园区',
  building: '建筑',
  area: '区域'
}

const pickerTitle = computed(() => pickerTitleMap[activePicker.value] ?? '')
const areaFloorOptions = computed(() => {
  const building = buildingOptions.value.find((item) => item.value === selectedBuilding.value)
  return (building?.floors ?? []).map((floor) => ({ label: floor.label, value: floor.value }))
})
const pickerOptions = computed(() => {
  if (activePicker.value === 'campus') return campusOptions
  if (activePicker.value === 'building') return [{ label: '仅园区级', value: '' }, ...buildingOptions.value]
  if (activePicker.value === 'area') {
    const filteredAreas = popupAreaFloor.value ? areaOptions.value.filter((item) => item.floorValue === popupAreaFloor.value) : areaOptions.value
    return [{ label: '仅建筑级', value: '' }, ...filteredAreas]
  }
  return []
})
const pickerCurrentValue = computed(() => {
  if (activePicker.value === 'campus') return selectedCampus.value
  if (activePicker.value === 'building') return selectedBuilding.value
  if (activePicker.value === 'area') return selectedArea.value
  return ''
})
const pickerCurrentLabel = computed(() => {
  if (activePicker.value === 'campus') return currentCampus.value?.label ?? ''
  if (activePicker.value === 'building') return currentBuilding.value?.label ?? '仅园区级'
  if (activePicker.value === 'area') return currentArea.value?.label ?? '仅建筑级'
  return ''
})

const handleCampusChange = () => {
  selectedBuilding.value = ''
  selectedArea.value = ''
}
const handleBuildingChange = () => {
  selectedArea.value = ''
}

const selectCampus = (value) => {
  if (selectedCampus.value === value) return
  selectedCampus.value = value
  handleCampusChange()
}

const selectBuilding = (value) => {
  if (selectedBuilding.value === value) return
  selectedBuilding.value = value
  handleBuildingChange()
}

const openPicker = (type) => {
  if (type === 'area' && !selectedBuilding.value) return
  if (type === 'area') popupAreaFloor.value = ''
  activePicker.value = type
}

const closePicker = () => {
  activePicker.value = null
}

const choosePickerOption = (value) => {
  if (activePicker.value === 'campus') {
    selectCampus(value)
  } else if (activePicker.value === 'building') {
    selectBuilding(value)
  } else if (activePicker.value === 'area') {
    selectedArea.value = value
  }

  closePicker()
}

const updateEnergyChart = () => {
  if (!energyChartInstance) return
  const chartData = currentScene.value.energy[selectedFilter.value]
  const echarts = window.echarts
  energyChartInstance.setOption({
    grid: { left: '3%', right: '3%', bottom: '3%', top: '14%', containLabel: true },
    legend: { data: ['标准值', '当前值', '节约率'], textStyle: { color: 'rgba(243,249,255,0.88)', fontSize: 11 }, top: 0, right: 0, itemWidth: 12, itemHeight: 8 },
    xAxis: { type: 'category', data: chartData.xAxisData, axisLine: { lineStyle: { color: 'rgba(193,213,231,0.22)' } }, axisLabel: { color: 'rgba(234,243,252,0.68)', fontSize: 10 } },
    yAxis: [
      { type: 'value', name: 'kWh', nameTextStyle: { color: 'rgba(234,243,252,0.62)', fontSize: 10 }, axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(209,224,238,0.08)' } }, axisLabel: { color: 'rgba(234,243,252,0.7)', fontSize: 10 } },
      { type: 'value', name: '%', nameTextStyle: { color: 'rgba(234,243,252,0.62)', fontSize: 10 }, axisLine: { show: false }, splitLine: { show: false }, axisLabel: { color: 'rgba(234,243,252,0.7)', fontSize: 10 } }
    ],
    series: [
      { name: '标准值', type: 'bar', data: chartData.baseline, itemStyle: { color: 'rgba(196, 214, 232, 0.36)' }, barWidth: '30%' },
      { name: '当前值', type: 'bar', data: chartData.current, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(151, 240, 167, 0.98)' }, { offset: 0.55, color: 'rgba(88, 239, 219, 0.92)' }, { offset: 1, color: 'rgba(120, 232, 255, 0.72)' }], false) }, barWidth: '30%' },
      { name: '节约率', type: 'line', yAxisIndex: 1, data: chartData.saveRate, itemStyle: { color: 'rgba(255, 203, 114, 1)' }, lineStyle: { width: 2.4 }, symbol: 'circle', symbolSize: 5, smooth: true }
    ]
  })
}
const updateTrendChart = () => {
  if (!trendChartInstance) return
  const chartData = currentScene.value.trend
  trendChartInstance.setOption({
    grid: { left: '4%', right: '4%', bottom: '4%', top: '18%', containLabel: true },
    legend: { data: ['CU能耗', 'SCU能耗', 'OCSR能耗', '节能率'], textStyle: { color: 'rgba(243,249,255,0.82)', fontSize: 10 }, top: 2, left: 'center', itemWidth: 10, itemHeight: 6 },
    xAxis: { type: 'category', data: chartData.days, axisLine: { lineStyle: { color: 'rgba(193,213,231,0.22)' } }, axisLabel: { color: 'rgba(234,243,252,0.66)', fontSize: 9, interval: 4 } },
    yAxis: [
      { type: 'value', name: 'kWh', nameTextStyle: { color: 'rgba(234,243,252,0.62)', fontSize: 10 }, axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(209,224,238,0.08)' } }, axisLabel: { color: 'rgba(234,243,252,0.68)', fontSize: 10 } },
      { type: 'value', name: '%', min: 0, max: 40, nameTextStyle: { color: 'rgba(234,243,252,0.62)', fontSize: 10 }, axisLine: { show: false }, splitLine: { show: false }, axisLabel: { color: 'rgba(234,243,252,0.68)', fontSize: 10 } }
    ],
    series: [
      { name: 'CU能耗', type: 'line', data: chartData.cu, itemStyle: { color: '#BFD6FF' }, lineStyle: { width: 2.2 }, symbol: 'none', smooth: true },
      { name: 'SCU能耗', type: 'line', data: chartData.scu, itemStyle: { color: '#58EFDB' }, lineStyle: { width: 2.2 }, symbol: 'none', smooth: true },
      { name: 'OCSR能耗', type: 'line', data: chartData.ocsr, itemStyle: { color: '#9FE882' }, lineStyle: { width: 2.2 }, symbol: 'none', smooth: true },
      { name: '节能率', type: 'line', yAxisIndex: 1, data: chartData.rate, itemStyle: { color: '#FFCB72' }, lineStyle: { width: 2.2, type: 'dashed' }, symbol: 'circle', symbolSize: 4, smooth: true }
    ]
  })
}
const initEnergyChart = () => {
  if (!energyChart.value || !window.echarts) return
  energyChartInstance = window.echarts.init(energyChart.value)
  updateEnergyChart()
}
const initTrendChart = () => {
  if (!trendChart.value || !window.echarts) return
  trendChartInstance = window.echarts.init(trendChart.value)
  updateTrendChart()
}
const changeFilter = (value) => { selectedFilter.value = value }
const handleResize = () => { energyChartInstance?.resize(); trendChartInstance?.resize() }
watch([selectedFilter, currentSceneKey], () => { updateEnergyChart(); updateTrendChart() })

onMounted(() => {
  setTimeout(() => { initEnergyChart(); initTrendChart() }, 100)
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
.dashboard-page::before,
.dashboard-page::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.dashboard-page::before {
  background:
    radial-gradient(circle at 50% -4%, rgba(255, 219, 158, 0.18), transparent 24%),
    radial-gradient(circle at 50% 42%, rgba(217, 234, 248, 0.08), transparent 28%);
}
.dashboard-page::after {
  background:
    linear-gradient(180deg, rgba(11, 25, 40, 0.12) 0%, rgba(8, 18, 30, 0.28) 100%),
    radial-gradient(circle at 50% 30%, rgba(120, 232, 255, 0.08), transparent 26%);
}
.background-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
.background-image img { width: 100%; height: 100%; object-fit: cover; opacity: 0.96; filter: saturate(0.82) brightness(1.12) contrast(0.92); }
.dashboard-content { position: relative; z-index: 1; width: 100%; height: 100%; display: grid; grid-template-columns: 380px 1fr 380px; gap: 16px; padding: 16px; min-height: 0; }
.left-section { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.area-nav-card { flex: 0 0 380px; }
.area-path { margin-bottom: 16px; padding: 12px 14px; border: 1px solid rgba(186, 214, 235, 0.16); border-radius: 12px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1); }
.path-label { font-size: 12px; color: var(--text-3); margin-bottom: 8px; }
.path-value { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 14px; line-height: 1.5; color: var(--text-1); font-weight: 600; }
.path-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(120, 232, 255, 0.08)); border: 1px solid rgba(186, 214, 235, 0.18); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1); }
.path-separator { color: var(--text-3); }
.nav-filters { display: flex; flex-direction: column; gap: 12px; }
.nav-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.nav-entry-card { position: relative; min-height: 82px; padding: 14px 12px 12px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; border-radius: 14px; border: 1px solid rgba(186, 214, 235, 0.18); background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04) 24%, rgba(38, 61, 88, 0.82) 100%); color: var(--text-1); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 18px rgba(5, 13, 24, 0.08); }
.nav-entry-card:hover { border-color: rgba(186, 214, 235, 0.28); box-shadow: var(--glow-soft), inset 0 1px 0 rgba(255,255,255,0.14); }
.nav-entry-card:disabled { cursor: not-allowed; opacity: 0.55; box-shadow: none; }
.nav-entry-card-area { background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04) 22%, rgba(43, 69, 99, 0.86) 100%); }
.nav-entry-label { font-size: 12px; color: var(--text-3); font-weight: 600; }
.nav-entry-value { font-size: 16px; line-height: 1.25; color: var(--text-1); font-weight: 700; text-align: left; word-break: break-all; }
.nav-area-tip { font-size: 12px; line-height: 1.5; color: var(--text-3); }
.nav-popup-arrow { color: var(--accent-cyan); font-size: 14px; text-shadow: 0 0 12px rgba(120, 232, 255, 0.18); }
.nav-popup-mask { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(8, 18, 31, 0.34); backdrop-filter: blur(10px); border-radius: 12px; }
.nav-popup-panel { width: 100%; max-width: 320px; padding: 14px; border-radius: 16px; border: 1px solid rgba(186, 214, 235, 0.22); background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04) 22%, rgba(28, 49, 73, 0.9) 100%); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.14); }
.nav-popup-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.nav-popup-title { font-size: 15px; font-weight: 600; color: var(--text-1); }
.nav-popup-close { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(186, 214, 235, 0.22); background: rgba(255, 255, 255, 0.08); color: var(--text-2); }
.nav-popup-subtitle { margin-bottom: 12px; font-size: 12px; color: var(--text-3); }
.nav-popup-floors { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.nav-floor-chip { min-height: 32px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(186, 214, 235, 0.18); background: rgba(28, 49, 73, 0.76); color: var(--text-2); font-size: 12px; font-weight: 500; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
.nav-floor-chip.active { color: #102033; border-color: rgba(255, 232, 177, 0.48); background: linear-gradient(135deg, rgba(255, 203, 114, 0.96), rgba(120, 232, 255, 0.88)); }
.nav-popup-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; max-height: 220px; overflow: auto; }
.nav-popup-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.nav-popup-option { min-height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid rgba(186, 214, 235, 0.18); background: rgba(28, 49, 73, 0.76); color: var(--text-2); font-size: 13px; font-weight: 500; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
.nav-popup-option:hover { border-color: rgba(186, 214, 235, 0.28); color: var(--text-1); }
.nav-popup-option.active { color: #102033; border-color: rgba(255, 232, 177, 0.48); background: linear-gradient(135deg, rgba(255, 203, 114, 0.96), rgba(120, 232, 255, 0.88)); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14), 0 8px 18px rgba(5, 13, 24, 0.12); }
.nav-hint { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(186, 214, 235, 0.14); font-size: 12px; line-height: 1.6; color: var(--text-3); }
.energy-chart-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.filter-buttons { display: flex; gap: 8px; margin-bottom: 12px; }
.filter-btn { padding: 7px 16px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03)); border: 1px solid rgba(186, 214, 235, 0.16); border-radius: 999px; color: rgba(234, 243, 252, 0.7); font-size: 12px; cursor: pointer; transition: all 0.3s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
.filter-btn:hover { border-color: rgba(186, 214, 235, 0.28); color: var(--text-1); }
.filter-btn.active { background: linear-gradient(135deg, rgba(255, 203, 114, 0.96), rgba(143, 232, 139, 0.9)); border-color: rgba(255, 232, 177, 0.48); color: #102033; box-shadow: 0 8px 18px rgba(5, 13, 24, 0.12); }
.energy-chart { width: 100%; height: 100%; flex: 1; }
.center-section { position: relative; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 6px; min-height: 0; }
.center-section::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 8%;
  right: 8%;
  height: 220px;
  border-radius: 36px;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 220, 162, 0.16), transparent 40%),
    linear-gradient(180deg, rgba(220, 236, 252, 0.12), rgba(220, 236, 252, 0.02) 42%, transparent 80%);
  filter: blur(2px);
}
.kpi-row { position: relative; display: flex; gap: 16px; justify-content: center; padding: 4px 10px 0; }
.kpi-row :deep(.kpi-card) { flex: 1; max-width: 208px; min-height: 116px; }
.kpi-row :deep(.kpi-label) { font-size: 17px; margin-bottom: 12px; letter-spacing: 0.3px; }
.kpi-row :deep(.kpi-value) { font-size: 44px; line-height: 1; letter-spacing: -1px; }
.kpi-row :deep(.kpi-unit) { margin-left: 8px; font-size: 22px; text-shadow: none; }
.kpi-row :deep(.kpi-sub) { margin-top: 16px; font-size: 15px; font-weight: 500; color: rgba(234, 247, 255, 0.86); }
.kpi-row :deep(.sub-icon) { color: inherit; font-size: 14px; }
.right-section { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.trend-chart-card { flex: 0 0 auto; }
.trend-chart { width: 100%; height: 232px; }
.environment-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.aqi-section { margin-bottom: 14px; }
.aqi-label { font-size: 13px; color: var(--text-2); margin-bottom: 10px; font-weight: 500; }
.aqi-value { display: flex; align-items: center; gap: 12px; }
.aqi-status { font-size: 18px; font-weight: 700; color: var(--accent-green); text-shadow: 0 0 12px rgba(142, 232, 139, 0.18); }
.aqi-bars { display: flex; gap: 4px; flex: 1; }
.aqi-bar { flex: 1; height: 8px; background: rgba(255, 255, 255, 0.14); border-radius: 999px; }
.aqi-bar.active { background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); box-shadow: 0 0 8px rgba(142, 232, 139, 0.14); }
.env-items { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }
.env-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)); border: 1px solid rgba(186, 214, 235, 0.14); border-radius: 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
.env-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04)); border: 1px solid rgba(186,214,235,0.14); flex-shrink: 0; }
.env-icon { font-size: 13px; font-weight: 700; color: var(--text-1); letter-spacing: 0.5px; }
.env-info { flex: 1; }
.env-name { font-size: 14px; color: var(--text-2); margin-bottom: 6px; }
.env-value-row { display: flex; align-items: center; gap: 10px; }
.env-bar { flex: 1; height: 6px; background: rgba(255, 255, 255, 0.14); border-radius: 999px; overflow: hidden; }
.env-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); border-radius: 999px; box-shadow: 0 0 8px rgba(120, 232, 255, 0.2); }
.env-value { min-width: 84px; font-size: 15px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-num); }
.env-status { min-width: 36px; text-align: right; font-size: 13px; font-weight: 600; color: var(--accent-green); }
</style>

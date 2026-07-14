<template>
  <div class="dashboard-page">
    <div class="dashboard-content">
      <div class="left-section">
        <DataCard title="项目概览" class="project-overview-card">
          <div class="project-factory-visual">
            <img src="/project-factory-exterior.png" alt="生产厂房外观" />
            <div class="project-factory-shade"></div>
            <div class="project-brand-badge">CARRIER</div>
          </div>
          <div class="project-hero">
            <div class="project-copy">
              <div class="project-name">开利项目</div>
              <div class="project-desc">高性能照明联网及能耗改造方案</div>
            </div>
          </div>

          <div class="project-stats">
            <div v-for="item in projectStats" :key="item.label" class="project-stat">
              <span class="panel-icon" :class="item.tone" v-html="iconMap[item.icon]"></span>
              <div>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
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

        </DataCard>

        <DataCard title="近30天设备能耗趋势" class="trend-chart-card side-trend-card">
          <div ref="trendChart" class="trend-chart"></div>
        </DataCard>
      </div>

      <div class="center-section">
        <div class="kpi-row">
          <div v-for="item in currentScene.kpis" :key="item.label" class="kpi-card-v3" :class="`tone-${item.tone}`">
            <img class="kpi-icon-image" :src="item.image" :alt="`${item.label}图例`" />
            <div class="kpi-label">{{ item.label }}</div>
            <div class="kpi-value-row">
              <strong>{{ item.value }}</strong>
              <span>{{ item.unit }}</span>
            </div>
            <svg class="kpi-wave" viewBox="0 0 220 28" preserveAspectRatio="none" aria-hidden="true">
              <path class="wave-horizon" d="M4 14h212" />
              <path class="wave-primary" d="M4 6c35 0 49 16 85 16s48-16 85-16c19 0 31 5 42 9" />
              <path class="wave-secondary" d="M4 22C39 22 52 6 89 6s48 16 85 16c18 0 31-5 42-9" />
              <circle cx="89" cy="14" r="1.8" />
              <circle cx="174" cy="14" r="1.4" />
            </svg>
            <div class="kpi-foot">
              <span class="kpi-foot-icon" v-html="iconMap.trendUp"></span>
              <strong>{{ item.subValue }}</strong>
            </div>
          </div>
        </div>

        <DataCard title="实时照明能耗及节约值" class="energy-chart-card main-energy-card">
          <template #header-extra>
            <div class="filter-buttons">
              <button v-for="item in filterOptions" :key="item.value" :class="['filter-btn', { active: selectedFilter === item.value }]" @click="changeFilter(item.value)">{{ item.label }}</button>
            </div>
          </template>
          <div v-if="energyLoading || energyError" :class="['energy-api-status', { error: energyError }]">
            {{ energyError || '能耗数据加载中...' }}
          </div>
          <div ref="energyChart" class="energy-chart"></div>
        </DataCard>
      </div>

      <div class="right-section">
        <DataCard title="设备状态总览" class="device-health-card">
          <div v-if="deviceStatusLoading && !dashboardDeviceStatus.updatedAt" class="device-health-loading">
            设备状态加载中...
          </div>

          <template v-else>
            <section class="inventory-section" aria-label="设备清单概览">
              <div class="inventory-ring" :style="deviceTypeRingStyle">
                <div class="inventory-ring-core">
                  <strong>{{ dashboardDeviceStatus.inventory.total || '--' }}</strong>
                  <span>总设备</span>
                </div>
              </div>
              <div class="inventory-breakdown">
                <div class="inventory-row cu">
                  <i></i>
                  <span>CU 设备</span>
                  <strong>{{ dashboardDeviceStatus.inventory.cu }}</strong>
                </div>
                <div class="inventory-row gw">
                  <i></i>
                  <span>GW 网关</span>
                  <strong>{{ dashboardDeviceStatus.inventory.gw }}</strong>
                </div>
                <div class="inventory-row region">
                  <i></i>
                  <span>已配置区域</span>
                  <strong>{{ dashboardDeviceStatus.inventory.regions }}</strong>
                </div>
              </div>
            </section>

            <div v-if="dashboardDeviceStatus.errors.inventory" class="device-source-warning">
              {{ dashboardDeviceStatus.errors.inventory }}
            </div>

            <section class="connectivity-section" aria-label="设备连接状态">
              <div class="device-section-heading">
                <span>连接状态</span>
                <span :class="['connectivity-badge', { available: dashboardDeviceStatus.connectivity.available }]">
                  {{ dashboardDeviceStatus.connectivity.available ? '实时状态正常' : '实时状态待接入' }}
                </span>
              </div>
              <div class="connectivity-grid">
                <div v-for="item in connectivityMetrics" :key="item.label" :class="['connectivity-item', item.tone]">
                  <span class="connectivity-label"><i></i>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>

            <section class="alarm-summary-section" aria-label="设备告警状态">
              <div class="device-section-heading">
                <span>告警状态</span>
              </div>
              <div class="alarm-summary-grid">
                <div v-for="item in alarmMetrics" :key="item.label" :class="['alarm-summary-item', item.tone]">
                  <span><i></i>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>

            <div v-if="dashboardDeviceStatus.errors.alarms" class="device-source-warning">
              {{ dashboardDeviceStatus.errors.alarms }}
            </div>
          </template>
        </DataCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import DataCard from '../components/DataCard.vue'
import kpiFeeImage from '../assets/images/KPI-节约电费.png'
import kpiRateImage from '../assets/images/KPI-节约率.png'
import kpiCarbonImage from '../assets/images/KPI-碳排放.png'
import {
  createEmptyDashboardDeviceStatus,
  loadDashboardDeviceStatus
} from '../services/dashboardDeviceStatusService.js'
import {
  createEmptyDashboardEnergy,
  loadDashboardEnergy
} from '../services/dashboardEnergyApi.js'

const KPI_COLORS = {
  fee: 'var(--accent-gold)',
  rate: 'var(--accent-green)',
  carbon: 'var(--accent-lime)'
}

const energyChart = ref(null)
const trendChart = ref(null)
let energyChartInstance = null
let trendChartInstance = null
let deviceStatusRefreshTimer = null
let energyRefreshTimer = null
let dashboardDisposed = false
let deviceStatusRequestActive = false
let energyRequestActive = false

const dashboardDeviceStatus = ref(createEmptyDashboardDeviceStatus())
const deviceStatusLoading = ref(true)
const dashboardEnergy = ref(createEmptyDashboardEnergy())
const energyLoading = ref(true)
const energyError = ref('')
const iconMap = {
  cost: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m9 7 7 9 7-9M16 16v10M10 18.5h12M10 22.5h12" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  saving: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M25.5 6.5C14.2 7.1 7.5 12.2 8 21.2c7.6.2 13.7-4.6 17.5-14.7Z" fill="currentColor" opacity=".95"/><path d="M8.5 25c3.8-7 8.2-9.7 13.6-12.1" fill="none" stroke="#063e38" stroke-width="2.1" stroke-linecap="round"/><path d="M7 26h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  carbon: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8.5 23c-3.2 0-5.5-2.3-5.5-5.2 0-2.8 2-4.9 4.6-5.3C8.8 8.7 12 6.2 16 6.2c4.8 0 8.7 3.5 9.2 8 2.3.5 3.8 2.2 3.8 4.4 0 2.6-2.1 4.4-5 4.4H8.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="16" y="20" fill="currentColor" font-size="8" font-family="Arial" font-weight="700" text-anchor="middle">CO₂</text></svg>`,
  workshop: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 25.5V11l6.5 3.7V11l6.5 3.7V8.5h9v17" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M9 25.5v-5h4v5M17 25.5v-5h4v5M6 25.5h22" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`,
  grid: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 7h8v8H6zM18 7h8v8h-8zM6 19h8v6H6zM18 19h8v6h-8z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/></svg>`,
  route: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 25c2.4-7.1 2.2-12.2 8-18 5.8 5.8 5.6 10.9 8 18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M16 7v19M11 17h10" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`,
  device: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="8" y="5.5" width="16" height="21" rx="3.5" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M13 10h6M14 22h4M23.5 12.5l4-2M23.5 18.5l4 2M8.5 12.5l-4-2M8.5 18.5l-4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  floors: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 5 11 5-11 5L5 10l11-5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m7 15 9 4 9-4M7 20l9 4 9-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  area: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 12V7h5M20 7h5v5M25 20v5h-5M12 25H7v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M11 21 21 11M11 16v5h5M21 16v-5h-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  energy: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m18 4-10 14h8l-2 10 10-14h-8l2-10Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
  totalEnergy: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="6" width="22" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 21v-5M16 21V11M22 21v-8M9 10h3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  gateway: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 14.5a13 13 0 0 1 18 0M11 18.5a7.4 7.4 0 0 1 10 0M15.5 23h1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  signal: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 24V14M13 24V10M19 24V6M25 24V16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  trendUp: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 25V8M5 25h22M9 20l5-6 4 3 8-9M21 8h5v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  alarm: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25h18M10 22V12a6 6 0 0 1 12 0v10M14 27h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M5.5 13.5 3.8 10M26.5 13.5l1.7-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  warning: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 5 12 21H4L16 5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 12v6M16 23h.1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  shield: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4.5 25 8v7.5c0 5.6-3.4 9.7-9 12-5.6-2.3-9-6.4-9-12V8l9-3.5Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/></svg>`,
  dim: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 6v3M16 23v3M6 16h3M23 16h3M9 9l2 2M21 21l2 2M23 9l-2 2M11 21l-2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="4.5" fill="none" stroke="currentColor" stroke-width="2.1"/></svg>`,
  auto: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 17a7 7 0 0 1 11.8-5.1l2.2 2.2M23 9v5h-5M23 15a7 7 0 0 1-11.8 5.1L9 17.9M9 23v-5h5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

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

const clampValue = (value, min, max) => Math.max(min, Math.min(max, value))
const percentOf = (value, total) => Math.round((value / Math.max(total, 1)) * 100)

const createDeviceHealth = (config) => {
  const total = clampValue(210 + Math.round(config.energyShift * 0.35), 188, 232)
  const offline = clampValue(10 + Math.max(0, -config.rateShift) * 2 + (config.trendShift < -8 ? 4 : 0) - (config.trendShift > 5 ? 2 : 0), 6, 26)
  const abnormal = clampValue(3 + Math.max(0, -config.rateShift) + (config.trendShift < -10 ? 2 : 0), 2, 12)
  const online = total - offline
  const todayAlerts = clampValue(abnormal + Math.max(0, Math.round((12 - config.trendShift) / 6)), 3, 18)

  return {
    total,
    online,
    offline,
    abnormal,
    onlineRate: percentOf(online, total),
    todayAlerts,
    summary: [
      { label: '设备总数', value: `${total}台`, tone: 'total' },
      { label: '在线设备', value: `${online}台`, tone: 'online' },
      { label: '离线设备', value: `${offline}台`, tone: 'offline' },
      { label: '今日告警', value: `${todayAlerts}条`, tone: 'warning' }
    ],
    bars: [
      { label: '在线设备', value: online, percent: percentOf(online, total), tone: 'online' },
      { label: '离线设备', value: offline, percent: percentOf(offline, total), tone: 'offline' }
    ]
  }
}

const createControlStatus = (config) => {
  const total = createDeviceHealth(config).total
  const powerOnPercent = clampValue(68 + config.rateShift * 2 + Math.round(config.trendShift / 3), 52, 82)
  const powerOn = Math.round(total * powerOnPercent / 100)
  const powerOff = total - powerOn
  const autoPercent = clampValue(74 + config.rateShift + Math.round(config.energyShift / 8), 58, 88)
  const auto = Math.round(total * autoPercent / 100)
  const manual = total - auto
  const startupBrightness = clampValue(72 + config.rateShift * 2 + Math.round(config.energyShift / 5), 48, 92)
  const backgroundBrightness = clampValue(42 + config.rateShift + Math.round(config.trendShift / 5), 22, 68)

  return {
    total,
    powerOn,
    powerOff,
    powerOnPercent,
    auto,
    manual,
    autoPercent,
    brightness: [
      { label: '平均开机亮度', value: startupBrightness },
      { label: '平均背景亮度', value: backgroundBrightness }
    ],
    strategies: [
      { label: '无人感策略', value: autoPercent >= 70 ? '已覆盖' : '待优化' },
      { label: '网关联动', value: powerOnPercent >= 60 ? '运行中' : '低负载' }
    ]
  }
}

const makeScene = (config) => ({
  kpis: [
    { label: '累计节约电费', value: config.fee, unit: '元', subLabel: '当前范围', subValue: config.subFee, image: kpiFeeImage, tone: 'blue', valueColor: KPI_COLORS.fee },
    { label: '照明节约率', value: config.rate, unit: '%', subLabel: '效率表现', subValue: config.subRate, image: kpiRateImage, tone: 'green', valueColor: KPI_COLORS.rate },
    { label: '累计碳排放量', value: config.carbon, unit: 't', subLabel: '低碳状态', subValue: config.subCarbon, image: kpiCarbonImage, tone: 'violet', valueColor: KPI_COLORS.carbon }
  ],
  aqi: { label: config.aqiLabel, activeBars: config.activeBars },
  environmentMetrics: [
    { name: 'PM 2.5', icon: 'PM', value: `${config.pm} ug/m³`, status: '正常', progress: config.pmProgress },
    { name: 'CO₂', icon: 'CO', value: `${config.co2} ppm`, status: '正常', progress: config.co2Progress },
    { name: '温度', icon: '温', value: `${config.temperature} ℃`, status: '正常', progress: config.tempProgress },
    { name: '湿度', icon: '湿', value: `${config.humidity} %`, status: '正常', progress: config.humidityProgress }
  ],
  deviceHealth: createDeviceHealth(config),
  controlStatus: createControlStatus(config)
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
const formatMetric = (value, digits = 0) => value === null
  ? '--'
  : new Intl.NumberFormat('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
const formatEnergyTotal = (value) => {
  if (value === null) return '--'
  return value >= 1000 ? `${formatMetric(value / 1000, 1)}MWh` : `${formatMetric(value, 1)}kWh`
}
const dashboardKpis = computed(() => {
  const metrics = dashboardEnergy.value.metrics
  return [
    {
      label: '累计节约电费',
      value: formatMetric(metrics.savedMoneyYuan),
      unit: '元',
      subValue: metrics.yearSavedKWh === null ? '年度节约电量 --' : `年度节约 ${formatMetric(metrics.yearSavedKWh)}kWh`,
      image: kpiFeeImage,
      tone: 'blue',
      valueColor: KPI_COLORS.fee
    },
    {
      label: '照明节约率',
      value: formatMetric(metrics.savingRate, 1),
      unit: '%',
      subValue: '当前统计范围',
      image: kpiRateImage,
      tone: 'green',
      valueColor: KPI_COLORS.rate
    },
    {
      label: '累计碳减排量',
      value: formatMetric(metrics.carbonReductionTons, 2),
      unit: 't',
      subValue: '年度累计减排',
      image: kpiCarbonImage,
      tone: 'violet',
      valueColor: KPI_COLORS.carbon
    }
  ]
})
const currentScene = computed(() => ({
  ...sceneMap[currentSceneKey.value],
  kpis: dashboardKpis.value,
  energy: dashboardEnergy.value.energy,
  trend: dashboardEnergy.value.trend
}))
const currentPathText = computed(() => [currentCampus.value?.label, currentBuilding.value?.label, currentArea.value?.label].filter(Boolean).join(' / '))
const currentPathSegments = computed(() => [currentCampus.value?.label, currentBuilding.value?.label, currentArea.value?.label].filter(Boolean))
const formatInteger = (value) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)
const projectStats = computed(() => [
  { label: '楼层数', value: dashboardDeviceStatus.value.inventory.floors ? `${dashboardDeviceStatus.value.inventory.floors}层` : '--', icon: 'floors', tone: 'blue' },
  { label: '总面积', value: dashboardDeviceStatus.value.inventory.totalArea ? `${formatInteger(dashboardDeviceStatus.value.inventory.totalArea)}㎡` : '--', icon: 'area', tone: 'cyan' },
  { label: '今日能耗', value: dashboardEnergy.value.metrics.todayKWh === null ? '--' : `${formatMetric(dashboardEnergy.value.metrics.todayKWh)}kWh`, icon: 'energy', tone: 'green' },
  { label: '年度总能耗', value: formatEnergyTotal(dashboardEnergy.value.metrics.yearKWh), icon: 'totalEnergy', tone: 'blue' }
])
const deviceTypeRingStyle = computed(() => {
  const { total, cu, gw } = dashboardDeviceStatus.value.inventory
  const cuPercent = total > 0 ? (cu / total) * 100 : 0
  const gwEndPercent = total > 0 ? Math.min(cuPercent + (gw / total) * 100, 100) : 0

  return {
    '--cu-percent': `${cuPercent}%`,
    '--gw-end-percent': `${gwEndPercent}%`,
    '--ring-cu-color': total > 0 ? '#77df79' : 'rgba(84, 118, 151, 0.48)',
    '--ring-gw-color': total > 0 ? '#4398f6' : 'rgba(84, 118, 151, 0.48)',
    '--ring-other-color': total > 0 ? '#ffb347' : 'rgba(84, 118, 151, 0.48)'
  }
})
const connectivityMetrics = computed(() => {
  const connectivity = dashboardDeviceStatus.value.connectivity
  return [
    { label: '在线设备', value: connectivity.available ? `${connectivity.online} 台` : '未接入', tone: 'online' },
    { label: '离线设备', value: connectivity.available ? `${connectivity.offline} 台` : '未接入', tone: 'offline' },
    { label: '在线率', value: connectivity.available ? `${connectivity.onlineRate}%` : '暂无数据', tone: 'rate' }
  ]
})
const alarmMetrics = computed(() => {
  const unavailable = Boolean(dashboardDeviceStatus.value.errors.alarms)
  const alarms = dashboardDeviceStatus.value.alarms
  return [
    { label: '告警总数', value: unavailable ? '--' : alarms.total, tone: 'total' },
    { label: '待处理', value: unavailable ? '--' : alarms.pending, tone: 'pending' },
    { label: '已处理', value: unavailable ? '--' : alarms.processed, tone: 'processed' },
    { label: '已关闭', value: unavailable ? '--' : alarms.closed, tone: 'closed' }
  ]
})
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
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(7,24,42,0.96)', borderColor: 'rgba(85,216,255,0.34)', textStyle: { color: '#e7f2ff' } },
    grid: { left: '3%', right: '3%', bottom: '3%', top: '14%', containLabel: true },
    legend: {
      type: 'plain',
      orient: 'horizontal',
      data: ['标准值', '当前值', '节约率'],
      textStyle: { color: '#c1d3e7', fontSize: 10 },
      top: 0,
      right: 8,
      width: 230,
      itemWidth: 11,
      itemHeight: 7,
      itemGap: 10
    },
    xAxis: { type: 'category', data: chartData.xAxisData, axisLine: { lineStyle: { color: 'rgba(105,176,235,0.24)' } }, axisLabel: { color: '#8fa8c1', fontSize: 10 } },
    yAxis: [
      { type: 'value', name: 'kWh', nameTextStyle: { color: '#8fa8c1', fontSize: 10 }, axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(105,176,235,0.10)' } }, axisLabel: { color: '#8fa8c1', fontSize: 10 } },
      { type: 'value', name: '%', nameTextStyle: { color: '#8fa8c1', fontSize: 10 }, axisLine: { show: false }, splitLine: { show: false }, axisLabel: { color: '#8fa8c1', fontSize: 10 } }
    ],
    series: [
      { name: '标准值', type: 'bar', data: chartData.baseline, itemStyle: { color: 'rgba(113, 140, 166, 0.42)' }, barWidth: '30%' },
      { name: '当前值', type: 'bar', data: chartData.current, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(94, 231, 154, 0.98)' }, { offset: 0.55, color: 'rgba(69, 223, 207, 0.92)' }, { offset: 1, color: 'rgba(85, 216, 255, 0.72)' }], false) }, barWidth: '30%' },
      { name: '节约率', type: 'line', yAxisIndex: 1, data: chartData.saveRate, itemStyle: { color: '#ffd166' }, lineStyle: { width: 2.4 }, symbol: 'circle', symbolSize: 5, smooth: true }
    ]
  })
}
const updateTrendChart = () => {
  if (!trendChartInstance) return
  const chartData = currentScene.value.trend
  const echarts = window.echarts
  trendChartInstance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(7,24,42,0.96)', borderColor: 'rgba(85,216,255,0.34)', textStyle: { color: '#e7f2ff' } },
    grid: { left: '4%', right: '4%', bottom: '4%', top: '15%', containLabel: true },
    legend: { data: ['照明能耗'], textStyle: { color: '#c1d3e7', fontSize: 10 }, top: 2, left: 'center', itemWidth: 14, itemHeight: 7 },
    xAxis: { type: 'category', data: chartData.days, axisLine: { lineStyle: { color: 'rgba(105,176,235,0.24)' } }, axisLabel: { color: '#8fa8c1', fontSize: 9, interval: 4 } },
    yAxis: { type: 'value', name: 'kWh', nameTextStyle: { color: '#8fa8c1', fontSize: 10 }, axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(105,176,235,0.10)' } }, axisLabel: { color: '#8fa8c1', fontSize: 10 } },
    series: [
      {
        name: '照明能耗',
        type: 'line',
        data: chartData.actualKWh,
        itemStyle: { color: '#55d8ff' },
        lineStyle: { width: 2.8, color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#4d9fff' }, { offset: 0.55, color: '#55d8ff' }, { offset: 1, color: '#5ee79a' }]) },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(85, 216, 255, 0.20)' }, { offset: 1, color: 'rgba(85, 216, 255, 0.01)' }]) },
        symbol: 'none',
        smooth: true
      }
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
watch([selectedFilter, currentSceneKey, dashboardEnergy], () => { updateEnergyChart(); updateTrendChart() })

const refreshDashboardEnergy = async () => {
  if (energyRequestActive) return
  energyRequestActive = true
  energyLoading.value = true
  energyError.value = ''

  try {
    const nextEnergy = await loadDashboardEnergy()
    if (!dashboardDisposed) dashboardEnergy.value = nextEnergy
  } catch (error) {
    if (!dashboardDisposed) {
      dashboardEnergy.value = createEmptyDashboardEnergy()
      energyError.value = error?.message || '能耗数据加载失败'
    }
  } finally {
    energyRequestActive = false
    if (!dashboardDisposed) energyLoading.value = false
  }
}

const refreshDashboardDeviceStatus = async () => {
  if (deviceStatusRequestActive) return
  deviceStatusRequestActive = true
  deviceStatusLoading.value = true

  try {
    const nextStatus = await loadDashboardDeviceStatus({ mapId: 'floor1' })
    if (!dashboardDisposed) dashboardDeviceStatus.value = nextStatus
  } finally {
    deviceStatusRequestActive = false
    if (!dashboardDisposed) deviceStatusLoading.value = false
  }
}

onMounted(() => {
  dashboardDisposed = false
  refreshDashboardEnergy()
  refreshDashboardDeviceStatus()
  energyRefreshTimer = window.setInterval(refreshDashboardEnergy, 5 * 60_000)
  deviceStatusRefreshTimer = window.setInterval(refreshDashboardDeviceStatus, 60_000)
  setTimeout(() => { initEnergyChart(); initTrendChart() }, 100)
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  dashboardDisposed = true
  if (energyRefreshTimer) window.clearInterval(energyRefreshTimer)
  if (deviceStatusRefreshTimer) window.clearInterval(deviceStatusRefreshTimer)
  energyRefreshTimer = null
  deviceStatusRefreshTimer = null
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
.dashboard-content { position: relative; z-index: 1; width: 100%; height: 100%; display: grid; grid-template-columns: 380px minmax(0, 1fr) 380px; gap: 16px; padding: 16px; min-height: 0; }
.left-section { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.project-overview-card { flex: 0 0 380px; }
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
.energy-chart-card { min-height: 0; display: flex; flex-direction: column; }
.filter-buttons { display: flex; gap: 8px; margin-bottom: 12px; }
.filter-btn { padding: 7px 16px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03)); border: 1px solid rgba(186, 214, 235, 0.16); border-radius: 999px; color: rgba(234, 243, 252, 0.7); font-size: 12px; cursor: pointer; transition: all 0.3s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
.filter-btn:hover { border-color: rgba(186, 214, 235, 0.28); color: var(--text-1); }
.filter-btn.active { background: linear-gradient(135deg, rgba(255, 203, 114, 0.96), rgba(143, 232, 139, 0.9)); border-color: rgba(255, 232, 177, 0.48); color: #102033; box-shadow: 0 8px 18px rgba(5, 13, 24, 0.12); }
.energy-api-status { flex: 0 0 auto; margin-bottom: 6px; color: rgba(181, 215, 239, 0.82); font-size: 12px; text-align: center; }
.energy-api-status.error { color: #ffb36b; }
.energy-chart { width: 100%; height: 100%; flex: 1; }
.center-section { position: relative; display: grid; grid-template-rows: auto 1fr minmax(360px, 42%); gap: 16px; padding-top: 6px; min-height: 0; }
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
.kpi-row { position: relative; grid-row: 1; display: flex; gap: 16px; justify-content: center; align-items: stretch; padding: 4px 10px 0; }
.kpi-row :deep(.kpi-card) { flex: 1; max-width: 236px; min-height: 126px; }
.kpi-row :deep(.kpi-label) { font-size: 17px; margin-bottom: 12px; letter-spacing: 0.3px; }
.kpi-row :deep(.kpi-value) { font-size: 44px; line-height: 1; letter-spacing: -1px; }
.kpi-row :deep(.kpi-unit) { margin-left: 8px; font-size: 22px; text-shadow: none; }
.kpi-row :deep(.kpi-sub) { margin-top: 16px; font-size: 15px; font-weight: 500; color: rgba(234, 247, 255, 0.86); }
.kpi-row :deep(.sub-icon) { color: inherit; font-size: 14px; }
.center-section .energy-chart-card { position: relative; z-index: 1; grid-row: 3; }
.right-section { display: grid; grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; min-height: 0; }
.trend-chart-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.trend-chart { width: 100%; height: 100%; min-height: 0; flex: 1; }
.device-status-card,
.device-control-card { min-height: 0; display: flex; flex-direction: column; }
.status-overview { display: grid; grid-template-columns: 124px 1fr; gap: 14px; align-items: center; margin-bottom: 12px; min-height: 124px; }
.status-ring,
.control-ring {
  --ring-value: 80%;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 50% 50%, rgba(21, 39, 59, 0.94) 55%, transparent 56%),
    conic-gradient(var(--accent-green) 0 var(--ring-value), rgba(255, 255, 255, 0.13) var(--ring-value) 100%);
  border: 1px solid rgba(186, 214, 235, 0.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 22px rgba(142, 232, 139, 0.08);
}
.status-ring-core,
.control-ring-core { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 82px; height: 82px; border-radius: 50%; background: rgba(25, 45, 67, 0.72); border: 1px solid rgba(186, 214, 235, 0.12); }
.status-ring-core strong,
.control-ring-core strong { font-size: 27px; line-height: 1; color: var(--text-1); font-family: var(--font-num); text-shadow: 0 0 14px rgba(120, 232, 255, 0.12); }
.status-ring-core span,
.control-ring-core span { margin-top: 7px; font-size: 12px; color: var(--text-3); }
.status-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; min-width: 0; }
.status-mini-card,
.strategy-card { min-height: 54px; padding: 9px 10px; border-radius: 10px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)); border: 1px solid rgba(186, 214, 235, 0.14); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
.status-mini-card span,
.strategy-card span { display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-3); }
.status-mini-card strong,
.strategy-card strong { font-size: 18px; line-height: 1; color: var(--text-1); font-family: var(--font-num); }
.status-mini-card.online strong { color: var(--accent-green); }
.status-mini-card.offline strong { color: var(--accent-cloud); }
.status-mini-card.warning strong { color: var(--accent-gold); }
.health-bars,
.control-metrics { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.health-bar-row,
.metric-row { display: flex; flex-direction: column; gap: 7px; }
.health-bar-meta,
.metric-meta,
.compare-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--text-3); }
.health-bar-meta strong,
.metric-meta strong,
.compare-row strong { color: var(--text-1); font-family: var(--font-num); font-size: 14px; }
.health-bar-track,
.metric-track,
.compare-track,
.dual-track { height: 8px; border-radius: 999px; overflow: hidden; background: rgba(255, 255, 255, 0.12); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
.health-bar-fill,
.metric-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); box-shadow: 0 0 10px rgba(120, 232, 255, 0.16); }
.health-bar-fill.offline { background: linear-gradient(90deg, rgba(215, 230, 246, 0.36), rgba(215, 230, 246, 0.72)); }
.health-bar-fill.warning { background: linear-gradient(90deg, var(--accent-gold), rgba(255, 123, 138, 0.86)); }
.control-split { display: grid; grid-template-columns: 116px 1fr; gap: 14px; align-items: center; margin-bottom: 14px; }
.control-ring { background:
    radial-gradient(circle at 50% 50%, rgba(21, 39, 59, 0.94) 55%, transparent 56%),
    conic-gradient(var(--accent-cyan) 0 var(--ring-value), rgba(255, 255, 255, 0.13) var(--ring-value) 100%);
}
.power-compare { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.compare-row.muted strong { color: var(--text-3); }
.compare-track { display: flex; }
.compare-fill,
.dual-fill { height: 100%; }
.compare-fill.on { background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); }
.compare-fill.off { background: rgba(215, 230, 246, 0.26); }
.dual-track { display: flex; height: 9px; }
.dual-fill.auto { background: linear-gradient(90deg, var(--accent-teal), var(--accent-green)); }
.dual-fill.manual { background: linear-gradient(90deg, rgba(255, 203, 114, 0.88), rgba(255, 203, 114, 0.44)); }
.metric-row.compact { gap: 6px; }
.metric-meta-sub { margin-top: -2px; }
.strategy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
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

.dashboard-page {
  background:
    radial-gradient(circle at 50% -12%, rgba(29, 143, 255, 0.24), transparent 31%),
    radial-gradient(circle at 14% 16%, rgba(37, 219, 194, 0.14), transparent 25%),
    radial-gradient(circle at 88% 22%, rgba(121, 77, 255, 0.12), transparent 28%),
    linear-gradient(180deg, #07172a 0%, #051225 52%, #030b18 100%);
}
.dashboard-page::before {
  background:
    linear-gradient(rgba(109, 202, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(109, 202, 255, 0.03) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(180deg, rgba(255,255,255,0.58), transparent 88%);
}
.dashboard-page::after {
  background:
    linear-gradient(180deg, rgba(4, 15, 30, 0.2), rgba(1, 8, 18, 0.58)),
    radial-gradient(circle at 50% 52%, rgba(52, 174, 255, 0.08), transparent 34%);
}
.dashboard-content { grid-template-columns: 380px minmax(0, 1fr) 400px; gap: 18px; padding: 18px 16px 20px; }
.dashboard-content :deep(.data-card) {
  border-color: rgba(58, 157, 236, 0.42);
  background:
    linear-gradient(180deg, rgba(31, 92, 144, 0.24), rgba(9, 35, 68, 0.68) 42%, rgba(6, 24, 49, 0.86)),
    radial-gradient(circle at 14% 0%, rgba(59, 193, 255, 0.14), transparent 32%);
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(202, 237, 255, 0.12),
    inset 0 0 22px rgba(27, 125, 220, 0.08);
}
.dashboard-content :deep(.card-header) { padding: 13px 16px 11px; border-bottom-color: rgba(89, 171, 238, 0.2); }
.dashboard-content :deep(.card-body) { padding: 14px; }
.left-section { gap: 16px; }
.project-overview-card { flex: 0 0 420px; }
.project-hero { display: flex; align-items: center; gap: 13px; margin-bottom: 12px; }
.project-mark { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 12px; color: #69dcff; background: linear-gradient(180deg, rgba(47, 140, 255, 0.24), rgba(19, 62, 116, 0.38)); border: 1px solid rgba(99, 193, 255, 0.28); box-shadow: 0 0 18px rgba(53, 168, 255, 0.14), inset 0 1px 0 rgba(255,255,255,0.12); }
.project-mark svg { width: 34px; height: 34px; filter: drop-shadow(0 0 8px rgba(105, 220, 255, 0.24)); }
.project-name { font-size: 18px; font-weight: 800; color: var(--text-1); line-height: 1.2; }
.project-desc { margin-top: 6px; font-size: 12px; color: rgba(207, 230, 250, 0.72); }
.project-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.project-stat { min-height: 54px; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(78, 159, 232, 0.2); background: linear-gradient(180deg, rgba(24, 74, 124, 0.52), rgba(10, 38, 76, 0.52)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
.project-stat strong { display: block; font-size: 18px; line-height: 1; color: var(--text-1); font-family: var(--font-num); }
.project-stat span:not(.panel-icon) { display: block; margin-top: 5px; font-size: 12px; color: var(--text-3); }
.area-path { margin-bottom: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(8, 30, 61, 0.56); }
.path-label { margin-bottom: 6px; }
.nav-grid { gap: 8px; }
.nav-entry-card { min-height: 58px; padding: 9px 10px; border-radius: 10px; background: linear-gradient(180deg, rgba(31, 91, 148, 0.54), rgba(10, 39, 78, 0.62)); }
.nav-entry-value { font-size: 14px; }
.nav-area-tip { display: none; }
.nav-hint { margin-top: 10px; padding-top: 10px; line-height: 1.45; }
.center-section { grid-template-rows: 230px minmax(0, 1fr); gap: 18px; padding-top: 34px; }
.center-section::before { display: none; }
.kpi-row { gap: 18px; padding: 0; }
.kpi-card-v3 { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 20px 20px 18px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(58, 157, 236, 0.54); background: linear-gradient(180deg, rgba(15, 74, 132, 0.78), rgba(7, 34, 74, 0.86)); box-shadow: 0 18px 34px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.12); }
.kpi-card-v3::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.78; background: radial-gradient(circle at 50% 12%, var(--kpi-glow), transparent 45%); }
.kpi-card-v3.tone-gold { --kpi-main: #ffc65f; --kpi-soft: rgba(255, 198, 95, 0.22); --kpi-glow: rgba(255, 191, 79, 0.22); }
.kpi-card-v3.tone-green { --kpi-main: #62eda2; --kpi-soft: rgba(98, 237, 162, 0.18); --kpi-glow: rgba(71, 236, 157, 0.22); border-color: rgba(65, 227, 157, 0.52); background: linear-gradient(180deg, rgba(8, 95, 83, 0.78), rgba(5, 45, 62, 0.88)); }
.kpi-card-v3.tone-violet { --kpi-main: #c691ff; --kpi-soft: rgba(160, 102, 255, 0.22); --kpi-glow: rgba(160, 102, 255, 0.22); border-color: rgba(142, 94, 255, 0.54); background: linear-gradient(180deg, rgba(51, 35, 118, 0.78), rgba(21, 26, 74, 0.88)); }
.kpi-icon-orb { position: relative; z-index: 1; width: 64px; height: 64px; display: grid; place-items: center; color: var(--kpi-main); border-radius: 50%; background: radial-gradient(circle at 35% 26%, rgba(255,255,255,0.22), transparent 32%), linear-gradient(180deg, var(--kpi-soft), rgba(4, 20, 44, 0.64)); border: 2px solid color-mix(in srgb, var(--kpi-main) 62%, transparent); box-shadow: 0 0 0 6px color-mix(in srgb, var(--kpi-main) 12%, transparent), 0 0 24px color-mix(in srgb, var(--kpi-main) 28%, transparent), inset 0 2px 6px rgba(255,255,255,0.18); }
.kpi-icon-orb svg { width: 34px; height: 34px; filter: drop-shadow(0 0 10px color-mix(in srgb, var(--kpi-main) 38%, transparent)); }
.kpi-label { position: relative; z-index: 1; margin-top: 12px; color: rgba(232, 246, 255, 0.92); font-size: 17px; font-weight: 700; }
.kpi-value-row { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 10px; margin-top: 8px; }
.kpi-value-row strong { color: var(--kpi-main); font-size: 44px; line-height: 1; font-family: var(--font-num); text-shadow: 0 0 22px color-mix(in srgb, var(--kpi-main) 24%, transparent); }
.kpi-value-row span { color: rgba(229, 241, 252, 0.78); font-size: 19px; font-weight: 700; }
.kpi-wave { position: relative; z-index: 1; width: 74%; height: 18px; margin: 6px 0 4px; opacity: 0.68; background: linear-gradient(90deg, transparent, var(--kpi-main), transparent); mask-image: radial-gradient(20px 8px at 20% 50%, #000 30%, transparent 32%), radial-gradient(34px 9px at 50% 58%, #000 30%, transparent 32%), radial-gradient(20px 8px at 80% 50%, #000 30%, transparent 32%); }
.kpi-foot { position: relative; z-index: 1; width: 100%; display: flex; justify-content: space-between; gap: 14px; padding-top: 10px; border-top: 1px solid rgba(198, 230, 255, 0.12); color: rgba(214, 232, 248, 0.74); font-size: 12px; }
.kpi-foot strong { color: rgba(236, 248, 255, 0.92); font-size: 13px; text-align: right; }
.center-section .trend-chart-card { position: relative; z-index: 1; min-height: 0; display: flex; flex-direction: column; }
.center-section .trend-chart { min-height: 0; height: 100%; }
.left-section .energy-chart-card { flex: 1; min-height: 0; }
.left-section .energy-chart { min-height: 0; }
.right-section { display: block; min-height: 0; }
.device-status-card { height: 100%; }
.device-status-card :deep(.card-body) { gap: 14px; }
.status-overview { grid-template-columns: 148px 1fr; gap: 12px; min-height: 152px; margin-bottom: 0; }
.status-ring { width: 142px; height: 142px; background: radial-gradient(circle at 50% 50%, rgba(6, 29, 61, 0.96) 54%, transparent 55%), conic-gradient(#64e487 0 var(--ring-value), #4c91ff var(--ring-value) calc(var(--ring-value) + 12%), #ff9d42 calc(var(--ring-value) + 12%) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 0 26px rgba(73, 209, 255, 0.16); }
.status-ring-core { width: 96px; height: 96px; }
.status-ring-core strong { font-size: 34px; }
.status-ring-core em { margin-top: 5px; color: rgba(216, 234, 249, 0.74); font-size: 12px; font-style: normal; font-family: var(--font-num); }
.status-legend { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.legend-row { display: grid; grid-template-columns: 10px 1fr auto auto; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); }
.legend-row i { width: 9px; height: 9px; border-radius: 50%; background: var(--legend-color); box-shadow: 0 0 10px var(--legend-color); }
.legend-row.online { --legend-color: #64e487; }
.legend-row.offline { --legend-color: #77a8dd; }
.legend-row.warning { --legend-color: #ff6d76; }
.legend-row strong { color: var(--text-1); font-size: 13px; font-family: var(--font-num); }
.legend-row em { color: var(--text-3); font-style: normal; }
.status-metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.status-mini-card { display: flex; align-items: center; gap: 10px; min-height: 76px; padding: 12px; border-radius: 9px; background: linear-gradient(180deg, rgba(28, 83, 139, 0.46), rgba(8, 35, 75, 0.58)); border: 1px solid rgba(76, 154, 225, 0.18); }
.status-mini-card span:not(.panel-icon) { display: block; margin-bottom: 6px; font-size: 12px; color: var(--text-3); }
.status-mini-card strong { font-size: 22px; }
.operation-list { display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 10px; background: rgba(5, 25, 55, 0.38); border: 1px solid rgba(67, 141, 213, 0.14); }
.operation-row { min-height: 48px; display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 10px; border-radius: 8px; background: rgba(21, 65, 111, 0.46); border: 1px solid rgba(78, 159, 232, 0.1); }
.operation-copy { min-width: 0; }
.operation-copy span { display: block; color: rgba(225, 240, 252, 0.82); font-size: 13px; }
.operation-row > strong { color: var(--text-1); font-size: 16px; font-family: var(--font-num); }
.operation-row.green > strong,
.operation-row.cyan > strong { color: #59f0d5; }
.operation-row.warning > strong { color: #ffc65f; }
.operation-progress { margin-top: 7px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; }
.operation-progress div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #42d8ff, #64e487); }
.status-refresh { margin-top: auto; padding-top: 4px; color: var(--text-3); font-size: 12px; text-align: right; }
.panel-icon { flex: 0 0 auto; width: 30px; height: 30px; display: grid; place-items: center; color: #54d5ff; border-radius: 8px; background: rgba(54, 137, 224, 0.16); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 12px rgba(84, 213, 255, 0.1); }
.panel-icon svg { width: 20px; height: 20px; }
.panel-icon.green { color: #64e487; background: rgba(72, 224, 139, 0.14); }
.panel-icon.cyan { color: #48e6ff; background: rgba(72, 230, 255, 0.14); }
.panel-icon.gold,
.panel-icon.warning { color: #ffc65f; background: rgba(255, 198, 95, 0.14); }
.panel-icon.orange { color: #ff9d42; background: rgba(255, 157, 66, 0.14); }
.panel-icon.blue { color: #58a7ff; background: rgba(88, 167, 255, 0.14); }

/* v4 visual refinement: preserve the existing system while placing the center dashboard at the visual foreground. */
.dashboard-content { grid-template-columns: 400px minmax(0, 1fr) 390px; gap: 20px; padding: 18px 20px 22px; }
.dashboard-content :deep(.data-card) { border-color: rgba(58, 157, 236, 0.34); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(202, 237, 255, 0.1), inset 0 0 22px rgba(27, 125, 220, 0.06); }
.left-section { gap: 18px; }
.project-overview-card { flex: 0 0 454px; }
.project-overview-card :deep(.card-body) { padding: 12px; }
.project-factory-visual { position: relative; height: 112px; margin-bottom: 12px; overflow: hidden; border-radius: 7px; border: 1px solid rgba(86, 161, 224, 0.22); background: #0a2344; }
.project-factory-visual img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: 50% 58%; opacity: 0.72; filter: saturate(0.82) brightness(0.78) contrast(1.04); }
.project-factory-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(5, 26, 57, 0.4), transparent 55%), linear-gradient(180deg, transparent 42%, rgba(5, 20, 42, 0.66)); }
.project-brand-badge { position: absolute; top: 10px; left: 10px; padding: 3px 10px 4px; border: 1px solid rgba(205, 229, 255, 0.56); border-radius: 999px; color: #ebf7ff; background: rgba(5, 25, 55, 0.46); font-family: Georgia, serif; font-size: 11px; font-style: italic; letter-spacing: 0.8px; }
.project-hero { margin-bottom: 10px; }
.project-mark { width: 42px; height: 42px; border-radius: 9px; opacity: 0.9; }
.project-mark svg { width: 28px; height: 28px; }
.project-name { font-size: 17px; }
.project-desc { margin-top: 3px; font-size: 11px; }
.project-stats { gap: 7px; margin-bottom: 9px; }
.project-stat { min-height: 50px; padding: 7px 9px; opacity: 0.9; }
.project-stat strong { font-size: 17px; }
.project-stat span:not(.panel-icon) { margin-top: 3px; font-size: 11px; }
.area-path { margin-bottom: 8px; padding: 8px 10px; }
.path-label { margin-bottom: 4px; }
.nav-grid { gap: 7px; }
.nav-entry-card { min-height: 49px; padding: 7px 9px; }
.nav-hint { display: none; }
.side-trend-card { flex: 1; min-height: 0; }
.side-trend-card :deep(.card-body) { padding: 12px 10px 10px; }
.side-trend-card .trend-chart { min-height: 0; }

.center-section { grid-template-rows: 408px minmax(0, 1fr); gap: 24px; padding-top: 2px; }
.kpi-row { gap: 16px; padding: 0 4px; }
.kpi-card-v3 { padding: 26px 22px 20px; border-radius: 10px; border-color: rgba(70, 177, 249, 0.68); box-shadow: 0 20px 38px rgba(0, 0, 0, 0.3), 0 0 20px var(--kpi-soft), inset 0 1px 0 rgba(242, 252, 255, 0.18); }
.kpi-card-v3.tone-green { border-color: rgba(70, 232, 163, 0.66); }
.kpi-card-v3.tone-violet { border-color: rgba(175, 118, 255, 0.7); }
.kpi-icon-orb { width: 78px; height: 78px; box-shadow: 0 0 0 7px color-mix(in srgb, var(--kpi-main) 11%, transparent), 0 0 30px color-mix(in srgb, var(--kpi-main) 32%, transparent), inset 0 2px 8px rgba(255,255,255,0.2); }
.kpi-icon-orb svg { width: 40px; height: 40px; }
.kpi-label { margin-top: 14px; font-size: 18px; }
.kpi-value-row { margin-top: 10px; }
.kpi-value-row strong { font-size: 58px; }
.kpi-value-row span { font-size: 20px; }
.kpi-wave { width: 80%; margin: 8px 0 6px; }
.kpi-foot { padding-top: 13px; font-size: 12px; }
.kpi-foot strong { font-size: 13px; }
.main-energy-card { position: relative; z-index: 1; min-height: 0; display: flex; flex-direction: column; margin-top: 2px; }
.center-section .main-energy-card { grid-row: 2; }
.main-energy-card :deep(.card-body) { padding: 14px 16px 16px; }
.main-energy-card .energy-chart { min-height: 0; }
.filter-buttons { margin-bottom: 8px; }
.filter-btn { padding: 6px 14px; }

.right-section { min-height: 0; }
.device-status-card { background: linear-gradient(180deg, rgba(23, 75, 123, 0.2), rgba(6, 27, 59, 0.76)) !important; }
.device-status-card :deep(.card-body) { padding: 14px 12px 12px; gap: 13px; }
.status-overview { grid-template-columns: 154px 1fr; min-height: 176px; gap: 12px; }
.status-ring { position: relative; isolation: isolate; width: 150px; height: 150px; border: 0; background: radial-gradient(circle at 50% 50%, rgba(4, 25, 54, 0.98) 52%, transparent 53%), conic-gradient(from -16deg, #76e88b 0 calc(var(--ring-value) - 1%), #b9ffad var(--ring-value) calc(var(--ring-value) + 1%), #4c94ff calc(var(--ring-value) + 1%) 100%); box-shadow: 0 0 0 1px rgba(165, 255, 188, 0.28), 0 0 18px rgba(84, 224, 137, 0.22), 0 0 42px rgba(72, 155, 255, 0.12), inset 0 2px 6px rgba(255,255,255,0.35); }
.status-ring::before { content: ''; position: absolute; z-index: -1; inset: 7px; border-radius: inherit; background: conic-gradient(from -16deg, rgba(196, 255, 172, 0.64) 0 calc(var(--ring-value) - 1%), rgba(82, 130, 255, 0.55) calc(var(--ring-value) + 1%) 100%); filter: blur(4px); opacity: 0.86; }
.status-ring::after { content: ''; position: absolute; inset: 12px 30px auto; height: 16px; border-radius: 50%; background: rgba(237, 255, 241, 0.42); filter: blur(6px); transform: rotate(-28deg); }
.status-ring-core { width: 102px; height: 102px; border-color: rgba(161, 240, 255, 0.18); background: radial-gradient(circle at 40% 28%, rgba(29, 90, 144, 0.7), rgba(5, 24, 53, 0.96) 64%); box-shadow: inset 0 1px 8px rgba(152, 240, 255, 0.18); }
.status-ring-core strong { color: #67ef93; font-size: 38px; text-shadow: 0 0 18px rgba(100, 239, 147, 0.6); }
.status-ring-core span { margin-top: 4px; color: rgba(233, 247, 255, 0.9); }
.status-ring-core em { margin-top: 3px; }
.status-legend { gap: 18px; }
.legend-row { grid-template-columns: 9px minmax(0, 1fr) auto auto; gap: 7px; font-size: 13px; }
.legend-row strong { font-size: 17px; }
.legend-row em { font-size: 12px; }
.legend-row.online { --legend-color: #72e888; }
.legend-row.offline { --legend-color: #4c94ff; }
.status-metric-grid { gap: 9px; }
.status-mini-card { min-height: 68px; padding: 10px; background: linear-gradient(180deg, rgba(24, 76, 126, 0.34), rgba(7, 33, 70, 0.46)); }
.status-mini-card strong { font-size: 21px; }
.operation-heading { display: flex; align-items: center; gap: 9px; margin: 4px 4px -4px; color: rgba(233, 246, 255, 0.94); font-size: 14px; font-weight: 650; }
.operation-heading .panel-icon { width: 25px; height: 25px; border-radius: 7px; }
.operation-heading .panel-icon svg { width: 16px; height: 16px; }
.operation-list { gap: 6px; padding: 7px; background: rgba(5, 25, 55, 0.28); }
.operation-row { min-height: 43px; padding: 7px 8px; background: rgba(21, 65, 111, 0.34); }
.operation-copy span { font-size: 12px; }
.operation-row > strong { font-size: 15px; }
.operation-progress { margin-top: 5px; }

/* Reference fidelity pass: proportions and hierarchy measured from the supplied 1680 x 945 design. */
.dashboard-content {
  grid-template-columns: 460px minmax(0, 1fr) 460px;
  gap: 18px;
  padding: 18px 20px 22px;
}
.dashboard-content :deep(.data-card) {
  border-radius: 8px;
  border-color: rgba(36, 132, 225, 0.48);
  background: linear-gradient(180deg, rgba(8, 42, 84, 0.92), rgba(4, 27, 59, 0.94));
  box-shadow: inset 0 1px 0 rgba(135, 220, 255, 0.08), 0 12px 28px rgba(0, 5, 18, 0.22);
}
.dashboard-content :deep(.data-card::before) { height: 1px; opacity: 0.42; }
.dashboard-content :deep(.data-card::after) { opacity: 0.28; }
.dashboard-content :deep(.card-header) { min-height: 48px; padding: 13px 16px 11px; background: transparent; }
.dashboard-content :deep(.title-text) { font-size: 16px; font-weight: 650; letter-spacing: 0; }

.left-section { gap: 16px; }
.project-overview-card { flex: 0 0 520px; }
.project-overview-card :deep(.card-body) { padding: 12px; }
.project-factory-visual { height: 145px; margin-bottom: 14px; border-radius: 6px; }
.project-factory-visual img { opacity: 0.96; filter: saturate(0.9) brightness(0.88) contrast(1.06); object-position: 50% 61%; }
.project-factory-shade { background: linear-gradient(180deg, transparent 55%, rgba(2, 18, 43, 0.28)); }
.project-brand-badge { top: 12px; right: 12px; left: auto; padding: 3px 9px; background: rgba(8, 40, 82, 0.76); }
.project-hero { margin-bottom: 14px; padding: 0 2px; }
.project-copy { min-width: 0; }
.project-name { font-size: 21px; line-height: 1.2; }
.project-desc { margin-top: 7px; font-size: 12px; color: rgba(210, 230, 249, 0.7); }
.project-stats { gap: 8px; margin-bottom: 14px; }
.project-stat { min-height: 61px; gap: 12px; padding: 8px 12px; opacity: 1; background: linear-gradient(180deg, rgba(10, 55, 109, 0.84), rgba(5, 35, 77, 0.92)); border-color: rgba(41, 135, 222, 0.32); }
.project-stat .panel-icon { width: 36px; height: 36px; background: transparent; box-shadow: none; }
.project-stat .panel-icon svg { width: 27px; height: 27px; }
.project-stat span:not(.panel-icon) { margin: 0 0 4px; color: rgba(214, 233, 250, 0.76); font-size: 12px; }
.project-stat strong { font-size: 19px; line-height: 1; }
.area-path { display: none; }
.nav-filters { display: grid; grid-template-columns: 104px minmax(0, 1fr); align-items: center; gap: 8px; margin-top: auto; }
.nav-filters::before { content: '当前筛选策略：'; color: rgba(208, 228, 247, 0.72); font-size: 12px; }
.nav-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.nav-entry-card { min-height: 36px; padding: 6px 10px; border-radius: 6px; background: rgba(5, 31, 68, 0.78); }
.project-overview-card .nav-entry-label { display: none; }
.nav-entry-value { font-size: 12px; font-weight: 500; }
.nav-entry-card-area:disabled { display: none; }
.side-trend-card :deep(.card-body) { padding: 10px 8px 8px; }

.center-section { grid-template-rows: 500px minmax(0, 1fr); gap: 18px; padding-top: 0; }
.kpi-row { gap: 14px; padding: 0; }
.kpi-card-v3 {
  justify-content: flex-start;
  padding: 28px 20px 22px;
  border-radius: 8px;
  border-width: 1px;
  background: linear-gradient(180deg, rgba(4, 48, 102, 0.96), rgba(2, 29, 68, 0.98));
  box-shadow: inset 0 1px 0 rgba(183, 234, 255, 0.15), 0 0 18px rgba(26, 155, 255, 0.18), 0 16px 30px rgba(0, 5, 19, 0.28);
}
.kpi-card-v3::before { opacity: 1; background: radial-gradient(circle at 50% 13%, var(--kpi-glow), transparent 40%); }
.kpi-card-v3::after { content: ''; position: absolute; inset: 1px; border-radius: 7px; pointer-events: none; box-shadow: inset 0 0 26px color-mix(in srgb, var(--kpi-main) 10%, transparent); }
.kpi-card-v3.tone-blue { --kpi-main: #3db7ff; --kpi-value: #d9efff; --kpi-soft: rgba(36, 164, 255, 0.2); --kpi-glow: rgba(27, 152, 255, 0.22); border-color: rgba(45, 169, 255, 0.9); }
.kpi-card-v3.tone-green { --kpi-main: #69f47f; --kpi-value: #70f286; --kpi-soft: rgba(72, 236, 111, 0.18); --kpi-glow: rgba(54, 220, 106, 0.2); border-color: rgba(48, 221, 102, 0.82); background: linear-gradient(180deg, rgba(3, 70, 65, 0.96), rgba(2, 42, 52, 0.98)); }
.kpi-card-v3.tone-violet { --kpi-main: #b987ff; --kpi-value: #bd8cff; --kpi-soft: rgba(161, 92, 255, 0.2); --kpi-glow: rgba(153, 84, 255, 0.22); border-color: rgba(167, 98, 255, 0.86); background: linear-gradient(180deg, rgba(39, 31, 105, 0.96), rgba(21, 22, 70, 0.98)); }
.kpi-icon-orb { width: 112px; height: 112px; border-width: 2px; background: radial-gradient(circle at 38% 30%, rgba(255,255,255,0.23), transparent 25%), radial-gradient(circle, color-mix(in srgb, var(--kpi-main) 32%, #041a38), rgba(3, 22, 52, 0.94) 68%); box-shadow: 0 0 0 7px color-mix(in srgb, var(--kpi-main) 11%, transparent), 0 0 0 10px color-mix(in srgb, var(--kpi-main) 26%, transparent), 0 0 34px color-mix(in srgb, var(--kpi-main) 42%, transparent), inset 0 0 13px color-mix(in srgb, var(--kpi-main) 55%, transparent); }
.kpi-icon-orb::before { content: ''; position: absolute; inset: 13px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--kpi-main) 78%, white 12%); box-shadow: inset 0 0 12px color-mix(in srgb, var(--kpi-main) 34%, transparent); }
.kpi-icon-orb svg { position: relative; z-index: 1; width: 55px; height: 55px; filter: drop-shadow(0 0 12px color-mix(in srgb, var(--kpi-main) 55%, transparent)); }
.kpi-icon-image { position: relative; z-index: 1; width: 118px; height: 118px; display: block; object-fit: contain; }
.kpi-label { margin-top: 22px; font-size: 18px; font-weight: 600; }
.kpi-value-row { flex-direction: column; align-items: center; gap: 0; margin-top: 22px; }
.kpi-value-row strong { color: var(--kpi-value); font-size: 64px; font-weight: 700; line-height: 0.94; }
.kpi-value-row span { margin-top: 10px; color: var(--kpi-value); font-size: 20px; line-height: 1; }
.kpi-wave { position: relative; z-index: 1; width: 88%; height: 28px; margin: 24px auto 13px; overflow: visible; opacity: 0.78; background: none; mask-image: none; }
.kpi-wave path { fill: none; stroke: var(--kpi-main); stroke-width: 1.1; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--kpi-main) 45%, transparent)); }
.kpi-foot { justify-content: flex-start; align-items: center; gap: 10px; margin-top: auto; padding: 14px 0 0; border-top-color: rgba(164, 220, 255, 0.11); }
.kpi-foot-icon { width: 21px; height: 21px; color: var(--kpi-main); flex: 0 0 auto; }
.kpi-foot-icon svg { width: 100%; height: 100%; }
.kpi-foot strong { color: rgba(230, 242, 255, 0.82); font-size: 14px; font-weight: 500; text-align: left; }
.main-energy-card :deep(.card-body) { padding: 12px 16px 14px; }

.right-section { display: grid; grid-template-rows: 500px minmax(0, 1fr); gap: 18px; }
.device-status-card { height: auto; }
.device-status-card :deep(.card-body) { padding: 18px 16px 16px; gap: 20px; }
.status-overview { grid-template-columns: 232px minmax(0, 1fr); min-height: 244px; gap: 14px; }
.status-ring { width: 216px; height: 216px; margin: 0 auto; background: radial-gradient(circle at 50% 50%, rgba(3, 27, 61, 0.98) 51%, transparent 52%), conic-gradient(from -10deg, #79e77d 0 calc(var(--ring-value) - 1%), #b9ff9e var(--ring-value), #2b8fff calc(var(--ring-value) + 0.8%) 99.2%, #ffc35e 99.2% 100%); box-shadow: 0 0 0 2px rgba(71, 220, 115, 0.22), 0 0 28px rgba(71, 226, 119, 0.34), inset 0 4px 7px rgba(235, 255, 224, 0.42), inset 0 -5px 9px rgba(21, 94, 64, 0.72); }
.status-ring::before { inset: 9px; background: conic-gradient(from -10deg, rgba(207,255,176,0.88) 0 calc(var(--ring-value) - 1%), rgba(61, 151, 255, 0.72) var(--ring-value) 99%, rgba(255, 190, 79, 0.7) 99% 100%); filter: blur(5px); opacity: 0.86; }
.status-ring::after { inset: 18px 42px auto; height: 25px; background: rgba(244, 255, 232, 0.5); filter: blur(8px); }
.status-ring-core { width: 142px; height: 142px; background: radial-gradient(circle at 45% 34%, rgba(22, 79, 130, 0.78), rgba(2, 24, 54, 0.98) 66%); border-color: rgba(168, 239, 255, 0.18); box-shadow: inset 0 0 18px rgba(66, 195, 255, 0.14); }
.status-ring-core span { margin: 0 0 8px; color: rgba(237, 248, 255, 0.9); font-size: 17px; }
.status-ring-core strong { color: #71ed81; font-size: 50px; line-height: 0.92; text-shadow: 0 0 18px rgba(93, 239, 125, 0.72); }
.status-legend { gap: 30px; justify-content: center; }
.legend-row { display: grid; grid-template-columns: 11px minmax(0, 1fr); gap: 11px; align-items: start; }
.legend-row i { width: 10px; height: 10px; margin-top: 4px; }
.legend-copy > span { display: block; color: rgba(225, 239, 252, 0.9); font-size: 14px; }
.legend-copy > div { display: flex; align-items: baseline; gap: 14px; margin-top: 9px; }
.legend-copy strong { font-size: 21px; font-weight: 600; white-space: nowrap; }
.legend-copy em { color: rgba(211, 230, 248, 0.72); font-size: 13px; font-style: normal; }
.status-metric-grid { gap: 12px; }
.status-mini-card { min-height: 102px; gap: 15px; padding: 14px 16px; background: linear-gradient(180deg, rgba(8, 53, 104, 0.78), rgba(4, 34, 75, 0.88)); border-color: rgba(35, 127, 214, 0.28); }
.status-mini-card .panel-icon { width: 52px; height: 52px; background: transparent; box-shadow: none; }
.status-mini-card .panel-icon svg { width: 44px; height: 44px; }
.status-mini-card span:not(.panel-icon) { margin-bottom: 7px; font-size: 13px; }
.status-mini-card strong { font-size: 30px; }
.operation-card { min-height: 0; }
.operation-card :deep(.card-body) { padding: 12px; }
.operation-list { gap: 7px; padding: 0; border: 0; background: transparent; }
.operation-row { min-height: 52px; padding: 8px 12px; background: rgba(8, 45, 89, 0.72); border-color: rgba(42, 126, 207, 0.2); }
.operation-row .panel-icon { width: 30px; height: 30px; background: transparent; box-shadow: none; }
.operation-copy span { font-size: 13px; }
.operation-row > strong { font-size: 16px; }
.status-refresh { display: none; }

/* Final hierarchy pass: KPI > real-time energy > side panels. */
.dashboard-content :deep(.data-card) {
  border-color: rgba(31, 116, 198, 0.3);
  box-shadow: inset 0 1px 0 rgba(125, 207, 255, 0.06), 0 10px 24px rgba(0, 5, 18, 0.18);
}
.project-overview-card,
.side-trend-card,
.device-status-card,
.operation-card { border-color: rgba(31, 116, 198, 0.34) !important; }
.main-energy-card {
  border-color: rgba(53, 168, 255, 0.68) !important;
  box-shadow: inset 0 1px 0 rgba(168, 226, 255, 0.12), 0 0 18px rgba(38, 145, 238, 0.12), 0 13px 28px rgba(0, 6, 20, 0.22) !important;
}
.main-energy-card::before { opacity: 0.72 !important; }
.project-overview-card { flex-basis: 452px; }
.project-stats { margin-bottom: 0; }

.kpi-card-v3 {
  border-width: 1.5px;
  border-color: color-mix(in srgb, var(--kpi-main) 72%, rgba(219, 244, 255, 0.78));
  box-shadow: inset 0 1px 0 rgba(215, 245, 255, 0.2), inset 0 0 0 1px color-mix(in srgb, var(--kpi-main) 28%, transparent), inset 0 0 34px color-mix(in srgb, var(--kpi-main) 16%, transparent), 0 0 0 1px color-mix(in srgb, var(--kpi-main) 30%, transparent), 0 0 18px color-mix(in srgb, var(--kpi-main) 38%, transparent), 0 18px 34px rgba(0, 4, 18, 0.32);
}

/* KPI visual system: bright frame with four HUD-style corner brackets. */
.kpi-card-v3::after {
  inset: 0;
  border-radius: 8px;
  z-index: 2;
  background:
    linear-gradient(90deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) left top / 54px 2px no-repeat,
    linear-gradient(180deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) left top / 2px 54px no-repeat,
    linear-gradient(270deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) right top / 54px 2px no-repeat,
    linear-gradient(180deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) right top / 2px 54px no-repeat,
    linear-gradient(90deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) left bottom / 54px 2px no-repeat,
    linear-gradient(0deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) left bottom / 2px 54px no-repeat,
    linear-gradient(270deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) right bottom / 54px 2px no-repeat,
    linear-gradient(0deg, var(--kpi-main), color-mix(in srgb, var(--kpi-main) 12%, transparent)) right bottom / 2px 54px no-repeat;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--kpi-main) 56%, transparent));
}
.kpi-icon-orb {
  width: 118px;
  height: 118px;
  border: 2px solid color-mix(in srgb, var(--kpi-main) 82%, white 12%);
  background:
    radial-gradient(circle at 36% 27%, rgba(255,255,255,0.34), transparent 19%),
    radial-gradient(circle at 50% 54%, color-mix(in srgb, var(--kpi-main) 42%, #061b3a), rgba(3, 20, 49, 0.98) 69%);
  box-shadow:
    0 0 0 6px color-mix(in srgb, var(--kpi-main) 10%, transparent),
    0 0 0 9px color-mix(in srgb, var(--kpi-main) 42%, transparent),
    0 0 0 13px color-mix(in srgb, var(--kpi-main) 8%, transparent),
    0 0 35px color-mix(in srgb, var(--kpi-main) 54%, transparent),
    inset 0 2px 4px rgba(255,255,255,0.3),
    inset 0 -9px 15px rgba(0, 7, 29, 0.72);
}
.kpi-icon-orb::before { inset: 15px; border-width: 2px; border-color: color-mix(in srgb, var(--kpi-main) 88%, white 16%); box-shadow: 0 0 12px color-mix(in srgb, var(--kpi-main) 56%, transparent), inset 0 0 15px color-mix(in srgb, var(--kpi-main) 45%, transparent); }
.kpi-icon-orb::after { content: ''; position: absolute; z-index: 2; top: 14px; left: 24px; width: 48px; height: 15px; border-radius: 50%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.46), transparent); filter: blur(3px); transform: rotate(-18deg); pointer-events: none; }
.kpi-icon-orb svg { width: 58px; height: 58px; filter: drop-shadow(0 0 14px color-mix(in srgb, var(--kpi-main) 68%, transparent)); }
.kpi-label { margin-top: 24px; font-size: 19px; font-weight: 650; color: rgba(241, 249, 255, 0.96); text-shadow: 0 0 12px color-mix(in srgb, var(--kpi-main) 28%, transparent); }
.kpi-value-row { margin-top: 21px; }
.kpi-value-row strong { font-family: Bahnschrift, 'Arial Narrow', 'Microsoft YaHei', sans-serif; font-size: 66px; font-weight: 700; letter-spacing: 0; text-shadow: 0 0 20px color-mix(in srgb, var(--kpi-main) 30%, transparent); }
.kpi-value-row span { margin-top: 11px; font-size: 20px; font-weight: 650; text-shadow: 0 0 10px color-mix(in srgb, var(--kpi-main) 24%, transparent); }
.kpi-wave { height: 32px; margin-top: 20px; opacity: 0.92; }
.kpi-wave .wave-horizon { stroke-width: 0.7; opacity: 0.22; }
.kpi-wave .wave-primary { stroke-width: 1.35; opacity: 0.9; }
.kpi-wave .wave-secondary { stroke-width: 1; opacity: 0.54; }
.kpi-wave circle { fill: var(--kpi-main); stroke: rgba(255,255,255,0.52); stroke-width: 0.6; filter: drop-shadow(0 0 4px var(--kpi-main)); }
.kpi-foot { border-top-color: color-mix(in srgb, var(--kpi-main) 17%, transparent); }
.kpi-foot { justify-content: center; }
.kpi-foot strong { text-align: center; }
.main-energy-card .filter-buttons { margin: 0 0 0 auto; gap: 6px; }
.main-energy-card .filter-btn { min-height: 26px; padding: 4px 11px; font-size: 11px; }

.status-overview { grid-template-columns: 204px minmax(0, 1fr); min-height: 220px; }
.status-ring {
  width: 188px;
  height: 188px;
  border: 1px solid rgba(82, 188, 225, 0.26);
  background:
    radial-gradient(circle at 50% 50%, rgba(3, 28, 61, 0.98) 58%, transparent 59%),
    conic-gradient(from -9deg, #63dc82 0 var(--ring-value), #348ee8 var(--ring-value) 100%);
  box-shadow: 0 0 14px rgba(65, 207, 123, 0.14), inset 0 1px 2px rgba(255,255,255,0.18);
}
.status-ring::before { inset: 8px; background: none; border: 1px solid rgba(153, 242, 176, 0.26); filter: none; opacity: 1; }
.status-ring::after { top: 14px; left: 52px; right: 52px; height: 7px; background: rgba(226, 255, 231, 0.32); filter: blur(4px); transform: none; }
.status-ring-core { width: 126px; height: 126px; background: rgba(3, 27, 59, 0.98); border-color: rgba(75, 163, 207, 0.18); box-shadow: inset 0 0 12px rgba(56, 160, 214, 0.08); }
.status-ring-core span { margin-bottom: 7px; font-size: 15px; }
.status-ring-core strong { font-size: 44px; color: #68e183; text-shadow: 0 0 12px rgba(90, 226, 123, 0.34); }
.status-legend { gap: 24px; }

/* Dashboard right column refinement. */
.right-section { display: block; min-height: 0; }
.device-health-card {
  height: 100%;
  min-height: 0;
  border-color: rgba(31, 116, 198, 0.34) !important;
  background: linear-gradient(180deg, rgba(9, 43, 83, 0.92), rgba(4, 27, 58, 0.95)) !important;
}
.device-health-card :deep(.card-header) { min-height: 46px; padding-top: 11px; padding-bottom: 10px; }
.device-health-card :deep(.title-bar) {
  width: 9px;
  height: 9px;
  background: #68e68b;
  box-shadow: 0 0 0 4px rgba(76, 221, 135, 0.1), 0 0 12px rgba(76, 221, 135, 0.4);
}
.device-health-card :deep(.title-text) { color: rgba(240, 249, 255, 0.98); font-size: 17px; font-weight: 650; }
.device-health-card :deep(.card-body) {
  min-height: 0;
  padding: 10px 18px 14px;
  gap: 0;
  overflow: hidden;
}
.device-health-loading { flex: 1; display: grid; place-items: center; color: rgba(183, 210, 234, 0.68); font-size: 13px; }
.inventory-section {
  flex: 1.04;
  min-height: 232px;
  display: grid;
  grid-template-columns: 214px minmax(0, 1fr);
  align-items: center;
  gap: 34px;
  padding: 6px 6px 10px 0;
  border-bottom: 1px solid rgba(84, 151, 205, 0.16);
}
.inventory-ring {
  position: relative;
  isolation: isolate;
  width: 200px;
  height: 200px;
  display: grid;
  place-items: center;
  margin: 0 auto;
  border: 1px solid rgba(133, 235, 139, 0.56);
  border-radius: 50%;
  background: conic-gradient(from -6deg, var(--ring-cu-color) 0 var(--cu-percent), var(--ring-gw-color) var(--cu-percent) var(--gw-end-percent), var(--ring-other-color) var(--gw-end-percent) 100%);
  box-shadow: 0 6px 18px rgba(0, 13, 35, 0.24), inset 0 2px 4px rgba(238, 255, 227, 0.44), inset 0 -5px 10px rgba(23, 102, 54, 0.52);
}
.inventory-ring::before {
  display: none;
}
.inventory-ring::after {
  display: none;
}
.inventory-ring-core {
  position: relative;
  z-index: 1;
  width: 122px;
  height: 122px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 1px solid rgba(130, 207, 180, 0.2);
  border-radius: 50%;
  background: #031938;
  box-shadow: 0 0 0 1px rgba(0, 12, 37, 0.3);
}
.inventory-ring-core strong {
  color: #79e481;
  font-family: Bahnschrift, 'Arial Narrow', 'Microsoft YaHei', sans-serif;
  font-size: 40px;
  font-weight: 680;
  text-shadow: none;
}
.inventory-ring-core span { margin-top: 8px; color: rgba(210, 233, 226, 0.78); font-size: 12px; }
.inventory-breakdown { min-width: 0; padding-left: 2px; }
.inventory-row {
  min-height: 58px;
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(84, 151, 205, 0.12);
  color: rgba(203, 226, 245, 0.78);
  font-size: 13px;
}
.inventory-row:last-child { border-bottom: 0; }
.inventory-row i { width: 8px; height: 8px; border-radius: 50%; background: #55dfaa; box-shadow: 0 0 8px rgba(85, 223, 170, 0.45); }
.inventory-row.gw i { background: #4d9fff; box-shadow: 0 0 8px rgba(77, 159, 255, 0.45); }
.inventory-row.region i { background: #ffc65f; box-shadow: 0 0 7px rgba(255, 198, 95, 0.25); }
.inventory-row strong { color: #55dfaa; font-size: 24px; font-weight: 650; text-align: right; }
.inventory-row.gw strong { color: #64adff; }
.inventory-row.region strong { color: #ffc65f; }
.device-section-heading {
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: rgba(230, 243, 253, 0.94);
  font-size: 14px;
  font-weight: 650;
}
.connectivity-section {
  flex: 1;
  min-height: 226px;
  display: flex;
  flex-direction: column;
  padding: 12px 0 14px;
  border-bottom: 1px solid rgba(84, 151, 205, 0.16);
}
.connectivity-badge {
  padding: 3px 8px;
  border-radius: 4px;
  color: rgba(170, 196, 220, 0.78);
  background: rgba(94, 123, 153, 0.16);
  font-size: 10px;
  font-weight: 400;
}
.connectivity-badge.available { color: var(--success); background: rgba(55, 204, 122, 0.12); }
.connectivity-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(3, minmax(54px, 1fr));
  gap: 9px;
  margin-top: 8px;
}
.connectivity-item {
  min-width: 0;
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  border: 1px solid rgba(55, 132, 201, 0.2);
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(12, 54, 99, 0.72), rgba(8, 41, 80, 0.48));
}
.connectivity-label { display: flex; align-items: center; gap: 12px; color: rgba(207, 228, 246, 0.84); font-size: 15px; }
.connectivity-label i,
.alarm-summary-item span i { width: 8px; height: 8px; border-radius: 50%; background: #55dfaa; box-shadow: 0 0 7px rgba(85, 223, 170, 0.34); }
.connectivity-item strong { color: #55dfaa; font-size: 20px; font-weight: 650; }
.connectivity-item.offline .connectivity-label i { background: #7692ad; box-shadow: none; }
.connectivity-item.offline strong { color: rgba(164, 190, 214, 0.82); }
.connectivity-item.rate .connectivity-label i { background: #51d8ef; box-shadow: 0 0 7px rgba(81, 216, 239, 0.34); }
.connectivity-item.rate strong { color: #65dcf1; }
.alarm-summary-section {
  flex: 1.04;
  min-height: 236px;
  display: flex;
  flex-direction: column;
  padding: 12px 0 0;
}
.alarm-summary-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(90px, 1fr));
  gap: 10px;
  margin-top: 8px;
}
.alarm-summary-item {
  min-width: 0;
  min-height: 90px;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid rgba(55, 132, 201, 0.2);
  border-radius: 6px;
  background: linear-gradient(145deg, rgba(12, 54, 99, 0.76), rgba(7, 38, 75, 0.58));
}
.alarm-summary-item span { display: flex; align-items: center; gap: 9px; color: rgba(196, 220, 240, 0.8); font-size: 14px; }
.alarm-summary-item strong { color: #ffab54; font-size: 36px; font-weight: 680; line-height: 1; text-align: center; }
.alarm-summary-item.total span i { background: #ffab54; box-shadow: 0 0 7px rgba(255, 171, 84, 0.3); }
.alarm-summary-item.pending span i { background: #ffd166; box-shadow: 0 0 7px rgba(255, 209, 102, 0.3); }
.alarm-summary-item.pending strong { color: #ffd166; }
.alarm-summary-item.processed span i { background: #55dfaa; }
.alarm-summary-item.processed strong { color: #55dfaa; }
.alarm-summary-item.closed span i { background: #7893ad; box-shadow: none; }
.alarm-summary-item.closed strong { color: rgba(155, 183, 207, 0.8); }
.device-source-warning { padding: 7px 0; color: rgba(255, 187, 102, 0.9); font-size: 11px; }
</style>

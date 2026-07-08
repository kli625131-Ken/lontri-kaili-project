<template>
  <div class="linkage-page">
    <div class="linkage-layout">
      <div class="left-column">
        <DataCard title="接入系统与鉴权" class="system-card">
          <div class="system-list">
            <button
              v-for="system in controlSystems"
              :key="system.id"
              class="system-item"
              :class="{ active: selectedSystemId === system.id }"
              @click="selectedSystemId = system.id"
            >
              <div class="system-head">
                <span class="system-name">{{ system.name }}</span>
                <span class="system-status" :class="system.status">{{ system.statusText }}</span>
              </div>
              <div class="system-meta">{{ system.authMode }} · {{ system.owner }}</div>
              <div class="system-foot">
                <span>最近调用 {{ system.lastCall }}</span>
                <span>{{ system.permissions.filter((item) => item.granted).length }} 个区域已授权</span>
              </div>
            </button>
          </div>
        </DataCard>

        <DataCard title="区域调用权限" class="permission-card">
          <div class="permission-summary">
            <div class="mini-kpi">
              <span>鉴权方式</span>
              <strong>{{ currentSystem.authMode }}</strong>
            </div>
            <div class="mini-kpi">
              <span>审批级别</span>
              <strong>{{ currentSystem.approvalLevel }}</strong>
            </div>
          </div>

          <div class="permission-list">
            <div v-for="permission in currentSystem.permissions" :key="permission.area" class="permission-item">
              <div class="permission-top">
                <div>
                  <div class="permission-area">{{ permission.area }}</div>
                  <div class="permission-scene">默认调用场景：{{ permission.sceneName }}</div>
                </div>
                <button
                  class="toggle-pill"
                  :class="{ active: permission.granted }"
                  @click="permission.granted = !permission.granted"
                >
                  {{ permission.granted ? '已授权' : '已禁用' }}
                </button>
              </div>

              <div class="permission-actions">
                <button
                  v-for="action in actionCatalog"
                  :key="action"
                  class="action-chip"
                  :class="{ active: permission.actions.includes(action) }"
                  @click="toggleAction(permission, action)"
                >
                  {{ action }}
                </button>
              </div>

              <div class="permission-foot">
                <span>审批链：{{ permission.approval }}</span>
                <span>风险控制：{{ permission.limit }}</span>
              </div>
            </div>
          </div>
        </DataCard>
      </div>

      <div class="center-column">
        <DataCard title="生产排班计划" class="schedule-card">
          <template #header-extra>
            <div class="date-nav">
              <button class="nav-btn" @click="changeDate(-1)">前一天</button>
              <span class="date-text">{{ formattedDate }}</span>
              <button class="nav-btn" @click="changeDate(1)">后一天</button>
            </div>
          </template>

          <div class="timeline-card">
            <div class="timeline-head">
              <span v-for="hour in timelineMarks" :key="hour" class="time-mark">{{ hour }}</span>
            </div>
            <div class="timeline-body">
              <div class="timeline-grid">
                <span v-for="index in 24" :key="index" class="grid-line"></span>
              </div>

              <div
                v-for="schedule in schedules"
                :key="schedule.id"
                class="timeline-row"
                :class="{ selected: selectedScheduleId === schedule.id }"
                @click="selectedScheduleId = schedule.id"
              >
                <div class="timeline-label">
                  <strong>{{ schedule.name }}</strong>
                  <span>{{ schedule.area }}</span>
                </div>
                <div class="timeline-track">
                  <div
                    v-for="segment in getScheduleSegments(schedule)"
                    :key="segment.key"
                    class="timeline-bar"
                    :class="[schedule.barClass, { disabled: !schedule.enabled }]"
                    :style="{ left: `${segment.left}%`, width: `${segment.width}%` }"
                  >
                    <span>{{ schedule.sceneName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="schedule-list">
            <div
              v-for="schedule in schedules"
              :key="schedule.id"
              class="schedule-item"
              :class="{ active: selectedScheduleId === schedule.id }"
              @click="selectedScheduleId = schedule.id"
            >
              <div class="schedule-top">
                <div>
                  <div class="schedule-name">{{ schedule.name }}</div>
                  <div class="schedule-detail">{{ schedule.area }} · {{ schedule.startTime }} - {{ schedule.endTime }}</div>
                </div>
                <button
                  class="toggle-pill"
                  :class="{ active: schedule.enabled }"
                  @click.stop="schedule.enabled = !schedule.enabled"
                >
                  {{ schedule.enabled ? '自动执行' : '停用' }}
                </button>
              </div>
              <div class="schedule-foot">
                <span>预开灯 {{ schedule.warmup }} 分钟</span>
                <span>收尾延时 {{ schedule.shutdownDelay }} 分钟</span>
                <span>场景 {{ schedule.sceneName }}</span>
              </div>
            </div>
          </div>
        </DataCard>

        <DataCard :title="`${currentSchedule.name} 联动策略`" class="logic-card">
          <div class="logic-summary">
            <div class="logic-kpi">
              <span>触发方式</span>
              <strong>{{ currentSchedule.triggerMode }}</strong>
            </div>
            <div class="logic-kpi">
              <span>结束后场景</span>
              <strong>{{ currentSchedule.fallbackScene }}</strong>
            </div>
            <div class="logic-kpi">
              <span>当前审批</span>
              <strong>{{ currentSchedule.approvalMode }}</strong>
            </div>
          </div>

          <div class="form-grid">
            <div class="field">
              <label>触发逻辑</label>
              <select v-model="currentSchedule.triggerMode">
                <option value="按排班开始">按排班开始</option>
                <option value="排班 + 工单双校验">排班 + 工单双校验</option>
                <option value="排班 + 区域空闲校验">排班 + 区域空闲校验</option>
              </select>
              <p>严格权限下建议与排班系统事件联合校验。</p>
            </div>

            <div class="field">
              <label>生产开始前预开灯</label>
              <input v-model.number="currentSchedule.warmup" type="number" min="0" />
              <span class="field-suffix">分钟</span>
              <p>排班开始前提前打开目标区域灯光。</p>
            </div>

            <div class="field">
              <label>生产结束后延时关灯</label>
              <input v-model.number="currentSchedule.shutdownDelay" type="number" min="0" />
              <span class="field-suffix">分钟</span>
              <p>避免班尾人员撤场时照明骤停。</p>
            </div>

            <div class="field">
              <label>联动场景</label>
              <select v-model="currentSchedule.sceneId">
                <option v-for="scene in sceneLibrary" :key="scene.id" :value="scene.id">
                  {{ scene.name }}
                </option>
              </select>
              <p>当前排班自动调用的照明场景。</p>
            </div>

            <div class="field">
              <label>结束后回落场景</label>
              <select v-model="currentSchedule.fallbackScene">
                <option value="停产保安">停产保安</option>
                <option value="节能待机">节能待机</option>
                <option value="保持当前场景">保持当前场景</option>
              </select>
              <p>生产结束后的默认回落照明策略。</p>
            </div>

            <div class="field">
              <label>审批模式</label>
              <select v-model="currentSchedule.approvalMode">
                <option value="排班自动执行">排班自动执行</option>
                <option value="生产主管确认">生产主管确认</option>
                <option value="调度 + 运维双确认">调度 + 运维双确认</option>
              </select>
              <p>高风险区域建议采用双确认或人工确认。</p>
            </div>
          </div>

          <div class="logic-actions">
            <button class="primary-btn" @click="saveLinkage">保存联动策略</button>
            <button class="secondary-btn" @click="simulateLinkage">模拟执行一次</button>
            <span class="status-text">{{ linkageMessage }}</span>
          </div>
        </DataCard>
      </div>

      <div class="right-column">
        <DataCard title="照明场景预设" class="scene-card">
          <div class="scene-grid">
            <button
              v-for="scene in sceneLibrary"
              :key="scene.id"
              class="scene-box"
              :class="{ active: selectedSceneId === scene.id }"
              @click="selectScene(scene.id)"
            >
              <div class="scene-box-top">
                <span class="scene-name">{{ scene.name }}</span>
                <span class="scene-type">{{ scene.scope }}</span>
              </div>
              <div class="scene-values">亮度 {{ scene.brightness }}% · 色温 {{ scene.colorTemp }}K</div>
              <div class="scene-desc">{{ scene.desc }}</div>
            </button>
          </div>
        </DataCard>

        <DataCard title="执行状态与记录" class="record-card">
          <div class="record-kpis">
            <div class="mini-kpi">
              <span>已授权区域</span>
              <strong>{{ grantedAreaCount }}</strong>
            </div>
            <div class="mini-kpi">
              <span>自动排班</span>
              <strong>{{ enabledScheduleCount }}</strong>
            </div>
            <div class="mini-kpi">
              <span>今日执行</span>
              <strong>{{ executionRecords.length }} 次</strong>
            </div>
          </div>

          <div class="queue-box">
            <div class="queue-title">下一条待执行</div>
            <div class="queue-main">{{ nextExecution.event }}</div>
            <div class="queue-detail">{{ nextExecution.detail }}</div>
          </div>

          <div class="record-list">
            <div v-for="record in executionRecords" :key="record.id" class="record-item">
              <span class="record-time">{{ record.time }}</span>
              <div class="record-main">
                <div class="record-event">{{ record.event }}</div>
                <div class="record-detail">{{ record.detail }}</div>
              </div>
              <span class="record-status" :class="record.status">{{ record.statusText }}</span>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import DataCard from '../components/DataCard.vue'

const timelineMarks = ['00:00', '06:00', '12:00', '18:00', '24:00']
const actionCatalog = ['开灯', '关灯', '切换场景', '亮度调整']

const controlSystems = ref([
  {
    id: 'mes',
    name: 'MES 生产管理系统',
    status: 'active',
    statusText: '已授权',
    authMode: 'Token + IP 白名单',
    approvalLevel: '生产调度自动审批',
    owner: '生产调度中心',
    lastCall: '14:08',
    permissions: [
      { area: '酿造一车间', sceneName: '生产全亮', actions: ['开灯', '关灯', '切换场景'], approval: '排班自动执行', limit: '不允许越权跨区', granted: true },
      { area: '包装中心', sceneName: '包装生产', actions: ['开灯', '关灯', '切换场景', '亮度调整'], approval: '生产主管确认', limit: '亮度不得超过 95%', granted: true },
      { area: '仓储区', sceneName: '收发作业', actions: ['开灯', '关灯'], approval: '排班自动执行', limit: '仅允许主通道与月台', granted: true }
    ]
  },
  {
    id: 'wms',
    name: 'WMS 仓储系统',
    status: 'standby',
    statusText: '受限授权',
    authMode: 'AppKey + 签名',
    approvalLevel: '仓储主管确认',
    owner: '仓储运营组',
    lastCall: '09:36',
    permissions: [
      { area: '仓储区', sceneName: '节能待机', actions: ['开灯', '关灯'], approval: '仓储主管确认', limit: '仅允许仓储区调用', granted: true },
      { area: '包装中心', sceneName: '待机补光', actions: ['切换场景'], approval: '人工审批', limit: '不可直接开关灯', granted: false }
    ]
  }
])

const sceneLibrary = ref([
  { id: 'production-full', name: '生产全亮', scope: '生产', brightness: 100, colorTemp: 5200, desc: '排班开始后立即启用，保障工位和安全标识识别。' },
  { id: 'packaging', name: '包装生产', scope: '生产', brightness: 95, colorTemp: 5000, desc: '适配包装线高速运转时的高显色需求。' },
  { id: 'inspection', name: '巡检维护', scope: '维护', brightness: 68, colorTemp: 4600, desc: '适合巡检、保养和短时故障排查。' },
  { id: 'energy-save', name: '节能待机', scope: '节能', brightness: 35, colorTemp: 4000, desc: '排班空档或等待工单时保持基础照明。' },
  { id: 'security', name: '停产保安', scope: '保安', brightness: 18, colorTemp: 3400, desc: '生产结束后维持通道与安全点位照明。' }
])

const schedules = ref([
  { id: 1, name: '酿造早班', area: '酿造一车间', startTime: '06:30', endTime: '14:30', enabled: true, barClass: 'day', warmup: 20, shutdownDelay: 12, triggerMode: '按排班开始', sceneId: 'production-full', sceneName: '生产全亮', fallbackScene: '停产保安', approvalMode: '排班自动执行' },
  { id: 2, name: '包装中班', area: '包装中心', startTime: '14:00', endTime: '22:00', enabled: true, barClass: 'swing', warmup: 15, shutdownDelay: 8, triggerMode: '排班 + 工单双校验', sceneId: 'packaging', sceneName: '包装生产', fallbackScene: '节能待机', approvalMode: '生产主管确认' },
  { id: 3, name: '仓储夜班', area: '仓储区', startTime: '22:00', endTime: '05:30', enabled: false, barClass: 'night', warmup: 10, shutdownDelay: 20, triggerMode: '排班 + 区域空闲校验', sceneId: 'energy-save', sceneName: '节能待机', fallbackScene: '停产保安', approvalMode: '调度 + 运维双确认' }
])

const executionRecords = ref([
  { id: 1, time: '05:40', event: '酿造早班预开灯', detail: '酿造一车间切换至“生产全亮”场景，排班提前 20 分钟触发。', status: 'success', statusText: '成功' },
  { id: 2, time: '13:12', event: '包装线工单校验通过', detail: '包装中心已满足工单条件，等待 14:00 排班自动切换。', status: 'pending', statusText: '待执行' },
  { id: 3, time: '22:00', event: '仓储夜班联动锁定', detail: '因双确认未完成，仓储区自动开灯被阻止。', status: 'warning', statusText: '拦截' }
])

const selectedSystemId = ref('mes')
const selectedScheduleId = ref(1)
const selectedSceneId = ref('production-full')
const scheduleDate = ref(new Date('2026-03-13T00:00:00'))
const linkageMessage = ref('最近一次保存：未执行')

const currentSystem = computed(() => controlSystems.value.find((item) => item.id === selectedSystemId.value) ?? controlSystems.value[0])
const currentSchedule = computed(() => schedules.value.find((item) => item.id === selectedScheduleId.value) ?? schedules.value[0])
const selectedScene = computed(() => sceneLibrary.value.find((item) => item.id === selectedSceneId.value) ?? sceneLibrary.value[0])
const grantedAreaCount = computed(() => currentSystem.value.permissions.filter((item) => item.granted).length)
const enabledScheduleCount = computed(() => schedules.value.filter((item) => item.enabled).length)
const formattedDate = computed(() => {
  const date = scheduleDate.value
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
})
const nextExecution = computed(() => {
  const record = executionRecords.value.find((item) => item.status === 'pending')
  return record ?? executionRecords.value[0]
})

watch(
  () => currentSchedule.value.sceneId,
  (sceneId) => {
    const scene = sceneLibrary.value.find((item) => item.id === sceneId)
    if (scene) {
      currentSchedule.value.sceneName = scene.name
      selectedSceneId.value = sceneId
    }
  },
  { immediate: true }
)

const timeToMinutes = (value) => {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

const getScheduleSegments = (schedule) => {
  const start = timeToMinutes(schedule.startTime)
  let end = timeToMinutes(schedule.endTime)

  if (end <= start) {
    end += 24 * 60
  }

  return [
    { start, end: Math.min(end, 24 * 60) },
    ...(end > 24 * 60 ? [{ start: 0, end: end - 24 * 60 }] : [])
  ].map((segment, index) => ({
    key: `${schedule.id}-${index}`,
    left: (segment.start / (24 * 60)) * 100,
    width: ((segment.end - segment.start) / (24 * 60)) * 100
  }))
}

const changeDate = (delta) => {
  const next = new Date(scheduleDate.value)
  next.setDate(next.getDate() + delta)
  scheduleDate.value = next
}

const toggleAction = (permission, action) => {
  if (permission.actions.includes(action)) {
    permission.actions = permission.actions.filter((item) => item !== action)
  } else {
    permission.actions = [...permission.actions, action]
  }
}

const selectScene = (sceneId) => {
  selectedSceneId.value = sceneId
  currentSchedule.value.sceneId = sceneId
}

const saveLinkage = () => {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  linkageMessage.value = `最近一次保存：${currentSchedule.value.name} ${time}`
  executionRecords.value.unshift({
    id: Date.now(),
    time,
    event: '联动策略已更新',
    detail: `${currentSchedule.value.area} 已保存为“${currentSchedule.value.sceneName}”自动联动策略。`,
    status: 'success',
    statusText: '成功'
  })
}

const simulateLinkage = () => {
  const scene = selectedScene.value
  executionRecords.value.unshift({
    id: Date.now(),
    time: '模拟',
    event: `${currentSchedule.value.name} 模拟执行`,
    detail: `${currentSchedule.value.area} 已按“${scene.name}”场景执行，预开灯 ${currentSchedule.value.warmup} 分钟。`,
    status: 'pending',
    statusText: '模拟'
  })
  linkageMessage.value = `已模拟 ${currentSchedule.value.name} 的自动联动`
}
</script>

<style scoped>
.linkage-page {
  width: 100%;
  height: 100%;
  padding: 16px;
}

.linkage-layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr) 340px;
  gap: 16px;
  height: 100%;
}

.left-column,
.center-column,
.right-column {
  min-height: 0;
  display: grid;
  gap: 16px;
}

.left-column,
.right-column {
  grid-template-rows: 0.82fr minmax(0, 1fr);
}

.center-column {
  grid-template-rows: 1fr 0.9fr;
}

.system-card,
.permission-card,
.schedule-card,
.logic-card,
.scene-card,
.record-card {
  min-height: 0;
}

.system-card :deep(.card-body),
.permission-card :deep(.card-body),
.schedule-card :deep(.card-body),
.logic-card :deep(.card-body),
.scene-card :deep(.card-body),
.record-card :deep(.card-body) {
  min-height: 0;
}

.system-list,
.permission-list,
.schedule-list,
.record-list,
.scene-grid {
  min-height: 0;
  overflow: auto;
}

.system-list,
.permission-list,
.schedule-list,
.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.system-item,
.schedule-item,
.scene-box,
.action-chip,
.toggle-pill {
  border: 1px solid var(--line-main);
  border-radius: var(--radius-md);
  background: rgba(7, 18, 31, 0.72);
  color: var(--text-1);
}

.system-item,
.schedule-item,
.scene-box {
  width: 100%;
  padding: 14px;
  text-align: left;
}

.system-item.active,
.schedule-item.active,
.scene-box.active {
  border-color: var(--line-strong);
  box-shadow: 0 0 0 1px rgba(89, 227, 255, 0.08), var(--glow-soft);
  background: linear-gradient(180deg, rgba(89, 227, 255, 0.14), rgba(7, 18, 31, 0.78));
}

.system-head,
.system-foot,
.permission-top,
.permission-foot,
.schedule-top,
.schedule-foot,
.scene-box-top,
.record-item,
.date-nav,
.timeline-row,
.logic-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.system-name,
.permission-area,
.schedule-name,
.scene-name,
.record-event {
  font-weight: 600;
  color: var(--text-1);
}

.system-meta,
.system-foot,
.permission-scene,
.permission-foot,
.schedule-detail,
.schedule-foot,
.scene-desc,
.scene-values,
.queue-detail,
.record-detail,
.field p {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.55;
}

.system-status,
.scene-type,
.record-status,
.toggle-pill,
.action-chip,
.date-text {
  font-size: 11px;
}

.system-status {
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(89, 227, 255, 0.26);
}

.system-status.active {
  color: var(--accent-teal);
  background: rgba(53, 246, 212, 0.08);
}

.system-status.standby {
  color: var(--warning);
  background: rgba(255, 204, 88, 0.08);
}

.permission-summary,
.record-kpis,
.logic-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.record-kpis,
.logic-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mini-kpi,
.logic-kpi,
.queue-box,
.permission-item,
.record-item {
  padding: 12px;
  border: 1px solid rgba(89, 227, 255, 0.12);
  border-radius: 12px;
  background: rgba(8, 22, 38, 0.76);
}

.mini-kpi span,
.logic-kpi span,
.queue-title {
  display: block;
  color: var(--text-2);
  font-size: 12px;
  margin-bottom: 8px;
}

.mini-kpi strong,
.logic-kpi strong,
.queue-main {
  color: var(--text-1);
  font-size: 14px;
}

.toggle-pill,
.action-chip,
.nav-btn,
.primary-btn,
.secondary-btn {
  padding: 8px 12px;
  border-radius: 999px;
}

.toggle-pill,
.action-chip,
.nav-btn,
.secondary-btn {
  background: rgba(89, 227, 255, 0.08);
  color: var(--text-2);
}

.toggle-pill.active,
.action-chip.active {
  color: var(--accent-cyan);
  border-color: var(--line-strong);
}

.permission-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0;
}

.date-nav {
  flex-wrap: wrap;
}

.date-text {
  color: var(--accent-cyan);
  white-space: nowrap;
}

.timeline-card {
  position: relative;
  padding: 14px;
  border: 1px solid rgba(89, 227, 255, 0.12);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(12, 28, 48, 0.72), rgba(7, 18, 31, 0.78));
  margin-bottom: 12px;
}

.timeline-head {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  color: var(--text-2);
  font-size: 11px;
  margin-bottom: 10px;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-row {
  position: relative;
  padding: 6px 0;
  cursor: pointer;
}

.timeline-row.selected .timeline-track {
  box-shadow: 0 0 0 1px rgba(89, 227, 255, 0.12);
}

.timeline-label {
  width: 132px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-label span {
  color: var(--text-2);
  font-size: 11px;
}

.timeline-track {
  position: relative;
  flex: 1;
  height: 32px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(89, 227, 255, 0.08);
}

.timeline-grid {
  position: absolute;
  inset: 44px 14px 14px 146px;
  pointer-events: none;
  display: grid;
  grid-template-columns: repeat(24, 1fr);
}

.grid-line {
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

.timeline-bar {
  position: absolute;
  top: 3px;
  bottom: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #04111f;
  font-size: 11px;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}

.timeline-bar.day {
  background: linear-gradient(90deg, #59e3ff, #35f6d4);
}

.timeline-bar.swing {
  background: linear-gradient(90deg, #8cb7ff, #59e3ff);
}

.timeline-bar.night {
  background: linear-gradient(90deg, #6d7dff, #59e3ff);
}

.timeline-bar.disabled {
  opacity: 0.4;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(89, 227, 255, 0.12);
  border-radius: 12px;
  background: rgba(8, 22, 38, 0.76);
}

.field label {
  font-size: 13px;
  color: var(--text-1);
}

.field input,
.field select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
}

.field-suffix {
  position: absolute;
  top: 46px;
  right: 14px;
  color: var(--accent-cyan);
  font-size: 11px;
}

.primary-btn {
  border: none;
  color: #04111f;
  font-weight: 700;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-teal));
}

.status-text {
  color: var(--text-2);
  font-size: 12px;
}

.scene-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.scene-type {
  color: var(--accent-cyan);
}

.queue-box {
  margin-bottom: 12px;
}

.record-time {
  min-width: 48px;
  color: var(--accent-cyan);
  font-family: var(--font-num);
  font-size: 12px;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-status {
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(89, 227, 255, 0.26);
}

.record-status.success {
  color: var(--accent-teal);
  background: rgba(53, 246, 212, 0.08);
}

.record-status.pending {
  color: var(--warning);
  background: rgba(255, 204, 88, 0.08);
}

.record-status.warning {
  color: #ff8c6a;
  background: rgba(255, 140, 106, 0.08);
}

@media (max-width: 1440px) {
  .linkage-layout {
    grid-template-columns: 300px minmax(0, 1fr) 320px;
  }

  .timeline-grid {
    inset: 44px 14px 14px 126px;
  }

  .timeline-label {
    width: 112px;
  }
}

@media (max-width: 1180px) {
  .linkage-page {
    overflow: auto;
  }

  .linkage-layout {
    height: auto;
    grid-template-columns: 1fr;
  }

  .left-column,
  .center-column,
  .right-column {
    grid-template-rows: none;
  }

  .record-kpis,
  .logic-summary,
  .permission-summary,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .timeline-row {
    flex-direction: column;
    align-items: stretch;
  }

  .timeline-label {
    width: auto;
  }

  .timeline-grid {
    display: none;
  }
}
</style>

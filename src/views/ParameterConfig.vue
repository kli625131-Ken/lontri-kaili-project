<template>
  <div class="config-page">
    <div class="config-layout">
      <div class="left-column">
        <DataCard title="区域 / 设备组" class="area-card">
          <div class="area-list">
            <button
              v-for="area in areaProfiles"
              :key="area.id"
              class="area-item"
              :class="{ active: selectedAreaId === area.id }"
              @click="selectedAreaId = area.id"
            >
              <div class="area-item-top">
                <span class="area-name">{{ area.name }}</span>
                <span class="area-count">{{ area.deviceCount }} 台</span>
              </div>
              <div class="area-meta">{{ area.zoneType }} · {{ area.deviceGroup }}</div>
              <div class="area-tags">
                <span class="tag">{{ area.occupancySensor ? '人感已启用' : '人感关闭' }}</span>
                <span class="tag">{{ area.ambientSensor ? '光感已启用' : '光感关闭' }}</span>
              </div>
            </button>
          </div>
        </DataCard>

        <DataCard title="配置模板" class="template-card">
          <div class="template-list">
            <button
              v-for="template in configTemplates"
              :key="template.id"
              class="template-item"
              :class="{ active: selectedTemplateId === template.id }"
              @click="applyTemplate(template)"
            >
              <div class="template-head">
                <span class="template-name">{{ template.name }}</span>
                <span class="template-badge">{{ template.focus }}</span>
              </div>
              <div class="template-desc">{{ template.desc }}</div>
            </button>
          </div>
        </DataCard>
      </div>

      <DataCard :title="`${selectedArea.name} 参数配置`" class="editor-card">
        <template #header-extra>
          <div class="header-chip">{{ selectedArea.zoneType }}</div>
        </template>

        <div class="editor-scroll">
          <section class="section-block">
            <div class="section-head">
              <div>
                <div class="section-title">传感器策略</div>
                <div class="section-desc">配置人感、光感和自动模式的进入 / 退出逻辑。</div>
              </div>
            </div>

            <div class="switch-grid">
              <button
                class="switch-card"
                :class="{ active: selectedArea.occupancySensor }"
                @click="selectedArea.occupancySensor = !selectedArea.occupancySensor"
              >
                <span class="switch-title">人感模式</span>
                <span class="switch-state">{{ selectedArea.occupancySensor ? '已开启' : '已关闭' }}</span>
                <span class="switch-hint">用于人员进入后自动恢复作业照明。</span>
              </button>

              <button
                class="switch-card"
                :class="{ active: selectedArea.ambientSensor }"
                @click="selectedArea.ambientSensor = !selectedArea.ambientSensor"
              >
                <span class="switch-title">光感模式</span>
                <span class="switch-state">{{ selectedArea.ambientSensor ? '已开启' : '已关闭' }}</span>
                <span class="switch-hint">根据环境照度自动限制灯具输出。</span>
              </button>
            </div>

            <div class="form-grid">
              <div class="field">
                <label>进入背景亮度时间</label>
                <input v-model.number="selectedArea.entryBackgroundDelay" type="number" min="0" />
                <span class="field-suffix">秒</span>
                <p>无人感后经过该时长，切换到背景亮度。</p>
              </div>

              <div class="field">
                <label>背景亮度</label>
                <div class="range-row">
                  <input v-model.number="selectedArea.backgroundBrightness" type="range" min="0" max="100" />
                  <span class="range-value">{{ selectedArea.backgroundBrightness }}%</span>
                </div>
                <p>用于待机、巡检或缓降场景的最低亮度。</p>
              </div>

              <div class="field">
                <label>退出自动模式时间</label>
                <input v-model.number="selectedArea.exitAutoDelay" type="number" min="0" />
                <span class="field-suffix">秒</span>
                <p>在人工干预后，多长时间恢复自动联动。</p>
              </div>

              <div class="field">
                <label>感应灵敏度</label>
                <select v-model="selectedArea.sensitivity">
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </select>
                <p>用于控制人感触发频率与误触发容忍度。</p>
              </div>

              <div class="field">
                <label>感应范围</label>
                <input v-model.number="selectedArea.detectionRange" type="number" min="1" />
                <span class="field-suffix">米</span>
                <p>建议与区域纵深一致，避免相邻区域串扰。</p>
              </div>

              <div class="field">
                <label>光感标定值</label>
                <input v-model.number="selectedArea.luxCalibration" type="number" min="0" />
                <span class="field-suffix">Lux</span>
                <p>低于该照度值时允许自动拉升灯具亮度。</p>
              </div>
            </div>
          </section>

          <section class="section-block">
            <div class="section-head">
              <div>
                <div class="section-title">灯具参数</div>
                <div class="section-desc">限定灯具启动上限，统一生产和待机状态下的输出边界。</div>
              </div>
            </div>

            <div class="form-grid">
              <div class="field">
                <label>灯具开机最大亮度</label>
                <div class="range-row">
                  <input v-model.number="selectedArea.startupMaxBrightness" type="range" min="10" max="100" />
                  <span class="range-value">{{ selectedArea.startupMaxBrightness }}%</span>
                </div>
                <p>限制设备上电后允许达到的最大输出亮度。</p>
              </div>

              <div class="field">
                <label>默认渐变时长</label>
                <input v-model.number="selectedArea.defaultFadeTime" type="number" min="0" />
                <span class="field-suffix">秒</span>
                <p>所有自动场景切换时的基础过渡时间。</p>
              </div>

              <div class="field">
                <label>默认色温</label>
                <input v-model.number="selectedArea.defaultColorTemp" type="number" min="2700" max="6500" step="100" />
                <span class="field-suffix">K</span>
                <p>区域灯具常规运行色温基线。</p>
              </div>

              <div class="field">
                <label>背景保安时长</label>
                <input v-model.number="selectedArea.guardDuration" type="number" min="0" />
                <span class="field-suffix">分钟</span>
                <p>生产结束后保留低亮巡检照明的时间。</p>
              </div>
            </div>
          </section>

          <section class="section-block">
            <div class="section-head">
              <div>
                <div class="section-title">区域灯光场景</div>
                <div class="section-desc">为当前区域配置生产、巡检、节能、停产等预设场景参数。</div>
              </div>
            </div>

            <div class="scene-panel">
              <div class="scene-tabs">
                <button
                  v-for="scene in selectedArea.sceneConfigs"
                  :key="scene.id"
                  class="scene-tab"
                  :class="{ active: selectedSceneId === scene.id }"
                  @click="selectedSceneId = scene.id"
                >
                  <span>{{ scene.name }}</span>
                  <small>{{ scene.bindProduction ? '生产联动' : '人工 / 计划联动' }}</small>
                </button>
              </div>

              <div class="scene-editor">
                <div class="scene-editor-head">
                  <div>
                    <div class="scene-editor-title">{{ selectedScene.name }}</div>
                    <div class="scene-editor-desc">{{ selectedScene.description }}</div>
                  </div>
                  <button
                    class="ghost-btn"
                    :class="{ active: selectedScene.bindProduction }"
                    @click="selectedScene.bindProduction = !selectedScene.bindProduction"
                  >
                    {{ selectedScene.bindProduction ? '已绑定生产联动' : '未绑定生产联动' }}
                  </button>
                </div>

                <div class="form-grid">
                  <div class="field">
                    <label>场景亮度</label>
                    <div class="range-row">
                      <input v-model.number="selectedScene.brightness" type="range" min="0" max="100" />
                      <span class="range-value">{{ selectedScene.brightness }}%</span>
                    </div>
                    <p>场景激活时的目标亮度。</p>
                  </div>

                  <div class="field">
                    <label>场景色温</label>
                    <input v-model.number="selectedScene.colorTemp" type="number" min="2700" max="6500" step="100" />
                    <span class="field-suffix">K</span>
                    <p>用于区分作业、巡检与节能视觉氛围。</p>
                  </div>

                  <div class="field">
                    <label>持续时长</label>
                    <input v-model.number="selectedScene.holdTime" type="number" min="0" />
                    <span class="field-suffix">分钟</span>
                    <p>0 表示持续到下一条规则接管。</p>
                  </div>

                  <div class="field">
                    <label>场景渐变时间</label>
                    <input v-model.number="selectedScene.fadeTime" type="number" min="0" />
                    <span class="field-suffix">秒</span>
                    <p>进入当前场景时单独生效的渐变时长。</p>
                  </div>

                  <div class="field full-span">
                    <label>适用说明</label>
                    <textarea v-model="selectedScene.description" rows="3" />
                    <p>说明该场景的触发时机、适用工况或禁用边界。</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="action-row">
            <button class="primary-btn" @click="saveConfig">保存区域配置</button>
            <button class="secondary-btn" @click="resetAreaConfig">恢复区域默认</button>
            <span class="status-text">{{ saveMessage }}</span>
          </div>
        </div>
      </DataCard>

      <div class="right-column">
        <DataCard title="生效概览" class="summary-card">
          <div class="summary-kpis">
            <div class="summary-kpi">
              <span class="summary-label">启用传感器</span>
              <strong>{{ enabledSensorCount }}/2</strong>
            </div>
            <div class="summary-kpi">
              <span class="summary-label">可联动场景</span>
              <strong>{{ linkedSceneCount }}</strong>
            </div>
            <div class="summary-kpi">
              <span class="summary-label">开机亮度上限</span>
              <strong>{{ selectedArea.startupMaxBrightness }}%</strong>
            </div>
          </div>

          <div class="summary-list">
            <div class="summary-line">
              <span>区域定位</span>
              <strong>{{ selectedArea.zoneType }}</strong>
            </div>
            <div class="summary-line">
              <span>设备组</span>
              <strong>{{ selectedArea.deviceGroup }}</strong>
            </div>
            <div class="summary-line">
              <span>背景亮度策略</span>
              <strong>{{ selectedArea.entryBackgroundDelay }} 秒后降至 {{ selectedArea.backgroundBrightness }}%</strong>
            </div>
            <div class="summary-line">
              <span>自动模式恢复</span>
              <strong>{{ selectedArea.exitAutoDelay }} 秒</strong>
            </div>
            <div class="summary-line">
              <span>光感标定阈值</span>
              <strong>{{ selectedArea.luxCalibration }} Lux</strong>
            </div>
          </div>
        </DataCard>

        <DataCard title="联动边界" class="guard-card">
          <div class="guard-list">
            <div class="guard-item">
              <span class="guard-title">生产联动优先级</span>
              <span class="guard-desc">已绑定生产的场景优先于手动模板，人工接管后在 {{ selectedArea.exitAutoDelay }} 秒后恢复自动。</span>
            </div>
            <div class="guard-item">
              <span class="guard-title">节能保护</span>
              <span class="guard-desc">背景亮度和保安时长共同约束停产后的最低照明水平，避免区域全黑。</span>
            </div>
            <div class="guard-item">
              <span class="guard-title">设备上限保护</span>
              <span class="guard-desc">所有场景亮度均受开机最大亮度 {{ selectedArea.startupMaxBrightness }}% 限制。</span>
            </div>
          </div>
        </DataCard>

        <DataCard title="变更记录" class="history-card">
          <div class="history-list">
            <div v-for="item in changeHistory" :key="item.id" class="history-item">
              <div class="history-dot"></div>
              <div class="history-main">
                <div class="history-title">{{ item.title }}</div>
                <div class="history-meta">{{ item.user }} · {{ item.scope }}</div>
              </div>
              <div class="history-time">{{ item.time }}</div>
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

const clone = (value) => JSON.parse(JSON.stringify(value))

const initialAreaProfiles = [
  {
    id: 'brewing-1',
    name: '酿造一车间',
    zoneType: '生产核心区',
    deviceGroup: 'CU / OCSR',
    deviceCount: 18,
    occupancySensor: true,
    ambientSensor: true,
    entryBackgroundDelay: 180,
    backgroundBrightness: 35,
    exitAutoDelay: 900,
    sensitivity: '高',
    detectionRange: 10,
    luxCalibration: 320,
    startupMaxBrightness: 100,
    defaultFadeTime: 3,
    defaultColorTemp: 5200,
    guardDuration: 20,
    sceneConfigs: [
      { id: 'production', name: '生产作业', brightness: 100, colorTemp: 5200, holdTime: 0, fadeTime: 2, bindProduction: true, description: '匹配早晚班生产状态，排班开始时自动启用。' },
      { id: 'inspection', name: '巡检模式', brightness: 68, colorTemp: 4600, holdTime: 30, fadeTime: 3, bindProduction: false, description: '适用于设备巡检或短时维护，不覆盖生产主场景。' },
      { id: 'energy', name: '节能模式', brightness: 42, colorTemp: 4000, holdTime: 0, fadeTime: 5, bindProduction: true, description: '停线等待或空档期自动降档运行。' },
      { id: 'shutdown', name: '停产保安', brightness: 18, colorTemp: 3500, holdTime: 45, fadeTime: 8, bindProduction: true, description: '生产结束后保留保安照明，便于人员撤离。' }
    ]
  },
  {
    id: 'packaging',
    name: '包装中心',
    zoneType: '高节拍作业区',
    deviceGroup: 'CU / SCU',
    deviceCount: 24,
    occupancySensor: true,
    ambientSensor: true,
    entryBackgroundDelay: 120,
    backgroundBrightness: 40,
    exitAutoDelay: 600,
    sensitivity: '中',
    detectionRange: 8,
    luxCalibration: 280,
    startupMaxBrightness: 95,
    defaultFadeTime: 2,
    defaultColorTemp: 5000,
    guardDuration: 15,
    sceneConfigs: [
      { id: 'production', name: '生产作业', brightness: 95, colorTemp: 5000, holdTime: 0, fadeTime: 2, bindProduction: true, description: '包装排班开始后自动切换，保证条码和工位识别。' },
      { id: 'inspection', name: '巡检模式', brightness: 70, colorTemp: 4700, holdTime: 20, fadeTime: 2, bindProduction: false, description: '用于短时点检与设备换线确认。' },
      { id: 'energy', name: '节能模式', brightness: 38, colorTemp: 4200, holdTime: 0, fadeTime: 4, bindProduction: true, description: '排班空窗或半停线时降低照明负载。' },
      { id: 'shutdown', name: '停产保安', brightness: 20, colorTemp: 3500, holdTime: 30, fadeTime: 6, bindProduction: true, description: '班后保留通道照明，避免整区瞬时熄灭。' }
    ]
  },
  {
    id: 'warehouse',
    name: '仓储区',
    zoneType: '物流缓冲区',
    deviceGroup: 'OCSR / GW',
    deviceCount: 15,
    occupancySensor: true,
    ambientSensor: false,
    entryBackgroundDelay: 300,
    backgroundBrightness: 25,
    exitAutoDelay: 1200,
    sensitivity: '低',
    detectionRange: 12,
    luxCalibration: 260,
    startupMaxBrightness: 88,
    defaultFadeTime: 4,
    defaultColorTemp: 4300,
    guardDuration: 45,
    sceneConfigs: [
      { id: 'production', name: '收发作业', brightness: 88, colorTemp: 4300, holdTime: 0, fadeTime: 3, bindProduction: true, description: '收发货窗口激活时启用，优先保障月台与叉车道。' },
      { id: 'inspection', name: '盘点模式', brightness: 62, colorTemp: 4200, holdTime: 60, fadeTime: 4, bindProduction: false, description: '适用于库位盘点和异常复核。' },
      { id: 'energy', name: '节能待机', brightness: 28, colorTemp: 3800, holdTime: 0, fadeTime: 6, bindProduction: true, description: '无作业单时仅保留主通道和安全点位。' },
      { id: 'shutdown', name: '夜间保安', brightness: 15, colorTemp: 3200, holdTime: 90, fadeTime: 10, bindProduction: true, description: '夜班结束后维持极低亮度的安防巡检照明。' }
    ]
  }
]

const configTemplates = [
  {
    id: 'standard',
    name: '标准作业模板',
    focus: '均衡',
    desc: '适合常规生产区，兼顾效率、舒适度和自动恢复速度。',
    sensor: { occupancySensor: true, ambientSensor: true, entryBackgroundDelay: 180, backgroundBrightness: 35, exitAutoDelay: 900, sensitivity: '中', detectionRange: 8, luxCalibration: 300 },
    lighting: { startupMaxBrightness: 100, defaultFadeTime: 3, defaultColorTemp: 5000, guardDuration: 20 },
    sceneDefaults: {
      production: { brightness: 100, colorTemp: 5000 },
      inspection: { brightness: 70, colorTemp: 4600 },
      energy: { brightness: 40, colorTemp: 4000 },
      shutdown: { brightness: 18, colorTemp: 3400 }
    }
  },
  {
    id: 'energy',
    name: '节能优先模板',
    focus: '节能',
    desc: '缩短高亮持续时间，提升背景亮度与停产保护的节能收益。',
    sensor: { occupancySensor: true, ambientSensor: true, entryBackgroundDelay: 90, backgroundBrightness: 28, exitAutoDelay: 480, sensitivity: '中', detectionRange: 7, luxCalibration: 340 },
    lighting: { startupMaxBrightness: 88, defaultFadeTime: 4, defaultColorTemp: 4300, guardDuration: 12 },
    sceneDefaults: {
      production: { brightness: 88, colorTemp: 4800 },
      inspection: { brightness: 60, colorTemp: 4400 },
      energy: { brightness: 30, colorTemp: 3900 },
      shutdown: { brightness: 15, colorTemp: 3200 }
    }
  },
  {
    id: 'inspection',
    name: '巡检维护模板',
    focus: '维护',
    desc: '适合维护窗口较多的区域，保留更长的巡检照明与人工接管时间。',
    sensor: { occupancySensor: true, ambientSensor: false, entryBackgroundDelay: 240, backgroundBrightness: 45, exitAutoDelay: 1800, sensitivity: '高', detectionRange: 10, luxCalibration: 260 },
    lighting: { startupMaxBrightness: 96, defaultFadeTime: 2, defaultColorTemp: 4600, guardDuration: 35 },
    sceneDefaults: {
      production: { brightness: 92, colorTemp: 4900 },
      inspection: { brightness: 78, colorTemp: 4500 },
      energy: { brightness: 42, colorTemp: 4100 },
      shutdown: { brightness: 22, colorTemp: 3400 }
    }
  }
]

const areaProfiles = ref(clone(initialAreaProfiles))
const selectedAreaId = ref(areaProfiles.value[0].id)
const selectedSceneId = ref(areaProfiles.value[0].sceneConfigs[0].id)
const selectedTemplateId = ref('standard')
const saveMessage = ref('最近一次保存：未执行')
const changeHistory = ref([
  { id: 1, title: '更新包装中心节能模式亮度至 38%', user: 'admin', scope: '包装中心 · CU / SCU', time: '今天 14:26' },
  { id: 2, title: '调整酿造一车间光感标定值为 320 Lux', user: '运维班组', scope: '酿造一车间 · 生产核心区', time: '今天 10:18' },
  { id: 3, title: '启用仓储区停产保安场景联动', user: '系统策略', scope: '仓储区 · 物流缓冲区', time: '昨天 20:42' }
])

const selectedArea = computed(() => areaProfiles.value.find((item) => item.id === selectedAreaId.value) ?? areaProfiles.value[0])
const selectedScene = computed(() => selectedArea.value.sceneConfigs.find((scene) => scene.id === selectedSceneId.value) ?? selectedArea.value.sceneConfigs[0])
const enabledSensorCount = computed(() => [selectedArea.value.occupancySensor, selectedArea.value.ambientSensor].filter(Boolean).length)
const linkedSceneCount = computed(() => selectedArea.value.sceneConfigs.filter((scene) => scene.bindProduction).length)

watch(selectedAreaId, () => {
  selectedSceneId.value = selectedArea.value.sceneConfigs[0]?.id ?? ''
})

const applyTemplate = (template) => {
  const area = selectedArea.value
  selectedTemplateId.value = template.id
  Object.assign(area, clone(template.sensor), clone(template.lighting))
  area.sceneConfigs = area.sceneConfigs.map((scene) => ({
    ...scene,
    ...(template.sceneDefaults[scene.id] ?? {})
  }))
  saveMessage.value = `已套用模板：${template.name}`
}

const saveConfig = () => {
  const area = selectedArea.value
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  saveMessage.value = `最近一次保存：${area.name} ${time}`
  changeHistory.value.unshift({
    id: Date.now(),
    title: `保存 ${area.name} 的传感器与场景参数`,
    user: '当前用户',
    scope: `${area.name} · ${area.deviceGroup}`,
    time: `今天 ${time}`
  })
}

const resetAreaConfig = () => {
  const targetIndex = areaProfiles.value.findIndex((item) => item.id === selectedAreaId.value)
  const origin = initialAreaProfiles.find((item) => item.id === selectedAreaId.value)

  if (targetIndex === -1 || !origin) {
    return
  }

  areaProfiles.value[targetIndex] = clone(origin)
  selectedSceneId.value = areaProfiles.value[targetIndex].sceneConfigs[0]?.id ?? ''
  selectedTemplateId.value = 'standard'
  saveMessage.value = `已恢复 ${origin.name} 的默认配置`
}
</script>

<style scoped>
.config-page {
  width: 100%;
  height: 100%;
  padding: 16px;
}

.config-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 340px;
  gap: 16px;
  height: 100%;
}

.left-column,
.right-column {
  display: grid;
  gap: 16px;
  min-height: 0;
}

.left-column {
  grid-template-rows: minmax(0, 1fr) 0.8fr;
}

.right-column {
  grid-template-rows: auto auto minmax(0, 1fr);
}

.area-card,
.template-card,
.summary-card,
.guard-card,
.history-card,
.editor-card {
  min-height: 0;
}

.area-card :deep(.card-body),
.template-card :deep(.card-body),
.history-card :deep(.card-body),
.editor-card :deep(.card-body) {
  min-height: 0;
}

.area-list,
.template-list,
.history-list,
.editor-scroll {
  min-height: 0;
  overflow: auto;
}

.area-list,
.template-list,
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.area-item,
.template-item,
.switch-card,
.scene-tab {
  width: 100%;
  border: 1px solid var(--line-main);
  border-radius: var(--radius-md);
  background: rgba(7, 18, 31, 0.72);
  color: var(--text-1);
  text-align: left;
}

.area-item {
  padding: 14px;
}

.area-item.active,
.template-item.active,
.scene-tab.active,
.switch-card.active {
  border-color: var(--line-strong);
  box-shadow: 0 0 0 1px rgba(89, 227, 255, 0.08), var(--glow-soft);
  background: linear-gradient(180deg, rgba(89, 227, 255, 0.14), rgba(7, 18, 31, 0.78));
}

.area-item-top,
.template-head,
.scene-editor-head,
.section-head,
.summary-line,
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.area-name,
.template-name,
.section-title,
.scene-editor-title,
.history-title {
  color: var(--text-1);
  font-weight: 600;
}

.area-name {
  font-size: 14px;
}

.area-count,
.template-badge,
.header-chip,
.tag,
.field-suffix,
.history-time {
  font-size: 11px;
  color: var(--accent-cyan);
}

.area-meta,
.template-desc,
.section-desc,
.switch-hint,
.scene-editor-desc,
.field p,
.guard-desc,
.history-meta {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.55;
}

.area-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.tag,
.template-badge,
.header-chip {
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(89, 227, 255, 0.26);
  background: rgba(89, 227, 255, 0.08);
}

.template-item {
  padding: 14px;
}

.header-chip {
  white-space: nowrap;
}

.editor-scroll {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-right: 4px;
}

.section-block {
  border: 1px solid rgba(89, 227, 255, 0.12);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(12, 28, 48, 0.72), rgba(7, 18, 31, 0.78));
  padding: 18px;
}

.section-head {
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  margin-bottom: 6px;
}

.switch-grid,
.form-grid {
  display: grid;
  gap: 14px;
}

.switch-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 14px;
}

.switch-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
}

.switch-title {
  font-size: 14px;
  font-weight: 600;
}

.switch-state {
  color: var(--accent-teal);
  font-size: 12px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.field.full-span {
  grid-column: 1 / -1;
}

.field label {
  font-size: 13px;
  color: var(--text-1);
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border-radius: 8px;
  padding: 10px 12px;
}

.field textarea {
  resize: vertical;
  min-height: 88px;
}

.field-suffix {
  position: absolute;
  top: 46px;
  right: 14px;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-row input[type='range'] {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.range-value {
  min-width: 58px;
  text-align: right;
  color: var(--accent-teal);
  font-weight: 700;
  font-family: var(--font-num);
}

.scene-panel {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 14px;
}

.scene-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scene-tab {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scene-tab small {
  color: var(--text-2);
  font-size: 11px;
}

.scene-editor {
  padding: 16px;
  border: 1px solid rgba(89, 227, 255, 0.12);
  border-radius: 12px;
  background: rgba(8, 22, 38, 0.76);
}

.scene-editor-head {
  margin-bottom: 16px;
}

.ghost-btn,
.primary-btn,
.secondary-btn {
  border-radius: 8px;
  padding: 10px 16px;
}

.ghost-btn {
  border: 1px solid var(--line-main);
  background: rgba(89, 227, 255, 0.08);
  color: var(--text-2);
}

.ghost-btn.active {
  color: var(--accent-cyan);
  border-color: var(--line-strong);
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-btn {
  border: none;
  color: #04111f;
  font-weight: 700;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-teal));
}

.secondary-btn {
  border: 1px solid var(--line-main);
  background: rgba(89, 227, 255, 0.08);
  color: var(--text-2);
}

.status-text {
  color: var(--text-2);
  font-size: 12px;
}

.summary-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-kpi {
  padding: 14px 12px;
  border: 1px solid rgba(89, 227, 255, 0.12);
  border-radius: 12px;
  background: rgba(8, 22, 38, 0.76);
}

.summary-label {
  display: block;
  color: var(--text-2);
  font-size: 12px;
  margin-bottom: 8px;
}

.summary-kpi strong,
.summary-line strong {
  color: var(--text-1);
  font-size: 15px;
}

.summary-list,
.guard-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-line,
.guard-item,
.history-item {
  padding: 12px;
  border: 1px solid rgba(89, 227, 255, 0.12);
  border-radius: 12px;
  background: rgba(8, 22, 38, 0.76);
}

.summary-line span,
.guard-title {
  color: var(--text-2);
  font-size: 12px;
}

.guard-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-teal));
  box-shadow: 0 0 12px rgba(89, 227, 255, 0.32);
}

.history-main {
  flex: 1;
  min-width: 0;
}

/* System theme alignment; layout and interaction remain unchanged. */
.area-item, .template-item, .switch-card, .scene-tab { background: var(--control-bg); border-color: var(--border-subtle); color: var(--text-primary); }
.area-item.active, .template-item.active, .scene-tab.active, .switch-card.active { border-color: var(--border-active); background: linear-gradient(180deg, var(--info-soft), var(--control-bg)); box-shadow: 0 0 0 1px rgba(85, 216, 255, 0.08), var(--glow-soft); }
.area-name, .template-name, .section-title, .scene-editor-title, .history-title, .field label, .summary-kpi strong, .summary-line strong { color: var(--text-strong); }
.area-meta, .template-desc, .section-desc, .switch-hint, .scene-editor-desc, .field p, .guard-desc, .history-meta, .summary-label, .summary-line span, .guard-title { color: var(--text-secondary); }
.tag, .template-badge, .header-chip { border-color: var(--border-subtle); background: var(--info-soft); color: var(--accent-cyan); }
.section-block, .field, .scene-editor, .summary-kpi, .summary-line, .guard-item, .history-item { border-color: var(--border-subtle); background: rgba(7, 24, 42, 0.72); }
.ghost-btn, .secondary-btn { border-color: var(--border-default); background: var(--control-bg); color: var(--text-secondary); }
.ghost-btn.active { border-color: var(--border-active); color: var(--accent-cyan); }
.primary-btn { color: var(--bg-page-deep); background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); }
.history-dot { background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); box-shadow: 0 0 12px rgba(85, 216, 255, 0.22); }

@media (max-width: 1440px) {
  .config-layout {
    grid-template-columns: 260px minmax(0, 1fr) 320px;
  }

  .scene-panel {
    grid-template-columns: 1fr;
  }

  .scene-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .config-page {
    overflow: auto;
  }

  .config-layout {
    height: auto;
    grid-template-columns: 1fr;
  }

  .left-column,
  .right-column {
    grid-template-rows: none;
  }

  .switch-grid,
  .form-grid,
  .summary-kpis {
    grid-template-columns: 1fr;
  }
}
</style>

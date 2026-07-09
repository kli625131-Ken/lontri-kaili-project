<template>
  <aside class="control-drawer config-drawer">
    <header class="drawer-head">
      <div class="drawer-title-box">
        <h3 class="drawer-title">{{ drawerTitle }}</h3>
        <p class="drawer-subtitle">{{ targetName }}</p>
      </div>
      <button class="drawer-close" type="button" title="关闭" @click="$emit('close')">×</button>
    </header>

    <nav class="config-tabs" aria-label="配置步骤">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="config-tab"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="drawer-body">
      <section v-if="activeTab === 'base'" class="drawer-section">
        <div class="button-grid two by-two">
          <button
            v-for="mode in sceneModes"
            :key="mode.value"
            type="button"
            class="action-btn icon-btn"
            @click="$emit('test-action', { type: 'area-scene', mode: mode.value, region: target })"
          >
            {{ mode.label }}
          </button>
        </div>

        <div class="form-grid">
          <label class="field-row">
            <span>区域名称</span>
            <input v-model.trim="baseForm.name" class="text-input" @change="commitBaseInfo" />
          </label>
          <label class="field-row">
            <span>区域编号</span>
            <input v-model.trim="baseForm.code" class="text-input" @change="commitBaseInfo" />
          </label>
          <label class="field-row">
            <span>所属网关</span>
            <input :value="gatewaySummary" readonly class="text-input readonly" />
          </label>
          <label class="field-row">
            <span>配置状态</span>
            <input :value="configStatusText" readonly class="text-input readonly" />
          </label>
        </div>

        <details class="device-summary" open>
          <summary>
            <span>区域内 CU：{{ regionDevices.length }} 台</span>
            <span>异常：{{ offlineDeviceCount }}</span>
          </summary>
          <div class="summary-list">
            <div v-for="device in compactDevices" :key="device.id" class="summary-row">
              <span>{{ device.shortName || device.id }}</span>
              <span>{{ device.gatewayId || '--' }}</span>
            </div>
            <div v-if="regionDevices.length > compactDevices.length" class="summary-empty">
              还有 {{ regionDevices.length - compactDevices.length }} 台设备
            </div>
            <div v-if="!regionDevices.length" class="summary-empty">当前区域暂无 CU 设备</div>
          </div>
        </details>
      </section>

      <section v-if="activeTab === 'areaGroup'" class="drawer-section">
        <div class="form-grid">
          <label class="field-row">
            <span>区域组名称</span>
            <input v-model.trim="areaGroupForm.name" class="text-input" />
          </label>
          <label class="field-row">
            <span>4位组号</span>
            <input
              v-model.trim="areaGroupForm.groupNo"
              maxlength="4"
              class="text-input"
              inputmode="numeric"
              @input="areaGroupForm.groupNo = digitsOnly(areaGroupForm.groupNo).slice(0, 4)"
            />
          </label>
          <label class="field-row">
            <span>CU成员数量</span>
            <input :value="regionDevices.length" readonly class="text-input readonly" />
          </label>
          <label class="field-row">
            <span>所属网关</span>
            <input :value="gatewaySummary" readonly class="text-input readonly" />
          </label>
        </div>
        <div class="button-row">
          <button class="action-btn" type="button" @click="$emit('create-area-group', target)">新建区域组</button>
          <button class="action-btn" type="button" @click="$emit('bind-area-group', target)">选择已有区域组</button>
          <button class="action-btn primary" type="button" @click="$emit('save-area-group', { region: target, areaGroup: areaGroupForm })">
            保存草稿
          </button>
        </div>
      </section>

      <section v-if="activeTab === 'scene'" class="drawer-section">
        <div class="existing-scenes">
          <div class="scene-list-head">
            <span>已有场景</span>
            <strong>{{ regionScenes.length }}</strong>
          </div>
          <div v-if="regionScenes.length" class="scene-list">
            <div v-for="scene in regionScenes" :key="scene.id" class="scene-row">
              <span>{{ scene.name || scene.defaultScene || scene.mode || scene.id }}</span>
              <strong>{{ scene.brightness ?? '--' }}%</strong>
            </div>
          </div>
          <div v-else class="summary-empty">当前区域暂无场景信息</div>
        </div>

        <div class="form-grid">
          <label class="field-row">
            <span>默认场景</span>
            <select v-model="sceneForm.defaultScene" class="text-input select-input">
              <option value="on">区域开</option>
              <option value="off">区域关</option>
              <option value="saving">节能</option>
            </select>
          </label>
          <label class="field-row">
            <span>自定义场景</span>
            <input v-model.trim="sceneForm.name" class="text-input" />
          </label>
          <label class="field-row">
            <span>亮度</span>
            <span class="unit-input-wrap" :class="{ invalid: errors.sceneBrightness }">
              <input
                :value="sceneForm.brightness"
                list="drawer-brightness-options"
                type="text"
                inputmode="numeric"
                class="unit-input"
                @input="handleSceneBrightnessInput"
                @blur="validateSceneBrightness"
              />
              <span>%</span>
            </span>
            <small v-if="errors.sceneBrightness" class="field-error">{{ errors.sceneBrightness }}</small>
          </label>
          <label class="field-row">
            <span>色温</span>
            <input v-model.trim="sceneForm.colorTemperature" class="text-input" inputmode="numeric" @input="sceneForm.colorTemperature = digitsOnly(sceneForm.colorTemperature).slice(0, 4)" />
          </label>
        </div>
        <datalist id="drawer-brightness-options">
          <option v-for="value in brightnessOptions" :key="`scene-${value}`" :value="`${value}%`"></option>
        </datalist>
        <div class="button-row">
          <button class="action-btn" type="button" @click="$emit('create-default-scenes', target)">默认场景</button>
          <button class="action-btn" type="button" @click="$emit('create-custom-scene', target)">自定义场景</button>
          <button class="action-btn primary" type="button" @click="$emit('save-scene', { region: target, scene: sceneForm })">保存场景</button>
        </div>
      </section>

      <DeviceParameterConfigPanel
        v-if="activeTab === 'params'"
        :model="paramForm"
        :brightness-options="brightnessOptions"
        :time-fields="timeFields"
        brightness-list-id="drawer-brightness-options"
        :get-field-error="getParamFieldError"
        :on-percent-change="handlePercentInput"
        :on-percent-blur="formatPercent"
        :on-duration-change="handleDurationInput"
        :on-duration-blur="validateDuration"
      />

      <section v-if="activeTab === 'validate'" class="drawer-section">
        <div class="test-grid">
          <button class="action-btn" type="button" @click="$emit('test-action', { type: 'area-on', region: target })">区域开</button>
          <button class="action-btn" type="button" @click="$emit('test-action', { type: 'area-off', region: target })">区域关</button>
          <button class="action-btn" type="button" @click="$emit('test-action', { type: 'brightness', region: target })">亮度测试</button>
          <button class="action-btn" type="button" @click="$emit('test-action', { type: 'scene', region: target })">场景测试</button>
          <button class="action-btn primary" type="button" @click="$emit('validate')">校验配置</button>
        </div>
        <div class="validation-box" :class="{ ok: !validationMessages.length }">
          <p v-if="validationMessages.length">校验失败</p>
          <p v-else>校验通过</p>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import DeviceParameterConfigPanel from './DeviceParameterConfigPanel.vue'

const props = defineProps({
  target: {
    type: Object,
    default: null
  },
  targetType: {
    type: String,
    default: ''
  },
  devices: {
    type: Array,
    default: () => []
  },
  draftState: {
    type: Object,
    required: true
  },
  validationMessages: {
    type: Array,
    default: () => []
  },
  initialTab: {
    type: String,
    default: 'base'
  },
  sceneModes: {
    type: Array,
    default: () => [
      { label: '开启', value: 'on' },
      { label: '关闭', value: 'off' },
      { label: '会议模式', value: 'meeting' },
      { label: '讨论模式', value: 'discussion' }
    ]
  }
})

const emit = defineEmits([
  'close',
  'update-region',
  'create-area-group',
  'bind-area-group',
  'save-area-group',
  'create-default-scenes',
  'create-custom-scene',
  'save-scene',
  'use-param-template',
  'save-cu-params',
  'test-action',
  'validate'
])

const tabs = [
  { label: '基础信息', value: 'base' },
  { label: '区域组', value: 'areaGroup' },
  { label: '场景', value: 'scene' },
  { label: '参数配置', value: 'params' },
  { label: '测试', value: 'validate' }
]
const tabValues = new Set(tabs.map((tab) => tab.value))
const activeTab = ref(normalizeTab(props.initialTab))
const brightnessOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const timeFields = [
  { key: 'bgTime', label: '进入背景亮度时间', hint: '无人感后，降低到“背景亮度”所需时间' },
  { key: 'offTime', label: '进入关灯时间', hint: '无人感后，彻底关闭灯所需时间' },
  { key: 'manualTime', label: '手动模式持续时间', hint: '手动模式下无人感保持时长，到期恢复自动' }
]

const baseForm = reactive({ name: '', code: '' })
const areaGroupForm = reactive({ name: '', groupNo: '' })
const sceneForm = reactive({ defaultScene: 'on', name: '自定义场景', brightness: '80', colorTemperature: '4000' })
const paramForm = reactive({
  templateId: 'custom',
  mode: 'manual',
  brightness: '100',
  bgBrightness: '40',
  bgTime: '60',
  offTime: '300',
  manualTime: '1800'
})
const errors = reactive({})

const drawerTitle = computed(() => {
  if (activeTab.value === 'params') return '参数配置'
  return props.targetType === 'area' ? '区域配置' : '配置调试'
})
const targetName = computed(() => props.target?.name || props.target?.shortName || props.target?.id || '未选择对象')
const regionDevices = computed(() => {
  if (!props.target?.memberIds) return []
  return props.devices.filter((device) => props.target.memberIds.includes(device.id))
})
const compactDevices = computed(() => regionDevices.value.slice(0, 6))
const offlineDeviceCount = computed(() => regionDevices.value.filter((device) => device.online === false).length)
const gatewaySummary = computed(() => {
  const ids = Array.from(new Set(regionDevices.value.map((device) => device.gatewayId).filter(Boolean)))
  if (!ids.length) return '--'
  if (ids.length === 1) return ids[0]
  return `${ids[0]} 等 ${ids.length} 个`
})
const areaGroup = computed(() => props.draftState.areaGroups?.find((group) => group.regionId === props.target?.id) || null)
const configStatusText = computed(() => {
  if (props.draftState.dirty) return '待保存'
  if (areaGroup.value || regionParamConfig.value) return '已保存草稿'
  return '待保存'
})
const regionParamConfig = computed(() => {
  const configs = props.draftState.cuParamConfigs || []
  return configs.find((item) => item.regionId === props.target?.id) || null
})
const regionScenes = computed(() => {
  const scenes = props.draftState.scenes || []
  return scenes.filter((scene) => scene.regionId === props.target?.id)
})
const paramTemplates = computed(() => props.draftState.cuParamTemplates || [])

watch(
  () => props.initialTab,
  (tab) => {
    activeTab.value = normalizeTab(tab)
  }
)

watch(
  () => props.target,
  (target) => {
    activeTab.value = normalizeTab(props.initialTab)
    baseForm.name = target?.name || ''
    baseForm.code = target?.code || target?.id || ''
    areaGroupForm.name = areaGroup.value?.name || `${target?.name || '区域'}组`
    areaGroupForm.groupNo = areaGroup.value?.groupNo || ''
    syncParamForm()
  },
  { immediate: true }
)

watch(regionParamConfig, syncParamForm, { immediate: true })

function normalizeTab(value) {
  if (value === 'devices') return 'base'
  return tabValues.has(value) ? value : 'base'
}

function syncParamForm() {
  const config = regionParamConfig.value
  if (!config) return
  paramForm.templateId = config.templateId || 'custom'
  paramForm.mode = config.mode || 'manual'
  paramForm.brightness = String(config.brightness ?? '100')
  paramForm.bgBrightness = String(config.bgBrightness ?? '40')
  paramForm.bgTime = String(config.bgTime ?? '60')
  paramForm.offTime = String(config.offTime ?? '300')
  paramForm.manualTime = String(config.manualTime ?? '1800')
}

function commitBaseInfo() {
  if (!props.target) return
  emit('update-region', {
    ...props.target,
    name: baseForm.name || props.target.name,
    code: baseForm.code || props.target.code || props.target.id
  })
}

function saveCuParams() {
  if (!props.target || !validateAllParams()) return
  emit('save-cu-params', {
    region: props.target,
    params: {
      templateId: paramForm.templateId,
      mode: paramForm.mode,
      brightness: Number(paramForm.brightness),
      bgBrightness: Number(paramForm.bgBrightness),
      bgTime: Number(paramForm.bgTime),
      offTime: Number(paramForm.offTime),
      manualTime: Number(paramForm.manualTime)
    }
  })
}

function handlePercentInput(event, key) {
  const value = digitsOnly(event.target.value).slice(0, 3)
  paramForm[key] = value
  event.target.value = value
  validatePercent(key)
}

function formatPercent(key) {
  validatePercent(key)
}

function validatePercent(key) {
  const value = paramForm[key]
  const numericValue = Number(value)
  if (value === '' || !Number.isInteger(numericValue) || numericValue < 0 || numericValue > 100) {
    errors[key] = '请输入 0-100 的整数'
    return false
  }
  errors[key] = ''
  return true
}

function getParamFieldError(key) {
  return errors[key] || ''
}

function handleSceneBrightnessInput(event) {
  const value = digitsOnly(event.target.value).slice(0, 3)
  sceneForm.brightness = value
  event.target.value = value
  validateSceneBrightness()
}

function validateSceneBrightness() {
  const numericValue = Number(sceneForm.brightness)
  if (sceneForm.brightness === '' || !Number.isInteger(numericValue) || numericValue < 0 || numericValue > 100) {
    errors.sceneBrightness = '请输入 0-100 的整数'
    return false
  }
  errors.sceneBrightness = ''
  return true
}

function handleDurationInput(event, key) {
  const value = digitsOnly(event.target.value)
  paramForm[key] = value
  event.target.value = value
  validateDuration(key)
}

function validateDuration(key) {
  if (paramForm[key] === '') {
    errors[key] = '请输入时间'
    return false
  }
  errors[key] = ''
  return true
}

function validateAllParams() {
  return ['brightness', 'bgBrightness'].every(validatePercent) && timeFields.map((item) => item.key).every(validateDuration)
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '')
}
</script>

<style scoped>
.config-drawer.control-drawer {
  position: absolute;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: auto !important;
  width: clamp(360px, 28vw, 420px) !important;
  max-height: none !important;
  display: flex;
  flex-direction: column;
  border: 0 !important;
  border-left: 1px solid rgba(89, 227, 255, 0.36) !important;
  border-radius: 0 !important;
  background:
    linear-gradient(180deg, rgba(7, 20, 38, 0.98), rgba(4, 12, 24, 0.98)),
    radial-gradient(circle at top right, rgba(89, 227, 255, 0.1), transparent 42%);
  box-shadow: -12px 0 30px rgba(0, 0, 0, 0.26) !important;
  overflow: hidden;
  transform: none;
}

.config-drawer {
  z-index: 16;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(89, 227, 255, 0.18);
}

.drawer-title {
  margin: 0 0 3px;
  color: #f3f9ff;
  font-size: 15px;
}

.drawer-subtitle {
  margin: 0;
  color: rgba(211, 225, 239, 0.62);
  font-size: 12px;
}

.drawer-close {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(7, 19, 34, 0.78);
  color: rgba(234, 243, 252, 0.86);
  font-size: 20px;
  line-height: 1;
}

.config-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  min-height: 38px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(89, 227, 255, 0.16);
  background: rgba(5, 16, 30, 0.72);
}

.config-tab {
  position: relative;
  min-width: 0;
  min-height: 38px;
  padding: 0 6px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(220, 235, 246, 0.68);
  font-size: 12px;
  white-space: nowrap;
}

.config-tab.active {
  color: #55f2df;
  background: rgba(53, 246, 212, 0.06);
}

.config-tab.active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 2px;
  background: #55f2df;
}

.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 14px;
}

.drawer-section,
.form-grid,
.metric-grid,
.time-grid {
  display: grid;
  gap: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(234, 243, 252, 0.9);
  font-size: 14px;
}

.section-tag {
  padding: 4px 10px;
  border: 1px solid rgba(89, 227, 255, 0.2);
  border-radius: 999px;
  color: rgba(234, 243, 252, 0.76);
  background: rgba(89, 227, 255, 0.08);
  font-size: 11px;
}

.button-grid {
  display: grid;
  gap: 8px;
}

.button-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.button-grid.by-two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.existing-scenes {
  overflow: hidden;
  border: 1px solid rgba(89, 227, 255, 0.16);
  border-radius: 8px;
  background: rgba(6, 17, 31, 0.52);
}

.scene-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  color: rgba(234, 243, 252, 0.86);
  font-size: 12px;
  border-bottom: 1px solid rgba(89, 227, 255, 0.12);
}

.scene-list {
  max-height: 132px;
  overflow: auto;
}

.scene-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  gap: 10px;
  padding: 8px 12px;
  color: rgba(234, 243, 252, 0.72);
  font-size: 12px;
}

.scene-row + .scene-row {
  border-top: 1px solid rgba(89, 227, 255, 0.08);
}

.form-grid,
.metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-row {
  display: grid;
  gap: 6px;
  color: rgba(234, 243, 252, 0.78);
  font-size: 12px;
}

.text-input,
.unit-input {
  width: 100%;
  min-width: 0;
  height: 34px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f3f9ff;
  font-size: 13px;
}

.text-input {
  padding: 0 10px;
  border: 1px solid rgba(89, 227, 255, 0.2);
  border-radius: 7px;
  background: rgba(3, 12, 24, 0.74);
}

.select-input {
  padding-right: 28px;
  appearance: none;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath d='M4 5.5 7 8.5 10 5.5' fill='none' stroke='%23dcefff' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") right 10px center / 14px 14px no-repeat,
    rgba(3, 12, 24, 0.74);
}

.select-input option {
  background: #071526;
  color: #f3f9ff;
}

.text-input.readonly,
.text-input:read-only {
  color: rgba(234, 243, 252, 0.64);
  background: rgba(4, 14, 28, 0.46);
}

.unit-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 9px;
  border: 1px solid rgba(89, 227, 255, 0.2);
  border-radius: 7px;
  background: rgba(3, 12, 24, 0.74);
  color: rgba(234, 243, 252, 0.78);
}

.unit-input-wrap.invalid {
  border-color: rgba(255, 111, 118, 0.78);
}

.unit-input {
  height: 32px;
  text-align: left;
}

.field-error {
  color: #ff8d88;
  font-size: 11px;
}

.metric-card {
  display: grid;
  gap: 8px;
  padding: 14px 12px 12px;
  border: 1px solid rgba(89, 227, 255, 0.26);
  border-radius: 12px;
  background: rgba(6, 17, 31, 0.7);
}

.metric-label {
  display: block;
  margin-bottom: 2px;
  color: rgba(234, 243, 252, 0.72);
  font-size: 12px;
}

.metric-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(4, 14, 28, 0.74);
  color: #55f2df;
  font-family: var(--font-num);
}

.metric-input-wrap.invalid,
.time-input-wrap.invalid {
  border-color: rgba(255, 111, 118, 0.78);
}

.metric-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #55f2df;
  font-size: 22px;
  font-family: var(--font-num);
  text-align: left;
}

.time-stack {
  display: grid;
  gap: 12px;
}

.time-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(89, 227, 255, 0.18);
  border-radius: 12px;
  background: rgba(6, 17, 31, 0.72);
}

.time-title {
  color: #f3f9ff;
  font-size: 14px;
}

.time-copy {
  color: rgba(211, 225, 239, 0.58);
  font-size: 12px;
}

.time-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(4, 14, 28, 0.74);
  color: #55f2df;
  font-family: var(--font-num);
}

.time-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #55f2df;
  font-family: var(--font-num);
  text-align: left;
}

.device-summary {
  border: 1px solid rgba(89, 227, 255, 0.16);
  border-radius: 8px;
  background: rgba(6, 17, 31, 0.52);
}

.device-summary summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  color: rgba(234, 243, 252, 0.86);
  cursor: pointer;
  font-size: 12px;
}

.summary-list {
  max-height: 138px;
  overflow: auto;
  border-top: 1px solid rgba(89, 227, 255, 0.12);
}

.summary-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 108px;
  gap: 10px;
  padding: 8px 12px;
  color: rgba(234, 243, 252, 0.72);
  font-size: 12px;
}

.summary-empty,
.validation-box {
  padding: 10px 12px;
  color: rgba(211, 225, 239, 0.62);
  font-size: 12px;
}

.button-row,
.test-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(89, 227, 255, 0.24);
  border-radius: 7px;
  background: rgba(6, 17, 31, 0.74);
  color: rgba(234, 243, 252, 0.84);
  font-size: 12px;
}

.action-btn:hover,
.action-btn.primary {
  color: #55f2df;
  border-color: rgba(53, 246, 212, 0.56);
  background: rgba(18, 76, 88, 0.44);
}

.validation-box {
  border: 1px solid rgba(255, 203, 114, 0.32);
  border-radius: 8px;
  background: rgba(6, 17, 31, 0.54);
  color: #ffcb72;
}

.validation-box.ok {
  border-color: rgba(53, 246, 212, 0.32);
  color: #55f2df;
}

@media (max-width: 1180px) {
  .config-drawer.control-drawer {
    width: 360px !important;
  }
}
</style>

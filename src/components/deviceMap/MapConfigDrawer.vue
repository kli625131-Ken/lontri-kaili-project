<template>
  <aside class="control-drawer config-drawer">
    <header class="drawer-head">
      <div>
        <h3>{{ activeTab === 'workflow' ? '区域调试工作台' : '参数配置' }}</h3>
        <p>{{ targetName }}</p>
      </div>
      <button type="button" title="关闭" @click="$emit('close')">×</button>
    </header>

    <nav class="drawer-tabs" aria-label="区域配置">
      <button type="button" :class="{ active: activeTab === 'workflow' }" @click="activeTab = 'workflow'">区域调试</button>
      <button type="button" :class="{ active: activeTab === 'params' }" @click="activeTab = 'params'">参数配置</button>
    </nav>

    <div class="drawer-body">
      <RegionWorkflowWorkbench
        v-if="activeTab === 'workflow'"
        :workflow="workflow"
        :busy="workflowBusy"
        @action="$emit('workflow-action', $event)"
      />

      <div v-else class="parameter-body">
        <DeviceParameterConfigPanel
          :model="paramForm"
          :brightness-options="brightnessOptions"
          :time-fields="timeFields"
          :get-field-error="getFieldError"
          :on-percent-change="handlePercentInput"
          :on-percent-blur="validatePercent"
          :on-duration-change="handleDurationInput"
          :on-duration-blur="validateDuration"
        />
        <button type="button" class="save-parameter-btn" @click="saveParams">保存参数配置</button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import DeviceParameterConfigPanel from './DeviceParameterConfigPanel.vue'
import RegionWorkflowWorkbench from './RegionWorkflowWorkbench.vue'
import { DEVICE_MAP_BRIGHTNESS_OPTIONS } from './deviceMapOptions'

const props = defineProps({
  target: { type: Object, default: null },
  draftState: { type: Object, required: true },
  workflow: { type: Object, default: null },
  workflowBusy: { type: Boolean, default: false },
  initialTab: { type: String, default: 'workbench' }
})

const emit = defineEmits(['close', 'workflow-action', 'save-cu-params'])
const activeTab = ref(normalizeTab(props.initialTab))
const errors = reactive({})
const brightnessOptions = DEVICE_MAP_BRIGHTNESS_OPTIONS
const timeFields = [
  { key: 'bgTime', label: '进入背景亮度时间', hint: '无人感后，降低到背景亮度所需时间' },
  { key: 'offTime', label: '进入关灯时间', hint: '无人感后，彻底关闭灯所需时间' },
  { key: 'manualTime', label: '手动模式持续时间', hint: '手动模式到期后恢复自动感应' }
]
const paramForm = reactive({
  templateId: 'custom',
  mode: 'manual',
  brightness: '100',
  bgBrightness: '40',
  bgTime: '60',
  offTime: '300',
  manualTime: '1800'
})

const targetName = computed(() => props.target?.name || props.target?.id || '未选择区域')
const regionParamConfig = computed(() => (
  props.draftState.cuParamConfigs?.find((item) => item.regionId === props.target?.id) || null
))

watch(() => props.initialTab, (value) => { activeTab.value = normalizeTab(value) })
watch([() => props.target?.id, regionParamConfig], syncParamForm, { immediate: true })

function normalizeTab(value) {
  return value === 'params' ? 'params' : 'workflow'
}

function syncParamForm() {
  const config = regionParamConfig.value
  paramForm.templateId = config?.templateId || 'custom'
  paramForm.mode = config?.mode || 'manual'
  paramForm.brightness = String(config?.brightness ?? 100)
  paramForm.bgBrightness = String(config?.bgBrightness ?? 40)
  paramForm.bgTime = String(config?.bgTime ?? 60)
  paramForm.offTime = String(config?.offTime ?? 300)
  paramForm.manualTime = String(config?.manualTime ?? 1800)
}

function handlePercentInput(event, key) {
  const value = digitsOnly(event.target.value).slice(0, 3)
  paramForm[key] = value
  event.target.value = value
  validatePercent(key)
}

function validatePercent(key) {
  const value = Number(paramForm[key])
  errors[key] = paramForm[key] === '' || !Number.isInteger(value) || value < 0 || value > 100
    ? '请输入 0-100 的整数'
    : ''
  return !errors[key]
}

function handleDurationInput(event, key) {
  const value = digitsOnly(event.target.value)
  paramForm[key] = value
  event.target.value = value
  validateDuration(key)
}

function validateDuration(key) {
  errors[key] = paramForm[key] === '' ? '请输入时间' : ''
  return !errors[key]
}

function getFieldError(key) {
  return errors[key] || ''
}

function saveParams() {
  const valid = ['brightness', 'bgBrightness'].every(validatePercent)
    && timeFields.every((field) => validateDuration(field.key))
  if (!valid || !props.target) return
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
  z-index: 16;
  width: clamp(400px, 31vw, 480px) !important;
  max-height: none !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0 !important;
  border-left: 1px solid var(--border-default) !important;
  border-radius: 0 !important;
  background: linear-gradient(180deg, rgba(10, 29, 51, .99), rgba(4, 12, 23, .99));
  box-shadow: -12px 0 30px rgba(0, 5, 14, .42) !important;
  transform: none;
}
.drawer-head { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 14px; border-bottom: 1px solid var(--border-subtle); }
.drawer-head h3 { margin: 0; color: var(--text-primary); font-size: 15px; letter-spacing: 0; }.drawer-head p { margin: 3px 0 0; color: var(--text-tertiary); font-size: 11px; }.drawer-head button { width: 30px; height: 30px; border: 0; color: var(--text-tertiary); background: transparent; font-size: 22px; cursor: pointer; }
.drawer-tabs { display: grid; grid-template-columns: repeat(2, 1fr); padding: 0 12px; border-bottom: 1px solid var(--border-subtle); }.drawer-tabs button { height: 38px; border: 0; border-bottom: 2px solid transparent; color: var(--text-tertiary); background: transparent; cursor: pointer; font-size: 11px; }.drawer-tabs button.active { border-bottom-color: var(--accent-cyan); color: var(--accent-cyan); }
.drawer-body { min-height: 0; flex: 1; overflow: auto; }.drawer-body::-webkit-scrollbar { width: 5px; }.drawer-body::-webkit-scrollbar-thumb { border-radius: 3px; background: rgba(88, 176, 194, .24); }
.parameter-body { display: grid; gap: 18px; padding: 16px; }.save-parameter-btn { min-height: 36px; border: 1px solid var(--border-active); border-radius: 6px; color: var(--bg-page-deep); background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); font-weight: 700; cursor: pointer; }
@media (max-width: 760px) { .config-drawer.control-drawer { width: min(100%, 460px) !important; } }
</style>

<template>
  <aside class="control-drawer config-drawer" aria-label="区域信息">
    <nav class="drawer-tabs" aria-label="区域配置" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.value"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        <span class="fluent-icon" aria-hidden="true">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <div class="drawer-main">
      <div class="drawer-scroll">
        <template v-if="activeTab === 'region'">
          <RegionFields :show-name="true" />

          <section class="content-section multicast-section">
            <SectionTitle title="组播控制" />
            <div class="multicast-actions">
              <button type="button" :class="{ active: selectedMulticastAction === 'on' }" :disabled="workflowBusy" @click="runMulticast('on')">
                <span class="fluent-icon button-icon" aria-hidden="true">{{ icons.power }}</span>组播开
              </button>
              <button type="button" :class="{ active: selectedMulticastAction === 'off' }" :disabled="workflowBusy" @click="runMulticast('off')">
                <span class="fluent-icon button-icon" aria-hidden="true">{{ icons.mute }}</span>组播关
              </button>
            </div>
            <div class="brightness-segments" aria-label="组播亮度">
              <button v-for="value in groupBrightnessOptions" :key="value" type="button" :class="{ active: selectedBrightness === value }" :disabled="workflowBusy" @click="runBrightness(value)">
                {{ value }}%
              </button>
            </div>
          </section>

          <DeviceListSection title="设备列表" @query="groupQueryRequested = true" @configure="configureGroup" />

          <section class="content-section info-section">
            <SectionTitle title="组信息列表" />
            <InfoEmpty v-if="!groupQueryRequested" text="暂无组播查询结果" />
            <dl v-else class="query-result">
              <div><dt>区域组 ID</dt><dd>{{ groupId }}</dd></div>
              <div><dt>网关</dt><dd>{{ gatewayName }}</dd></div>
              <div><dt>配置状态</dt><dd>{{ groupStatus }}</dd></div>
            </dl>
          </section>
        </template>

        <template v-else-if="activeTab === 'scene'">
          <RegionFields :show-name="false" />
          <DeviceListSection title="设备列表" @query="sceneQueryRequested = true" @configure="configureGroup" />

          <section class="content-section scene-section">
            <SectionTitle title="场景配置" />
            <div class="segmented-control">
              <button type="button" :class="{ active: sceneMode === 'default' }" @click="sceneMode = 'default'">默认场景</button>
              <button type="button" :class="{ active: sceneMode === 'custom' }" @click="sceneMode = 'custom'">自定义场景</button>
            </div>
            <div class="data-table-wrap scene-table-wrap">
              <table class="data-table scene-table">
                <thead><tr><th>场景名称</th><th>场景ID</th><th>亮度/色温</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="scene in sceneRows" :key="scene.id">
                    <td>{{ scene.name }}</td>
                    <td class="code-text">{{ formatSceneId(scene.slot) }}</td>
                    <td>{{ scene.brightness }}% | {{ scene.brightness === 0 ? '-' : `${scene.colorTemperature}K` }}</td>
                    <td class="operation-cell">
                      <button v-if="canExecuteScene(scene)" type="button" :disabled="workflowBusy" @click="executeScene(scene)">执行场景</button>
                      <button v-if="canEditScene(scene)" type="button" :disabled="workflowBusy" @click="editingScene = scene">编辑</button>
                    </td>
                  </tr>
                  <tr v-if="!sceneRows.length"><td colspan="4" class="table-empty-row">暂无{{ sceneMode === 'custom' ? '自定义' : '默认' }}场景</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="content-section info-section">
            <SectionTitle title="场景信息" />
            <InfoEmpty v-if="!sceneQueryRequested" text="暂无组播查询结果" />
            <dl v-else class="query-result">
              <div><dt>场景数量</dt><dd>{{ workflow?.scenes?.length || 0 }}</dd></div>
              <div><dt>当前场景</dt><dd>{{ activeSceneName || '未执行' }}</dd></div>
              <div><dt>配置状态</dt><dd>{{ workflow?.sceneConfiguration?.status || '待配置' }}</dd></div>
            </dl>
          </section>
        </template>

        <template v-else-if="activeTab === 'panel'">
          <RegionFields :show-name="true" />
          <section class="content-section panel-section">
            <SectionTitle title="参数配置" />
            <div class="panel-config-grid">
              <div class="panel-diagram">
                <button v-for="button in panelButtons" :key="button.keyNo" type="button" :class="{ active: selectedPanelKey === button.keyNo }" @click="selectedPanelKey = button.keyNo">{{ button.keyNo }}</button>
                <span>面板示意图</span>
              </div>
              <div class="panel-fields">
                <label><span>面板 ID</span><input v-model.trim="panelForm.panelId" type="text" maxlength="8" placeholder="输入面板 ID" /></label>
                <label><span>目标场景 ID</span><input v-model.trim="panelForm.targetSceneId" type="text" list="configured-scenes" placeholder="输入场景 ID" /></label>
                <datalist id="configured-scenes"><option v-for="scene in workflow?.scenes || []" :key="scene.id" :value="scene.id">{{ scene.name }}</option></datalist>
              </div>
            </div>
            <div class="dual-actions">
              <button type="button" class="primary" :disabled="workflowBusy || !panelFormValid" @click="configurePanelForm">提交</button>
              <button type="button" :disabled="workflowBusy || !panelFormValid" @click="configurePanelForm">下发配置</button>
            </div>
          </section>

          <section class="content-section subscription-info-section">
            <div class="section-title-row"><h3>订阅信息</h3><button type="button" class="query-link" @click="panelQueryRequested = true"><span class="fluent-icon">{{ icons.sync }}</span>一键查询</button></div>
            <div class="data-table-wrap subscription-table-wrap">
              <table class="data-table">
                <thead><tr><th>面板 ID</th><th>键值 ID</th><th>目标场景 ID</th></tr></thead>
                <tbody>
                  <tr v-for="(record, index) in panelRecords" :key="`${record.EnoceanID || record.panelId}-${index}`">
                    <td>{{ record.EnoceanID || record.panelId || '--' }}</td>
                    <td>{{ record.EnoceanKeyID || record.keyNo || '--' }}</td>
                    <td>{{ record.GatewayGroupSoltID || record.sceneId || '--' }}</td>
                  </tr>
                  <tr v-if="!panelRecords.length"><td colspan="3" class="table-empty-row">{{ panelQueryRequested ? '暂无订阅信息' : '请先查询订阅信息' }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'subscription'">
          <RegionFields :show-name="true" />
          <section class="content-section subscription-form-section">
            <SectionTitle title="新建订阅规则" />
            <label class="stacked-field"><span>触发源</span><select v-model="subscriptionForm.deviceId"><option value="">选择此区域内设备...</option><option v-for="device in devices" :key="device.id" :value="device.id">{{ device.name || device.id }}</option></select></label>
            <div class="type-field"><span>类型</span><div><button v-for="type in subscriptionTypes" :key="type" type="button" :class="{ active: subscriptionForm.type === type }" @click="subscriptionForm.type = type">{{ type }}</button></div></div>
            <div class="dual-actions"><button type="button" class="primary" :disabled="!subscriptionForm.deviceId || workflowBusy" @click="configureSubscriptionForm">提交保存</button><button type="button" :disabled="!subscriptionForm.deviceId || workflowBusy" @click="configureSubscriptionForm">下发配置</button></div>
          </section>
          <section class="content-section info-section">
            <div class="section-title-row"><h3>订阅信息</h3><button type="button" class="query-link" @click="subscriptionQueryRequested = true"><span class="fluent-icon">{{ icons.search }}</span>一键查询</button></div>
            <InfoEmpty v-if="!subscriptionQueryRequested || !subscriptionRecords.length" icon="rss" :text="subscriptionQueryRequested ? '暂无订阅信息' : '暂无订阅信息'" />
            <div v-else class="data-table-wrap"><table class="data-table"><thead><tr><th>面板 ID</th><th>键值 ID</th><th>目标场景 ID</th></tr></thead><tbody><tr v-for="(record, index) in subscriptionRecords" :key="index"><td>{{ record.EnoceanID }}</td><td>{{ record.EnoceanKeyID }}</td><td>{{ record.GatewayGroupSoltID }}</td></tr></tbody></table></div>
          </section>
        </template>

        <template v-else-if="activeTab === 'mtc'">
          <RegionFields :show-name="true" />
          <section class="content-section subscription-form-section">
            <SectionTitle title="触发源配置" />
            <label class="stacked-field"><span>触发源：</span><select v-model="mtcDeviceId"><option value="">-- 请选择区域内设备 --</option><option v-for="device in devices" :key="device.id" :value="device.id">{{ device.name || device.id }}</option></select></label>
            <div class="dual-actions"><button type="button" class="primary" :disabled="!mtcDeviceId || workflowBusy" @click="configureSubscriptionForm">提交保存</button><button type="button" :disabled="!mtcDeviceId || workflowBusy" @click="configureSubscriptionForm">下发配置</button></div>
          </section>
          <section class="content-section info-section">
            <div class="section-title-row"><h3>订阅信息</h3><button type="button" class="query-link" @click="mtcQueryRequested = true"><span class="fluent-icon">{{ icons.search }}</span>一键查询</button></div>
            <InfoEmpty v-if="!mtcQueryRequested || !subscriptionRecords.length" icon="info" text="暂无订阅数据" />
            <div v-else class="data-table-wrap"><table class="data-table"><thead><tr><th>面板 ID</th><th>键值 ID</th><th>目标场景 ID</th></tr></thead><tbody><tr v-for="(record, index) in subscriptionRecords" :key="index"><td>{{ record.EnoceanID }}</td><td>{{ record.EnoceanKeyID }}</td><td>{{ record.GatewayGroupSoltID }}</td></tr></tbody></table></div>
          </section>
        </template>

        <template v-else>
          <RegionFields :show-name="true" :show-group="false" />
          <div class="parameter-content">
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
          </div>
        </template>
      </div>

      <footer class="drawer-footer"><button type="button" @click="$emit('delete-region')">删除区域</button></footer>
    </div>

    <SceneConfigDialog v-if="editingScene" :scene="editingScene" :devices="devices" :busy="workflowBusy" @close="editingScene = null" @save="saveSceneEdit" />
  </aside>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, reactive, ref, watch } from 'vue'
import DeviceParameterConfigPanel from './DeviceParameterConfigPanel.vue'
import SceneConfigDialog from './SceneConfigDialog.vue'
import { DEVICE_MAP_BRIGHTNESS_OPTIONS } from './deviceMapOptions'

const props = defineProps({
  target: { type: Object, default: null },
  draftState: { type: Object, required: true },
  workflow: { type: Object, default: null },
  workflowBusy: { type: Boolean, default: false },
  initialTab: { type: String, default: 'workbench' }
})

const emit = defineEmits(['close', 'workflow-action', 'save-cu-params', 'delete-region'])
const icons = { power: '\uE7E8', mute: '\uE74F', sync: '\uE895', search: '\uE721', light: '\uE706', sensor: '\uE80A' }
const tabs = [
  { value: 'region', label: '区域信息', icon: '\uE946' },
  { value: 'scene', label: '场景信息', icon: '\uE9D9' },
  { value: 'panel', label: '面板配置', icon: '\uE80A' },
  { value: 'subscription', label: '订阅管理', icon: '\uE701' },
  { value: 'mtc', label: 'MTC 模式', icon: '\uE756' },
  { value: 'params', label: '参数配置', icon: '\uE713' }
]
const groupBrightnessOptions = [0, 30, 60, 100]
const brightnessOptions = DEVICE_MAP_BRIGHTNESS_OPTIONS
const subscriptionTypes = ['Lontri', 'Philips', 'Wiz']
const timeFields = [
  { key: 'bgTime', label: '进入背景亮度时间', hint: '无人感后，降低到背景亮度所需时间' },
  { key: 'offTime', label: '进入关灯时间', hint: '无人感后，彻底关闭灯所需时间' },
  { key: 'manualTime', label: '手动模式持续时间', hint: '手动模式到期后恢复自动感应' }
]

const activeTab = ref(normalizeTab(props.initialTab))
const selectedMulticastAction = ref('on')
const selectedBrightness = ref(0)
const groupQueryRequested = ref(false)
const sceneQueryRequested = ref(false)
const sceneMode = ref('default')
const editingScene = ref(null)
const panelQueryRequested = ref(false)
const selectedPanelKey = ref(null)
const panelForm = reactive({ panelId: '', targetSceneId: '' })
const subscriptionForm = reactive({ deviceId: '', type: 'Lontri' })
const subscriptionQueryRequested = ref(false)
const mtcDeviceId = ref('')
const mtcQueryRequested = ref(false)
const errors = reactive({})
const paramForm = reactive({ mode: 'auto', brightness: '100', bgBrightness: '40', bgTime: '900', offTime: '1200', manualTime: '1250' })
let paramSaveTimer = null
let paramsReady = false

const regionSnapshot = computed(() => props.workflow?.region || null)
const areaGroup = computed(() => props.workflow?.areaGroup || null)
const regionName = computed(() => regionSnapshot.value?.name || props.target?.name || props.target?.id || '--')
const groupId = computed(() => areaGroup.value?.groupNo || props.target?.code || props.target?.id || '--')
const gatewayName = computed(() => regionSnapshot.value?.gatewayName || areaGroup.value?.gatewayId || props.target?.gatewayId || '未识别')
const devices = computed(() => regionSnapshot.value?.members || [])
const deviceCount = computed(() => regionSnapshot.value?.deviceCount ?? devices.value.length)
const groupStatus = computed(() => areaGroup.value?.status || '待配置')
const sceneRows = computed(() => (props.workflow?.scenes || []).filter((scene) => sceneMode.value === 'custom' ? scene.kind === 'custom' : scene.kind !== 'custom'))
const activeSceneName = computed(() => props.workflow?.scenes?.find((scene) => scene.active)?.name || '')
const panelButtons = computed(() => props.workflow?.panel?.buttons?.length ? props.workflow.panel.buttons : [{ keyNo: 1 }, { keyNo: 2 }, { keyNo: 3 }, { keyNo: 4 }])
const panelFormValid = computed(() => panelForm.panelId.trim().length === 8)
const subscriptionRecords = computed(() => props.workflow?.subscription?.records || [])
const panelRecords = computed(() => panelQueryRequested.value ? subscriptionRecords.value : [])
const regionParamConfig = computed(() => props.draftState.cuParamConfigs?.find((item) => item.regionId === props.target?.id) || null)

watch(() => props.initialTab, (value) => { activeTab.value = normalizeTab(value) })
watch(() => props.target?.id, resetLocalState)
watch(() => props.workflow?.panel, syncPanelForm, { immediate: true, deep: true })
watch([() => props.target?.id, regionParamConfig], syncParamForm, { immediate: true })
watch(paramForm, scheduleParamSave, { deep: true, flush: 'sync' })
onBeforeUnmount(() => { if (paramSaveTimer) window.clearTimeout(paramSaveTimer) })

function normalizeTab(value) { return tabs.some((tab) => tab.value === value) ? value : value === 'params' ? 'params' : 'region' }
function resetLocalState() {
  activeTab.value = 'region'; selectedMulticastAction.value = 'on'; selectedBrightness.value = 0
  groupQueryRequested.value = false; sceneQueryRequested.value = false; sceneMode.value = 'default'; editingScene.value = null
  panelQueryRequested.value = false; selectedPanelKey.value = null; subscriptionQueryRequested.value = false; mtcQueryRequested.value = false
  subscriptionForm.deviceId = ''; subscriptionForm.type = 'Lontri'; mtcDeviceId.value = ''
}
function syncPanelForm() {
  panelForm.panelId = props.workflow?.panel?.panelId || ''
  panelForm.targetSceneId = props.workflow?.panel?.buttons?.find((button) => button.sceneId)?.sceneId || ''
  selectedPanelKey.value = props.workflow?.panel?.buttons?.[0]?.keyNo ?? null
}
function runMulticast(action) { selectedMulticastAction.value = action; emit('workflow-action', { type: 'verify-group', action }) }
function runBrightness(value) { selectedBrightness.value = value; selectedMulticastAction.value = 'brightness'; emit('workflow-action', { type: 'verify-group', action: 'brightness', value }) }
function configureGroup() { emit('workflow-action', { type: 'configure-group' }) }
function formatSceneId(slot) { return String(slot ?? '').padStart(2, '0') }
function canExecuteScene(scene) { return scene.configStatus === '配置完成' }
function canEditScene(scene) { return scene.configStatus !== '配置中' && scene.verifyStatus !== '验证中' }
function executeScene(scene) { emit('workflow-action', { type: 'verify-scene', sceneId: scene.id }) }
function saveSceneEdit(scene) { emit('workflow-action', { type: 'update-scene', scene }); editingScene.value = null }
function configurePanelForm() {
  const buttons = panelButtons.value.map((button) => ({ ...button, ...(panelForm.targetSceneId ? { action: 'scene', sceneId: panelForm.targetSceneId } : {}) }))
  emit('workflow-action', { type: 'configure-panel', panel: { panelId: panelForm.panelId, buttons } })
}
function configureSubscriptionForm() { emit('workflow-action', { type: 'configure-subscription' }) }
function syncParamForm() {
  paramsReady = false
  const config = regionParamConfig.value
  paramForm.mode = config?.mode || 'auto'; paramForm.brightness = String(config?.brightness ?? 100); paramForm.bgBrightness = String(config?.bgBrightness ?? 40)
  paramForm.bgTime = String(config?.bgTime ?? 900); paramForm.offTime = String(config?.offTime ?? 1200); paramForm.manualTime = String(config?.manualTime ?? 1250)
  queueMicrotask(() => { paramsReady = true })
}
function scheduleParamSave() { if (!paramsReady) return; if (paramSaveTimer) window.clearTimeout(paramSaveTimer); paramSaveTimer = window.setTimeout(saveParams, 350) }
function saveParams() {
  const valid = ['brightness', 'bgBrightness'].every(validatePercent) && timeFields.every((field) => validateDuration(field.key))
  if (!valid || !props.target) return
  emit('save-cu-params', { region: props.target, params: { mode: paramForm.mode, brightness: Number(paramForm.brightness), bgBrightness: Number(paramForm.bgBrightness), bgTime: Number(paramForm.bgTime), offTime: Number(paramForm.offTime), manualTime: Number(paramForm.manualTime) } })
}
function handlePercentInput(event, key) { const value = digitsOnly(event.target.value).slice(0, 3); paramForm[key] = value; event.target.value = value; validatePercent(key) }
function validatePercent(key) { const value = Number(paramForm[key]); errors[key] = paramForm[key] === '' || !Number.isInteger(value) || value < 0 || value > 100 ? '请输入 0-100 的整数' : ''; return !errors[key] }
function handleDurationInput(event, key) { const value = digitsOnly(event.target.value); paramForm[key] = value; event.target.value = value; validateDuration(key) }
function validateDuration(key) { errors[key] = paramForm[key] === '' ? '请输入时间' : ''; return !errors[key] }
function getFieldError(key) { return errors[key] || '' }
function digitsOnly(value) { return String(value ?? '').replace(/\D/g, '') }
function getDeviceIcon(device) { return /OCSR|SENSOR|PIR/i.test(`${device?.name || ''} ${device?.id || ''}`) ? icons.sensor : icons.light }

const RegionFields = defineComponent({
  props: { showName: { type: Boolean, default: true }, showGroup: { type: Boolean, default: true } },
  setup(componentProps) {
    return () => h('section', { class: 'region-fields' }, [
      componentProps.showName ? h('label', { class: 'field-block full-field' }, [h('span', '区域名称'), h('input', { value: regionName.value, readonly: true })]) : null,
      h('div', { class: 'field-grid' }, [
        componentProps.showGroup ? h('label', { class: 'field-block' }, [h('span', '区域组 ID'), h('input', { value: groupId.value, readonly: true, class: 'code-field' })]) : null,
        h('label', { class: ['field-block', { 'full-grid-field': !componentProps.showGroup }] }, [h('span', '网关'), h('input', { value: gatewayName.value, readonly: true, class: 'code-field' })])
      ])
    ])
  }
})
const SectionTitle = defineComponent({ props: { title: String }, setup(componentProps) { return () => h('div', { class: 'section-title-row' }, [h('h3', componentProps.title)]) } })
const InfoEmpty = defineComponent({ props: { text: String, icon: String }, setup(componentProps) { return () => h('div', { class: 'info-empty' }, [componentProps.icon ? h('span', { class: 'empty-icon' }, componentProps.icon === 'rss' ? '◔' : 'ⓘ') : null, h('span', componentProps.text)]) } })
const DeviceListSection = defineComponent({
  props: { title: String }, emits: ['query', 'configure'],
  setup(componentProps, { emit: componentEmit }) {
    return () => h('section', { class: 'content-section device-section' }, [
      h('div', { class: 'device-heading' }, [h('h3', `${componentProps.title} (${deviceCount.value})`), h('div', { class: 'heading-actions' }, [
        h('button', { type: 'button', disabled: props.workflowBusy, onClick: () => componentEmit('query') }, [h('span', { class: 'fluent-icon' }, icons.sync), '一键查询']),
        h('button', { type: 'button', class: 'primary', disabled: props.workflowBusy, onClick: () => componentEmit('configure') }, [h('span', { class: 'fluent-icon' }, '\uE724'), '一键配置'])
      ])]),
      h('div', { class: 'data-table-wrap device-table-wrap' }, [h('table', { class: 'data-table device-table' }, [
        h('thead', [h('tr', [h('th', '设备名称'), h('th', 'Zigbee ID'), h('th', '状态')])]),
        h('tbody', devices.value.length ? devices.value.map((device) => h('tr', { key: device.id }, [
          h('td', { class: 'device-name-cell' }, [h('span', { class: 'fluent-icon device-icon' }, getDeviceIcon(device)), h('span', device.name || device.id)]),
          h('td', { class: 'code-text' }, device.zigbeeId || device.id || '--'),
          h('td', [h('span', { class: ['network-status', { pending: device.online === false }] }, [h('i'), device.online === false ? '待入网' : '已入网'])])
        ])) : [h('tr', [h('td', { colspan: 3, class: 'table-empty-row' }, '暂无设备')])])
      ])])
    ])
  }
})
</script>

<style>
.config-drawer.control-drawer {
  --primary: #004ac6; --primary-hover: #003ea8; --text: #191c1e; --secondary: #434655; --muted: #737686;
  --border: #c3c6d7; --border-soft: #e2e8f0; --surface: #ffffff; --surface-low: #f2f4f6; --surface-high: #e6e8ea;
  position: absolute; inset: 0 0 0 auto !important; z-index: 16; width: 420px !important; max-width: calc(100% - 24px); max-height: none !important;
  display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; border: 0 !important; border-left: 1px solid var(--border) !important;
  border-radius: 0 !important; color: var(--text); background: var(--surface); box-shadow: -4px 0 10px rgba(15, 23, 42, .08) !important;
  font-family: Inter, "Microsoft YaHei", "PingFang SC", Arial, sans-serif; transform: none;
}
.config-drawer {
.fluent-icon { font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets"; font-size: 14px; font-weight: 400; line-height: 1; }
.drawer-tabs { display: grid; flex: 0 0 48px; grid-template-columns: repeat(6, minmax(0, 1fr)); align-items: end; padding: 7px 6px 0; overflow: hidden; border-bottom: 1px solid var(--border); background: #f7f9fb; }
.drawer-tabs button { min-width: 0; height: 40px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 0 3px; overflow: hidden; border: 0; border-bottom: 2px solid transparent; border-radius: 6px 6px 0 0; color: var(--secondary); background: transparent; cursor: pointer; font-size: 11px; white-space: nowrap; }
.drawer-tabs button span:last-child { overflow: hidden; text-overflow: clip; }
.drawer-tabs button:hover { background: var(--surface-high); }
.drawer-tabs button.active { border-bottom-color: var(--primary); color: #0b1c30; background: #d0e1fb; }
.drawer-main { min-height: 0; display: flex; flex: 1; flex-direction: column; }
.drawer-scroll { min-height: 0; flex: 1; overflow: auto; padding: 16px; scrollbar-color: var(--border) transparent; scrollbar-width: thin; }
.drawer-scroll::-webkit-scrollbar { width: 4px; }.drawer-scroll::-webkit-scrollbar-thumb { border-radius: 2px; background: var(--border); }
.region-fields { display: grid; gap: 12px; }.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }.full-grid-field { grid-column: 2; }
.field-block { min-width: 0; display: grid; gap: 5px; }.field-block > span { color: #505f76; font-size: 12px; line-height: 16px; }
.field-block input, .stacked-field select, .panel-fields input { width: 100%; height: 34px; box-sizing: border-box; padding: 0 9px; border: 1px solid var(--border); border-radius: 2px; color: var(--text); background: #f7f9fb; outline: none; font-size: 13px; }
.field-block input.code-field { border-color: var(--border-soft); color: #475569; background: #eceef0; font-family: "JetBrains Mono", Consolas, monospace; }
.content-section { margin-top: 22px; }.section-title-row, .device-heading { min-height: 24px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-soft); }
.section-title-row h3, .device-heading h3 { margin: 0; color: #505f76; font-size: 11px; font-weight: 700; line-height: 16px; }
.multicast-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 9px; }
.multicast-actions button { height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; border: 1px solid var(--border); border-radius: 2px; color: var(--text); background: #f7f9fb; cursor: pointer; font-size: 13px; font-weight: 600; }
.multicast-actions button.active { border-color: var(--primary); color: #fff; background: var(--primary); }.button-icon { font-size: 18px; }
.brightness-segments { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 9px; }
.brightness-segments button { height: 31px; border: 1px solid var(--border); border-left: 0; color: var(--text); background: #fff; cursor: pointer; font-size: 11px; }.brightness-segments button:first-child { border-left: 1px solid var(--border); border-radius: 2px 0 0 2px; }.brightness-segments button:last-child { border-radius: 0 2px 2px 0; }.brightness-segments button.active { background: var(--surface-high); }
.device-section { margin-top: 24px; }.heading-actions { display: flex; gap: 5px; }.heading-actions button { height: 27px; display: inline-flex; align-items: center; gap: 4px; padding: 0 8px; border: 1px solid var(--border); border-radius: 2px; color: var(--primary); background: #fff; cursor: pointer; font-size: 10px; }.heading-actions button.primary { border-color: var(--primary); color: #fff; background: var(--primary); }
.data-table-wrap { overflow: auto; margin-top: 9px; border: 1px solid var(--border-soft); border-radius: 4px; background: #f7f9fb; }.device-table-wrap { height: 198px; }.data-table { width: 100%; border-collapse: collapse; table-layout: fixed; }.data-table th { height: 32px; padding: 0 10px; color: #505f76; background: var(--surface-low); font-size: 11px; font-weight: 500; text-align: left; }.data-table td { height: 30px; padding: 0 10px; border-top: 1px solid var(--border-soft); color: var(--text); font-size: 11px; white-space: nowrap; }.device-table th:nth-child(1) { width: 29%; }.device-table th:nth-child(2) { width: 52%; }.device-table th:nth-child(3) { width: 19%; }
.device-name-cell { display: flex; align-items: center; gap: 7px; }.device-icon { color: #505f76; font-size: 12px; }.code-text { overflow: hidden; color: #475569 !important; font-family: "JetBrains Mono", Consolas, monospace; text-overflow: ellipsis; }.network-status { display: inline-flex; align-items: center; gap: 6px; color: #10b981; }.network-status.pending { color: #f43f5e; }.network-status i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.table-empty-row { height: 76px !important; color: var(--muted) !important; text-align: center; }.info-section { margin-top: 18px; }.info-empty { min-height: 104px; display: grid; place-items: center; align-content: center; gap: 8px; box-sizing: border-box; margin-top: 9px; border: 1px dashed var(--border); border-radius: 4px; color: #505f76; background: var(--surface-low); font-size: 11px; }.empty-icon { color: var(--border); font-size: 26px; }
.query-result { min-height: 104px; display: grid; align-content: center; gap: 7px; box-sizing: border-box; margin: 9px 0 0; padding: 14px 16px; border: 1px dashed var(--border); border-radius: 4px; background: var(--surface-low); }.query-result > div { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 12px; }.query-result dt { color: var(--muted); font-size: 11px; }.query-result dd { margin: 0; color: var(--text); font-family: "JetBrains Mono", Consolas, monospace; font-size: 11px; }
.segmented-control { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-top: 9px; padding: 3px; border-radius: 4px; background: var(--surface-low); }.segmented-control button { height: 28px; border: 0; border-radius: 2px; color: #505f76; background: transparent; cursor: pointer; font-size: 11px; }.segmented-control button.active { color: var(--primary); background: #fff; box-shadow: 0 1px 2px rgba(15,23,42,.08); }
.scene-table-wrap { max-height: 230px; }.scene-table th:nth-child(1) { width: 22%; }.scene-table th:nth-child(2) { width: 17%; }.scene-table th:nth-child(3) { width: 29%; }.scene-table th:nth-child(4) { width: 32%; }.operation-cell { display: flex; align-items: center; gap: 8px; }.operation-cell button, .query-link { padding: 0; border: 0; color: var(--primary); background: transparent; cursor: pointer; font-size: 11px; }
.panel-config-grid { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 12px; margin-top: 12px; }.panel-diagram { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 8px; border: 1px solid var(--border); border-radius: 3px; background: var(--surface-low); }.panel-diagram button { aspect-ratio: 1; border: 1px solid #b7c8e1; border-radius: 2px; color: #004ac6; background: #d0e1fb; cursor: pointer; font-weight: 600; }.panel-diagram button.active { outline: 2px solid var(--primary); outline-offset: -2px; }.panel-diagram > span { grid-column: 1 / -1; padding-top: 3px; color: #505f76; font-size: 10px; text-align: center; }.panel-fields { display: grid; align-content: start; gap: 12px; }.panel-fields label, .stacked-field { display: grid; gap: 5px; }.panel-fields label > span, .stacked-field > span, .type-field > span { color: #505f76; font-size: 12px; }
.dual-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin-top: 12px; }.dual-actions button { height: 34px; border: 1px solid var(--primary); border-radius: 2px; color: var(--primary); background: #fff; cursor: pointer; font-size: 13px; font-weight: 600; }.dual-actions button.primary { color: #fff; background: var(--primary); }.dual-actions button:disabled, button:disabled { cursor: wait; opacity: .55; }
.subscription-info-section { margin-top: 18px; }.subscription-table-wrap { max-height: 230px; }.subscription-form-section { display: grid; gap: 12px; }.subscription-form-section .section-title-row { margin-bottom: 0; }.type-field { display: grid; gap: 6px; }.type-field > div { display: flex; gap: 7px; }.type-field button { min-width: 48px; min-height: 26px; padding: 0 10px; border: 1px solid var(--border); border-radius: 13px; color: #505f76; background: #fff; cursor: pointer; font-size: 10px; }.type-field button.active { border-color: var(--primary); color: var(--primary); background: #eff6ff; }.query-link { display: inline-flex; align-items: center; gap: 4px; }
.parameter-content { display: grid; gap: 16px; margin-top: 16px; }.drawer-footer { flex: 0 0 66px; display: flex; align-items: center; padding: 0 16px; border-top: 1px solid var(--border); background: var(--surface-low); }.drawer-footer button { width: 100%; height: 35px; border: 1px solid #f43f5e; border-radius: 2px; color: #f43f5e; background: transparent; cursor: pointer; font-size: 13px; }.drawer-footer button:hover { color: #fff; background: #f43f5e; }
.parameter-content .drawer-section { gap: 12px; padding: 14px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-low); }.parameter-content .section-head { color: var(--text); }.parameter-content .section-tag { border-color: var(--border-soft); border-radius: 2px; color: #505f76; background: var(--surface-high); }.parameter-content .action-btn { min-height: 34px; border-color: var(--border); border-radius: 2px; color: var(--text); background: #fff; }.parameter-content .action-btn.active { border-color: var(--primary); color: #fff; background: var(--primary); }.parameter-content .section-desc, .parameter-content .time-copy { color: var(--muted); }.parameter-content .metric-card, .parameter-content .time-card { border-color: var(--border); border-radius: 2px; background: #f7f9fb; }.parameter-content .brightness-select, .parameter-content .time-input-wrap { border-color: var(--border); border-radius: 2px; color: var(--primary); background: #fff; }.parameter-content .brightness-options { border-color: var(--border); background: #fff; }.parameter-content .brightness-options button { color: var(--secondary); }.parameter-content .brightness-options button:hover, .parameter-content .brightness-options button.selected { color: var(--primary); background: #eff6ff; }.parameter-content .time-input, .parameter-content .brightness-select input { color: var(--text); font-family: "JetBrains Mono", Consolas, monospace; }
}
@media (max-width: 760px) { .config-drawer.control-drawer { width: min(100%, 420px) !important; max-width: 100%; }.config-drawer { .drawer-tabs { padding-right: 2px; padding-left: 2px; }.drawer-tabs button { gap: 2px; padding: 0 1px; font-size: 10px; }.panel-config-grid { grid-template-columns: 130px minmax(0, 1fr); } } }
</style>

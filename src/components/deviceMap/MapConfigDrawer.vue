<template>
  <aside class="stitch-config-drawer" aria-label="区域信息">
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
                      <button v-if="sceneMode === 'custom'" type="button" class="scene-edit-button" :disabled="workflowBusy" @click="editingScene = scene">
                        <span class="fluent-icon" aria-hidden="true">{{ icons.edit }}</span>编辑
                      </button>
                      <button type="button" :disabled="workflowBusy" @click="executeScene(scene)">执行场景</button>
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
            <div class="section-title-row"><h3>订阅信息</h3><button type="button" class="drawer-action drawer-action--query" @click="panelQueryRequested = true"><span class="fluent-icon">{{ icons.sync }}</span>一键查询</button></div>
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
            <div class="section-title-row"><h3>订阅信息</h3><button type="button" class="drawer-action drawer-action--query" @click="subscriptionQueryRequested = true"><span class="fluent-icon">{{ icons.search }}</span>一键查询</button></div>
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
            <div class="section-title-row"><h3>订阅信息</h3><button type="button" class="drawer-action drawer-action--query" @click="mtcQueryRequested = true"><span class="fluent-icon">{{ icons.search }}</span>一键查询</button></div>
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
const icons = {
  power: '\uE7E8',
  mute: '\uE74F',
  sync: '\uE895',
  search: '\uE721',
  light: '\uE706',
  sensor: '\uE80A',
  rss: '\uE701',
  info: '\uE946',
  edit: '\uE713'
}
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
const sceneRows = computed(() => props.workflow?.scenes || [])
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
    return () => {
      const gatewayField = h('label', { class: 'field-block' }, [
        h('span', '网关'),
        h('input', { value: gatewayName.value, readonly: true, class: 'code-field' })
      ])
      const groupField = h('label', { class: 'field-block' }, [
        h('span', '区域组 ID'),
        h('input', { value: groupId.value, readonly: true, class: 'code-field' })
      ])

      return h('section', { class: 'region-fields' }, componentProps.showName
        ? [
            h('div', { class: 'field-grid' }, [
              h('label', { class: 'field-block' }, [h('span', '区域名称'), h('input', { value: regionName.value, readonly: true })]),
              gatewayField
            ]),
            componentProps.showGroup ? groupField : null
          ]
        : [h('div', { class: 'field-grid' }, componentProps.showGroup ? [groupField, gatewayField] : [gatewayField])])
    }
  }
})
const SectionTitle = defineComponent({ props: { title: String }, setup(componentProps) { return () => h('div', { class: 'section-title-row' }, [h('h3', componentProps.title)]) } })
const InfoEmpty = defineComponent({
  props: { text: String, icon: String },
  setup(componentProps) {
    return () => h('div', { class: 'info-empty' }, [
      componentProps.icon ? h('span', { class: 'fluent-icon empty-icon', 'aria-hidden': 'true' }, componentProps.icon === 'rss' ? icons.rss : icons.info) : null,
      h('span', componentProps.text)
    ])
  }
})
const DeviceListSection = defineComponent({
  props: { title: String }, emits: ['query', 'configure'],
  setup(componentProps, { emit: componentEmit }) {
    return () => h('section', { class: 'content-section device-section' }, [
      h('div', { class: 'device-heading' }, [h('h3', `${componentProps.title} (${deviceCount.value})`), h('div', { class: 'heading-actions' }, [
        h('button', { type: 'button', class: 'drawer-action drawer-action--query', disabled: props.workflowBusy, onClick: () => componentEmit('query') }, [h('span', { class: 'fluent-icon' }, icons.sync), '一键查询']),
        h('button', { type: 'button', class: 'drawer-action drawer-action--configure', disabled: props.workflowBusy, onClick: () => componentEmit('configure') }, [h('span', { class: 'fluent-icon' }, '\uE724'), '一键配置'])
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
.stitch-config-drawer {
  --stitch-primary: #004ac6;
  --stitch-primary-hover: #003ea8;
  --stitch-text: #191c1e;
  --stitch-text-secondary: #434655;
  --stitch-label: #505f76;
  --stitch-muted: #737686;
  --stitch-border: #c3c6d7;
  --stitch-border-soft: #e2e8f0;
  --stitch-surface: #ffffff;
  --stitch-surface-bright: #f7f9fb;
  --stitch-surface-low: #f2f4f6;
  --stitch-surface-container: #eceef0;
  --stitch-surface-high: #e6e8ea;
  --stitch-active-tab: #d3e4fe;
  --stitch-code: #475569;
  --stitch-success: #10b981;
  --stitch-danger: #f43f5e;
  --primary: var(--stitch-primary);
  --primary-hover: var(--stitch-primary-hover);
  --text: var(--stitch-text);
  --secondary: var(--stitch-text-secondary);
  --muted: var(--stitch-muted);
  --border: var(--stitch-border);
  --border-soft: var(--stitch-border-soft);
  --surface: var(--stitch-surface);
  --surface-low: var(--stitch-surface-low);
  --surface-high: var(--stitch-surface-high);
  --text-1: var(--stitch-text);
  --text-2: var(--stitch-text-secondary);
  --text-primary: var(--stitch-text);
  --text-secondary: var(--stitch-text-secondary);
  --text-tertiary: var(--stitch-muted);
  --text-strong: var(--stitch-text);
  --control-bg: var(--stitch-surface);
  --control-bg-hover: var(--stitch-surface-low);
  --border-subtle: var(--stitch-border-soft);
  --border-default: var(--stitch-border);
  --border-active: var(--stitch-primary);
  --accent-cyan: var(--stitch-primary);
  --accent-teal: var(--stitch-primary);
  --danger: var(--stitch-danger);
  --danger-border: var(--stitch-danger);
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 16;
  width: clamp(460px, 27vw, 620px);
  max-width: calc(100% - 24px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  border-left: 1px solid var(--stitch-border);
  color: var(--stitch-text);
  color-scheme: light;
  background: var(--stitch-surface);
  box-shadow: -4px 0 10px rgba(15, 23, 42, 0.08);
  font-family: Inter, "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif;
  font-size: 14px;
  transform: none;
}

.stitch-config-drawer *,
.stitch-config-drawer *::before,
.stitch-config-drawer *::after {
  box-sizing: border-box;
}

.stitch-config-drawer button,
.stitch-config-drawer input,
.stitch-config-drawer select {
  font: inherit;
}

.stitch-config-drawer .fluent-icon {
  flex: 0 0 auto;
  font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets";
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
}

.stitch-config-drawer .drawer-tabs {
  min-width: 0;
  flex: 0 0 48px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 7px 8px 0;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--stitch-border);
  background: var(--stitch-surface-bright);
  scrollbar-width: none;
}

.stitch-config-drawer .drawer-tabs::-webkit-scrollbar {
  display: none;
}

.stitch-config-drawer .drawer-tabs button {
  flex: 0 0 auto;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 6px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 8px 8px 0 0;
  color: var(--stitch-text-secondary);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.stitch-config-drawer .drawer-tabs button:hover {
  background: var(--stitch-surface-high);
}

.stitch-config-drawer .drawer-tabs button.active {
  border-bottom-color: var(--stitch-primary);
  color: #0b1c30;
  background: var(--stitch-active-tab);
}

.stitch-config-drawer .drawer-tabs button:focus-visible,
.stitch-config-drawer button:focus-visible,
.stitch-config-drawer input:focus-visible,
.stitch-config-drawer select:focus-visible {
  outline: 2px solid rgba(0, 74, 198, 0.32);
  outline-offset: 1px;
}

.stitch-config-drawer .drawer-main {
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  background: var(--stitch-surface);
}

.stitch-config-drawer .drawer-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--stitch-surface);
  scrollbar-color: var(--stitch-border) transparent;
  scrollbar-width: thin;
}

.stitch-config-drawer .drawer-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.stitch-config-drawer .drawer-scroll::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: var(--stitch-border);
}

.stitch-config-drawer .region-fields {
  display: grid;
  gap: 12px;
}

.stitch-config-drawer .field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stitch-config-drawer .full-grid-field {
  grid-column: 2;
}

.stitch-config-drawer .field-block {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.stitch-config-drawer .field-block > span,
.stitch-config-drawer .panel-fields label > span,
.stitch-config-drawer .stacked-field > span,
.stitch-config-drawer .type-field > span {
  color: var(--stitch-label);
  font-size: 12px;
  line-height: 16px;
}

.stitch-config-drawer .field-block input,
.stitch-config-drawer .stacked-field select,
.stitch-config-drawer .panel-fields input {
  width: 100%;
  height: 34px;
  padding: 0 9px;
  border: 1px solid var(--stitch-border);
  border-radius: 2px;
  color: var(--stitch-text);
  background: var(--stitch-surface-bright);
  outline: none;
  font-size: 13px;
}

.stitch-config-drawer .field-block input.code-field {
  border-color: var(--stitch-border-soft);
  color: var(--stitch-code);
  background: var(--stitch-surface-container);
  font-family: "JetBrains Mono", Consolas, monospace;
}

.stitch-config-drawer .content-section {
  margin-top: 24px;
}

.stitch-config-drawer .section-title-row,
.stitch-config-drawer .device-heading {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--stitch-border-soft);
}

.stitch-config-drawer .section-title-row h3,
.stitch-config-drawer .device-heading h3 {
  margin: 0;
  color: var(--stitch-label);
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0.03em;
}

.stitch-config-drawer .multicast-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 9px;
}

.stitch-config-drawer .multicast-actions button {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid var(--stitch-border);
  border-radius: 2px;
  color: var(--stitch-text);
  background: var(--stitch-surface-bright);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.stitch-config-drawer .multicast-actions button.active {
  border-color: var(--stitch-primary);
  color: #ffffff;
  background: var(--stitch-primary);
}

.stitch-config-drawer .button-icon {
  font-size: 18px;
}

.stitch-config-drawer .brightness-segments {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 9px;
}

.stitch-config-drawer .brightness-segments button {
  height: 31px;
  border: 1px solid var(--stitch-border);
  border-left: 0;
  color: var(--stitch-text);
  background: var(--stitch-surface);
  cursor: pointer;
  font-size: 11px;
}

.stitch-config-drawer .brightness-segments button:first-child {
  border-left: 1px solid var(--stitch-border);
  border-radius: 2px 0 0 2px;
}

.stitch-config-drawer .brightness-segments button:last-child {
  border-radius: 0 2px 2px 0;
}

.stitch-config-drawer .brightness-segments button.active {
  background: var(--stitch-surface-high);
}

.stitch-config-drawer .heading-actions {
  display: flex;
  gap: 8px;
}

.stitch-config-drawer .drawer-action {
  min-width: 88px;
  height: 30px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--stitch-primary);
  border-radius: 2px;
  color: var(--stitch-primary);
  background: var(--stitch-surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.stitch-config-drawer .drawer-action .fluent-icon {
  font-size: 14px;
  line-height: 1;
}

.stitch-config-drawer .drawer-action--configure {
  border-color: var(--stitch-primary);
  color: #ffffff;
  background: var(--stitch-primary);
}

.stitch-config-drawer .drawer-action--query:hover:not(:disabled),
.stitch-config-drawer .drawer-action--query:focus-visible {
  background: #eff6ff;
}

.stitch-config-drawer .drawer-action--configure:hover:not(:disabled),
.stitch-config-drawer .drawer-action--configure:focus-visible {
  border-color: #003b9f;
  background: #003b9f;
}

.stitch-config-drawer .data-table-wrap {
  overflow: auto;
  margin-top: 9px;
  border: 1px solid var(--stitch-border-soft);
  border-radius: 4px;
  background: var(--stitch-surface-bright);
}

.stitch-config-drawer .device-table-wrap {
  height: 198px;
}

.stitch-config-drawer .data-table {
  width: 100%;
  min-width: 500px;
  border-collapse: collapse;
  table-layout: fixed;
}

.stitch-config-drawer .data-table th {
  height: 32px;
  padding: 0 10px;
  color: var(--stitch-label);
  background: var(--stitch-surface-low);
  font-size: 11px;
  font-weight: 500;
  text-align: left;
}

.stitch-config-drawer .data-table td {
  height: 30px;
  padding: 0 10px;
  border-top: 1px solid var(--stitch-border-soft);
  color: var(--stitch-text);
  font-size: 11px;
  white-space: nowrap;
}

.stitch-config-drawer .device-table th:nth-child(1) { width: 30%; }
.stitch-config-drawer .device-table th:nth-child(2) { width: 44%; }
.stitch-config-drawer .device-table th:nth-child(3) { width: 26%; }

.stitch-config-drawer .device-name-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}

.stitch-config-drawer .device-icon {
  color: var(--stitch-label);
  font-size: 12px;
}

.stitch-config-drawer .code-text {
  overflow: hidden;
  color: var(--stitch-code) !important;
  font-family: "JetBrains Mono", Consolas, monospace;
  text-overflow: ellipsis;
}

.stitch-config-drawer .network-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--stitch-success);
}

.stitch-config-drawer .network-status.pending {
  color: var(--stitch-danger);
}

.stitch-config-drawer .network-status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.stitch-config-drawer .table-empty-row {
  height: 76px !important;
  color: var(--stitch-muted) !important;
  text-align: center;
}

.stitch-config-drawer .info-section {
  margin-top: 18px;
}

.stitch-config-drawer .info-empty {
  min-height: 104px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  margin-top: 9px;
  border: 1px dashed var(--stitch-border);
  border-radius: 4px;
  color: var(--stitch-label);
  background: var(--stitch-surface-low);
  font-size: 11px;
}

.stitch-config-drawer .empty-icon {
  color: var(--stitch-border);
  font-size: 26px;
}

.stitch-config-drawer .query-result {
  min-height: 104px;
  display: grid;
  align-content: center;
  gap: 7px;
  margin: 9px 0 0;
  padding: 14px 16px;
  border: 1px dashed var(--stitch-border);
  border-radius: 4px;
  background: var(--stitch-surface-low);
}

.stitch-config-drawer .query-result > div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
}

.stitch-config-drawer .query-result dt {
  color: var(--stitch-muted);
  font-size: 11px;
}

.stitch-config-drawer .query-result dd {
  margin: 0;
  color: var(--stitch-text);
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 11px;
}

.stitch-config-drawer .segmented-control {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  margin-top: 9px;
  padding: 3px;
  border-radius: 4px;
  background: var(--stitch-surface-low);
}

.stitch-config-drawer .segmented-control button {
  height: 28px;
  border: 0;
  border-radius: 2px;
  color: var(--stitch-label);
  background: transparent;
  cursor: pointer;
  font-size: 11px;
}

.stitch-config-drawer .segmented-control button.active {
  color: var(--stitch-primary);
  background: var(--stitch-surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.stitch-config-drawer .scene-table-wrap,
.stitch-config-drawer .subscription-table-wrap {
  max-height: 230px;
}

.stitch-config-drawer .scene-table {
  min-width: 560px;
}

.stitch-config-drawer .scene-table th:nth-child(1) { width: 22%; }
.stitch-config-drawer .scene-table th:nth-child(2) { width: 17%; }
.stitch-config-drawer .scene-table th:nth-child(3) { width: 29%; }
.stitch-config-drawer .scene-table th:nth-child(4) { width: 32%; }

.stitch-config-drawer .operation-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stitch-config-drawer .operation-cell button,
.stitch-config-drawer .query-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  color: var(--stitch-primary);
  background: transparent;
  cursor: pointer;
  font-size: 11px;
}

.stitch-config-drawer .operation-cell .scene-edit-button {
  min-height: 24px;
  padding: 0 7px;
  border: 1px solid var(--stitch-primary);
  border-radius: 2px;
  background: var(--stitch-surface);
}

.stitch-config-drawer .operation-cell .scene-edit-button .fluent-icon {
  font-size: 13px;
}

.stitch-config-drawer .panel-config-grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 16px;
  margin-top: 12px;
}

.stitch-config-drawer .panel-diagram {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--stitch-border);
  border-radius: 3px;
  background: var(--stitch-surface-low);
}

.stitch-config-drawer .panel-diagram button {
  aspect-ratio: 1;
  border: 1px solid #b7c8e1;
  border-radius: 2px;
  color: var(--stitch-primary);
  background: #d0e1fb;
  cursor: pointer;
  font-weight: 600;
}

.stitch-config-drawer .panel-diagram button.active {
  outline: 2px solid var(--stitch-primary);
  outline-offset: -2px;
}

.stitch-config-drawer .panel-diagram > span {
  grid-column: 1 / -1;
  padding-top: 3px;
  color: var(--stitch-label);
  font-size: 10px;
  text-align: center;
}

.stitch-config-drawer .panel-fields {
  display: grid;
  align-content: start;
  gap: 12px;
}

.stitch-config-drawer .panel-fields label,
.stitch-config-drawer .stacked-field {
  display: grid;
  gap: 5px;
}

.stitch-config-drawer .dual-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.stitch-config-drawer .dual-actions button {
  height: 36px;
  border: 1px solid var(--stitch-primary);
  border-radius: 2px;
  color: var(--stitch-primary);
  background: var(--stitch-surface);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.stitch-config-drawer .dual-actions button.primary {
  color: #ffffff;
  background: var(--stitch-primary);
}

.stitch-config-drawer button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.stitch-config-drawer .subscription-info-section {
  margin-top: 18px;
}

.stitch-config-drawer .subscription-form-section {
  display: grid;
  gap: 12px;
}

.stitch-config-drawer .subscription-form-section .section-title-row {
  margin-bottom: 0;
}

.stitch-config-drawer .type-field {
  display: grid;
  gap: 6px;
}

.stitch-config-drawer .type-field > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.stitch-config-drawer .type-field button {
  min-width: 58px;
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid var(--stitch-border);
  border-radius: 14px;
  color: var(--stitch-label);
  background: var(--stitch-surface);
  cursor: pointer;
  font-size: 10px;
}

.stitch-config-drawer .type-field button.active {
  border-color: var(--stitch-primary);
  color: var(--stitch-primary);
  background: #eff6ff;
}

.stitch-config-drawer .query-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stitch-config-drawer .parameter-content {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.stitch-config-drawer .parameter-content .drawer-section {
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--stitch-border);
  border-radius: 6px;
  background: var(--stitch-surface-low);
}

.stitch-config-drawer .parameter-content .section-head {
  color: var(--stitch-text);
}

.stitch-config-drawer .parameter-content .section-tag {
  border-color: var(--stitch-border-soft);
  border-radius: 2px;
  color: var(--stitch-label);
  background: var(--stitch-surface-high);
}

.stitch-config-drawer .parameter-content .action-btn {
  min-height: 36px;
  border-color: var(--stitch-border);
  border-radius: 2px;
  color: var(--stitch-text);
  background: var(--stitch-surface);
}

.stitch-config-drawer .parameter-content .action-btn.active {
  border-color: var(--stitch-primary);
  color: #ffffff;
  background: var(--stitch-primary);
}

.stitch-config-drawer .parameter-content .section-desc,
.stitch-config-drawer .parameter-content .time-copy {
  color: var(--stitch-muted);
}

.stitch-config-drawer .parameter-content .metric-card,
.stitch-config-drawer .parameter-content .time-card {
  border-color: var(--stitch-border);
  border-radius: 2px;
  background: var(--stitch-surface-bright);
}

.stitch-config-drawer .parameter-content .brightness-select,
.stitch-config-drawer .parameter-content .time-input-wrap {
  border-color: var(--stitch-border);
  border-radius: 2px;
  color: var(--stitch-primary);
  background: var(--stitch-surface);
}

.stitch-config-drawer .parameter-content .brightness-options {
  border-color: var(--stitch-border);
  background: var(--stitch-surface);
}

.stitch-config-drawer .parameter-content .brightness-options button {
  color: var(--stitch-text-secondary);
}

.stitch-config-drawer .parameter-content .brightness-options button:hover,
.stitch-config-drawer .parameter-content .brightness-options button.selected {
  color: var(--stitch-primary);
  background: #eff6ff;
}

.stitch-config-drawer .parameter-content .time-input,
.stitch-config-drawer .parameter-content .brightness-select input {
  color: var(--stitch-text);
  font-family: "JetBrains Mono", Consolas, monospace;
}

.stitch-config-drawer .drawer-footer {
  flex: 0 0 66px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-top: 1px solid var(--stitch-border);
  background: var(--stitch-surface-low);
}

.stitch-config-drawer .drawer-footer button {
  width: 100%;
  height: 36px;
  border: 1px solid var(--stitch-danger);
  border-radius: 2px;
  color: var(--stitch-danger);
  background: transparent;
  cursor: pointer;
  font-size: 13px;
}

.stitch-config-drawer .drawer-footer button:hover {
  color: #ffffff;
  background: var(--stitch-danger);
}

@media (max-width: 760px) {
  .stitch-config-drawer {
    width: 100%;
    max-width: 100%;
  }

  .stitch-config-drawer .drawer-tabs {
    padding-right: 6px;
    padding-left: 6px;
  }

  .stitch-config-drawer .field-grid {
    grid-template-columns: 1fr;
  }

  .stitch-config-drawer .full-grid-field {
    grid-column: auto;
  }
}

@media (max-width: 620px) {
  .stitch-config-drawer .panel-config-grid {
    grid-template-columns: 1fr;
  }

  .stitch-config-drawer .panel-diagram {
    max-width: 240px;
  }

  .stitch-config-drawer .dual-actions,
  .stitch-config-drawer .multicast-actions {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div v-if="workflow" class="workflow-shell">
    <section class="region-summary">
      <div class="summary-title-row">
        <div>
          <span class="eyebrow">区域调试工作台</span>
          <h4>{{ workflow.region.name }}</h4>
          <p>{{ workflow.region.code }}</p>
        </div>
        <div class="progress-ring" :style="{ '--progress': `${workflow.overallProgress * 3.6}deg` }">
          <strong>{{ workflow.overallProgress }}%</strong>
        </div>
      </div>
      <div class="summary-grid">
        <div><span>所属网关</span><strong>{{ workflow.region.gatewayName }}</strong></div>
        <div><span>区域设备</span><strong>{{ workflow.region.deviceCount }} 台</strong></div>
        <div><span>在线</span><strong class="success-text">{{ workflow.region.onlineCount }}</strong></div>
        <div><span>离线</span><strong :class="{ 'warning-text': workflow.region.offlineCount }">{{ workflow.region.offlineCount }}</strong></div>
      </div>
      <div class="flow-tags">
        <span class="required-tag">必配流程</span>
        <span class="optional-tag">按需配置</span>
        <strong v-if="workflow.requiredComplete">基础调试已完成</strong>
      </div>
    </section>

    <nav class="step-nav" aria-label="区域调试步骤">
      <button
        v-for="step in steps"
        :key="step.key"
        type="button"
        :class="['step-button', { active: activeStep === step.key, optional: step.optional, done: step.done }]"
        @click="selectStep(step)"
      >
        <span>{{ step.index }}</span>
        <span><strong>{{ step.label }}</strong><small>{{ step.status }}</small></span>
      </button>
    </nav>

    <div v-if="workflow.memberChanges.added.length || workflow.memberChanges.removed.length || workflow.gatewayChanges.length" class="notice warning">
      <strong>区域设备关系发生变化</strong>
      <p v-if="workflow.memberChanges.added.length">新增：{{ memberNames(workflow.memberChanges.added) }}</p>
      <p v-if="workflow.memberChanges.removed.length">移出：{{ memberNames(workflow.memberChanges.removed) }}</p>
      <p v-for="change in workflow.gatewayChanges" :key="`gateway-${change.id}`">
        {{ change.name }}：{{ change.from }} → {{ change.to }}
      </p>
      <button type="button" class="primary-btn" :disabled="busy" @click="emitAction('sync-members')">同步成员并重新配置</button>
    </div>

    <section v-if="activeStep === 'group'" class="step-panel">
      <StepHeading index="1" title="配置区域组" status="必配流程" description="区域、网关和 CU 关系已自动识别，无需手工选择。" />

      <div class="relation-card">
        <div><span>区域组名称</span><strong>{{ workflow.areaGroup.name }}</strong></div>
        <div><span>Group No</span><strong>{{ workflow.areaGroup.groupNo }}</strong></div>
        <div><span>所属网关</span><strong>{{ workflow.areaGroup.gatewayId || '待确认' }}</strong></div>
        <div><span>成员数量</span><strong>{{ workflow.areaGroup.memberIds.length }} 台</strong></div>
      </div>

      <div v-if="!workflow.region.deviceCount" class="notice warning">当前区域暂无可配置设备</div>
      <div v-else-if="workflow.region.gatewayIds.length > 1" class="notice warning">
        当前区域包含多个网关，不能直接生成单一区域组，请检查区域范围或设备归属。
      </div>

      <details class="member-list">
        <summary>查看区域内设备 <span>{{ workflow.region.members.length }}</span></summary>
        <div v-for="member in workflow.region.members" :key="member.id" class="member-row">
          <span>{{ member.name }}</span>
          <span>{{ member.gatewayId || '未识别网关' }}</span>
          <i :class="member.online ? 'online' : 'offline'"></i>
        </div>
      </details>

      <ProgressCard v-if="workflow.progress?.label?.includes('区域组')" :progress="workflow.progress" />
      <ResultCard
        v-if="workflow.areaGroup.completedAt"
        :title="workflow.areaGroup.failedIds.length ? '区域组配置未完成' : '配置完成'"
        :items="[
          `成功设备 ${workflow.areaGroup.successCount} 台`,
          `失败设备 ${workflow.areaGroup.failedIds.length} 台`,
          workflow.areaGroup.name,
          `完成时间 ${workflow.areaGroup.completedAt}`
        ]"
      />
      <button v-if="workflow.areaGroup.failedIds.length" type="button" class="secondary-btn full" :disabled="busy" @click="emitAction('retry-group')">重试失败项</button>

      <button
        type="button"
        class="primary-btn full"
        :disabled="busy || !workflow.region.deviceCount || workflow.region.gatewayIds.length > 1 || workflow.memberChanges.added.length || workflow.memberChanges.removed.length || workflow.gatewayChanges.length"
        @click="emitAction('configure-group')"
      >
        {{ workflow.areaGroup.status === '配置完成' ? '重新配置区域组' : '一键配置区域组' }}
      </button>
    </section>

    <section v-if="activeStep === 'multicast'" class="step-panel">
      <StepHeading index="2" title="组播验证" status="必配流程" description="验证整个区域组能否统一执行开、关和亮度控制。" />
      <div v-if="workflow.areaGroup.status !== '配置完成'" class="notice">请先完成区域组配置。</div>
      <div class="verify-grid">
        <button type="button" class="verify-btn" :disabled="busy || workflow.areaGroup.status !== '配置完成'" @click="emitAction('verify-group', { action: 'on' })">
          <span>组播开验证</span><small>{{ workflow.multicast.actions.on.status }}</small>
        </button>
        <button type="button" class="verify-btn" :disabled="busy || workflow.areaGroup.status !== '配置完成'" @click="emitAction('verify-group', { action: 'off' })">
          <span>组播关验证</span><small>{{ workflow.multicast.actions.off.status }}</small>
        </button>
      </div>
      <button type="button" class="secondary-btn full" :disabled="busy || workflow.areaGroup.status !== '配置完成'" @click="emitAction('verify-group', { action: 'brightness', value: 50 })">
        亮度 50% 验证 · {{ workflow.multicast.actions.brightness.status }}
      </button>
      <ResultCard
        v-if="workflow.multicast.status !== '待验证'"
        :title="workflow.multicast.status"
        :items="[
          `组播开：${workflow.multicast.actions.on.status}`,
          `组播关：${workflow.multicast.actions.off.status}`,
          `最近操作：${latestMulticastTime}`
        ]"
      />
      <button v-if="workflow.multicast.status === '验证失败'" type="button" class="secondary-btn full" :disabled="busy" @click="retryFailedGroupVerification">重新验证</button>
      <button v-if="workflow.multicast.status === '验证通过'" type="button" class="primary-btn full" @click="activeStep = 'scenes'">继续配置场景</button>
    </section>

    <section v-if="activeStep === 'scenes'" class="step-panel">
      <StepHeading index="3" title="配置场景" status="必配流程" description="一次配置全部选中的默认场景和自定义场景。" />
      <div v-if="workflow.areaGroup.status !== '配置完成'" class="notice">未完成区域组配置，暂不能配置场景。</div>

      <div class="scene-list">
        <article v-for="scene in sceneDrafts" :key="scene.id" class="scene-card">
          <div class="scene-card-head">
            <label class="check-label"><input v-model="scene.included" type="checkbox" /><span>{{ scene.kind === 'custom' ? '自定义' : '默认' }}</span></label>
            <div class="scene-statuses"><span>{{ scene.configStatus }}</span><span>{{ scene.verifyStatus }}</span></div>
          </div>
          <div class="scene-fields">
            <label><span>场景名称</span><input v-model.trim="scene.name" type="text" /></label>
            <label><span>SLOT</span><input :value="scene.slot" type="text" inputmode="numeric" @input="setDigits(scene, 'slot', $event, 2)" /></label>
            <label><span>亮度</span><BrightnessSelectInput :model-value="scene.brightness" :options="brightnessOptions" @input="setDigits(scene, 'brightness', $event, 3)" /></label>
            <label><span>色温</span><select v-model.number="scene.colorTemperature"><option v-for="temperature in colorTemperatures" :key="temperature" :value="temperature">{{ temperature }}K</option></select></label>
          </div>
          <button v-if="scene.kind === 'custom' && scene.configStatus !== '配置完成'" type="button" class="text-btn danger" :disabled="busy" @click="emitAction('remove-scene', { sceneId: scene.id })">删除</button>
        </article>
      </div>
      <div class="add-scene-box">
        <button type="button" class="secondary-btn full" @click="customSceneVisible = !customSceneVisible">{{ customSceneVisible ? '收起新增场景' : '新增自定义场景' }}</button>
        <div v-if="customSceneVisible" class="scene-fields custom-fields">
          <label><span>场景名称</span><input v-model.trim="customScene.name" type="text" /></label>
          <label><span>SLOT</span><input :value="customScene.slot" type="text" inputmode="numeric" @input="setDigits(customScene, 'slot', $event, 2)" /></label>
          <label><span>亮度</span><BrightnessSelectInput :model-value="customScene.brightness" :options="brightnessOptions" @input="setDigits(customScene, 'brightness', $event, 3)" /></label>
          <label><span>色温</span><select v-model.number="customScene.colorTemperature"><option v-for="temperature in colorTemperatures" :key="temperature" :value="temperature">{{ temperature }}K</option></select></label>
          <button type="button" class="secondary-btn full" :disabled="busy" @click="addCustomScene">加入配置列表</button>
        </div>
      </div>

      <ProgressCard v-if="workflow.progress?.label?.includes('场景')" :progress="workflow.progress" />
      <ResultCard
        v-if="workflow.sceneConfiguration.completedAt"
        :title="workflow.sceneConfiguration.failedCount ? '场景配置未完成' : '场景配置完成'"
        :items="[`已配置 ${workflow.sceneConfiguration.successCount} 个场景`, `失败 ${workflow.sceneConfiguration.failedCount} 个`, `完成时间 ${workflow.sceneConfiguration.completedAt}`]"
      />
      <button v-if="workflow.sceneConfiguration.failedCount" type="button" class="secondary-btn full" :disabled="busy" @click="emitAction('retry-scenes')">重试失败项</button>
      <button type="button" class="primary-btn full" :disabled="busy || workflow.areaGroup.status !== '配置完成'" @click="emitAction('configure-scenes', { scenes: sceneDrafts })">一键配置场景</button>
    </section>

    <section v-if="activeStep === 'sceneVerify'" class="step-panel">
      <StepHeading index="4" title="场景验证" status="必配流程" description="切换区域组到已配置场景，并验证亮度、色温和控制结果。" />
      <div v-if="!configuredScenes.length" class="notice">请先完成场景配置。</div>
      <div class="scene-list verify-scenes">
        <article v-for="scene in configuredScenes" :key="scene.id" :class="['scene-card', { active: scene.active }]">
          <div class="scene-card-head">
            <div><strong>{{ scene.name }}</strong><small>SLOT {{ scene.slot }}</small></div>
            <span>{{ scene.verifyStatus }}</span>
          </div>
          <p>{{ scene.brightness }}% · {{ scene.colorTemperature }}K</p>
          <button type="button" class="secondary-btn full" :disabled="busy" @click="emitAction('verify-scene', { sceneId: scene.id })">切换并验证</button>
        </article>
      </div>
      <ResultCard
        v-if="workflow.sceneVerifyStatus !== '待验证'"
        :title="workflow.sceneVerifyStatus"
        :items="[activeSceneName ? `当前场景：${activeSceneName}` : '尚未激活场景', `${verifiedSceneCount} / ${configuredScenes.length} 个场景已验证`]"
      />
      <div v-if="workflow.requiredComplete" class="completion-card">
        <strong>基础调试已完成</strong>
        <p>可按需继续配置实体面板或订阅。</p>
      </div>
    </section>

    <section v-if="activeStep === 'panel'" class="step-panel optional-panel">
      <StepHeading index="5" title="配置实体面板" status="按需配置" description="一次配置面板编号和四个按键。" />
      <div class="choice-row">
        <button type="button" :class="{ active: panelRequired === true }" @click="chooseOptional('panel', true)">需要配置实体面板</button>
        <button type="button" :class="{ active: panelRequired === false }" @click="chooseOptional('panel', false)">本区域不配置面板</button>
      </div>
      <div v-if="panelRequired === false" class="notice success">已跳过，不影响基础调试完成。</div>

      <template v-if="panelRequired === true">
        <div class="relation-card panel-info">
          <label><span>面板编号 / ID</span><input v-model.trim="panelForm.panelId" type="text" maxlength="8" placeholder="请输入 8 位面板编号" /></label>
          <div><span>面板类型</span><strong>四按键面板</strong></div>
          <div><span>关联区域</span><strong>{{ workflow.region.name }}</strong></div>
          <div><span>关联区域组</span><strong>{{ workflow.areaGroup.name }}</strong></div>
        </div>
        <div class="button-config-list">
          <div v-for="button in panelForm.buttons" :key="button.keyNo" class="button-config-row">
            <strong>按键 {{ button.keyNo }}</strong>
            <select v-model="button.action">
              <option value="group-on">区域组开</option>
              <option value="group-off">区域组关</option>
              <option value="scene">切换场景</option>
              <option value="none">无动作</option>
            </select>
            <select v-if="button.action === 'scene'" v-model="button.sceneId">
              <option value="">选择已配置场景</option>
              <option v-for="scene in configuredScenes" :key="scene.id" :value="scene.id">{{ scene.name }}</option>
            </select>
          </div>
        </div>
        <ProgressCard v-if="workflow.progress?.label === '正在配置实体面板'" :progress="workflow.progress" />
        <button type="button" class="primary-btn full" :disabled="busy" @click="emitAction('configure-panel', { panel: panelForm })">一键配置面板</button>

        <div v-if="workflow.panel.status === '配置完成'" class="panel-verify">
          <h5>面板验证</h5>
          <button v-for="button in workflow.panel.buttons" :key="button.keyNo" type="button" class="verify-btn compact" :disabled="busy" @click="emitAction('verify-panel', { keyNo: button.keyNo })">
            <span>模拟按键 {{ button.keyNo }}</span>
            <small>{{ workflow.panel.verifyResults[String(button.keyNo)]?.actionText || actionLabel(button) }}</small>
          </button>
        </div>
      </template>
    </section>

    <section v-if="activeStep === 'subscription'" class="step-panel optional-panel">
      <StepHeading index="6" title="配置订阅" status="按需配置" description="将实体面板按键动作关联到当前区域组和场景。" />
      <div class="choice-row">
        <button type="button" :class="{ active: subscriptionRequired === true }" @click="chooseOptional('subscription', true)">需要配置订阅</button>
        <button type="button" :class="{ active: subscriptionRequired === false }" @click="chooseOptional('subscription', false)">本区域不配置订阅</button>
      </div>
      <div v-if="subscriptionRequired === false" class="notice success">已跳过，不影响基础调试完成。</div>
      <template v-if="subscriptionRequired === true">
        <div class="relation-card">
          <div><span>订阅对象</span><strong>实体面板按键</strong></div>
          <div><span>关联面板</span><strong>{{ workflow.panel.panelId || '待配置' }}</strong></div>
          <div><span>关联区域组</span><strong>{{ workflow.areaGroup.name }}</strong></div>
          <div><span>订阅状态</span><strong>{{ workflow.subscription.status }}</strong></div>
          <div v-if="workflow.subscription.configuredAt"><span>最近配置</span><strong>{{ workflow.subscription.configuredAt }}</strong></div>
        </div>
        <div v-if="workflow.panel.status !== '配置完成'" class="notice">订阅依赖实体面板，请先完成面板配置。</div>
        <button type="button" class="primary-btn full" :disabled="busy || workflow.panel.status !== '配置完成'" @click="emitAction('configure-subscription')">一键配置订阅</button>
      </template>
    </section>

    <section class="operation-log">
      <div class="section-title"><strong>最近操作记录</strong><span>{{ workflow.operationLogs.length }}</span></div>
      <div v-if="workflow.operationLogs.length" class="log-list">
        <div v-for="log in workflow.operationLogs.slice(0, 6)" :key="log.id" class="log-row">
          <span><strong>{{ log.action }}</strong><small>{{ log.time }}</small></span>
          <i>{{ log.result }}</i>
        </div>
      </div>
      <p v-else class="empty-copy">暂无操作记录</p>
    </section>
  </div>

  <div v-else class="workflow-loading">正在读取区域关系...</div>
</template>

<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from 'vue'
import BrightnessSelectInput from './BrightnessSelectInput.vue'
import { DEVICE_MAP_BRIGHTNESS_OPTIONS } from './deviceMapOptions'

const props = defineProps({
  workflow: { type: Object, default: null },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['action'])
const activeStep = ref('group')
const customSceneVisible = ref(false)
const sceneDrafts = ref([])
const customScene = reactive({ name: '自定义场景', slot: '5', brightness: '80', colorTemperature: 4000 })
const panelRequired = ref(null)
const subscriptionRequired = ref(null)
const panelForm = reactive({ panelId: '', buttons: [] })
const brightnessOptions = DEVICE_MAP_BRIGHTNESS_OPTIONS
const colorTemperatures = [2700, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500]

const steps = computed(() => {
  const workflow = props.workflow
  if (!workflow) return []
  return [
    { index: 1, key: 'group', label: '配置区域组', status: workflow.areaGroup.status, done: workflow.areaGroup.status === '配置完成' },
    { index: 2, key: 'multicast', label: '组播验证', status: workflow.multicast.status, done: workflow.multicast.status === '验证通过' },
    { index: 3, key: 'scenes', label: '配置场景', status: workflow.sceneConfiguration.status, done: workflow.sceneConfiguration.status === '配置完成' },
    { index: 4, key: 'sceneVerify', label: '场景验证', status: workflow.sceneVerifyStatus, done: workflow.sceneVerifyStatus === '验证通过' },
    { index: 5, key: 'panel', label: '实体面板', status: workflow.panel.status, done: ['配置完成', '已跳过'].includes(workflow.panel.status), optional: true },
    { index: 6, key: 'subscription', label: '订阅', status: workflow.subscription.status, done: ['配置完成', '已跳过'].includes(workflow.subscription.status), optional: true }
  ]
})

const configuredScenes = computed(() => props.workflow?.scenes.filter((scene) => scene.configStatus === '配置完成') || [])
const verifiedSceneCount = computed(() => configuredScenes.value.filter((scene) => scene.verifyStatus === '验证通过').length)
const activeSceneName = computed(() => configuredScenes.value.find((scene) => scene.active)?.name || '')
const latestMulticastTime = computed(() => {
  const times = Object.values(props.workflow?.multicast.actions || {}).map((item) => item.at).filter(Boolean)
  return times.at(-1) || '--'
})

watch(
  () => props.workflow,
  (workflow) => {
    if (!workflow) return
    sceneDrafts.value = workflow.scenes.map((scene) => ({ ...scene }))
    panelRequired.value = workflow.panel.required
    subscriptionRequired.value = workflow.subscription.required
    panelForm.panelId = workflow.panel.panelId || ''
    panelForm.buttons = workflow.panel.buttons.map((button) => ({ ...button }))
  },
  { immediate: true }
)

watch(
  () => props.workflow?.currentStep,
  (step, previousStep) => {
    if (step && previousStep && step !== previousStep) activeStep.value = step
  }
)

watch(
  () => props.workflow?.panel.status,
  (status, previousStatus) => {
    if (previousStatus && ['配置完成', '已跳过'].includes(status) && status !== previousStatus) activeStep.value = 'subscription'
  }
)

function emitAction(type, payload = {}) {
  emit('action', { type, ...payload })
}

function selectStep(step) {
  activeStep.value = step.key
}

function chooseOptional(step, required) {
  if (step === 'panel') panelRequired.value = required
  if (step === 'subscription') subscriptionRequired.value = required
  emitAction('set-optional', { step, required })
  if (step === 'panel' && !required) activeStep.value = 'subscription'
}

function addCustomScene() {
  emitAction('add-scene', { scene: { ...customScene } })
  customScene.name = '自定义场景'
  customScene.slot = String(nextAvailableSlot())
  customScene.brightness = '80'
  customScene.colorTemperature = 4000
}

function nextAvailableSlot() {
  const used = new Set(sceneDrafts.value.map((scene) => Number(scene.slot)))
  for (let slot = 0; slot <= 31; slot += 1) {
    if (!used.has(slot)) return slot
  }
  return 31
}

function setDigits(target, key, event, length) {
  const value = String(event.target.value || '').replace(/\D/g, '').slice(0, length)
  target[key] = value
  event.target.value = value
}

function memberNames(ids) {
  const members = props.workflow?.region.members || []
  return ids.map((id) => members.find((member) => member.id === id)?.name || id).join('、')
}

function actionLabel(button) {
  if (button.action === 'group-on') return '区域组开'
  if (button.action === 'group-off') return '区域组关'
  if (button.action === 'scene') return `切换场景：${configuredScenes.value.find((scene) => scene.id === button.sceneId)?.name || '未选择'}`
  return '无动作'
}

function retryFailedGroupVerification() {
  const failedAction = Object.entries(props.workflow?.multicast.actions || {}).find(([, value]) => value.status === '验证失败')?.[0]
  if (failedAction) emitAction('verify-group', { action: failedAction, value: failedAction === 'brightness' ? 50 : undefined })
}

const StepHeading = defineComponent({
  props: { index: String, title: String, status: String, description: String },
  setup(componentProps) {
    return () => h('header', { class: 'step-heading' }, [
      h('span', { class: 'heading-index' }, componentProps.index),
      h('div', [h('div', { class: 'heading-title' }, [h('h5', componentProps.title), h('span', componentProps.status)]), h('p', componentProps.description)])
    ])
  }
})

const ProgressCard = defineComponent({
  props: { progress: Object },
  setup(componentProps) {
    return () => h('div', { class: 'progress-card' }, [
      h('div', [h('strong', componentProps.progress.label), h('span', `${componentProps.progress.current} / ${componentProps.progress.total}`)]),
      h('div', { class: 'progress-track' }, [h('i', { style: { width: `${Math.round(componentProps.progress.current / Math.max(1, componentProps.progress.total) * 100)}%` } })])
    ])
  }
})

const ResultCard = defineComponent({
  props: { title: String, items: Array },
  setup(componentProps) {
    return () => h('div', { class: 'result-card' }, [h('strong', componentProps.title), ...componentProps.items.map((item) => h('span', item))])
  }
})
</script>

<style scoped>
.workflow-shell { display: grid; gap: 12px; padding: 12px; color: #dbe9f5; }
.region-summary { position: sticky; top: 0; z-index: 2; padding: 14px; border: 1px solid rgba(72, 219, 237, .24); border-radius: 8px; background: rgba(6, 20, 35, .97); box-shadow: 0 8px 20px rgba(0, 0, 0, .18); }
.summary-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.eyebrow { color: #54ded4; font-size: 11px; }
.summary-title-row h4 { margin: 4px 0 2px; color: #f5fbff; font-size: 17px; letter-spacing: 0; }
.summary-title-row p { margin: 0; color: #7f99ad; font-size: 11px; }
.progress-ring { --progress: 0deg; width: 52px; height: 52px; display: grid; flex: 0 0 52px; place-items: center; border-radius: 50%; background: radial-gradient(circle at center, #071728 58%, transparent 60%), conic-gradient(#52e0d4 var(--progress), rgba(90, 128, 149, .2) 0); }
.progress-ring strong { color: #eafffc; font-size: 12px; }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.summary-grid > div, .relation-card > div, .relation-card > label { min-width: 0; padding: 9px; border-left: 2px solid rgba(82, 224, 212, .55); background: rgba(22, 45, 63, .48); }
.summary-grid span, .relation-card span { display: block; margin-bottom: 4px; color: #7895a9; font-size: 10px; }
.summary-grid strong, .relation-card strong { display: block; overflow: hidden; color: #e7f3fb; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.success-text { color: #63dfb0 !important; }.warning-text { color: #ffbc67 !important; }
.flow-tags { display: flex; align-items: center; gap: 6px; margin-top: 10px; }
.flow-tags span, .step-heading .heading-title span { padding: 3px 6px; border-radius: 3px; font-size: 10px; }
.required-tag { color: #62e0d4; background: rgba(42, 190, 175, .13); }.optional-tag { color: #ffcb7a; background: rgba(255, 177, 69, .12); }
.flow-tags strong { margin-left: auto; color: #63dfb0; font-size: 11px; }
.step-nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.step-button { display: flex; min-width: 0; align-items: center; gap: 8px; padding: 8px; border: 1px solid rgba(91, 151, 181, .16); border-radius: 6px; color: #8ca5b7; background: rgba(8, 24, 40, .72); text-align: left; cursor: pointer; }
.step-button > span:first-child { width: 22px; height: 22px; display: grid; flex: 0 0 22px; place-items: center; border-radius: 50%; background: rgba(92, 124, 145, .2); font-size: 10px; }
.step-button > span:last-child { min-width: 0; }.step-button strong, .step-button small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.step-button strong { color: #c4d5e1; font-size: 11px; }.step-button small { margin-top: 2px; font-size: 9px; }
.step-button.active { border-color: rgba(82, 224, 212, .5); background: rgba(31, 113, 112, .22); }.step-button.done > span:first-child { color: #071a1c; background: #5bd9c7; }.step-button.optional { border-style: dashed; }
.step-panel, .operation-log { display: grid; gap: 12px; padding: 14px; border: 1px solid rgba(79, 157, 188, .18); border-radius: 8px; background: rgba(5, 17, 30, .76); }
.step-heading { display: flex; gap: 10px; }.heading-index { width: 28px; height: 28px; display: grid; flex: 0 0 28px; place-items: center; border-radius: 6px; color: #06191b; background: #58dfd1; font-weight: 700; }
.heading-title { display: flex; align-items: center; gap: 8px; }.heading-title h5 { margin: 0; color: #f2f9fd; font-size: 14px; }.heading-title span { color: #5be1d3; background: rgba(49, 193, 181, .12); }
.step-heading p { margin: 4px 0 0; color: #809aac; font-size: 11px; line-height: 1.5; }
.relation-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }.relation-card input { width: 100%; box-sizing: border-box; }
.notice { padding: 10px 12px; border: 1px solid rgba(82, 196, 220, .2); border-radius: 6px; color: #9db4c4; background: rgba(24, 61, 79, .26); font-size: 11px; line-height: 1.6; }.notice.warning { border-color: rgba(255, 178, 73, .3); color: #ffd392; background: rgba(104, 67, 20, .24); }.notice.success { color: #7ce1bd; }
.notice strong, .notice p { display: block; margin: 0 0 4px; }.notice .primary-btn { margin-top: 6px; }
.member-list { border-top: 1px solid rgba(82, 140, 166, .15); border-bottom: 1px solid rgba(82, 140, 166, .15); }.member-list summary { display: flex; justify-content: space-between; padding: 9px 2px; color: #9db5c5; cursor: pointer; font-size: 11px; }.member-row { display: grid; grid-template-columns: 1fr 1fr 10px; gap: 6px; padding: 7px 2px; color: #8ba4b5; font-size: 10px; }.member-row i { width: 6px; height: 6px; align-self: center; border-radius: 50%; }.member-row .online { background: #51d9a5; }.member-row .offline { background: #e99d5d; }
.primary-btn, .secondary-btn, .verify-btn, .choice-row button { min-height: 34px; border-radius: 5px; font-size: 11px; cursor: pointer; }.primary-btn { border: 1px solid #4fd9ce; color: #031718; background: #54d9ce; font-weight: 700; }.secondary-btn, .verify-btn, .choice-row button { border: 1px solid rgba(86, 201, 218, .27); color: #bee0ea; background: rgba(16, 54, 72, .62); }.primary-btn:disabled, .secondary-btn:disabled, .verify-btn:disabled { cursor: not-allowed; opacity: .42; }.full { width: 100%; }
.verify-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }.verify-btn { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 5px; padding: 8px 9px; text-align: left; }.verify-btn small { color: #65d9c9; }.verify-btn.compact { width: 100%; }
.progress-card, .result-card, .completion-card { display: grid; gap: 7px; padding: 11px; border-radius: 6px; background: rgba(19, 52, 68, .5); }.progress-card > div:first-child { display: flex; justify-content: space-between; color: #c9e0e9; font-size: 11px; }.progress-track { height: 5px; overflow: hidden; border-radius: 3px; background: rgba(102, 142, 160, .2); }.progress-track i { display: block; height: 100%; background: #54d9ce; transition: width .2s ease; }.result-card { border-left: 2px solid #55d8ad; }.result-card strong { color: #70dfba; }.result-card span { color: #91aab9; font-size: 10px; }.completion-card { border: 1px solid rgba(85, 216, 173, .3); }.completion-card strong { color: #74e0ba; }.completion-card p { margin: 0; color: #9bb3c1; font-size: 11px; }
.scene-list { display: grid; gap: 8px; }.scene-card { display: grid; gap: 9px; padding: 10px; border: 1px solid rgba(83, 142, 169, .18); border-radius: 6px; background: rgba(10, 29, 45, .78); }.scene-card.active { border-color: #57dace; box-shadow: inset 3px 0 #57dace; }.scene-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.scene-card-head > div strong, .scene-card-head > div small { display: block; }.scene-card-head small { margin-top: 3px; color: #7e99aa; font-size: 9px; }.check-label { display: flex; align-items: center; gap: 6px; color: #d7e7ef; font-size: 11px; }.check-label input { accent-color: #54d9ce; }.scene-statuses { display: flex; gap: 4px; }.scene-statuses span, .scene-card-head > span { padding: 2px 5px; border-radius: 3px; color: #72dacc; background: rgba(72, 190, 181, .1); font-size: 9px; }
.scene-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }.scene-fields label { min-width: 0; }.scene-fields label > span:first-child { display: block; margin-bottom: 4px; color: #7894a7; font-size: 9px; }.scene-fields input, .scene-fields select, .panel-info input, .button-config-row select { width: 100%; height: 30px; box-sizing: border-box; border: 1px solid rgba(88, 161, 187, .24); border-radius: 4px; outline: none; color: #e0edf4; background: rgba(4, 18, 31, .8); font-size: 10px; }.scene-fields input, .panel-info input { padding: 0 8px; }.unit-input { display: flex; height: 30px; overflow: hidden; border: 1px solid rgba(88, 161, 187, .24); border-radius: 4px; }.unit-input input { min-width: 0; height: 28px; border: 0; }.unit-input i { display: grid; width: 27px; place-items: center; color: #64d8cd; background: rgba(41, 87, 102, .4); font-style: normal; }
.text-btn { justify-self: end; border: 0; color: #85b4c6; background: transparent; cursor: pointer; font-size: 10px; }.text-btn.danger { color: #ef9b91; }.add-scene-box { display: grid; gap: 8px; }.custom-fields { padding: 10px; border: 1px dashed rgba(84, 190, 203, .25); border-radius: 6px; }
.verify-scenes .scene-card p { margin: 0; color: #8ba5b6; font-size: 10px; }
.optional-panel { border-style: dashed; }.choice-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }.choice-row button.active { border-color: #54d9ce; color: #58ded2; background: rgba(45, 153, 147, .2); }.button-config-list { display: grid; gap: 7px; }.button-config-row { display: grid; grid-template-columns: 58px 1fr; gap: 7px; align-items: center; padding: 8px; border-radius: 5px; background: rgba(14, 39, 55, .6); }.button-config-row strong { color: #c6dbe5; font-size: 10px; }.button-config-row select:last-child { grid-column: 2; }.panel-verify { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }.panel-verify h5 { grid-column: 1 / -1; margin: 0; color: #dbe9f1; font-size: 12px; }
.section-title { display: flex; justify-content: space-between; color: #dbe9f1; font-size: 11px; }.section-title span { color: #6ed9cf; }.log-list { display: grid; }.log-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; border-top: 1px solid rgba(83, 139, 163, .12); }.log-row span { min-width: 0; }.log-row strong, .log-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.log-row strong { color: #bcd1dc; font-size: 10px; }.log-row small { margin-top: 3px; color: #627e91; font-size: 9px; }.log-row i { flex: 0 0 auto; color: #63d6c6; font-size: 9px; font-style: normal; }.empty-copy, .workflow-loading { color: #7892a4; font-size: 11px; text-align: center; }.workflow-loading { padding: 40px 20px; }
@media (max-width: 420px) { .summary-grid, .relation-card, .scene-fields { grid-template-columns: 1fr; }.step-nav { grid-template-columns: 1fr 1fr; }.button-config-row { grid-template-columns: 52px 1fr; } }
/* Shared workflow hierarchy and semantic states. */
.workflow-shell { color: var(--text-secondary); }
.region-summary { border-color: var(--border-default); background: rgba(7, 24, 42, .97); box-shadow: var(--shadow-panel); }
.eyebrow, .heading-title span, .section-title span, .verify-btn small, .log-row i { color: var(--accent-cyan); }
.summary-title-row h4, .heading-title h5, .summary-grid strong, .relation-card strong, .section-title, .panel-verify h5 { color: var(--text-primary); }
.summary-title-row p, .summary-grid span, .relation-card span, .step-heading p, .member-list summary, .member-row, .scene-card-head small, .scene-fields label > span:first-child, .result-card span, .completion-card p, .log-row small, .empty-copy, .workflow-loading { color: var(--text-tertiary); }
.progress-ring { background: radial-gradient(circle at center, var(--bg-page) 58%, transparent 60%), conic-gradient(var(--accent-cyan) var(--progress), var(--offline-soft) 0); }
.success-text, .flow-tags strong, .notice.success, .result-card strong, .completion-card strong { color: var(--success) !important; }
.warning-text, .optional-tag, .notice.warning { color: var(--warning) !important; }
.step-button, .step-panel, .operation-log, .scene-card { border-color: var(--border-subtle); background: var(--control-bg); color: var(--text-tertiary); }
.step-button strong, .progress-card > div:first-child, .check-label, .button-config-row strong, .log-row strong { color: var(--text-secondary); }
.step-button.active, .choice-row button.active, .scene-card.active { border-color: var(--border-active); background: var(--info-soft); }
.step-button.done > span:first-child, .heading-index, .primary-btn { color: var(--bg-page-deep); background: var(--accent-cyan); }
.primary-btn { border-color: var(--border-active); }
.secondary-btn, .verify-btn, .choice-row button { border-color: var(--border-default); color: var(--text-secondary); background: var(--control-bg-hover); }
.notice { border-color: var(--border-subtle); color: var(--text-secondary); background: var(--info-soft); }
.notice.warning { border-color: var(--warning-border); background: var(--warning-soft); }
.member-row .online, .progress-track i { background: var(--success); }
.member-row .offline { background: var(--offline); }
.scene-fields input, .scene-fields select, .panel-info input, .button-config-row select { border-color: var(--border-default); color: var(--text-primary); background: var(--control-bg); }
.text-btn.danger { color: var(--danger); }
</style>

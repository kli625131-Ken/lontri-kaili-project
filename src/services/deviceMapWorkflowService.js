const STORAGE_KEY = 'device-map-region-workflows:v1'
const COLOR_TEMPERATURE_MIN = 2700
const COLOR_TEMPERATURE_MAX = 6500

let workflowStore = null

export async function getRegionWorkflow(region, devices = []) {
  await wait(80)
  const snapshot = createRegionSnapshot(region, devices)
  const store = getStore()
  const existing = store[snapshot.id]
  const workflow = existing
    ? reconcileRegionSnapshot(existing, snapshot)
    : createWorkflow(snapshot)

  saveWorkflow(workflow)
  return clone(enrichWorkflow(workflow))
}

export async function configureAreaGroup(regionId, options = {}) {
  const workflow = requireWorkflow(regionId)
  const memberIds = workflow.areaGroup.memberIds || []

  if (workflow.memberChanges.added.length || workflow.memberChanges.removed.length || workflow.gatewayChanges.length) {
    return failure('区域设备关系已变化，请先同步成员')
  }

  if (!memberIds.length) {
    return failure('当前区域暂无可配置设备')
  }

  if (workflow.region.gatewayIds.length > 1) {
    return failure('当前区域包含多个网关，不能直接生成单一区域组，请检查区域范围或设备归属。')
  }

  workflow.areaGroup.status = '配置中'
  workflow.progress = createProgress(options.retry ? '正在重试区域组' : '正在配置区域组', memberIds.length)
  saveWorkflow(workflow)
  await runProgress(workflow, memberIds.length, options.onProgress)

  const completedAt = nowText()
  const offlineIds = new Set(workflow.region.members.filter((member) => !member.online).map((member) => member.id))
  const failedIds = options.retry ? [] : memberIds.filter((id) => offlineIds.has(id))
  const successCount = memberIds.length - failedIds.length
  workflow.areaGroup = {
    ...workflow.areaGroup,
    status: failedIds.length ? (successCount ? '部分完成' : '配置失败') : '配置完成',
    successCount,
    failedIds,
    completedAt
  }
  workflow.progress = null
  if (failedIds.length) {
    addLog(workflow, options.retry ? '重试区域组失败项' : '一键配置区域组', '配置失败')
    saveWorkflow(workflow)
    return failureWithWorkflow(workflow, `${failedIds.length} 台设备配置失败，可重试失败项`)
  }

  workflow.multicast.status = '待验证'
  addLog(workflow, options.retry ? '重试区域组失败项' : '一键配置区域组', '配置完成')
  saveWorkflow(workflow)
  return success(workflow, `区域组已配置到 ${memberIds.length} 台设备`)
}

export async function retryAreaGroupFailures(regionId, options = {}) {
  const workflow = requireWorkflow(regionId)
  if (!workflow.areaGroup.failedIds?.length) return failure('当前没有需要重试的设备')
  return configureAreaGroup(regionId, { ...options, retry: true })
}

export async function verifyGroupControl(regionId, action, options = {}) {
  const workflow = requireWorkflow(regionId)
  if (workflow.areaGroup.status !== '配置完成') {
    return failure('请先完成区域组配置')
  }

  const actionKey = normalizeGroupAction(action)
  const actionLabel = {
    on: '组播开验证',
    off: '组播关验证',
    brightness: `亮度 ${Number(options.value ?? 50)}% 验证`
  }[actionKey]
  const wasFailure = workflow.multicast.actions[actionKey]?.status === '验证失败'

  workflow.multicast.status = '验证中'
  workflow.multicast.actions[actionKey] = {
    status: '验证中',
    value: actionKey === 'brightness' ? Number(options.value ?? 50) : null,
    at: nowText()
  }
  saveWorkflow(workflow)
  options.onProgress?.(clone(enrichWorkflow(workflow)))
  await wait(420)

  if (workflow.region.offlineCount > 0 && !wasFailure) {
    workflow.multicast.actions[actionKey] = {
      ...workflow.multicast.actions[actionKey],
      status: '验证失败',
      at: nowText()
    }
    workflow.multicast.status = '验证失败'
    addLog(workflow, actionLabel, '验证失败')
    saveWorkflow(workflow)
    return failureWithWorkflow(workflow, `${actionLabel}失败，请重新验证`)
  }

  workflow.multicast.actions[actionKey] = {
    ...workflow.multicast.actions[actionKey],
    status: '验证通过',
    at: nowText()
  }
  workflow.multicast.status = getMulticastStatus(workflow.multicast.actions)
  addLog(workflow, actionLabel, '验证通过')
  saveWorkflow(workflow)
  return success(workflow, `${actionLabel}通过`)
}

export async function saveScenes(regionId, scenes, options = {}) {
  const workflow = requireWorkflow(regionId)
  if (workflow.areaGroup.status !== '配置完成') {
    return failure('请先完成区域组配置')
  }

  const normalized = normalizeScenes(scenes)
  const validation = validateScenes(normalized)
  if (!validation.ok) return validation

  const selectedScenes = normalized.filter((scene) => scene.included)
  if (!selectedScenes.length) return failure('请至少选择一个场景')

  workflow.scenes = normalized
  workflow.sceneConfiguration.status = '配置中'
  const total = selectedScenes.length * Math.max(1, workflow.areaGroup.memberIds.length)
  workflow.progress = createProgress('正在配置场景', total)
  saveWorkflow(workflow)
  await runProgress(workflow, total, options.onProgress)

  const selectedIds = new Set(selectedScenes.map((scene) => scene.id))
  const failedSceneIds = new Set(
    workflow.region.offlineCount > 0 && !options.retry
      ? [selectedScenes[selectedScenes.length - 1]?.id].filter(Boolean)
      : []
  )
  workflow.scenes = workflow.scenes.map((scene) => ({
    ...scene,
    configStatus: failedSceneIds.has(scene.id) ? '配置失败' : selectedIds.has(scene.id) ? '配置完成' : '待配置',
    verifyStatus: selectedIds.has(scene.id) ? '待验证' : scene.verifyStatus,
    configuredAt: selectedIds.has(scene.id) ? nowText() : scene.configuredAt
  }))
  workflow.sceneConfiguration = {
    status: failedSceneIds.size ? '部分完成' : '配置完成',
    successCount: selectedScenes.length - failedSceneIds.size,
    failedCount: failedSceneIds.size,
    completedAt: nowText()
  }
  workflow.progress = null
  if (failedSceneIds.size) {
    addLog(workflow, '一键配置场景', '配置失败')
    saveWorkflow(workflow)
    return failureWithWorkflow(workflow, `${failedSceneIds.size} 个场景配置失败，可重试失败项`)
  }

  addLog(workflow, options.retry ? '重试场景失败项' : '一键配置场景', '配置完成')
  saveWorkflow(workflow)
  return success(workflow, `已配置 ${selectedScenes.length} 个场景`)
}

export async function retrySceneFailures(regionId, options = {}) {
  const workflow = requireWorkflow(regionId)
  const failedScenes = workflow.scenes.filter((scene) => scene.configStatus === '配置失败')
  if (!failedScenes.length) return failure('当前没有需要重试的场景')

  workflow.sceneConfiguration.status = '配置中'
  workflow.progress = createProgress('正在重试场景', failedScenes.length * Math.max(1, workflow.areaGroup.memberIds.length))
  saveWorkflow(workflow)
  await runProgress(workflow, workflow.progress.total, options.onProgress)

  const failedIds = new Set(failedScenes.map((scene) => scene.id))
  workflow.scenes = workflow.scenes.map((scene) => (
    failedIds.has(scene.id)
      ? { ...scene, configStatus: '配置完成', verifyStatus: '待验证', configuredAt: nowText() }
      : scene
  ))
  const configuredCount = workflow.scenes.filter((scene) => scene.included && scene.configStatus === '配置完成').length
  workflow.sceneConfiguration = {
    status: '配置完成',
    successCount: configuredCount,
    failedCount: 0,
    completedAt: nowText()
  }
  workflow.progress = null
  addLog(workflow, '重试场景失败项', '配置完成')
  saveWorkflow(workflow)
  return success(workflow, `${failedScenes.length} 个失败场景已重新配置`)
}

export async function addCustomScene(regionId, scene) {
  const workflow = requireWorkflow(regionId)
  const nextScene = normalizeScene({
    ...scene,
    id: `scene-${regionId}-custom-${Date.now()}`,
    kind: 'custom',
    included: true,
    configStatus: '待配置',
    verifyStatus: '待验证'
  })
  const validation = validateScenes([...workflow.scenes, nextScene])
  if (!validation.ok) return validation

  workflow.scenes.push(nextScene)
  addLog(workflow, `新增场景 ${nextScene.name}`, '已保存')
  saveWorkflow(workflow)
  return success(workflow, '自定义场景已加入配置列表')
}

export async function updateScene(regionId, scene) {
  const workflow = requireWorkflow(regionId)
  const nextScenes = workflow.scenes.map((item) => (
    item.id === scene.id ? normalizeScene({ ...item, ...scene }) : item
  ))
  const validation = validateScenes(nextScenes)
  if (!validation.ok) return validation

  workflow.scenes = nextScenes
  saveWorkflow(workflow)
  return success(workflow, '场景参数已更新')
}

export async function removeCustomScene(regionId, sceneId) {
  const workflow = requireWorkflow(regionId)
  const scene = workflow.scenes.find((item) => item.id === sceneId)
  if (!scene || scene.kind !== 'custom' || scene.configStatus === '配置完成') {
    return failure('只能删除尚未配置的自定义场景')
  }

  workflow.scenes = workflow.scenes.filter((item) => item.id !== sceneId)
  addLog(workflow, `删除场景 ${scene.name}`, '已完成')
  saveWorkflow(workflow)
  return success(workflow, '自定义场景已删除')
}

export async function switchAndVerifyScene(regionId, sceneId, options = {}) {
  const workflow = requireWorkflow(regionId)
  const scene = workflow.scenes.find((item) => item.id === sceneId)
  if (!scene || scene.configStatus !== '配置完成') {
    return failure('该场景尚未完成配置')
  }

  scene.verifyStatus = '验证中'
  saveWorkflow(workflow)
  options.onProgress?.(clone(enrichWorkflow(workflow)))
  await wait(460)

  workflow.activeSceneId = sceneId
  workflow.scenes = workflow.scenes.map((item) => ({
    ...item,
    active: item.id === sceneId,
    verifyStatus: item.id === sceneId ? '验证通过' : item.verifyStatus
  }))
  addLog(workflow, `切换并验证 ${scene.name}`, '验证通过')
  saveWorkflow(workflow)
  return success(workflow, `${scene.name} 切换并验证通过`)
}

export async function configurePanel(regionId, panelConfig, options = {}) {
  const workflow = requireWorkflow(regionId)
  const validation = validatePanelConfig(workflow, panelConfig)
  if (!validation.ok) return validation

  workflow.panel = {
    ...workflow.panel,
    required: true,
    status: '配置中',
    panelId: String(panelConfig.panelId).trim(),
    buttons: clone(panelConfig.buttons)
  }
  workflow.progress = createProgress('正在配置实体面板', 5)
  saveWorkflow(workflow)
  await runProgress(workflow, 5, options.onProgress)

  workflow.panel.status = '配置完成'
  workflow.panel.configuredAt = nowText()
  workflow.panel.verifyResults = {}
  workflow.progress = null
  addLog(workflow, '一键配置面板', '配置完成')
  saveWorkflow(workflow)
  return success(workflow, '面板及四个按键配置完成')
}

export async function verifyPanel(regionId, keyNo, options = {}) {
  const workflow = requireWorkflow(regionId)
  if (workflow.panel.status !== '配置完成') return failure('请先完成面板配置')
  const button = workflow.panel.buttons.find((item) => Number(item.keyNo) === Number(keyNo))
  if (!button) return failure('未找到该按键配置')

  workflow.panel.verifyResults[String(keyNo)] = {
    status: '验证中',
    actionText: getPanelActionText(button.action, workflow.scenes.find((item) => item.id === button.sceneId)?.name),
    at: nowText()
  }
  saveWorkflow(workflow)
  options.onProgress?.(clone(enrichWorkflow(workflow)))
  await wait(360)
  const scene = workflow.scenes.find((item) => item.id === button.sceneId)
  const actionText = getPanelActionText(button.action, scene?.name)
  workflow.panel.verifyResults[String(keyNo)] = {
    status: '验证通过',
    actionText,
    at: nowText()
  }
  addLog(workflow, `面板按键 ${keyNo} 验证`, '验证通过')
  saveWorkflow(workflow)
  return success(workflow, `${actionText}触发成功`)
}

export async function setOptionalStep(regionId, step, required) {
  const workflow = requireWorkflow(regionId)
  if (!['panel', 'subscription'].includes(step)) return failure('不支持的配置步骤')

  workflow[step].required = required
  if (!required) {
    workflow[step].status = '已跳过'
    addLog(workflow, step === 'panel' ? '实体面板' : '订阅', '已跳过')
  } else if (workflow[step].status === '已跳过') {
    workflow[step].status = '待配置'
  }
  saveWorkflow(workflow)
  return success(workflow, required ? '已进入配置' : '已跳过')
}

export async function configureSubscription(regionId, options = {}) {
  const workflow = requireWorkflow(regionId)
  if (workflow.panel.status !== '配置完成') {
    return failure('请先完成实体面板配置')
  }

  workflow.subscription.required = true
  workflow.subscription.status = '配置中'
  saveWorkflow(workflow)
  options.onProgress?.(clone(enrichWorkflow(workflow)))
  await wait(520)

  workflow.subscription = {
    ...workflow.subscription,
    status: '配置完成',
    object: '实体面板按键',
    panelId: workflow.panel.panelId,
    areaGroupId: workflow.areaGroup.id,
    configuredAt: nowText(),
    records: buildLegacySubscriptionRecords(workflow)
  }
  addLog(workflow, '一键配置订阅', '配置完成')
  saveWorkflow(workflow)
  return success(workflow, '订阅配置完成')
}

export async function syncRegionMembers(region, devices = []) {
  const workflow = requireWorkflow(region.id)
  const snapshot = createRegionSnapshot(region, devices)
  workflow.region = snapshot
  workflow.areaGroup.memberIds = [...snapshot.memberIds]
  workflow.areaGroup.gatewayId = snapshot.gatewayIds.length === 1 ? snapshot.gatewayIds[0] : ''
  workflow.areaGroup.status = '待配置'
  workflow.areaGroup.successCount = 0
  workflow.areaGroup.failedIds = []
  workflow.areaGroup.completedAt = ''
  workflow.memberChanges = { added: [], removed: [] }
  workflow.gatewayChanges = []
  workflow.multicast = createMulticastState()
  workflow.scenes = workflow.scenes.map((scene) => ({
    ...scene,
    configStatus: scene.included ? '待配置' : scene.configStatus,
    verifyStatus: '待验证',
    active: false
  }))
  workflow.sceneConfiguration = {
    status: '待配置',
    successCount: 0,
    failedCount: 0,
    completedAt: ''
  }
  workflow.activeSceneId = ''
  addLog(workflow, '同步成员并重新配置', '待配置')
  saveWorkflow(workflow)
  return success(workflow, '成员已同步，请重新配置区域组')
}

export async function completeRegionWorkflow(regionId) {
  const workflow = requireWorkflow(regionId)
  const enriched = enrichWorkflow(workflow)
  if (!enriched.requiredComplete) return failure('请先完成必配流程')
  workflow.completedAt = nowText()
  addLog(workflow, '区域调试', '已完成')
  saveWorkflow(workflow)
  return success(workflow, '区域调试已完成')
}

export async function deleteRegionWorkflow(regionId) {
  const store = getStore()
  delete store[regionId]
  persistStore()
  return { ok: true }
}

function createWorkflow(region) {
  return {
    id: region.id,
    region,
    areaGroup: {
      id: `group-${region.id}`,
      name: `${region.name}区域组`,
      groupNo: createGroupNo(region.id),
      gatewayId: region.gatewayIds.length === 1 ? region.gatewayIds[0] : '',
      memberIds: [...region.memberIds],
      status: '待配置',
      successCount: 0,
      failedIds: [],
      completedAt: ''
    },
    multicast: createMulticastState(),
    scenes: createDefaultScenes(region.id),
    sceneConfiguration: {
      status: '待配置',
      successCount: 0,
      failedCount: 0,
      completedAt: ''
    },
    activeSceneId: '',
    panel: {
      required: null,
      status: '待选择',
      panelId: '',
      type: '四按键面板',
      buttons: createDefaultPanelButtons(),
      verifyResults: {},
      configuredAt: ''
    },
    subscription: {
      required: null,
      status: '待选择',
      object: '实体面板按键',
      panelId: '',
      areaGroupId: `group-${region.id}`,
      configuredAt: '',
      records: []
    },
    memberChanges: { added: [], removed: [] },
    gatewayChanges: [],
    progress: null,
    operationLogs: [],
    completedAt: ''
  }
}

function createRegionSnapshot(region, devices) {
  const memberIds = Array.from(new Set(region?.memberIds || []))
  const memberSet = new Set(memberIds)
  const members = devices
    .filter((device) => device.type === 'cu' && memberSet.has(device.id))
    .map((device) => ({
      id: device.id,
      name: device.shortName || device.name || device.id,
      zigbeeId: device.zigbeeId || '',
      gatewayId: device.gatewayId || device.regionId || '',
      online: device.online !== false
    }))
  const gatewayIds = Array.from(new Set(members.map((device) => device.gatewayId).filter(Boolean)))

  return {
    id: region?.id || '',
    name: region?.name || region?.id || '未命名区域',
    code: region?.code || region?.id || '',
    memberIds,
    members,
    gatewayIds,
    gatewayName: gatewayIds.length === 1 ? gatewayIds[0] : gatewayIds.length > 1 ? `${gatewayIds.length} 个网关` : '未识别',
    deviceCount: members.length,
    onlineCount: members.filter((device) => device.online).length,
    offlineCount: members.filter((device) => !device.online).length
  }
}

function reconcileRegionSnapshot(workflow, snapshot) {
  recoverInterruptedState(workflow)
  const previousGatewayById = new Map((workflow.region?.members || []).map((member) => [member.id, member.gatewayId]))
  const configuredIds = workflow.areaGroup.memberIds || []
  const added = snapshot.memberIds.filter((id) => !configuredIds.includes(id))
  const removed = configuredIds.filter((id) => !snapshot.memberIds.includes(id))
  const gatewayChanges = snapshot.members
    .filter((member) => previousGatewayById.has(member.id) && previousGatewayById.get(member.id) !== member.gatewayId)
    .map((member) => ({
      id: member.id,
      name: member.name,
      from: previousGatewayById.get(member.id) || '未识别',
      to: member.gatewayId || '未识别'
    }))
  workflow.region = snapshot
  workflow.memberChanges = { added, removed }
  workflow.gatewayChanges = gatewayChanges

  if ((added.length || removed.length || gatewayChanges.length) && workflow.areaGroup.status !== '待配置') {
    workflow.areaGroup.status = '需重新配置'
    workflow.multicast.status = '待验证'
    workflow.multicast.actions = createMulticastState().actions
    workflow.scenes = workflow.scenes.map((scene) => ({ ...scene, verifyStatus: '待验证', active: false }))
    workflow.activeSceneId = ''
  }
  return workflow
}

function recoverInterruptedState(workflow) {
  if (workflow.areaGroup.status === '配置中') workflow.areaGroup.status = '待配置'
  if (workflow.sceneConfiguration.status === '配置中') workflow.sceneConfiguration.status = '待配置'
  if (workflow.panel.status === '配置中') workflow.panel.status = '待配置'
  if (workflow.subscription.status === '配置中') workflow.subscription.status = '待配置'
  if (workflow.multicast.status === '验证中') {
    Object.values(workflow.multicast.actions).forEach((action) => {
      if (action.status === '验证中') action.status = '待验证'
    })
    workflow.multicast.status = getMulticastStatus(workflow.multicast.actions)
  }
  workflow.scenes.forEach((scene) => {
    if (scene.verifyStatus === '验证中') scene.verifyStatus = '待验证'
  })
  workflow.progress = null
}

function enrichWorkflow(workflow) {
  const configuredScenes = workflow.scenes.filter((scene) => scene.configStatus === '配置完成')
  const verifiedScenes = configuredScenes.filter((scene) => scene.verifyStatus === '验证通过')
  const sceneVerifyStatus = !configuredScenes.length
    ? '待验证'
    : verifiedScenes.length === configuredScenes.length
      ? '验证通过'
      : verifiedScenes.length
        ? '部分验证'
        : '待验证'
  const requiredComplete = workflow.areaGroup.status === '配置完成'
    && workflow.multicast.status === '验证通过'
    && workflow.sceneConfiguration.status === '配置完成'
    && sceneVerifyStatus === '验证通过'
  const requiredDone = [
    workflow.areaGroup.status === '配置完成',
    workflow.multicast.status === '验证通过',
    workflow.sceneConfiguration.status === '配置完成',
    sceneVerifyStatus === '验证通过'
  ].filter(Boolean).length

  return {
    ...workflow,
    sceneVerifyStatus,
    requiredComplete,
    overallProgress: Math.round((requiredDone / 4) * 100),
    currentStep: getCurrentStep(workflow, sceneVerifyStatus)
  }
}

function getCurrentStep(workflow, sceneVerifyStatus) {
  if (workflow.areaGroup.status !== '配置完成') return 'group'
  if (workflow.multicast.status !== '验证通过') return 'multicast'
  if (workflow.sceneConfiguration.status !== '配置完成') return 'scenes'
  if (sceneVerifyStatus !== '验证通过') return 'sceneVerify'
  return 'panel'
}

function createDefaultScenes(regionId) {
  return [
    createScene(regionId, 'on', '全开', 1, 100, 4000),
    createScene(regionId, 'off', '全关', 2, 0, 4000),
    createScene(regionId, 'saving', '节能', 3, 50, 3500),
    createScene(regionId, 'meeting', '会议', 4, 80, 4000)
  ]
}

function createScene(regionId, mode, name, slot, brightness, colorTemperature) {
  return {
    id: `scene-${regionId}-${mode}`,
    regionId,
    kind: 'default',
    mode,
    name,
    slot,
    brightness,
    colorTemperature,
    included: true,
    configStatus: '待配置',
    verifyStatus: '待验证',
    active: false
  }
}

function normalizeScenes(scenes) {
  return (scenes || []).map(normalizeScene)
}

function normalizeScene(scene) {
  return {
    ...scene,
    name: String(scene.name || '').trim(),
    slot: Number(scene.slot),
    brightness: Number(scene.brightness),
    colorTemperature: Number(scene.colorTemperature),
    included: scene.included !== false
  }
}

function validateScenes(scenes) {
  const included = scenes.filter((scene) => scene.included)
  if (included.some((scene) => !scene.name)) return failure('请填写场景名称')
  if (included.some((scene) => !Number.isInteger(scene.slot) || scene.slot < 0 || scene.slot > 31)) {
    return failure('SLOT 请输入 0-31 的整数')
  }
  if (new Set(included.map((scene) => scene.slot)).size !== included.length) {
    return failure('SLOT 不能重复')
  }
  if (included.some((scene) => !Number.isInteger(scene.brightness) || scene.brightness < 0 || scene.brightness > 100)) {
    return failure('亮度请输入 0-100 的整数')
  }
  if (included.some((scene) => scene.colorTemperature < COLOR_TEMPERATURE_MIN || scene.colorTemperature > COLOR_TEMPERATURE_MAX)) {
    return failure(`色温请输入 ${COLOR_TEMPERATURE_MIN}-${COLOR_TEMPERATURE_MAX}K`)
  }
  return { ok: true }
}

function createDefaultPanelButtons() {
  return [
    { keyNo: 1, action: 'group-on', sceneId: '' },
    { keyNo: 2, action: 'group-off', sceneId: '' },
    { keyNo: 3, action: 'scene', sceneId: '' },
    { keyNo: 4, action: 'scene', sceneId: '' }
  ]
}

function validatePanelConfig(workflow, config) {
  if (!String(config?.panelId || '').trim()) return failure('请输入面板编号')
  if (String(config.panelId).trim().length !== 8) return failure('面板编号请输入 8 位')
  if (!Array.isArray(config?.buttons) || config.buttons.length !== 4) return failure('请完成四个按键配置')
  const configuredSceneIds = new Set(
    workflow.scenes.filter((scene) => scene.configStatus === '配置完成').map((scene) => scene.id)
  )
  const missingScene = config.buttons.some((button) => button.action === 'scene' && !configuredSceneIds.has(button.sceneId))
  if (missingScene) return failure('切换场景的按键必须选择已配置场景')
  return { ok: true }
}

function buildLegacySubscriptionRecords(workflow) {
  return workflow.panel.buttons.map((button) => {
    const scene = workflow.scenes.find((item) => item.id === button.sceneId)
    return {
      GatewayID: workflow.areaGroup.gatewayId,
      EnoceanNo: '01',
      EnoceanID: workflow.panel.panelId,
      EnoceanKeyID: String(button.keyNo).padStart(2, '0'),
      GatewayGroupSoltID: button.action === 'scene'
        ? String(scene?.slot ?? '').padStart(2, '0')
        : button.action === 'group-on'
          ? '01'
          : button.action === 'group-off'
            ? '02'
            : '00',
      GroupID: workflow.areaGroup.groupNo
    }
  })
}

function createMulticastState() {
  return {
    status: '待验证',
    actions: {
      on: { status: '待验证', value: null, at: '' },
      off: { status: '待验证', value: null, at: '' },
      brightness: { status: '待验证', value: 50, at: '' }
    }
  }
}

function normalizeGroupAction(action) {
  if (['on', 'group-on'].includes(action)) return 'on'
  if (['off', 'group-off'].includes(action)) return 'off'
  return 'brightness'
}

function getMulticastStatus(actions) {
  if (actions.on.status === '验证失败' || actions.off.status === '验证失败') return '验证失败'
  if (actions.on.status === '验证通过' && actions.off.status === '验证通过') return '验证通过'
  if (actions.on.status === '验证通过' || actions.off.status === '验证通过') return '部分验证'
  return '待验证'
}

function getPanelActionText(action, sceneName) {
  if (action === 'group-on') return '区域组开'
  if (action === 'group-off') return '区域组关'
  if (action === 'scene') return `切换场景${sceneName ? `：${sceneName}` : ''}`
  return '无动作'
}

function createProgress(label, total) {
  return { label, current: 0, total, status: '进行中' }
}

async function runProgress(workflow, total, onProgress) {
  for (let current = 1; current <= total; current += 1) {
    await wait(Math.min(130, Math.max(45, 720 / Math.max(1, total))))
    workflow.progress.current = current
    saveWorkflow(workflow)
    onProgress?.(clone(enrichWorkflow(workflow)))
  }
}

function addLog(workflow, action, result) {
  workflow.operationLogs = [
    { id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action, result, time: nowText() },
    ...(workflow.operationLogs || [])
  ].slice(0, 20)
}

function success(workflow, message) {
  return { ok: true, message, workflow: clone(enrichWorkflow(workflow)) }
}

function failure(message) {
  return { ok: false, message, error: message }
}

function failureWithWorkflow(workflow, message) {
  return { ok: false, message, error: message, workflow: clone(enrichWorkflow(workflow)) }
}

function requireWorkflow(regionId) {
  const workflow = getStore()[regionId]
  if (!workflow) throw new Error('未找到区域调试流程')
  return workflow
}

function saveWorkflow(workflow) {
  getStore()[workflow.id] = workflow
  persistStore()
}

function getStore() {
  if (workflowStore) return workflowStore
  try {
    workflowStore = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
  } catch (error) {
    workflowStore = {}
  }
  return workflowStore
}

function persistStore() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getStore()))
  } catch (error) {
    // The active session remains usable when browser storage is unavailable.
  }
}

function createGroupNo(regionId) {
  let hash = 0
  for (const character of String(regionId || 'region')) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) >>> 0
  }
  return (hash % 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

function nowText() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function clone(value) {
  return structuredClone(value)
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

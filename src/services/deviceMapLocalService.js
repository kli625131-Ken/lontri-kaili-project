import { DEVICE_MAP_PROJECT_ID, createMockConfigState } from '../mock/deviceMapMockData'

const STORAGE_PREFIX = 'deviceMapDraft:'

export function getDraftStorageKey(projectId = DEVICE_MAP_PROJECT_ID, floorId = '') {
  return `${STORAGE_PREFIX}${projectId}:${floorId}`
}

export function createInitialDraftState(floorId = '') {
  const mockState = createMockConfigState(floorId)
  return {
    floorId,
    dirty: false,
    regions: [],
    devices: [],
    areaGroups: [],
    scenes: mockState.scenes,
    cuParamTemplates: mockState.cuParamTemplates,
    cuParamConfigs: mockState.cuParamConfigs,
    operationLogs: mockState.operationLogs,
    testResults: mockState.testResults,
    validationMessages: [],
    currentDraftState: 'clean'
  }
}

export function createDraftFromOverlay(floorId, regions = [], devices = []) {
  const cuById = new Map(devices.filter((device) => device.type === 'cu').map((device) => [device.id, device]))
  return {
    ...createInitialDraftState(floorId),
    regions,
    devices,
    areaGroups: regions.map((region, index) => {
      const members = (region.memberIds || []).filter((id) => cuById.has(id))
      const gatewayId = getSingleGatewayId(members.map((id) => cuById.get(id)))
      return {
        id: `ag-${region.id || index + 1}`,
        name: `${region.name || region.id || `区域${index + 1}`}区域组`,
        regionId: region.id,
        gatewayId,
        memberIds: members,
        mode: 'local-draft'
      }
    }),
    scenes: createMockScenes(regions),
    cuParamConfigs: createMockCuParamConfigs(regions)
  }
}

export function loadLocalDraft(floorId, projectId = DEVICE_MAP_PROJECT_ID) {
  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(projectId, floorId))
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('读取本地地图草稿失败', error)
    return null
  }
}

export function saveLocalDraft(floorId, draftState, overlay = null, projectId = DEVICE_MAP_PROJECT_ID) {
  try {
    const payload = {
      ...draftState,
      floorId,
      savedAt: new Date().toISOString(),
      dirty: false
    }

    if (overlay) {
      payload.overlay = overlay
    }

    window.localStorage.setItem(getDraftStorageKey(projectId, floorId), JSON.stringify(payload))
    return true
  } catch (error) {
    console.warn('保存本地地图草稿失败', error)
    return false
  }
}

export function loadMapState(projectId, floorId, baseState = {}) {
  const localDraft = loadLocalDraft(floorId, projectId)
  const baseOverlay = normalizeOverlay(baseState)
  const draftOverlay = normalizeOverlay(localDraft?.overlay)
  const overlay = hasOverlayData(draftOverlay) ? draftOverlay : baseOverlay
  const devices = overlay.devices.length ? overlay.devices : [...overlay.cuDevices, ...overlay.gwDevices]
  const draft = localDraft
    ? normalizeDraft(localDraft, floorId, overlay)
    : createDraftFromOverlay(floorId, overlay.regions, devices)

  return {
    regions: overlay.regions,
    devices,
    cuDevices: overlay.cuDevices,
    gwDevices: overlay.gwDevices,
    areaGroups: draft.areaGroups,
    scenes: draft.scenes,
    cuParamTemplates: draft.cuParamTemplates,
    cuParamConfigs: draft.cuParamConfigs,
    operationLogs: draft.operationLogs,
    currentDraftState: draft.currentDraftState,
    draftState: draft,
    hasDraft: !!localDraft
  }
}

export function saveDraft(projectId, floorId, state) {
  return saveLocalDraft(floorId, state.draftState || state, state.overlay || null, projectId)
}

export function clearDraft(projectId, floorId) {
  try {
    window.localStorage.removeItem(getDraftStorageKey(projectId, floorId))
    return true
  } catch (error) {
    console.warn('清除本地地图草稿失败', error)
    return false
  }
}

export function updateRegion(state, region) {
  return upsertById(state, 'regions', region)
}

export function updateDevice(state, device) {
  return upsertById(state, 'devices', device)
}

export function updateAreaGroup(state, areaGroup) {
  return upsertById(state, 'areaGroups', areaGroup)
}

export function updateScene(state, scene) {
  return upsertById(state, 'scenes', scene)
}

export function updateCuParams(state, params) {
  const item = { ...params, id: params.id || `cu-param-${params.regionId || Date.now()}` }
  return upsertById(state, 'cuParamConfigs', item)
}

export function validateMapState(state) {
  return validateDraftState(state.draftState || state, state.devices || [])
}

export function mockControl(action) {
  return {
    ok: true,
    action,
    message: '前端模拟控制已完成',
    at: new Date().toISOString()
  }
}

export function removeDeviceFromDraft(draftState, deviceId) {
  return {
    ...draftState,
    dirty: true,
    areaGroups: draftState.areaGroups.map((group) => ({
      ...group,
      memberIds: (group.memberIds || []).filter((id) => id !== deviceId)
    }))
  }
}

export function upsertAreaGroup(draftState, group) {
  const exists = draftState.areaGroups.some((item) => item.id === group.id)
  return {
    ...draftState,
    dirty: true,
    areaGroups: exists
      ? draftState.areaGroups.map((item) => (item.id === group.id ? { ...item, ...group } : item))
      : [...draftState.areaGroups, group]
  }
}

export function validateAreaGroupGateway(group, devices = []) {
  const cuById = new Map(devices.filter((device) => device.type === 'cu').map((device) => [device.id, device]))
  const members = (group.memberIds || []).map((id) => cuById.get(id)).filter(Boolean)
  const gatewayIds = new Set(members.map((device) => device.gatewayId || device.regionId || '').filter(Boolean))

  if (!members.length) {
    return {
      ok: false,
      message: '区域组内 CU 不能为空。'
    }
  }

  if (gatewayIds.size > 1) {
    return {
      ok: false,
      message: '当前区域包含多个网关下的设备，本版本暂不支持跨网关区域组，请调整区域范围或设备关系。'
    }
  }

  return {
    ok: true,
    gatewayId: Array.from(gatewayIds)[0] || group.gatewayId || ''
  }
}

export function validateDraftState(draftState, devices = []) {
  const messages = []
  ;(draftState.areaGroups || []).forEach((group) => {
    const result = validateAreaGroupGateway(group, devices)
    if (!result.ok) messages.push(`${group.name || group.id}：${result.message}`)
  })
  return messages
}

export function getSingleGatewayId(devices = []) {
  const gatewayIds = new Set(devices.map((device) => device?.gatewayId || device?.regionId || '').filter(Boolean))
  return gatewayIds.size === 1 ? Array.from(gatewayIds)[0] : ''
}

function normalizeDraft(localDraft, floorId, overlay) {
  const { overlay: _overlay, ...draft } = localDraft
  return {
    ...createInitialDraftState(floorId),
    ...draft,
    floorId,
    regions: overlay.regions,
    devices: overlay.devices.length ? overlay.devices : [...overlay.cuDevices, ...overlay.gwDevices],
    dirty: !!draft.dirty
  }
}

function normalizeOverlay(overlay = {}) {
  const devices = Array.isArray(overlay.devices) ? overlay.devices : []
  const cuDevices = Array.isArray(overlay.cuDevices)
    ? overlay.cuDevices
    : devices.filter((device) => device.type === 'cu')
  const gwDevices = Array.isArray(overlay.gwDevices)
    ? overlay.gwDevices
    : devices.filter((device) => device.type === 'gw')

  return {
    regions: Array.isArray(overlay.regions) ? overlay.regions : [],
    cuDevices,
    gwDevices,
    devices: devices.length ? devices : [...cuDevices, ...gwDevices]
  }
}

function hasOverlayData(overlay) {
  return !!overlay && (
    overlay.regions.length > 0 ||
    overlay.cuDevices.length > 0 ||
    overlay.gwDevices.length > 0 ||
    overlay.devices.length > 0
  )
}

function upsertById(state, key, item) {
  const list = Array.isArray(state[key]) ? state[key] : []
  const id = item.id || `${key}-${Date.now()}`
  const nextItem = { ...item, id }
  const exists = list.some((entry) => entry.id === id)
  return {
    ...state,
    dirty: true,
    currentDraftState: 'dirty',
    [key]: exists ? list.map((entry) => (entry.id === id ? { ...entry, ...nextItem } : entry)) : [...list, nextItem]
  }
}

function createMockScenes(regions = []) {
  return regions.flatMap((region) => [
    { id: `scene-${region.id}-on`, regionId: region.id, name: '开启', mode: 'on', brightness: 100 },
    { id: `scene-${region.id}-off`, regionId: region.id, name: '关闭', mode: 'off', brightness: 0 },
    { id: `scene-${region.id}-meeting`, regionId: region.id, name: '会议模式', mode: 'meeting', brightness: 80 },
    { id: `scene-${region.id}-discussion`, regionId: region.id, name: '讨论模式', mode: 'discussion', brightness: 60 }
  ])
}

function createMockCuParamConfigs(regions = []) {
  return regions.map((region) => ({
    id: `param-${region.id}`,
    regionId: region.id,
    mode: 'auto',
    brightness: 100,
    bgBrightness: 40,
    bgTime: 900,
    offTime: 1200,
    manualTime: 1250
  }))
}

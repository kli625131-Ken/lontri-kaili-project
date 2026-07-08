const STORAGE_PREFIX = 'device-map-draft:'

export function createInitialDraftState(floorId = '') {
  return {
    floorId,
    dirty: false,
    areaGroups: [],
    scenes: [],
    cuParams: [],
    validationMessages: []
  }
}

export function createDraftFromOverlay(floorId, regions = [], devices = []) {
  const cuById = new Map(devices.filter((device) => device.type === 'cu').map((device) => [device.id, device]))
  return {
    ...createInitialDraftState(floorId),
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
    })
  }
}

export function loadLocalDraft(floorId) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${floorId}`)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('读取本地地图草稿失败', error)
    return null
  }
}

export function saveLocalDraft(floorId, draftState, overlay = null) {
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

    window.localStorage.setItem(`${STORAGE_PREFIX}${floorId}`, JSON.stringify(payload))
    return true
  } catch (error) {
    console.warn('保存本地地图草稿失败', error)
    return false
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
  draftState.areaGroups.forEach((group) => {
    const result = validateAreaGroupGateway(group, devices)
    if (!result.ok) messages.push(`${group.name || group.id}：${result.message}`)
  })
  return messages
}

export function getSingleGatewayId(devices = []) {
  const gatewayIds = new Set(devices.map((device) => device?.gatewayId || device?.regionId || '').filter(Boolean))
  return gatewayIds.size === 1 ? Array.from(gatewayIds)[0] : ''
}

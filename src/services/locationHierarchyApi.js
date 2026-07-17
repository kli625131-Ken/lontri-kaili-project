import { requestIotJson, unwrapWcfData } from './iotRestClient.js'

const ENV = import.meta.env ?? {}
const DEFAULT_ROOT_NAME = ENV.VITE_ENERGY_ROOT_NAME || 'Lontri'
const ZERO_GUID = '00000000-0000-0000-0000-000000000000'
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LEVELS = ['company', 'site', 'building', 'storey', 'area']
const LEVEL_ICONS = { company: '项', site: '城', building: '楼', storey: '层', area: '区' }

export async function loadEnergyLocationHierarchy({
  rootName = DEFAULT_ROOT_NAME,
  rootLocationId = '',
  signal,
  fetchImpl = globalThis.fetch
} = {}) {
  const response = await requestIotJson('/getallmaptrees', { auth: false, signal, fetchImpl })
  const source = unwrapWcfData(response)
  const roots = Array.isArray(source) ? source : []
  if (!roots.length) throw new Error('物理层级接口未返回有效树结构')

  const matched = findTreeNode(roots, (node) => {
    const locationId = String(node?.locationId || '').trim()
    if (rootLocationId) return locationId.toLowerCase() === rootLocationId.toLowerCase()
    return readNodeLabel(node).toLowerCase() === String(rootName).trim().toLowerCase()
  })

  if (!matched) throw new Error(`物理层级中未找到最大统计范围 ${rootName}`)
  if (!isPhysicalLocationId(matched.locationId)) throw new Error(`${rootName} 未配置有效 locationId`)

  const root = normalizeTreeNode(matched, 0, null)
  return { tree: [root], root }
}

export function isPhysicalLocationId(value) {
  const locationId = String(value || '').trim()
  return GUID_PATTERN.test(locationId) && locationId.toLowerCase() !== ZERO_GUID
}

function normalizeTreeNode(node, depth, parentLocationId) {
  const level = LEVELS[Math.min(depth, LEVELS.length - 1)]
  const locationId = String(node.locationId || '').trim()
  const children = Array.isArray(node.children)
    ? node.children
      .filter((child) => isPhysicalLocationId(child?.locationId))
      .map((child) => normalizeTreeNode(child, depth + 1, locationId))
    : []

  return {
    id: String(node.id || locationId),
    label: readNodeLabel(node),
    icon: LEVEL_ICONS[level],
    level,
    locationId,
    parentLocationId,
    mapTreeNodeId: node.id || null,
    mapViewId: node.url || null,
    children
  }
}

function findTreeNode(nodes, predicate) {
  for (const node of nodes) {
    if (predicate(node)) return node
    const matched = findTreeNode(Array.isArray(node?.children) ? node.children : [], predicate)
    if (matched) return matched
  }
  return null
}

function readNodeLabel(node) {
  return String(node?.text || node?.label || node?.name || '').trim()
}

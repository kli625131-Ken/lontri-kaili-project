const REGION_MIN_WIDTH = 28
const REGION_MIN_HEIGHT = 28
const REGION_MIN_AREA = 1800
const REGION_MAX_ASPECT_RATIO = 6.5
const REGION_MIN_FILL_RATIO = 0.4
const DEVICE_CLUSTER_DISTANCE = 6
const DEVICE_MAX_RAW_SIZE = 12

export function parseFloorSvg(svgText) {
  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
  const pathNodes = Array.from(svgDoc.querySelectorAll('path'))

  const rawRegionCandidates = []
  const rawDevicePaths = []
  let yellowPathCount = 0

  pathNodes.forEach((pathNode) => {
    const d = pathNode.getAttribute('d') || ''
    if (!d) return

    const stroke = normalizeColor(pathNode.getAttribute('stroke'))
    const fill = normalizeColor(pathNode.getAttribute('fill'))

    if (stroke === 'yellow' || fill === 'yellow') {
      yellowPathCount += 1
      const regionCandidate = buildRegionCandidate(d, rawRegionCandidates.length)
      if (regionCandidate) rawRegionCandidates.push(regionCandidate)
    }

    if (stroke === 'cyan') {
      const bbox = getPathBBox(d)
      if (bbox && bbox.width <= DEVICE_MAX_RAW_SIZE && bbox.height <= DEVICE_MAX_RAW_SIZE) {
        rawDevicePaths.push({ bbox })
      }
    }
  })

  const regions = dedupeRegionCandidates(rawRegionCandidates).map((candidate, index) => ({
    ...candidate,
    id: `region-candidate-${String(index + 1).padStart(3, '0')}`,
    name: `自动区域-${String(index + 1).padStart(2, '0')}`
  }))

  const deviceCandidates = clusterDevicePaths(rawDevicePaths).map((cluster, index) => ({
    id: `device-candidate-${String(index + 1).padStart(3, '0')}`,
    x: round((cluster.bbox.minX + cluster.bbox.maxX) / 2),
    y: round((cluster.bbox.minY + cluster.bbox.maxY) / 2),
    bbox: finalizeBBox(cluster.bbox),
    candidateType: 'device',
    confidence: Number(Math.min(0.95, 0.45 + cluster.items.length * 0.18).toFixed(2))
  }))

  return {
    regions,
    deviceCandidates,
    debugStats: {
      yellowPathCount,
      acceptedRegionCount: regions.length,
      cyanClusterCount: deviceCandidates.length,
      mappedCuCount: 0,
      mappedGwCount: 0
    }
  }
}

function buildRegionCandidate(d, index) {
  const parsedPath = parseSimplePath(d)
  if (!parsedPath.supported || !parsedPath.closed) return null

  const points = normalizePolygonPoints(parsedPath.points)
  if (points.length < 4 || points.length > 12) return null

  const sourceBBox = getBBoxFromPoints(points)
  if (!sourceBBox) return null
  if (sourceBBox.width < REGION_MIN_WIDTH || sourceBBox.height < REGION_MIN_HEIGHT) return null

  const aspectRatio = Math.max(sourceBBox.width, sourceBBox.height) / Math.max(1, Math.min(sourceBBox.width, sourceBBox.height))
  if (aspectRatio > REGION_MAX_ASPECT_RATIO) return null

  const area = Math.abs(getPolygonArea(points))
  if (area < REGION_MIN_AREA) return null

  const fillRatio = area / Math.max(1, sourceBBox.width * sourceBBox.height)
  if (fillRatio < REGION_MIN_FILL_RATIO) return null

  return {
    id: `region-raw-${index + 1}`,
    points,
    sourceBBox,
    sourceColor: 'yellow'
  }
}

function clusterDevicePaths(rawDevicePaths) {
  const clusters = []

  rawDevicePaths.forEach((item) => {
    let clusterIndex = clusters.findIndex((cluster) => distanceBetweenBoxes(cluster.bbox, item.bbox) <= DEVICE_CLUSTER_DISTANCE)

    if (clusterIndex === -1) {
      clusters.push({ bbox: item.bbox, items: [item] })
      return
    }

    clusters[clusterIndex].items.push(item)
    clusters[clusterIndex].bbox = mergeBoxes(clusters[clusterIndex].bbox, item.bbox)

    let merged = true
    while (merged) {
      merged = false
      for (let index = 0; index < clusters.length; index += 1) {
        if (index === clusterIndex) continue
        if (distanceBetweenBoxes(clusters[clusterIndex].bbox, clusters[index].bbox) > DEVICE_CLUSTER_DISTANCE) continue

        clusters[clusterIndex].items.push(...clusters[index].items)
        clusters[clusterIndex].bbox = mergeBoxes(clusters[clusterIndex].bbox, clusters[index].bbox)
        clusters.splice(index, 1)
        if (index < clusterIndex) clusterIndex -= 1
        merged = true
        break
      }
    }
  })

  return clusters
    .map((cluster) => ({
      ...cluster,
      bbox: finalizeBBox(cluster.bbox)
    }))
    .sort((left, right) => left.bbox.minY - right.bbox.minY || left.bbox.minX - right.bbox.minX)
}

function dedupeRegionCandidates(candidates) {
  const deduped = []

  candidates
    .slice()
    .sort((left, right) => getBoxArea(right.sourceBBox) - getBoxArea(left.sourceBBox))
    .forEach((candidate) => {
      const duplicated = deduped.some((existing) => areSimilarBoxes(existing.sourceBBox, candidate.sourceBBox))
      if (!duplicated) deduped.push(candidate)
    })

  return deduped.sort((left, right) => left.sourceBBox.minY - right.sourceBBox.minY || left.sourceBBox.minX - right.sourceBBox.minX)
}

function areSimilarBoxes(left, right) {
  const centerDistance = Math.hypot(
    (left.minX + left.maxX) / 2 - (right.minX + right.maxX) / 2,
    (left.minY + left.maxY) / 2 - (right.minY + right.maxY) / 2
  )

  return (
    centerDistance <= 2 &&
    Math.abs(left.width - right.width) <= 2 &&
    Math.abs(left.height - right.height) <= 2
  )
}

function parseSimplePath(d) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) || []
  const points = []
  let command = ''
  let cursor = { x: 0, y: 0 }
  let startPoint = null
  let index = 0
  let supported = true
  let closed = false

  const pushPoint = (x, y) => {
    cursor = { x, y }
    points.push({ x: round(x), y: round(y) })
    if (!startPoint) startPoint = { ...cursor }
  }

  while (index < tokens.length) {
    const token = tokens[index]
    if (isCommandToken(token)) {
      command = token
      index += 1
      if (command === 'Z' || command === 'z') {
        closed = true
        if (startPoint) points.push({ ...startPoint })
      }
      continue
    }

    if (!command) {
      supported = false
      break
    }

    const absolute = command === command.toUpperCase()
    switch (command.toUpperCase()) {
      case 'M':
      case 'L': {
        if (index + 1 >= tokens.length) {
          supported = false
          index = tokens.length
          break
        }

        const nextX = Number(tokens[index])
        const nextY = Number(tokens[index + 1])
        if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
          supported = false
          index = tokens.length
          break
        }

        const x = absolute ? nextX : cursor.x + nextX
        const y = absolute ? nextY : cursor.y + nextY
        pushPoint(x, y)
        index += 2
        if (command === 'M') command = absolute ? 'L' : 'l'
        break
      }
      case 'H': {
        const nextX = Number(tokens[index])
        if (!Number.isFinite(nextX)) {
          supported = false
          index = tokens.length
          break
        }

        const x = absolute ? nextX : cursor.x + nextX
        pushPoint(x, cursor.y)
        index += 1
        break
      }
      case 'V': {
        const nextY = Number(tokens[index])
        if (!Number.isFinite(nextY)) {
          supported = false
          index = tokens.length
          break
        }

        const y = absolute ? nextY : cursor.y + nextY
        pushPoint(cursor.x, y)
        index += 1
        break
      }
      default:
        supported = false
        index = tokens.length
        break
    }
  }

  return { points, supported, closed: closed || isClosedByPoints(points) }
}

function normalizePolygonPoints(points) {
  const normalized = []

  points.forEach((point) => {
    const lastPoint = normalized[normalized.length - 1]
    if (!lastPoint || lastPoint.x !== point.x || lastPoint.y !== point.y) normalized.push(point)
  })

  if (normalized.length > 1) {
    const firstPoint = normalized[0]
    const lastPoint = normalized[normalized.length - 1]
    if (firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y) normalized.pop()
  }

  return normalized
}

function getPathBBox(d) {
  const values = d.match(/-?\d*\.?\d+/g)?.map(Number) || []
  if (values.length < 4) return null

  const points = []
  for (let index = 0; index < values.length - 1; index += 2) {
    const x = values[index]
    const y = values[index + 1]
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y })
  }

  return getBBoxFromPoints(points)
}

function getBBoxFromPoints(points) {
  if (!points.length) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  points.forEach((point) => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  })

  return finalizeBBox({ minX, minY, maxX, maxY })
}

function finalizeBBox(bbox) {
  return {
    minX: round(bbox.minX),
    minY: round(bbox.minY),
    maxX: round(bbox.maxX),
    maxY: round(bbox.maxY),
    width: round(bbox.maxX - bbox.minX),
    height: round(bbox.maxY - bbox.minY)
  }
}

function mergeBoxes(left, right) {
  return finalizeBBox({
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY)
  })
}

function distanceBetweenBoxes(left, right) {
  const dx = Math.max(0, Math.max(left.minX - right.maxX, right.minX - left.maxX))
  const dy = Math.max(0, Math.max(left.minY - right.maxY, right.minY - left.maxY))
  return Math.hypot(dx, dy)
}

function getPolygonArea(points) {
  let total = 0

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    total += current.x * next.y - next.x * current.y
  }

  return total / 2
}

function getBoxArea(bbox) {
  return bbox.width * bbox.height
}

function isClosedByPoints(points) {
  if (points.length < 2) return false
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  return Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y) <= 0.8
}

function isCommandToken(token) {
  return /^[A-Za-z]$/.test(token)
}

function normalizeColor(value) {
  return (value || '').trim().toLowerCase()
}

function round(value) {
  return Number(value.toFixed(3))
}

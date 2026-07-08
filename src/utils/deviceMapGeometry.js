export function getPointsBBox(points = []) {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  const bounds = points.reduce(
    (result, point) => ({
      minX: Math.min(result.minX, Number(point.x)),
      minY: Math.min(result.minY, Number(point.y)),
      maxX: Math.max(result.maxX, Number(point.x)),
      maxY: Math.max(result.maxY, Number(point.y))
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  )

  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
  }
}

export function pointInPolygon(point, polygon = []) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const xi = polygon[index].x
    const yi = polygon[index].y
    const xj = polygon[previous].x
    const yj = polygon[previous].y
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-6) + xi

    if (intersect) inside = !inside
  }
  return inside
}

export function normalizeRegionShape(region) {
  const shapeType = region.shapeType || 'POLYGON'
  if (region.geometry) return { shapeType, geometry: region.geometry }

  const bbox = getPointsBBox(region.points || [])
  if (shapeType === 'RECT') {
    return {
      shapeType,
      geometry: {
        x: bbox.minX,
        y: bbox.minY,
        width: bbox.width,
        height: bbox.height
      }
    }
  }

  if (shapeType === 'CIRCLE') {
    return {
      shapeType,
      geometry: {
        cx: bbox.minX + bbox.width / 2,
        cy: bbox.minY + bbox.height / 2,
        radius: Math.max(bbox.width, bbox.height) / 2
      }
    }
  }

  return {
    shapeType: 'POLYGON',
    geometry: {
      points: region.points || []
    }
  }
}

export function shapeToPoints(shapeType, geometry, segments = 32) {
  if (!geometry) return []

  if (shapeType === 'RECT') {
    const x = Number(geometry.x)
    const y = Number(geometry.y)
    const width = Number(geometry.width)
    const height = Number(geometry.height)
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ]
  }

  if (shapeType === 'CIRCLE') {
    const cx = Number(geometry.cx)
    const cy = Number(geometry.cy)
    const radius = Math.max(Number(geometry.radius), 0)
    return Array.from({ length: segments }, (_, index) => {
      const angle = (Math.PI * 2 * index) / segments
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      }
    })
  }

  return (geometry.points || []).map((point) => ({ x: Number(point.x), y: Number(point.y) }))
}

export function isPointInShape(point, shapeType, geometry) {
  if (shapeType === 'RECT') {
    const minX = Math.min(geometry.x, geometry.x + geometry.width)
    const maxX = Math.max(geometry.x, geometry.x + geometry.width)
    const minY = Math.min(geometry.y, geometry.y + geometry.height)
    const maxY = Math.max(geometry.y, geometry.y + geometry.height)
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  }

  if (shapeType === 'CIRCLE') {
    return Math.hypot(point.x - geometry.cx, point.y - geometry.cy) <= Math.abs(geometry.radius)
  }

  return pointInPolygon(point, geometry.points || [])
}

export function moveGeometry(shapeType, geometry, delta) {
  if (shapeType === 'RECT') {
    return { ...geometry, x: geometry.x + delta.x, y: geometry.y + delta.y }
  }

  if (shapeType === 'CIRCLE') {
    return { ...geometry, cx: geometry.cx + delta.x, cy: geometry.cy + delta.y }
  }

  return {
    points: (geometry.points || []).map((point) => ({
      x: point.x + delta.x,
      y: point.y + delta.y
    }))
  }
}

export function resizeRectFromHandle(geometry, handle, point) {
  const x1 = handle.includes('w') ? point.x : geometry.x
  const y1 = handle.includes('n') ? point.y : geometry.y
  const x2 = handle.includes('e') ? point.x : geometry.x + geometry.width
  const y2 = handle.includes('s') ? point.y : geometry.y + geometry.height
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
}

export function geometryToCadGeometry(shapeType, geometry, svgToCad) {
  if (shapeType === 'RECT') {
    const points = shapeToPoints(shapeType, geometry).map(svgToCad)
    return { points }
  }

  if (shapeType === 'CIRCLE') {
    const center = svgToCad({ x: geometry.cx, y: geometry.cy })
    const edge = svgToCad({ x: geometry.cx + geometry.radius, y: geometry.cy })
    return {
      cx: center.x,
      cy: center.y,
      radius: Math.hypot(edge.x - center.x, edge.y - center.y)
    }
  }

  return {
    points: (geometry.points || []).map(svgToCad)
  }
}

export function collectDevicesInShape(region, devices = []) {
  const { shapeType, geometry } = normalizeRegionShape(region)
  return devices
    .filter((device) => isPointInShape({ x: device.x, y: device.y }, shapeType, geometry))
    .map((device) => device.id)
}

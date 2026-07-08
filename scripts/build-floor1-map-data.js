import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const excelPath = path.join(projectRoot, 'docs', '开利101车间-灯控设备坐标值260226.xls')
const svgPath = path.join(projectRoot, 'public', 'maps', 'floor1.svg')
const metaPath = path.join(projectRoot, 'public', 'maps', 'floor1.meta.json')
const dataPath = path.join(projectRoot, 'public', 'maps', 'floor1.data.json')
const deviceIconDir = path.join(projectRoot, 'src', 'assets', 'images', 'devices')

const workbook = XLSX.readFile(excelPath, { cellDates: false })
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false })
const iconFiles = fs.existsSync(deviceIconDir) ? fs.readdirSync(deviceIconDir) : []

const regionSourceRows = rows
  .map((row, index) => ({ row, excelRow: index + 2 }))
  .filter(({ row }) => !normalizeText(row.DEVICETYPE) && isFiniteNumber(row.X) && isFiniteNumber(row.Y))
  .map(({ row, excelRow }) => {
    const parsedName = parseRegionPointName(row['名称'])
    return {
      excelRow,
      regionCode: parsedName.regionCode,
      pointType: parsedName.pointType,
      label: normalizeText(row['名称']),
      x: toNumber(row.X),
      y: toNumber(row.Y)
    }
  })

const regions = buildRegions(regionSourceRows)
const cuDevices = rows
  .map((row, index) => ({ row, excelRow: index + 2 }))
  .filter(({ row }) => normalizeText(row.DEVICETYPE) && isFiniteNumber(row.X) && isFiniteNumber(row.Y))
  .map(({ row, excelRow }, index) => buildDevice(row, excelRow, index))
const regionGateways = buildRegionGateways(regions)
const devices = [...cuDevices, ...regionGateways]

const svgText = fs.readFileSync(svgPath, 'utf8')
const viewBox = parseSvgViewBox(svgText)
const svgPathBounds = getSvgPathBounds(svgText)
const svgBounds = viewBoxToBounds(viewBox)
const cadBounds = getCadBounds([...regionSourceRows, ...devices.map((device) => ({ x: device.cadX, y: device.cadY }))])
const transform = buildDemoAffineTransform(cadBounds)

const meta = {
  floorId: 'floor1',
  name: '开利101车间一层',
  svgUrl: '/maps/floor1.svg',
  dataUrl: '/maps/floor1.data.json',
  sourceExcel: 'docs/开利101车间-灯控设备坐标值260226.xls',
  sourceSheet: sheetName,
  unit: 'CAD',
  viewBox,
  svgBounds,
  svgPathBounds,
  cadBounds,
  bbox: cadBounds,
  coordinateTransform: transform,
  notes: [
    'floor1.data.json 由 scripts/build-floor1-map-data.js 从属性表生成。',
    '属性表当前只有 DEVICETYPE=CU 的设备坐标；GW 按每个区域一个网关图标派生，位置取区域 CAD 顶点中心。',
    'GWA06#0103 在源表中包含两组矩形顶点，生成时拆分为两个唯一区域。'
  ]
}

fs.writeFileSync(dataPath, `${JSON.stringify({ regions, devices }, null, 2)}\n`, 'utf8')
fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')

console.log(`Generated ${path.relative(projectRoot, dataPath)}`)
console.log(`Generated ${path.relative(projectRoot, metaPath)}`)
console.log(`Regions: ${regions.length}`)
console.log(`Devices: ${devices.length}`)
console.log(`CU devices: ${cuDevices.length}`)
console.log(`Region GW icons: ${regionGateways.length}`)
console.log(`Device types: ${[...new Set(devices.map((device) => device.type))].join(', ') || '(none)'}`)
console.log('GW coordinate rows: 0; GW icons are derived from region centers')

function buildRegions(sourceRows) {
  const grouped = groupBy(sourceRows, (item) => item.regionCode)
  return Object.entries(grouped).flatMap(([regionCode, points]) => {
    const rectangles = findRectangles(points)
    const usableGroups = rectangles.length ? rectangles : [sortClockwise(points)]

    return usableGroups.map((rectangle, index) => {
      const suffix = usableGroups.length > 1 ? `-${index + 1}` : ''
      const id = `${regionCode}${suffix}`
      const cadPoints = sortClockwise(rectangle).map((point) => ({
        x: round(point.x),
        y: round(point.y),
        sourceLabel: point.label,
        sourceRow: point.excelRow,
        pointType: point.pointType
      }))

      return {
        id,
        code: regionCode,
        name: id,
        sourceRows: cadPoints.map((point) => point.sourceRow),
        cadBounds: getCadBounds(cadPoints),
        points: cadPoints
      }
    })
  })
}

function buildDevice(row, excelRow, index) {
  const type = normalizeDeviceType(row.DEVICETYPE)
  const order = String(index + 1).padStart(4, '0')
  const gatewayNo = normalizeText(row.GWNO) || 'UNKNOWN-GW'
  const deviceNo = normalizeText(row.ZIGBEENO) || order
  const id = `${gatewayNo}-${type}-${deviceNo}-${order}`
  const sourceName = normalizeText(row['名称'])

  return {
    id,
    uniqueNo: id,
    name: sourceName || id,
    shortName: `${type}-${order}`,
    type,
    deviceType: type,
    icon: matchDeviceIcon(type),
    cadX: round(toNumber(row.X)),
    cadY: round(toNumber(row.Y)),
    sourceRow: excelRow,
    sourceFields: normalizeSourceFields(row)
  }
}

function buildRegionGateways(regions) {
  return regions.map((region, index) => {
    const center = getPolygonCentroid(region.points)
    const order = String(index + 1).padStart(2, '0')
    const id = `${region.id}-GW-${order}`

    return {
      id,
      uniqueNo: id,
      name: `${region.name} 网关`,
      shortName: `GW-${order}`,
      type: 'GW',
      deviceType: 'GW',
      icon: matchDeviceIcon('GW'),
      cadX: round(center.x),
      cadY: round(center.y),
      sourceRegionId: region.id,
      sourceRows: region.sourceRows,
      placementSource: 'region-centroid',
      sourceFields: {
        名称: `${region.name} 网关`,
        DEVICETYPE: 'GW',
        X: String(round(center.x)),
        Y: String(round(center.y)),
        来源: '区域中心派生'
      }
    }
  })
}

function parseRegionPointName(value) {
  const name = normalizeText(value)
  const match = name.match(/^(.*?)(坐标原点|XY轴最大值|X轴最大值|Y轴最大值)$/)
  return {
    regionCode: match ? match[1] : name,
    pointType: match ? match[2] : '顶点'
  }
}

function findRectangles(points) {
  const xs = uniqueSorted(points.map((point) => point.x))
  const ys = uniqueSorted(points.map((point) => point.y))
  const byCoordinate = new Map(points.map((point) => [coordinateKey(point.x, point.y), point]))
  const rectangles = []

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let xj = xi + 1; xj < xs.length; xj += 1) {
      for (let yi = 0; yi < ys.length - 1; yi += 1) {
        for (let yj = yi + 1; yj < ys.length; yj += 1) {
          const corners = [
            byCoordinate.get(coordinateKey(xs[xi], ys[yi])),
            byCoordinate.get(coordinateKey(xs[xj], ys[yi])),
            byCoordinate.get(coordinateKey(xs[xj], ys[yj])),
            byCoordinate.get(coordinateKey(xs[xi], ys[yj]))
          ]

          if (corners.every(Boolean)) rectangles.push(corners)
        }
      }
    }
  }

  return rectangles.sort((left, right) => {
    const leftBounds = getCadBounds(left)
    const rightBounds = getCadBounds(right)
    return leftBounds.minY - rightBounds.minY || leftBounds.minX - rightBounds.minX
  })
}

function parseSvgViewBox(svgText) {
  const viewBoxMatch = svgText.match(/<svg\b[^>]*\bviewBox="([^"]+)"/)
  if (viewBoxMatch) {
    const [x, y, width, height] = viewBoxMatch[1].split(/\s+/).map(Number)
    if ([x, y, width, height].every(Number.isFinite)) return { x, y, width, height }
  }

  const width = toNumber(svgText.match(/<svg\b[^>]*\bwidth="([^"]+)"/)?.[1] || 800)
  const height = toNumber(svgText.match(/<svg\b[^>]*\bheight="([^"]+)"/)?.[1] || 600)
  return { x: 0, y: 0, width, height }
}

function getSvgPathBounds(svgText) {
  const points = []
  const pathMatches = svgText.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)
  for (const match of pathMatches) {
    const values = [...match[1].matchAll(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)].map((item) => Number(item[0]))
    for (let index = 0; index < values.length - 1; index += 2) {
      const x = values[index]
      const y = values[index + 1]
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y })
    }
  }

  return getCadBounds(points)
}

function viewBoxToBounds(viewBox) {
  return {
    minX: viewBox.x,
    minY: viewBox.y,
    maxX: viewBox.x + viewBox.width,
    maxY: viewBox.y + viewBox.height,
    width: viewBox.width,
    height: viewBox.height
  }
}

function buildDemoAffineTransform(cadBounds) {
  return {
    type: 'affine',
    a: 0.0038009006724095858,
    b: 0,
    c: 37.863459765315284,
    d: 0,
    e: -0.0036353484950132904,
    f: 556.2677634497115,
    cadBounds,
    formulas: {
      cadToSvg: 'svg.x = cad.x * a + cad.y * b + c; svg.y = cad.x * d + cad.y * e + f',
      svgToCad: 'cad.x = (svg.x - c) / a; cad.y = (svg.y - f) / e'
    }
  }
}

function matchDeviceIcon(type) {
  const matched = iconFiles.find((file) => path.parse(file).name.toUpperCase() === type)
  return matched ? `src/assets/images/devices/${matched}` : null
}

function normalizeDeviceType(value) {
  return normalizeText(value).toUpperCase()
}

function normalizeSourceFields(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value == null ? null : String(value)]))
}

function sortClockwise(points) {
  const center = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x / points.length,
      y: accumulator.y + point.y / points.length
    }),
    { x: 0, y: 0 }
  )

  return [...points].sort((left, right) => {
    const leftAngle = Math.atan2(left.y - center.y, left.x - center.x)
    const rightAngle = Math.atan2(right.y - center.y, right.x - center.x)
    return leftAngle - rightAngle
  })
}

function getPolygonCentroid(points) {
  if (!points.length) return { x: 0, y: 0 }

  let twiceArea = 0
  let x = 0
  let y = 0

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const factor = current.x * next.y - next.x * current.y
    twiceArea += factor
    x += (current.x + next.x) * factor
    y += (current.y + next.y) * factor
  }

  if (Math.abs(twiceArea) < 1e-6) {
    return points.reduce(
      (accumulator, point) => ({
        x: accumulator.x + point.x / points.length,
        y: accumulator.y + point.y / points.length
      }),
      { x: 0, y: 0 }
    )
  }

  return {
    x: x / (3 * twiceArea),
    y: y / (3 * twiceArea)
  }
}

function getCadBounds(points) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    minX: round(Math.min(...xs)),
    minY: round(Math.min(...ys)),
    maxX: round(Math.max(...xs)),
    maxY: round(Math.max(...ys)),
    width: round(Math.max(...xs) - Math.min(...xs)),
    height: round(Math.max(...ys) - Math.min(...ys))
  }
}

function groupBy(items, getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item)
    if (!accumulator[key]) accumulator[key] = []
    accumulator[key].push(item)
    return accumulator
  }, {})
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => round(value)))].sort((left, right) => left - right)
}

function coordinateKey(x, y) {
  return `${round(x)}:${round(y)}`
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function isFiniteNumber(value) {
  return Number.isFinite(toNumber(value))
}

function toNumber(value) {
  if (typeof value === 'number') return value
  return Number(String(value ?? '').replace(/,/g, '').trim())
}

function round(value, digits = 4) {
  return Number(Number(value).toFixed(digits))
}

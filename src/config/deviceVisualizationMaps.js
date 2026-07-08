export const DEFAULT_DEVICE_VISUALIZATION_MAP_ID = 'floor1'

export const DEVICE_VISUALIZATION_MAPS = {
  lvdi1f: {
    id: 'lvdi1f',
    name: '绿地科技广场 10楼 一层',
    svgUrl: '/maps/lvdi_1F.svg',
    dataUrl: '/maps/lvdi_1F.data.json',
    dataType: 'backendMapPackage',
    available: true,
    errorMessage: '绿地1F 地图数据加载失败，请检查 lvdi_1F.svg 和 lvdi_1F.data.json。'
  },
  lvdi1fTest: {
    id: 'lvdi1fTest',
    name: '绿地科技广场 10楼 一层测试',
    svgUrl: '/maps/lvdi_1F.svg',
    dataUrl: '/maps/digital-map-test.data.json',
    dataType: 'rawBackendMapPackage',
    available: true,
    errorMessage: '绿地1F 测试地图数据加载失败，请检查 lvdi_1F.svg 和 digital-map-test.data.json。'
  },
  lvdi2f: {
    id: 'lvdi2f',
    name: '绿地科技广场 10楼 二层',
    svgUrl: '/maps/lvdi_2F.svg',
    dataUrl: '/maps/lvdi_2F.data.json',
    dataType: 'backendMapPackage',
    available: false,
    errorMessage: '绿地2F 本地地图文件尚未提供：缺少 lvdi_2F.svg 和 lvdi_2F.data.json。'
  },
  floor1: {
    id: 'floor1',
    name: '开利101车间 一楼车间',
    svgUrl: '/maps/floor1.svg',
    metaUrl: '/maps/floor1.meta.json',
    dataUrl: '/maps/floor1.data.json',
    dataType: 'floorData',
    available: true,
    errorMessage: 'floor1 地图真实数据加载失败，请检查 floor1.svg、floor1.meta.json 和 floor1.data.json。'
  }
}

export const DEVICE_VISUALIZATION_MAP_TREE = [
  {
    id: 'lvdi-office',
    label: '绿地办公室项目',
    icon: '项',
    children: [
      {
        id: 'shanghai-minhang',
        label: '上海闵行',
        icon: '城',
        children: [
          {
            id: 'lvdi-tech-plaza',
            label: '绿地科技广场',
            icon: '楼',
            children: [
              {
                id: 'building-10',
                label: '10楼',
                icon: '层',
                children: [
                  { id: 'lvdi-10f-1', label: '一层', icon: '1F', mapId: 'lvdi1f' },
                  { id: 'lvdi-10f-1-test', label: '一层测试', icon: '测', mapId: 'lvdi1fTest' },
                  { id: 'lvdi-10f-2', label: '二层', icon: '2F', mapId: 'lvdi2f' }
                ]
              }
            ]
          },
          {
            id: 'carrier-101',
            label: '开利101车间',
            icon: '车',
            children: [
              { id: 'carrier-101-1f', label: '一楼车间', icon: '1F', mapId: 'floor1' }
            ]
          }
        ]
      }
    ]
  }
]

export const DEFAULT_DEVICE_VISUALIZATION_MAP_ID = 'lvdi10f1'

export const DEVICE_VISUALIZATION_MAPS = {
  lvdi10f1: {
    id: 'lvdi10f1',
    name: 'Lontri:Shanghai:Lvdi:10F-1',
    hierarchyPath: 'Lontri:Shanghai:Lvdi:10F-1',
    available: true,
    errorMessage: '10F-1 数字地图加载失败，请检查空间层级关系和后端地图服务。'
  },
  lvdi10f2: {
    id: 'lvdi10f2',
    name: 'Lontri:Shanghai:Lvdi:10F-2',
    hierarchyPath: 'Lontri:Shanghai:Lvdi:10F-2',
    available: true,
    errorMessage: '10F-2 数字地图加载失败，请检查空间层级关系和后端地图服务。'
  }
}

export const DEVICE_VISUALIZATION_MAP_TREE = [
  {
    id: 'lontri',
    label: 'Lontri',
    icon: '项',
    children: [
      {
        id: 'shanghai',
        label: 'Shanghai',
        icon: '城',
        children: [
          {
            id: 'lvdi',
            label: 'Lvdi',
            icon: '楼',
            children: [
              {
                id: '10f-1',
                label: '10F-1',
                icon: '层',
                mapId: 'lvdi10f1'
              },
              {
                id: '10f-2',
                label: '10F-2',
                icon: '层',
                mapId: 'lvdi10f2'
              }
            ]
          }
        ]
      }
    ]
  }
]

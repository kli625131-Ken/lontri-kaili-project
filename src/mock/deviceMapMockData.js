export const DEVICE_MAP_PROJECT_ID = 'moutai-lighting'

export const CU_PARAM_TEMPLATES = [
  {
    id: 'office-default',
    name: '办公默认模板',
    mode: 'auto',
    brightness: 100,
    bgBrightness: 40,
    bgTime: 900,
    offTime: 1200,
    manualTime: 1250
  },
  {
    id: 'meeting-saving',
    name: '会议节能模板',
    mode: 'manual',
    brightness: 80,
    bgBrightness: 30,
    bgTime: 600,
    offTime: 1500,
    manualTime: 1800
  }
]

export const MOCK_TEST_RESULTS = [
  { id: 'gateway-single', level: 'info', message: '区域组设备需属于同一网关。' },
  { id: 'device-members', level: 'info', message: '区域组成员不能为空。' }
]

export function createMockConfigState(floorId = '') {
  return {
    floorId,
    areaGroups: [],
    scenes: [],
    cuParamTemplates: structuredClone(CU_PARAM_TEMPLATES),
    cuParamConfigs: [],
    operationLogs: [],
    testResults: structuredClone(MOCK_TEST_RESULTS)
  }
}

// 项目能力开关：保留后续空调、电表接入入口，当前开利项目只启用照明。
export const PROJECT_DEVICE_CAPABILITIES = Object.freeze([
  { label: '照明', value: 'lighting', sourceTypes: ['CU'], enabled: true },
  { label: '空调', value: 'air-conditioning', sourceTypes: ['SZO', 'SCU'], enabled: false },
  { label: '电表', value: 'electric-meter', sourceTypes: ['OSR', 'OCSR'], enabled: false }
])

export const ENABLED_PROJECT_DEVICE_TYPES = PROJECT_DEVICE_CAPABILITIES.filter((item) => item.enabled)

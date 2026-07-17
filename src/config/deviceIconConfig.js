export const DEVICE_ICON_DISPLAY_CONFIG = {
  gateway: {
    iconSizeSvg: 24,
    selectionPaddingSvg: 3,
    hitPaddingSvg: 4,
    cornerRadiusSvg: 3
  },
  device: {
    iconSizeSvg: 16,
    selectionPaddingSvg: 0.8,
    hitPaddingSvg: 2,
    cornerRadiusSvg: 2
  }
}

export function getDeviceIconDisplayConfig(category) {
  return DEVICE_ICON_DISPLAY_CONFIG[category] || DEVICE_ICON_DISPLAY_CONFIG.device
}

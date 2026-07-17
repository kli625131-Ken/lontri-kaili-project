const ENV = import.meta.env ?? {}

export const IOT_REST_API_BASE = (
  ENV.VITE_IOT_API_BASE ||
  'http://192.168.0.84/SmartIoTWCFService/IoTRESTService.svc'
).replace(/\/$/, '')

export const IOT_SERVICE_ORIGIN = new URL(IOT_REST_API_BASE).origin
export const IOT_SERVICE_ROOT = IOT_REST_API_BASE.replace(/\/IoTRESTService\.svc$/i, '')

import {
  alarmActionsResponse,
  alarmDetailResponse,
  alarmsResponse,
  alreadyProcessedResponse,
  operationLogsResponse,
} from "../mock/systemLogsMock.js";

const MOCK_DELAY = 240;
const REQUEST_TIMEOUT = 12000;
const API_BASE = (import.meta.env.VITE_IOT_API_BASE || "/iot-api").replace(/\/$/, "");
export const isSystemLogsMockMode =
  import.meta.env.VITE_SYSTEM_LOGS_USE_MOCK === "true";

const clone = (value) => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const resolveMock = (value) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(value)), MOCK_DELAY);
  });

async function post(path, payload, { preserveBusinessFailure = false } = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("接口返回内容不是有效 JSON");
    }

    if (!result || typeof result !== "object") {
      throw new Error("接口返回数据为空");
    }
    if (!preserveBusinessFailure && result.success !== true) {
      throw new Error(result.message || "业务请求失败");
    }
    return result;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("请求超时");
    throw error instanceof Error ? error : new Error("网络请求失败");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function queryOperationLogs({ page = 1, pageSize = 30 } = {}) {
  if (!isSystemLogsMockMode) {
    const result = await post("/operationlog/query", { page, pageSize });
    if (!Array.isArray(result.data)) throw new Error("系统日志返回字段缺失");
    return result;
  }
  return resolveMock({
    ...operationLogsResponse,
    data: page === 1 ? operationLogsResponse.data : [],
    page,
    pageSize,
  });
}

export async function queryAlarms(payload = {}) {
  if (!isSystemLogsMockMode) {
    const result = await post("/alarm/query", payload);
    if (!Array.isArray(result.data)) throw new Error("告警列表返回字段缺失");
    return result;
  }
  const page = Number(payload.page || alarmsResponse.page);
  const pageSize = Number(payload.pageSize || alarmsResponse.pageSize);
  return resolveMock({
    ...alarmsResponse,
    data: page === 1 ? alarmsResponse.data : [],
    page,
    pageSize,
  });
}

export async function getAlarmDetail(eventId) {
  if (!isSystemLogsMockMode) {
    const result = await post("/alarm/detail", { eventId });
    if (!result.alarm || typeof result.alarm !== "object") {
      throw new Error("告警详情返回字段缺失");
    }
    return result;
  }
  if (eventId === alarmDetailResponse.alarm.id) {
    return resolveMock(alarmDetailResponse);
  }

  const alarm = alarmsResponse.data.find((item) => item.id === eventId);
  return resolveMock(
    alarm
      ? { actions: [], alarm, message: null, success: true }
      : { actions: [], alarm: null, message: "Alarm not found", success: false },
  );
}

export async function getAlarmActions(eventId) {
  if (!isSystemLogsMockMode) {
    const result = await post("/alarm/actions", { eventId });
    if (!Array.isArray(result.data)) throw new Error("ACTION 返回字段缺失");
    return result;
  }
  return resolveMock(
    eventId === alarmDetailResponse.alarm.id
      ? alarmActionsResponse
      : { data: [], message: null, success: true },
  );
}

export async function handleAlarm(payload) {
  if (!isSystemLogsMockMode) {
    return post("/alarm/handle", payload, { preserveBusinessFailure: true });
  }
  const alarm = alarmsResponse.data.find((item) => item.id === payload?.eventId);
  return resolveMock(
    alarm
      ? alreadyProcessedResponse
      : { data: null, id: null, message: "Alarm not found", success: false },
  );
}

export async function closeAlarm(eventId) {
  if (!isSystemLogsMockMode) {
    return post("/alarm/close", { eventId }, { preserveBusinessFailure: true });
  }
  const alarm = alarmsResponse.data.find((item) => item.id === eventId);
  return resolveMock(
    alarm
      ? alreadyProcessedResponse
      : { data: null, id: null, message: "Alarm not found", success: false },
  );
}

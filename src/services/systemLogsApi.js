import {
  alarmActionsResponse,
  alarmDetailResponse,
  alarmsResponse,
  alreadyProcessedResponse,
  operationLogsResponse,
} from "../mock/systemLogsMock.js";

const MOCK_DELAY = 240;

const clone = (value) => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const resolveMock = (value) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(value)), MOCK_DELAY);
  });

export function queryOperationLogs({ page = 1, pageSize = 30 } = {}) {
  return resolveMock({
    ...operationLogsResponse,
    data: page === 1 ? operationLogsResponse.data : [],
    page,
    pageSize,
  });
}

export function queryAlarms(payload = {}) {
  const page = Number(payload.page || alarmsResponse.page);
  const pageSize = Number(payload.pageSize || alarmsResponse.pageSize);
  return resolveMock({
    ...alarmsResponse,
    data: page === 1 ? alarmsResponse.data : [],
    page,
    pageSize,
  });
}

export function getAlarmDetail(eventId) {
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

export function getAlarmActions(eventId) {
  return resolveMock(
    eventId === alarmDetailResponse.alarm.id
      ? alarmActionsResponse
      : { data: [], message: null, success: true },
  );
}

export function handleAlarm(payload) {
  const alarm = alarmsResponse.data.find((item) => item.id === payload?.eventId);
  return resolveMock(
    alarm
      ? alreadyProcessedResponse
      : { data: null, id: null, message: "Alarm not found", success: false },
  );
}

export function closeAlarm(eventId) {
  const alarm = alarmsResponse.data.find((item) => item.id === eventId);
  return resolveMock(
    alarm
      ? alreadyProcessedResponse
      : { data: null, id: null, message: "Alarm not found", success: false },
  );
}

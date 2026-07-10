const WCF_DATE_PATTERN = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/;

const chinaDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  hourCycle: "h23",
});

export function parseWcfDate(value) {
  if (!value) return "-";
  const match = String(value).match(WCF_DATE_PATTERN);
  if (!match) return "-";

  const date = new Date(Number(match[1]));
  if (Number.isNaN(date.getTime())) return "-";

  const parts = Object.fromEntries(
    chinaDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function normalizeLogLevel(level) {
  const normalized = String(level || "").toUpperCase();
  if (normalized === "INFO") return "info";
  if (normalized === "WARN") return "warning";
  if (normalized === "ERROR") return "error";
  if (!normalized) return "unmarked";
  return "other";
}

export function classifyLog(raw) {
  if (raw.bizType === "LOGIN") return "login";
  if (
    raw.logCategory === "MANUAL_ACTION" ||
    raw.source === "MANUAL_ACTION"
  ) {
    return "operation";
  }
  if (
    raw.gatewayId ||
    raw.hardwareSource ||
    raw.zigbeeId ||
    raw.source === "事件" ||
    raw.source === "COMMAND_SEND"
  ) {
    return "device";
  }
  if (raw.logCategory === "SYSTEM" || raw.source === "SYSTEM") {
    return "system";
  }
  return "other";
}

export function adaptOperationLog(raw) {
  const rawLevel = raw.logLevel ? String(raw.logLevel).toUpperCase() : "";
  const levelTextMap = { INFO: "信息", WARN: "警告", ERROR: "异常" };
  return {
    id: raw.id,
    level: normalizeLogLevel(raw.logLevel),
    levelText: rawLevel ? levelTextMap[rawLevel] || rawLevel : "未标注",
    time: parseWcfDate(raw.createTime),
    source: raw.gatewayId || raw.hardwareSource || raw.source || "-",
    type: classifyLog(raw),
    typeText: raw.bizType || raw.logCategory || raw.idMongo || "其他",
    content: raw.message || "-",
    raw,
  };
}

export function getAlarmStatusMeta(status) {
  if (String(status) === "2") {
    return { key: "processed", text: "已处理 / 已恢复", actionable: false };
  }
  if (String(status) === "4") {
    return { key: "closed", text: "已关闭", actionable: false };
  }
  return {
    key: "unknown",
    text: `状态 ${status ?? "-"}`,
    actionable: true,
  };
}

export function adaptAlarm(raw) {
  const statusMeta = getAlarmStatusMeta(raw.status);
  return {
    id: raw.id,
    levelText: String(raw.level) === "2" ? "L2" : `L${raw.level || "-"}`,
    title: raw.msg || "-",
    status: statusMeta.key,
    statusText: statusMeta.text,
    actionable: statusMeta.actionable,
    source: raw.gatewayId || raw.source || "-",
    occurCount: raw.occurCount ?? "-",
    createTime: parseWcfDate(raw.createTime),
    lastOccurTime: parseWcfDate(raw.lastOccurTime),
    resolvedBy: raw.resolvedBy || "-",
    resolveType: raw.resolveType || "-",
    resolveResult: raw.resolveResult || "-",
    resolvedTime: parseWcfDate(raw.resolvedTime),
    closeTime: parseWcfDate(raw.closeTime),
    raw,
  };
}

export function adaptAlarmAction(raw) {
  return {
    id: raw.id,
    time: parseWcfDate(raw.actionTime),
    type: raw.actionType || "-",
    by: raw.actionBy || "-",
    message: raw.actionMessage || "-",
    result: raw.resolveResult || "-",
    raw,
  };
}

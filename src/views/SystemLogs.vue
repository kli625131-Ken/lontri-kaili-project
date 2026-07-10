<template>
  <div class="system-logs-page">
    <div class="page-content">
      <DataCard title="日志筛选" class="filter-card">
        <div class="filter-section">
          <div class="filter-title">日志类型（当前页筛选）</div>
          <div class="log-types">
            <label v-for="type in logTypes" :key="type.value" class="type-item">
              <input
                v-model="selectedType"
                type="radio"
                :value="type.value"
                name="logType"
              />
              <span class="radio-mark"></span>
              <span class="type-label">{{ type.label }}</span>
            </label>
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-title">日志级别（当前页筛选）</div>
          <div class="level-tags">
            <button
              v-for="level in logLevels"
              :key="level.value"
              type="button"
              :class="[
                'level-tag',
                level.value,
                { active: selectedLevels.includes(level.value) },
              ]"
              @click="toggleLevel(level.value)"
            >
              {{ level.label }}
            </button>
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-title">时间范围</div>
          <div class="time-range">
            <label class="time-item">
              <span>开始时间</span>
              <input class="time-input" type="datetime-local" disabled />
            </label>
            <label class="time-item">
              <span>结束时间</span>
              <input class="time-input" type="datetime-local" disabled />
            </label>
          </div>
          <div class="quick-btns">
            <button
              v-for="button in quickButtons"
              :key="button"
              type="button"
              class="quick-btn"
              disabled
            >
              {{ button }}
            </button>
          </div>
          <p class="filter-note">接口暂不支持服务端时间筛选</p>
        </div>

        <button
          type="button"
          class="search-btn"
          :disabled="logsLoading || refreshing"
          @click="refreshLogs"
        >
          {{ refreshing ? "刷新中..." : "查询 / 刷新日志" }}
        </button>
        <p class="filter-footer">提示：类型、级别仅筛选当前页数据。</p>
      </DataCard>

      <DataCard title="系统日志" class="logs-card">
        <template #header-extra>
          <span class="connection-badge">Mock 数据已连接</span>
        </template>

        <div class="logs-header">
          <div class="stats-row">
            <div class="stat-item total-stat">
              <span class="stat-value">{{ formatNumber(totalRecords) }}</span>
              <span class="stat-meta">
                <span class="stat-label">总记录</span>
                <span class="stat-scope">全部数据</span>
              </span>
            </div>
            <div class="stat-item page-stat">
              <span class="stat-value">{{ pageRecordCount }}</span>
              <span class="stat-meta">
                <span class="stat-label">本页记录</span>
                <span class="stat-scope">当前页</span>
              </span>
            </div>
            <div class="stat-item alarm-stat">
              <span class="stat-value">{{ alarmTotal }}</span>
              <span class="stat-meta">
                <span class="stat-label">告警总数</span>
                <span class="stat-scope">当前 Mock</span>
              </span>
            </div>
          </div>
          <div class="export-btns">
            <button
              type="button"
              class="export-btn"
              :disabled="!filteredLogs.length || logsLoading"
              @click="exportLogs('csv')"
            >
              导出当前页 CSV
            </button>
            <button
              type="button"
              class="export-btn"
              :disabled="!filteredLogs.length || logsLoading"
              @click="exportLogs('excel')"
            >
              导出当前页 Excel
            </button>
          </div>
        </div>

        <div v-if="logsError" class="state-panel error-state">
          <span>{{ logsError }}</span>
          <button type="button" class="inline-btn" @click="refreshLogs">重新加载</button>
        </div>
        <div v-else class="logs-table" aria-live="polite">
          <div class="table-header table-grid">
            <div v-for="column in tableColumns" :key="column.key" class="th">
              {{ column.label }}
            </div>
          </div>
          <div class="table-body">
            <div v-if="logsLoading" class="state-panel">日志加载中...</div>
            <div v-else-if="!filteredLogs.length" class="state-panel">
              {{ pageLogs.length ? "当前筛选条件下暂无日志" : "当前页暂无日志" }}
            </div>
            <button
              v-for="log in filteredLogs"
              v-else
              :key="log.id"
              type="button"
              class="table-row table-grid"
              @click="showLogDetail(log)"
            >
              <span class="td level-cell">
                <span :class="['level-dot', log.level]"></span>
                <span>{{ log.levelText }}</span>
              </span>
              <span class="td mono-cell">{{ log.time }}</span>
              <span class="td ellipsis-cell" :title="log.source">{{ log.source }}</span>
              <span class="td ellipsis-cell" :title="log.typeText">
                <span class="type-badge">{{ log.typeText }}</span>
              </span>
              <span class="td content-cell" :title="log.content">{{ log.content }}</span>
            </button>
          </div>
        </div>

        <div class="pagination">
          <span class="page-info">{{ pageRangeText }}</span>
          <div class="page-buttons">
            <button
              type="button"
              class="page-btn"
              :disabled="currentPage <= 1 || logsLoading"
              @click="changePage(currentPage - 1)"
            >
              上一页
            </button>
            <span class="page-num">{{ currentPage }} / {{ totalPages }}</span>
            <button
              type="button"
              class="page-btn"
              :disabled="currentPage >= totalPages || logsLoading"
              @click="changePage(currentPage + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </DataCard>

      <div class="right-section">
        <DataCard title="告警概览" class="overview-card">
          <div v-if="alarmsLoading" class="compact-state">告警加载中...</div>
          <div v-else-if="alarmsError" class="compact-state error-text">加载失败</div>
          <div v-else class="alarm-overview">
            <div class="alarm-overview-ring" :style="alarmOverviewRingStyle">
              <div class="alarm-overview-ring-core">
                <strong>{{ alarmOverview.total }}</strong>
                <span>告警总数</span>
              </div>
            </div>
            <div class="alarm-overview-list">
              <div class="alarm-overview-item processed">
                <span class="overview-status-mark"></span>
                <span class="overview-copy">
                  <span class="overview-label">已处理 / 已恢复</span>
                  <span class="overview-percent">{{ alarmOverview.processedPercent }}%</span>
                </span>
                <strong>{{ alarmOverview.processed }}</strong>
              </div>
              <div class="alarm-overview-item closed">
                <span class="overview-status-mark"></span>
                <span class="overview-copy">
                  <span class="overview-label">已关闭</span>
                  <span class="overview-percent">{{ alarmOverview.closedPercent }}%</span>
                </span>
                <strong>{{ alarmOverview.closed }}</strong>
              </div>
            </div>
          </div>
        </DataCard>

        <DataCard title="日志统计" class="composition-card">
          <div v-if="logsLoading" class="compact-state">统计加载中...</div>
          <div v-else class="log-stat-content">
            <div class="log-stat-main">
              <div class="log-donut" :style="logCompositionRingStyle">
                <div class="log-donut-core">
                  <strong>{{ compositionTotal }}</strong>
                  <span>当前页</span>
                </div>
              </div>
              <div class="log-stat-legend">
                <div v-for="item in logComposition" :key="item.key" class="legend-row">
                  <span :class="['composition-dot', item.key]"></span>
                  <span class="legend-name">{{ item.label }}</span>
                  <strong>{{ item.count }} 条</strong>
                </div>
              </div>
            </div>
            <div class="log-stat-summary">
              <span v-for="item in logComposition" :key="item.key">
                <span :class="['composition-dot', item.key]"></span>
                {{ item.label }} {{ item.percent }}%
              </span>
            </div>
          </div>
        </DataCard>

        <DataCard title="最近告警" class="alarm-card">
          <div v-if="alarmsLoading" class="compact-state">告警加载中...</div>
          <div v-else-if="alarmsError" class="compact-state error-text">
            {{ alarmsError }}
          </div>
          <div v-else-if="!alarms.length" class="compact-state">暂无告警</div>
          <div
            v-else
            ref="alarmListRef"
            class="alarm-list"
            @mouseenter="pauseAlarmScroll"
            @mouseleave="resumeAlarmScroll"
            @focusin="pauseAlarmScroll"
            @focusout="resumeAlarmScroll"
            @wheel="handleAlarmWheel"
          >
            <button
              v-for="alarm in alarms"
              :key="alarm.id"
              type="button"
              class="alarm-item"
              @click="openAlarmDetail(alarm)"
            >
              <span class="alarm-level">{{ alarm.levelText }}</span>
              <span class="alarm-content">
                <span class="alarm-heading">
                  <span class="alarm-title" :title="alarm.title">{{ alarm.title }}</span>
                  <span :class="['alarm-status', alarm.status]">{{ alarm.statusText }}</span>
                </span>
                <span class="alarm-time">最近发生：{{ alarm.lastOccurTime }}</span>
              </span>
            </button>
          </div>
        </DataCard>
      </div>
    </div>

    <div v-if="selectedLog" class="modal-overlay" @click.self="selectedLog = null">
      <div class="modal log-modal" role="dialog" aria-modal="true" aria-label="日志详情">
        <div class="modal-header">
          <h3>日志详情</h3>
          <button type="button" class="icon-close" title="关闭" @click="selectedLog = null">
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>发生时间</label>
              <span>{{ selectedLog.time }}</span>
            </div>
            <div class="detail-item">
              <label>日志级别</label>
              <span :class="['detail-level', selectedLog.level]">{{ selectedLog.levelText }}</span>
            </div>
            <div class="detail-item">
              <label>来源/对象</label>
              <span class="break-value">{{ selectedLog.source }}</span>
            </div>
            <div class="detail-item">
              <label>业务类型</label>
              <span>{{ selectedLog.typeText }}</span>
            </div>
            <div class="detail-item full-width">
              <label>日志内容</label>
              <div class="detail-content">{{ selectedLog.content }}</div>
            </div>
            <div
              v-for="field in logRawFields"
              :key="field.key"
              class="detail-item"
            >
              <label>{{ field.label }}</label>
              <span class="break-value">{{ displayValue(selectedLog.raw[field.key]) }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-close" @click="selectedLog = null">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="selectedAlarm" class="modal-overlay" @click.self="closeAlarmModal">
      <div class="modal alarm-modal" role="dialog" aria-modal="true" aria-label="告警详情">
        <div class="modal-header">
          <h3>告警详情</h3>
          <button type="button" class="icon-close" title="关闭" @click="closeAlarmModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="alarmModalLoading" class="state-panel modal-state">告警详情加载中...</div>
          <div v-else-if="alarmModalError" class="state-panel error-state modal-state">
            {{ alarmModalError }}
          </div>
          <template v-else-if="alarmDetail">
            <div class="alarm-summary-head">
              <span class="alarm-level large">{{ alarmDetail.levelText }}</span>
              <div>
                <h4>{{ alarmDetail.title }}</h4>
                <span :class="['alarm-status', alarmDetail.status]">{{ alarmDetail.statusText }}</span>
              </div>
            </div>
            <div class="detail-grid alarm-detail-grid">
              <div class="detail-item">
                <label>gatewayId / source</label>
                <span class="break-value">{{ alarmDetail.source }}</span>
              </div>
              <div class="detail-item">
                <label>发生次数</label>
                <span>{{ alarmDetail.occurCount }}</span>
              </div>
              <div class="detail-item">
                <label>首次发生时间</label>
                <span>{{ alarmDetail.createTime }}</span>
              </div>
              <div class="detail-item">
                <label>最近发生时间</label>
                <span>{{ alarmDetail.lastOccurTime }}</span>
              </div>
              <div class="detail-item">
                <label>处理人</label>
                <span class="break-value">{{ alarmDetail.resolvedBy }}</span>
              </div>
              <div class="detail-item">
                <label>处理类型</label>
                <span>{{ alarmDetail.resolveType }}</span>
              </div>
              <div class="detail-item full-width">
                <label>处理结果</label>
                <span>{{ alarmDetail.resolveResult }}</span>
              </div>
              <div class="detail-item">
                <label>关闭时间</label>
                <span>{{ alarmDetail.closeTime }}</span>
              </div>
            </div>

            <section class="timeline-section">
              <h4>ACTION 时间线</h4>
              <div v-if="!alarmActions.length" class="timeline-empty">暂无 ACTION 记录</div>
              <div v-else class="timeline">
                <div v-for="action in alarmActions" :key="action.id" class="timeline-item">
                  <span class="timeline-dot"></span>
                  <div class="timeline-body">
                    <div class="timeline-meta">
                      <time>{{ action.time }}</time>
                      <strong>{{ action.type }}</strong>
                      <span>· {{ action.by }}</span>
                      <span class="timeline-result">{{ action.result }}</span>
                    </div>
                    <p>{{ action.message }}</p>
                  </div>
                </div>
              </div>
            </section>

            <p v-if="!alarmDetail.actionable" class="disabled-reason">
              该告警已处理、已恢复或已关闭，禁止重复操作。
            </p>
            <p v-if="operationMessage" :class="['operation-message', operationMessageType]">
              {{ operationMessage }}
            </p>
          </template>
        </div>
        <div class="modal-footer alarm-actions">
          <button
            type="button"
            class="btn-resolve"
            :disabled="!alarmDetail?.actionable || alarmModalLoading || operationSubmitting"
            @click="submitHandleAlarm"
          >
            {{ operationSubmitting ? "提交中..." : "处理告警" }}
          </button>
          <button
            type="button"
            class="btn-danger"
            :disabled="!alarmDetail?.actionable || alarmModalLoading || operationSubmitting"
            @click="submitCloseAlarm"
          >
            关闭告警
          </button>
          <button type="button" class="btn-close" @click="closeAlarmModal">关闭弹窗</button>
        </div>
      </div>
    </div>

    <div v-if="feedbackMessage" :class="['feedback-toast', feedbackType]" role="status">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import * as XLSX from "xlsx";
import DataCard from "../components/DataCard.vue";
import {
  closeAlarm,
  getAlarmActions,
  getAlarmDetail,
  handleAlarm,
  queryAlarms,
  queryOperationLogs,
} from "../services/systemLogsApi.js";
import {
  adaptAlarm,
  adaptAlarmAction,
  adaptOperationLog,
} from "../utils/systemLogsAdapters.js";

const logTypes = [
  { label: "全部日志", value: "all" },
  { label: "登录日志", value: "login" },
  { label: "操作日志", value: "operation" },
  { label: "设备日志", value: "device" },
  { label: "系统日志", value: "system" },
  { label: "其他", value: "other" },
];
const logLevels = [
  { label: "信息", value: "info" },
  { label: "警告", value: "warning" },
  { label: "异常", value: "error" },
  { label: "未标注", value: "unmarked" },
];
const quickButtons = ["今天", "昨天", "近 7 天", "近 30 天"];
const tableColumns = [
  { key: "level", label: "级别" },
  { key: "time", label: "时间" },
  { key: "source", label: "来源/对象" },
  { key: "type", label: "业务类型" },
  { key: "content", label: "内容" },
];
const logRawFields = [
  { key: "gatewayId", label: "gatewayId" },
  { key: "hardwareSource", label: "hardwareSource" },
  { key: "relatedEventId", label: "relatedEventId" },
  { key: "traceId", label: "traceId" },
  { key: "zigbeeId", label: "zigbeeId" },
  { key: "idMongo", label: "idMongo" },
];
const compositionDefinitions = [
  { key: "system", label: "系统" },
  { key: "manual", label: "人工操作" },
  { key: "event", label: "设备事件" },
  { key: "command", label: "命令发送" },
];
const compositionColors = {
  system: "var(--accent-cyan)",
  manual: "var(--accent-green)",
  event: "var(--warning)",
  command: "var(--accent-blue)",
};

const selectedType = ref("all");
const selectedLevels = ref(logLevels.map((item) => item.value));
const pageLogs = ref([]);
const alarms = ref([]);
const currentPage = ref(1);
const pageSize = ref(30);
const totalRecords = ref(0);
const alarmTotal = ref(0);
const logsLoading = ref(false);
const alarmsLoading = ref(false);
const refreshing = ref(false);
const logsError = ref("");
const alarmsError = ref("");
const selectedLog = ref(null);
const selectedAlarm = ref(null);
const alarmDetail = ref(null);
const alarmActions = ref([]);
const alarmModalLoading = ref(false);
const alarmModalError = ref("");
const operationSubmitting = ref(false);
const operationMessage = ref("");
const operationMessageType = ref("error");
const feedbackMessage = ref("");
const feedbackType = ref("success");
const alarmListRef = ref(null);
const alarmScrollPaused = ref(false);
let feedbackTimer = null;
let alarmScrollTimer = null;
let alarmScrollResumeTimer = null;

const pageRecordCount = computed(() => pageLogs.value.length);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalRecords.value / pageSize.value)),
);
const filteredLogs = computed(() =>
  pageLogs.value.filter((log) => {
    const typeMatches = selectedType.value === "all" || log.type === selectedType.value;
    const levelMatches = selectedLevels.value.includes(log.level);
    return typeMatches && levelMatches;
  }),
);
const pageRangeText = computed(() => {
  if (!pageLogs.value.length) {
    return `本页暂无记录，共 ${formatNumber(totalRecords.value)} 条`;
  }
  const start = (currentPage.value - 1) * pageSize.value + 1;
  const end = start + pageLogs.value.length - 1;
  return `显示 ${formatNumber(start)}–${formatNumber(end)} 条，共 ${formatNumber(totalRecords.value)} 条`;
});

const getCompositionKey = (log) => {
  const raw = log.raw;
  if (raw.logCategory === "SYSTEM" || raw.source === "SYSTEM") return "system";
  if (raw.logCategory === "MANUAL_ACTION" || raw.source === "MANUAL_ACTION") {
    return "manual";
  }
  if (raw.source === "事件") return "event";
  if (raw.logCategory === "COMMAND_SEND" || raw.source === "COMMAND_SEND") {
    return "command";
  }
  return null;
};

const compositionCounts = computed(() => {
  const counts = Object.fromEntries(compositionDefinitions.map((item) => [item.key, 0]));
  filteredLogs.value.forEach((log) => {
    const key = getCompositionKey(log);
    if (key) counts[key] += 1;
  });
  return counts;
});
const compositionTotal = computed(() =>
  Object.values(compositionCounts.value).reduce((total, count) => total + count, 0),
);
const logComposition = computed(() =>
  compositionDefinitions.map((item) => ({
    ...item,
    count: compositionCounts.value[item.key],
    percent: compositionTotal.value
      ? Math.round((compositionCounts.value[item.key] / compositionTotal.value) * 100)
      : 0,
  })),
);
const logCompositionRingStyle = computed(() => {
  if (!compositionTotal.value) {
    return { background: "conic-gradient(rgba(113, 140, 166, 0.18) 0 100%)" };
  }
  let cursor = 0;
  const segments = logComposition.value.map((item, index) => {
    const start = cursor;
    const end =
      index === logComposition.value.length - 1
        ? 100
        : cursor + (item.count / compositionTotal.value) * 100;
    cursor = end;
    return `${compositionColors[item.key]} ${start}% ${end}%`;
  });
  return { background: `conic-gradient(${segments.join(", ")})` };
});

const alarmOverview = computed(() => {
  const total = alarms.value.length;
  const processed = alarms.value.filter((alarm) => alarm.status === "processed").length;
  const closed = alarms.value.filter((alarm) => alarm.status === "closed").length;
  return {
    total,
    processed,
    closed,
    processedPercent: total ? Math.round((processed / total) * 100) : 0,
    closedPercent: total ? Math.round((closed / total) * 100) : 0,
  };
});
const alarmOverviewRingStyle = computed(() => {
  const total = alarmOverview.value.total;
  if (!total) {
    return { background: "conic-gradient(rgba(113, 140, 166, 0.18) 0 100%)" };
  }
  const processedEnd = (alarmOverview.value.processed / total) * 100;
  const closedEnd = ((alarmOverview.value.processed + alarmOverview.value.closed) / total) * 100;
  return {
    background: `conic-gradient(var(--success) 0 ${processedEnd}%, var(--offline) ${processedEnd}% ${closedEnd}%, rgba(113, 140, 166, 0.18) ${closedEnd}% 100%)`,
  };
});

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function toggleLevel(level) {
  selectedLevels.value = selectedLevels.value.includes(level)
    ? selectedLevels.value.filter((item) => item !== level)
    : [...selectedLevels.value, level];
}

function showFeedback(message, type = "success") {
  feedbackMessage.value = message;
  feedbackType.value = type;
  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedbackMessage.value = "";
  }, 2600);
}

async function loadLogs(page = currentPage.value) {
  logsLoading.value = true;
  logsError.value = "";
  try {
    const response = await queryOperationLogs({ page, pageSize: pageSize.value });
    if (response.success !== true) throw new Error(response.message || "Mock 日志请求失败");
    currentPage.value = response.page;
    pageSize.value = response.pageSize;
    totalRecords.value = response.total;
    pageLogs.value = response.data.map(adaptOperationLog);
  } catch (error) {
    pageLogs.value = [];
    logsError.value = error instanceof Error ? error.message : "Mock 日志请求失败";
  } finally {
    logsLoading.value = false;
  }
}

async function loadAlarms() {
  alarmsLoading.value = true;
  alarmsError.value = "";
  try {
    const response = await queryAlarms({ page: 1, pageSize: 20 });
    if (response.success !== true) throw new Error(response.message || "Mock 告警请求失败");
    alarms.value = response.data.map(adaptAlarm);
    alarmTotal.value = response.total;
  } catch (error) {
    alarms.value = [];
    alarmTotal.value = 0;
    alarmsError.value = error instanceof Error ? error.message : "Mock 告警请求失败";
  } finally {
    alarmsLoading.value = false;
  }
}

async function refreshLogs() {
  refreshing.value = true;
  await loadLogs(1);
  refreshing.value = false;
  if (!logsError.value) showFeedback("当前页 Mock 日志已刷新");
}

function changePage(page) {
  if (page < 1 || page > totalPages.value || logsLoading.value) return;
  loadLogs(page);
}

function showLogDetail(log) {
  selectedLog.value = log;
}

function getExportRows() {
  return filteredLogs.value.map((log) => ({
    级别: log.levelText,
    时间: log.time,
    "来源/对象": log.source,
    业务类型: log.typeText,
    内容: log.content,
  }));
}

function exportCsv(rows) {
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const content = [headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `系统日志_当前页_${currentPage.value}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportExcel(rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "系统日志");
  XLSX.writeFile(workbook, `系统日志_当前页_${currentPage.value}.xlsx`);
}

function exportLogs(format) {
  const rows = getExportRows();
  if (!rows.length) {
    showFeedback("当前筛选下没有可导出的日志", "error");
    return;
  }
  if (format === "csv") exportCsv(rows);
  else exportExcel(rows);
  showFeedback(`已导出当前页 ${format === "csv" ? "CSV" : "Excel"}`);
}

async function openAlarmDetail(alarm) {
  selectedAlarm.value = alarm;
  alarmDetail.value = null;
  alarmActions.value = [];
  alarmModalError.value = "";
  operationMessage.value = "";
  alarmModalLoading.value = true;
  try {
    const [detailResponse, actionsResponse] = await Promise.all([
      getAlarmDetail(alarm.id),
      getAlarmActions(alarm.id),
    ]);
    if (detailResponse.success !== true || !detailResponse.alarm) {
      throw new Error(detailResponse.message || "Mock 告警详情请求失败");
    }
    if (actionsResponse.success !== true) {
      throw new Error(actionsResponse.message || "Mock ACTION 请求失败");
    }
    alarmDetail.value = adaptAlarm(detailResponse.alarm);
    alarmActions.value = actionsResponse.data.map(adaptAlarmAction);
  } catch (error) {
    alarmModalError.value = error instanceof Error ? error.message : "Mock 告警详情请求失败";
  } finally {
    alarmModalLoading.value = false;
  }
}

function closeAlarmModal() {
  selectedAlarm.value = null;
  alarmDetail.value = null;
  alarmActions.value = [];
  alarmModalError.value = "";
  operationMessage.value = "";
}

function mapOperationMessage(message) {
  return message === "Already processed" ? "该告警已处理，请刷新列表" : message;
}

async function reloadAlarmAfterOperation() {
  const eventId = selectedAlarm.value?.id;
  await loadAlarms();
  const refreshedAlarm = alarms.value.find((alarm) => alarm.id === eventId);
  if (refreshedAlarm) await openAlarmDetail(refreshedAlarm);
}

async function submitHandleAlarm() {
  if (!alarmDetail.value?.actionable || operationSubmitting.value) return;
  operationSubmitting.value = true;
  operationMessage.value = "";
  try {
    const response = await handleAlarm({ eventId: alarmDetail.value.id });
    if (response.success !== true) {
      operationMessageType.value = "error";
      operationMessage.value = mapOperationMessage(response.message || "处理失败");
      return;
    }
    operationMessageType.value = "success";
    operationMessage.value = "处理成功";
    await reloadAlarmAfterOperation();
  } catch (error) {
    operationMessageType.value = "error";
    operationMessage.value = error instanceof Error ? error.message : "处理失败";
  } finally {
    operationSubmitting.value = false;
  }
}

async function submitCloseAlarm() {
  if (!alarmDetail.value?.actionable || operationSubmitting.value) return;
  if (!window.confirm("确认关闭该告警？")) return;
  operationSubmitting.value = true;
  operationMessage.value = "";
  try {
    const response = await closeAlarm(alarmDetail.value.id);
    if (response.success !== true) {
      operationMessageType.value = "error";
      operationMessage.value = mapOperationMessage(response.message || "关闭失败");
      return;
    }
    operationMessageType.value = "success";
    operationMessage.value = "关闭成功";
    await reloadAlarmAfterOperation();
  } catch (error) {
    operationMessageType.value = "error";
    operationMessage.value = error instanceof Error ? error.message : "关闭失败";
  } finally {
    operationSubmitting.value = false;
  }
}

function stopAlarmScroll() {
  window.clearInterval(alarmScrollTimer);
  alarmScrollTimer = null;
}

function startAlarmScroll() {
  stopAlarmScroll();
  alarmScrollTimer = window.setInterval(() => {
    const list = alarmListRef.value;
    if (!list || alarmScrollPaused.value || list.scrollHeight <= list.clientHeight + 1) return;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 1) {
      list.scrollTop = 0;
      return;
    }
    list.scrollTop += 1;
  }, 55);
}

function pauseAlarmScroll() {
  alarmScrollPaused.value = true;
}

function resumeAlarmScroll() {
  window.clearTimeout(alarmScrollResumeTimer);
  alarmScrollPaused.value = false;
}

function handleAlarmWheel() {
  pauseAlarmScroll();
  window.clearTimeout(alarmScrollResumeTimer);
  alarmScrollResumeTimer = window.setTimeout(resumeAlarmScroll, 1800);
}

watch(alarms, async () => {
  await nextTick();
  startAlarmScroll();
});

onMounted(() => {
  loadLogs(1);
  loadAlarms();
});

onUnmounted(() => {
  window.clearTimeout(feedbackTimer);
  window.clearTimeout(alarmScrollResumeTimer);
  stopAlarmScroll();
});
</script>

<style scoped>
.system-logs-page {
  width: 100%;
  height: 100%;
  padding: 16px;
}

.page-content {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 336px;
  gap: 12px;
  height: 100%;
  min-width: 0;
}

.filter-card,
.logs-card,
.right-section {
  min-width: 0;
  min-height: 0;
}

.filter-card :deep(.card-body) {
  overflow-y: auto;
}

.logs-card :deep(.card-body) {
  min-width: 0;
  min-height: 0;
}

.filter-section {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.filter-title {
  margin-bottom: 10px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
}

.log-types {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 24px;
  cursor: pointer;
}

.type-item input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-mark {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  border: 2px solid var(--border-default);
  border-radius: 50%;
}

.type-item input:checked + .radio-mark {
  border-color: var(--accent-cyan);
}

.type-item input:checked + .radio-mark::after {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-cyan);
  content: "";
}

.type-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.level-tags,
.quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.level-tag,
.quick-btn,
.export-btn,
.page-btn,
.inline-btn,
.btn-close,
.btn-resolve,
.btn-danger {
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--control-bg);
  color: var(--text-tertiary);
}

.level-tag {
  padding: 5px 10px;
  font-size: 11px;
}

.level-tag.info.active {
  border-color: var(--info-border);
  background: var(--info-soft);
  color: var(--accent-cyan);
}

.level-tag.warning.active {
  border-color: var(--warning-border);
  background: var(--warning-soft);
  color: var(--warning);
}

.level-tag.error.active {
  border-color: var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.level-tag.unmarked.active {
  border-color: rgba(143, 168, 193, 0.5);
  background: rgba(143, 168, 193, 0.12);
  color: var(--text-secondary);
}

.time-range {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.time-item span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.time-input {
  width: 100%;
  padding: 7px 8px;
  border-radius: 6px;
  font-size: 11px;
}

.time-input:disabled,
.quick-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.quick-btns {
  margin-top: 9px;
}

.quick-btn {
  padding: 5px 8px;
  font-size: 10px;
}

.filter-note,
.filter-footer {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.filter-note {
  margin-top: 8px;
}

.filter-footer {
  margin-top: 10px;
}

.search-btn {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan));
  color: var(--bg-page-deep);
  font-size: 13px;
  font-weight: 700;
}

.search-btn:disabled,
.export-btn:disabled,
.page-btn:disabled,
.btn-resolve:disabled,
.btn-danger:disabled {
  cursor: not-allowed;
  opacity: 0.42;
  transform: none;
}

.connection-badge {
  padding: 3px 8px;
  border: 1px solid var(--success-border);
  border-radius: 999px;
  background: var(--success-soft);
  color: var(--success);
  font-size: 10px;
}

.logs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.stats-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  min-width: 0;
}

.stat-item {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 96px;
  padding: 2px 18px 2px 14px;
}

.stat-item::before {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 0;
  width: 3px;
  border-radius: 2px;
  background: var(--accent-cyan);
  box-shadow: 0 0 12px rgba(85, 216, 255, 0.32);
  content: "";
}

.stat-item:not(:last-child)::after {
  position: absolute;
  top: 4px;
  right: 0;
  bottom: 4px;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--border-subtle), transparent);
  content: "";
}

.stat-item + .stat-item {
  margin-left: 16px;
}

.page-stat::before {
  background: var(--success);
  box-shadow: 0 0 12px rgba(94, 231, 154, 0.28);
}

.alarm-stat::before {
  background: var(--warning);
  box-shadow: 0 0 12px rgba(255, 209, 102, 0.28);
}

.stat-value {
  color: var(--accent-cyan);
  font-family: var(--font-num);
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 18px rgba(85, 216, 255, 0.18);
}

.page-stat .stat-value {
  color: var(--success);
  text-shadow: 0 0 18px rgba(94, 231, 154, 0.16);
}

.alarm-stat .stat-value {
  color: var(--warning);
  text-shadow: 0 0 18px rgba(255, 209, 102, 0.16);
}

.stat-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.stat-scope {
  padding: 1px 5px;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  background: rgba(85, 216, 255, 0.05);
  color: var(--text-muted);
  font-size: 8px;
  white-space: nowrap;
}

.export-btns {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.export-btn,
.page-btn,
.inline-btn {
  padding: 6px 9px;
  font-size: 10px;
}

.export-btn:hover:not(:disabled),
.page-btn:hover:not(:disabled),
.inline-btn:hover {
  border-color: var(--border-active);
  color: var(--accent-cyan);
}

.logs-table {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: rgba(7, 24, 42, 0.34);
}

.table-grid {
  display: grid;
  grid-template-columns: 68px 142px minmax(96px, 0.9fr) minmax(88px, 0.8fr) minmax(132px, 1.4fr);
  align-items: center;
  width: 100%;
  min-width: 0;
}

.table-header {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 10px;
  background: rgba(77, 159, 255, 0.11);
}

.th {
  min-width: 0;
  padding-right: 8px;
  color: var(--text-strong);
  font-size: 11px;
  font-weight: 600;
}

.table-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.table-row {
  min-height: 44px;
  padding: 0 10px;
  border: 0;
  border-bottom: 1px solid rgba(105, 176, 235, 0.11);
  background: transparent;
  text-align: left;
}

.table-row:hover {
  background: rgba(85, 216, 255, 0.055);
}

.td {
  display: block;
  min-width: 0;
  padding-right: 8px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
}

.level-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.level-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: var(--offline);
}

.level-dot.info {
  background: var(--accent-cyan);
}

.level-dot.warning {
  background: var(--warning);
}

.level-dot.error {
  background: var(--danger);
}

.level-dot.unmarked {
  background: var(--offline);
}

.mono-cell {
  font-family: var(--font-num);
  white-space: nowrap;
}

.ellipsis-cell,
.content-cell {
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  max-width: 100%;
  padding: 2px 6px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--info-soft);
  color: var(--accent-cyan);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-panel,
.compact-state {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
}

.state-panel {
  flex: 1;
  min-height: 110px;
  gap: 10px;
}

.error-state,
.error-text {
  color: var(--danger);
}

.pagination {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
}

.page-info {
  color: var(--text-tertiary);
  font-size: 11px;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-num {
  min-width: 58px;
  color: var(--text-primary);
  font-family: var(--font-num);
  font-size: 11px;
  text-align: center;
}

.right-section {
  display: grid;
  grid-template-rows: 154px 224px minmax(0, 1fr);
  gap: 12px;
}

.composition-card :deep(.card-body),
.overview-card :deep(.card-body),
.alarm-card :deep(.card-body) {
  min-height: 0;
}

.composition-card :deep(.card-body),
.overview-card :deep(.card-body) {
  padding: 12px 14px;
}

.alarm-overview {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  height: 100%;
}

.alarm-overview-ring,
.log-donut {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 50%;
  box-shadow: 0 0 22px rgba(85, 216, 255, 0.08);
}

.alarm-overview-ring {
  width: 72px;
  height: 72px;
}

.alarm-overview-ring-core,
.log-donut-core {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px solid var(--border-subtle);
  border-radius: 50%;
  background: var(--card-bg-strong);
  box-shadow: inset 0 0 18px rgba(85, 216, 255, 0.05);
}

.alarm-overview-ring-core {
  width: 50px;
  height: 50px;
}

.alarm-overview-ring-core strong {
  color: var(--text-primary);
  font-family: var(--font-num);
  font-size: 20px;
  line-height: 1;
}

.alarm-overview-ring-core span {
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 8px;
}

.alarm-overview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.alarm-overview-item {
  display: grid;
  grid-template-columns: 5px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: rgba(7, 24, 42, 0.66);
}

.overview-status-mark {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: var(--success);
  box-shadow: 0 0 10px rgba(94, 231, 154, 0.24);
}

.alarm-overview-item.closed .overview-status-mark {
  background: var(--offline);
  box-shadow: none;
}

.overview-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.overview-label {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-percent {
  color: var(--text-muted);
  font-size: 8px;
}

.alarm-overview-item strong {
  color: var(--success);
  font-family: var(--font-num);
  font-size: 18px;
}

.alarm-overview-item.closed strong {
  color: var(--offline);
}

.log-stat-content {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.log-stat-main {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 0;
}

.log-donut {
  width: 88px;
  height: 88px;
  margin: 0 auto;
}

.log-donut-core {
  width: 60px;
  height: 60px;
}

.log-donut-core strong {
  color: var(--text-primary);
  font-family: var(--font-num);
  font-size: 21px;
  line-height: 1;
}

.log-donut-core span {
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 8px;
}

.log-stat-legend {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  min-width: 0;
}

.legend-row {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 9px;
}

.legend-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-row strong {
  color: var(--text-primary);
  font-family: var(--font-num);
  font-size: 10px;
}

.log-stat-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
  padding-top: 9px;
  border-top: 1px solid var(--border-subtle);
}

.log-stat-summary > span {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  color: var(--text-tertiary);
  font-size: 8px;
  white-space: nowrap;
}

.composition-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
}

.composition-dot.system {
  background: var(--accent-cyan);
}

.composition-dot.manual {
  background: var(--accent-green);
}

.composition-dot.event {
  background: var(--warning);
}

.composition-dot.command {
  background: var(--accent-blue);
}

.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) transparent;
}

.alarm-list::-webkit-scrollbar {
  width: 4px;
}

.alarm-list::-webkit-scrollbar-track {
  background: transparent;
}

.alarm-list::-webkit-scrollbar-thumb {
  border-radius: 2px;
  background: var(--border-default);
}

.alarm-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: 100%;
  min-width: 0;
  padding: 9px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: rgba(7, 24, 42, 0.66);
  text-align: left;
}

.alarm-item:hover {
  border-color: var(--border-active);
  background: rgba(18, 51, 82, 0.76);
}

.alarm-level {
  flex: 0 0 auto;
  padding: 2px 7px;
  border: 1px solid var(--warning-border);
  border-radius: 4px;
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 10px;
  font-weight: 700;
}

.alarm-level.large {
  padding: 4px 9px;
  font-size: 12px;
}

.alarm-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 5px;
}

.alarm-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  min-width: 0;
}

.alarm-title {
  min-width: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-status {
  flex: 0 0 auto;
  color: var(--text-tertiary);
  font-size: 9px;
}

.alarm-status.processed {
  color: var(--success);
}

.alarm-status.closed {
  color: var(--offline);
}

.alarm-time {
  color: var(--text-muted);
  font-size: 10px;
}

.modal-overlay {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--overlay-bg);
}

.modal {
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: 100%;
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: linear-gradient(145deg, var(--card-bg-strong), var(--bg-page));
  box-shadow: var(--shadow-elevated);
}

.alarm-modal {
  width: 680px;
}

.modal-header,
.modal-footer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 14px 18px;
}

.modal-header {
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h3 {
  color: var(--text-primary);
  font-size: 16px;
}

.icon-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 22px;
}

.icon-close:hover {
  color: var(--text-primary);
}

.modal-body {
  min-height: 0;
  padding: 18px;
  overflow-y: auto;
}

.modal-footer {
  justify-content: flex-end;
  gap: 9px;
  border-top: 1px solid var(--border-subtle);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
}

.detail-item {
  min-width: 0;
}

.detail-item label {
  display: block;
  margin-bottom: 5px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.detail-item span,
.detail-content {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.detail-level.info {
  color: var(--accent-cyan);
}

.detail-level.warning {
  color: var(--warning);
}

.detail-level.error {
  color: var(--danger);
}

.detail-level.unmarked {
  color: var(--offline);
}

.full-width {
  grid-column: 1 / -1;
}

.detail-content {
  padding: 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--control-bg);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.break-value {
  overflow-wrap: anywhere;
}

.btn-close,
.btn-resolve,
.btn-danger {
  padding: 8px 14px;
  font-size: 12px;
}

.btn-resolve {
  border-color: var(--info-border);
  background: var(--info-soft);
  color: var(--accent-cyan);
}

.btn-danger {
  border-color: var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.alarm-summary-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}

.alarm-summary-head h4 {
  margin-bottom: 5px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.4;
}

.alarm-detail-grid {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.timeline-section {
  margin-top: 16px;
}

.timeline-section > h4 {
  margin-bottom: 12px;
  color: var(--text-strong);
  font-size: 13px;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 10px;
  padding-bottom: 15px;
}

.timeline-item:not(:last-child)::before {
  position: absolute;
  top: 9px;
  bottom: -1px;
  left: 4px;
  width: 1px;
  background: var(--border-default);
  content: "";
}

.timeline-dot {
  z-index: 1;
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  margin-top: 4px;
  border-radius: 50%;
  background: var(--accent-cyan);
  box-shadow: 0 0 0 3px var(--info-soft);
}

.timeline-body {
  min-width: 0;
}

.timeline-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.timeline-meta time {
  color: var(--text-secondary);
  font-family: var(--font-num);
}

.timeline-meta strong {
  color: var(--accent-cyan);
}

.timeline-result {
  color: var(--success);
}

.timeline-body p {
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
}

.timeline-empty,
.disabled-reason,
.operation-message {
  padding: 9px 10px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.5;
}

.timeline-empty {
  background: var(--control-bg);
  color: var(--text-tertiary);
}

.disabled-reason {
  margin-top: 2px;
  border: 1px solid var(--warning-border);
  background: var(--warning-soft);
  color: var(--warning);
}

.operation-message {
  margin-top: 8px;
}

.operation-message.error {
  border: 1px solid var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.operation-message.success {
  border: 1px solid var(--success-border);
  background: var(--success-soft);
  color: var(--success);
}

.modal-state {
  min-height: 180px;
}

.feedback-toast {
  position: fixed;
  z-index: 1100;
  right: 20px;
  bottom: 20px;
  max-width: 320px;
  padding: 10px 14px;
  border: 1px solid var(--success-border);
  border-radius: 6px;
  background: var(--card-bg-strong);
  color: var(--success);
  box-shadow: var(--shadow-elevated);
  font-size: 12px;
}

.feedback-toast.error {
  border-color: var(--danger-border);
  color: var(--danger);
}

@media (max-width: 1280px) {
  .system-logs-page {
    padding: 16px;
  }

  .stats-row {
    gap: 0;
  }

  .stat-item {
    padding-right: 14px;
  }

  .stat-item + .stat-item {
    margin-left: 12px;
  }

  .export-btns {
    max-width: 150px;
  }
}
</style>

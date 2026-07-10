<template>
  <div class="system-logs-page">
    <div class="page-content">
      <DataCard title="日志筛选" class="filter-card">
        <div class="filter-section">
          <div class="filter-title">日志类型</div>
          <div class="log-types">
            <label v-for="type in logTypes" :key="type.value" class="type-item"
              ><input
                type="radio"
                v-model="selectedType"
                :value="type.value"
                name="logType"
              /><span class="radio-mark"></span
              ><span class="type-label">{{ type.label }}</span></label
            >
          </div>
        </div>
        <div class="filter-section">
          <div class="filter-title">时间范围</div>
          <div class="time-range">
            <div class="time-item">
              <label>开始时间</label
              ><input
                type="datetime-local"
                v-model="startTime"
                class="time-input"
              />
            </div>
            <div class="time-item">
              <label>结束时间</label
              ><input
                type="datetime-local"
                v-model="endTime"
                class="time-input"
              />
            </div>
          </div>
          <div class="quick-btns">
            <button
              v-for="btn in quickBtns"
              :key="btn.value"
              class="quick-btn"
              @click="setQuickTime(btn.value)"
            >
              {{ btn.label }}
            </button>
          </div>
        </div>
        <div class="filter-section">
          <div class="filter-title">日志级别</div>
          <div class="level-tags">
            <span
              v-for="level in logLevels"
              :key="level.value"
              :class="[
                'level-tag',
                level.value,
                { active: selectedLevels.includes(level.value) },
              ]"
              @click="toggleLevel(level.value)"
              >{{ level.label }}</span
            >
          </div>
        </div>
        <button class="search-btn" @click="searchLogs">
          <span>🔍</span> 查询日志
        </button>
      </DataCard>
      <DataCard :title="currentTypeLabel" class="logs-card">
        <div class="logs-header">
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-value">{{ logs.length }}</span
              ><span class="stat-label">总记录</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="color: var(--danger)">{{
                errorCount
              }}</span
              ><span class="stat-label">异常</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="color: var(--warning)">{{
                warningCount
              }}</span
              ><span class="stat-label">警告</span>
            </div>
          </div>
          <div class="export-btns">
            <button class="export-btn" @click="exportLogs('csv')">
              导出CSV
            </button>
            <button class="export-btn" @click="exportLogs('excel')">
              导出Excel
            </button>
          </div>
        </div>
        <div class="logs-table">
          <div class="table-header">
            <div
              class="th"
              v-for="col in tableColumns"
              :key="col.key"
              :style="{ width: col.width }"
            >
              {{ col.label }}
            </div>
          </div>
          <div class="table-body">
            <div
              v-for="log in paginatedLogs"
              :key="log.id"
              class="table-row"
              @click="showLogDetail(log)"
            >
              <div class="td" :style="{ width: tableColumns[0].width }">
                <span :class="['level-dot', log.level]"></span>
              </div>
              <div class="td" :style="{ width: tableColumns[1].width }">
                {{ log.time }}
              </div>
              <div class="td" :style="{ width: tableColumns[2].width }">
                {{ log.source }}
              </div>
              <div class="td" :style="{ width: tableColumns[3].width }">
                <span :class="['type-badge', log.type]">{{
                  log.typeText
                }}</span>
              </div>
              <div
                class="td content-cell"
                :style="{ width: tableColumns[4].width }"
              >
                {{ log.content }}
              </div>
              <div class="td" :style="{ width: tableColumns[5].width }">
                <span :class="['status-badge', log.status]">{{
                  log.statusText
                }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="pagination">
          <span class="page-info"
            >显示 {{ (currentPage - 1) * pageSize + 1 }} -
            {{ Math.min(currentPage * pageSize, logs.length) }} 条，共
            {{ logs.length }} 条</span
          >
          <div class="page-buttons">
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              上一页
            </button>
            <span class="page-num">{{ currentPage }} / {{ totalPages }}</span>
            <button
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              下一页
            </button>
          </div>
        </div>
      </DataCard>
      <div class="right-section">
        <DataCard title="日志统计" class="stats-card">
          <div ref="statsChart" class="stats-chart"></div>
          <div class="stats-legend">
            <div class="legend-item">
              <span class="legend-dot info"></span
              ><span class="legend-label">信息</span
              ><span class="legend-value">65%</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot warning"></span
              ><span class="legend-label">警告</span
              ><span class="legend-value">25%</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot error"></span
              ><span class="legend-label">异常</span
              ><span class="legend-value">10%</span>
            </div>
          </div>
        </DataCard>
        <DataCard title="设备在线状态" class="online-card">
          <div class="online-stats">
            <div class="online-item">
              <div class="online-icon online">●</div>
              <div class="online-info">
                <span class="online-label">在线设备</span
                ><span class="online-value">186</span>
              </div>
            </div>
            <div class="online-item">
              <div class="online-icon offline">●</div>
              <div class="online-info">
                <span class="online-label">离线设备</span
                ><span class="online-value">14</span>
              </div>
            </div>
            <div class="online-item">
              <div class="online-icon warning">●</div>
              <div class="online-info">
                <span class="online-label">异常设备</span
                ><span class="online-value">3</span>
              </div>
            </div>
          </div>
          <div ref="onlineChart" class="online-chart"></div>
        </DataCard>
        <DataCard title="最近告警" class="alarm-card">
          <div
            ref="alarmListRef"
            class="alarm-list"
            @mouseenter="isPaused = true"
            @mouseleave="isPaused = false"
            @wheel="handleWheel"
          >
            <div
              v-for="alarm in recentAlarms"
              :key="alarm.id"
              class="alarm-item"
            >
              <div class="alarm-level" :class="alarm.level">
                {{ alarm.levelText }}
              </div>
              <div class="alarm-content">
                <div class="alarm-title">{{ alarm.title }}</div>
                <div class="alarm-time">{{ alarm.time }}</div>
              </div>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
    <div
      v-if="selectedLog"
      class="modal-overlay"
      @click.self="selectedLog = null"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>日志详情</h3>
          <button class="close-btn" @click="selectedLog = null">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-item">
            <label>日志级别</label
            ><span :class="['detail-level', selectedLog.level]">{{
              selectedLog.levelText
            }}</span>
          </div>
          <div class="detail-item">
            <label>发生时间</label
            ><span class="detail-value">{{ selectedLog.time }}</span>
          </div>
          <div class="detail-item">
            <label>来源</label
            ><span class="detail-value">{{ selectedLog.source }}</span>
          </div>
          <div class="detail-item">
            <label>日志类型</label
            ><span class="detail-value">{{ selectedLog.typeText }}</span>
          </div>
          <div class="detail-item">
            <label>详细内容</label>
            <div class="detail-content">{{ selectedLog.detail }}</div>
          </div>
          <div class="detail-item">
            <label>处理状态</label
            ><span :class="['detail-status', selectedLog.status]">{{
              selectedLog.statusText
            }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button
            v-if="selectedLog.status !== 'resolved'"
            class="btn-resolve"
            @click="resolveLog"
          >
            标记为已处理
          </button>
          <button class="btn-close" @click="selectedLog = null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import DataCard from "../components/DataCard.vue";

const logTypes = [
  { label: "登录日志", value: "login" },
  { label: "操作日志", value: "operation" },
  { label: "设备日志", value: "device" },
  { label: "系统日志", value: "system" },
];
const logLevels = [
  { label: "信息", value: "info" },
  { label: "警告", value: "warning" },
  { label: "异常", value: "error" },
];
const quickBtns = [
  { label: "今天", value: "today" },
  { label: "昨天", value: "yesterday" },
  { label: "近7天", value: "week" },
  { label: "近30天", value: "month" },
];

const selectedType = ref("login"),
  selectedLevels = ref(["info", "warning", "error"]);
const startTime = ref("2026-03-07T00:00"),
  endTime = ref("2026-03-08T23:59");
const currentPage = ref(1),
  pageSize = 10,
  selectedLog = ref(null);

const currentTypeLabel = computed(() => {
  const type = logTypes.find((t) => t.value === selectedType.value);
  return type ? type.label : "日志列表";
});
const logs = ref([
  {
    id: 1,
    level: "info",
    levelText: "信息",
    time: "2026-03-08 14:32:15",
    source: "系统",
    type: "login",
    typeText: "登录",
    content: "用户 admin 登录系统",
    detail: "用户 admin 从 IP 192.168.1.100 登录系统，登录方式：网页端",
    status: "normal",
    statusText: "正常",
  },
  {
    id: 2,
    level: "info",
    levelText: "信息",
    time: "2026-03-08 14:28:30",
    source: "GWA06#0101",
    type: "device",
    typeText: "设备",
    content: "设备上线",
    detail: "设备 GWA06#0101 成功连接到网关，信号强度：-45dBm",
    status: "normal",
    statusText: "正常",
  },
  {
    id: 3,
    level: "warning",
    levelText: "警告",
    time: "2026-03-08 14:15:22",
    source: "GWA06#0102",
    type: "device",
    typeText: "设备",
    content: "设备信号弱",
    detail: "设备 GWA06#0102 信号强度低于阈值，当前：-78dBm，建议检查设备位置",
    status: "pending",
    statusText: "待处理",
  },
  {
    id: 4,
    level: "info",
    levelText: "信息",
    time: "2026-03-08 13:56:10",
    source: "zhangsan",
    type: "operation",
    typeText: "操作",
    content: "修改设备亮度参数",
    detail: "用户 zhangsan 将区域1的设备开机亮度从80%调整为100%",
    status: "normal",
    statusText: "正常",
  },
  {
    id: 5,
    level: "error",
    levelText: "异常",
    time: "2026-03-08 13:42:05",
    source: "GWA06#0103",
    type: "device",
    typeText: "设备",
    content: "设备离线",
    detail: "设备 GWA06#0103 已离线超过5分钟，最后在线时间：13:37:00",
    status: "pending",
    statusText: "待处理",
  },
]);
const recentAlarms = ref([
  {
    id: 1,
    level: "error",
    levelText: "异常",
    title: "设备 GWA06#0103 离线",
    time: "13:42",
  },
  {
    id: 2,
    level: "warning",
    levelText: "警告",
    title: "设备 GWA06#0102 信号弱",
    time: "14:15",
  },
  {
    id: 3,
    level: "warning",
    levelText: "警告",
    title: "设备 GWA06#0105 电量低",
    time: "08:45",
  },
  {
    id: 4,
    level: "info",
    levelText: "信息",
    title: "网关-A1 已恢复连接",
    time: "10:25",
  },
  {
    id: 5,
    level: "info",
    levelText: "信息",
    title: "网关-A1 已恢复连接",
    time: "10:25",
  },
]);
const tableColumns = [
  { key: "level", label: "级别", width: "60px" },
  { key: "time", label: "时间", width: "150px" },
  { key: "source", label: "来源", width: "120px" },
  { key: "type", label: "类型", width: "80px" },
  { key: "content", label: "内容", width: "flex" },
  { key: "status", label: "状态", width: "80px" },
];
const errorCount = computed(
  () => logs.value.filter((l) => l.level === "error").length
);
const warningCount = computed(
  () => logs.value.filter((l) => l.level === "warning").length
);
const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return logs.value.slice(start, start + pageSize);
});
const totalPages = computed(() => Math.ceil(logs.value.length / pageSize));

const toggleLevel = (level) => {
  if (selectedLevels.value.includes(level))
    selectedLevels.value = selectedLevels.value.filter((l) => l !== level);
  else selectedLevels.value.push(level);
};
const setQuickTime = (type) => {};
const searchLogs = () => {
  currentPage.value = 1;
  alert("日志查询完成！");
};
const showLogDetail = (log) => {
  selectedLog.value = log;
};
const resolveLog = () => {
  if (selectedLog.value) {
    selectedLog.value.status = "resolved";
    selectedLog.value.statusText = "已处理";
    selectedLog.value = null;
  }
};
const exportLogs = (format) => {
  alert(`正在导出${format.toUpperCase()}格式的日志...`);
};

const statsChart = ref(null),
  onlineChart = ref(null),
  alarmListRef = ref(null);
let statsChartInstance = null,
  onlineChartInstance = null,
  scrollTimer = null;
const isPaused = ref(false);

const initCharts = () => {
  if (!window.echarts) return;
  statsChartInstance = window.echarts.init(statsChart.value);
  statsChartInstance.setOption({
    tooltip: { trigger: "item", backgroundColor: "rgba(7,24,42,0.96)", borderColor: "rgba(85,216,255,0.34)", textStyle: { color: "#e7f2ff" } },
    legend: {
      right: "15%",
      top: "center",
      orient: "vertical",
      itemGap: 15,
      textStyle: { color: "#c1d3e7" },
    },
    series: [
      {
        type: "pie",
        radius: ["35%", "85%"],
        center: ["30%", "50%"],
        data: [
          { value: 65, name: "信息", itemStyle: { color: "#55d8ff" } },
          { value: 25, name: "警告", itemStyle: { color: "#ffd166" } },
          { value: 10, name: "异常", itemStyle: { color: "#ff6678" } },
        ],
        label: { show: false },
      },
    ],
  });
  onlineChartInstance = window.echarts.init(onlineChart.value);
  onlineChartInstance.setOption({
    tooltip: { trigger: "item", backgroundColor: "rgba(7,24,42,0.96)", borderColor: "rgba(85,216,255,0.34)", textStyle: { color: "#e7f2ff" } },
    series: [
      {
        type: "gauge",
        radius: "80%",
        center: ["25%", "50%"],// 图表中心位置
        startAngle: 90,// 顺时针旋转
        endAngle: -270,// 逆时针旋转
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: { color: "#5ee79a" },
        },
        axisLine: {
          lineStyle: { width: 10, color: [[1, "rgba(113,140,166,0.18)"]] },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value: 93 }],
        detail: {
          valueAnimation: true,
          fontSize: 24,
          fontWeight: "bold",
          color: "#5ee79a",
          formatter: "{value}%",
          offsetCenter: [0, 0],
        },
      },
    ],
  });
};
const handleResize = () => {
  statsChartInstance?.resize();
  onlineChartInstance?.resize();
};

const startScroll = () => {
  if (scrollTimer) clearInterval(scrollTimer);
  scrollTimer = setInterval(() => {
    if (!isPaused.value && alarmListRef.value) {
      const list = alarmListRef.value;
      if (list.scrollTop + list.clientHeight >= list.scrollHeight) {
        list.scrollTop = 0;
      } else {
        list.scrollTop += 1;
      }
    }
  }, 50);
};

const stopScroll = () => {
  if (scrollTimer) {
    clearInterval(scrollTimer);
    scrollTimer = null;
  }
};

const handleWheel = () => {
  isPaused.value = true;
};

onMounted(() => {
  setTimeout(initCharts, 100);
  window.addEventListener("resize", handleResize);
  setTimeout(startScroll, 500);
});
onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  stopScroll();
  statsChartInstance?.dispose();
  onlineChartInstance?.dispose();
});
</script>

<style scoped>
.system-logs-page {
  width: 100%;
  height: 100%;
  padding: 20px;
}
.page-content {
  display: grid;
  grid-template-columns: 260px 1fr 390px;
  gap: 16px;
  height: 100%;
}
.filter-card {
  height: 100%;
  overflow: auto;
}
.logs-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.filter-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.filter-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px;
}
.log-types {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.type-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 0;
}
.type-item input {
  display: none;
}
.radio-mark {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.type-item input:checked + .radio-mark {
  border-color: #00d4aa;
}
.type-item input:checked + .radio-mark::after {
  content: "";
  width: 8px;
  height: 8px;
  background: #00d4aa;
  border-radius: 50%;
}
.type-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}
.time-range {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}
.time-item label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}
.time-input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 170, 0.3);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}
.quick-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.quick-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.quick-btn:hover {
  border-color: rgba(0, 212, 170, 0.5);
  color: #00d4aa;
}
.level-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.level-tag {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}
.level-tag.info.active {
  background: rgba(0, 212, 170, 0.2);
  border-color: #00d4aa;
  color: #00d4aa;
}
.level-tag.warning.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: #ffd700;
  color: #ffd700;
}
.level-tag.error.active {
  background: rgba(255, 107, 107, 0.2);
  border-color: #ff6b6b;
  color: #ff6b6b;
}
.search-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(90deg, #00d4aa, #00a884);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.search-btn:hover {
  box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
}
.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.stats-row {
  display: flex;
  gap: 24px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  font-family: monospace;
}
.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
.export-btns {
  display: flex;
  gap: 10px;
}
.export-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.export-btn:hover {
  border-color: rgba(0, 212, 170, 0.5);
  color: #00d4aa;
}
.logs-table {
  border: 1px solid rgba(0, 212, 170, 0.2);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.table-header {
  display: flex;
  background: rgba(0, 212, 170, 0.1);
  padding: 12px 16px;
  flex-shrink: 0;
}
.th {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}
.table-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.table-row {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}
.table-row:hover {
  background: rgba(0, 212, 170, 0.05);
}
.td {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
}
.content-cell {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.level-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.level-dot.info {
  background: #00d4aa;
}
.level-dot.warning {
  background: #ffd700;
}
.level-dot.error {
  background: #ff6b6b;
}
.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  background: rgba(0, 212, 170, 0.15);
  color: #00d4aa;
}
.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
}
.status-badge.normal {
  background: rgba(0, 212, 170, 0.15);
  color: #00d4aa;
}
.status-badge.pending {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
}
.status-badge.resolved {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}
.right-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0%;
}
.stats-card {
  flex: 0.6;
}
.online-card {
  flex: 0.85;
}
.alarm-card {
  flex: 1;
}
.stats-chart {
  width: 100%;
  height: 120px;
}
.stats-legend {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-dot.info {
  background: #00d4aa;
}
.legend-dot.warning {
  background: #ffd700;
}
.legend-dot.error {
  background: #ff6b6b;
}
.legend-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}
.legend-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}
.online-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  margin-left: auto;
  width: 50%;
}
.online-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}
.online-icon {
  font-size: 20px;
}
.online-icon.online {
  color: #00d4aa;
}
.online-icon.offline {
  color: #ff6b6b;
}
.online-icon.warning {
  color: #ffd700;
}
.online-info {
  display: flex;
  flex-direction: column;
  margin-left: 2%;
  gap: 2px;
}
.online-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
.online-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-family: monospace;
}
.online-chart {
  position: absolute;
  top: 58%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 50%;
}
.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 212, 170, 0.3) transparent;
}
.alarm-list::-webkit-scrollbar {
  width: 4px;
}
.alarm-list::-webkit-scrollbar-track {
  background: transparent;
}
.alarm-list::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 170, 0.3);
  border-radius: 2px;
}
.alarm-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}
.alarm-level {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  height: fit-content;
}
.alarm-level.error {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}
.alarm-level.warning {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}
.alarm-level.info {
  background: rgba(0, 212, 170, 0.2);
  color: #00d4aa;
}
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.page-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.page-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.page-btn:hover:not(:disabled) {
  border-color: rgba(0, 212, 170, 0.5);
  color: #00d4aa;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-num {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
  font-family: monospace;
}
.alarm-content {
  flex: 1;
}
.alarm-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}
.alarm-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: linear-gradient(135deg, #0d1f35 0%, #0a1628 100%);
  border: 1px solid rgba(0, 212, 170, 0.3);
  border-radius: 12px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}
.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.close-btn:hover {
  color: #fff;
}
.modal-body {
  padding: 24px;
}
.detail-item {
  margin-bottom: 16px;
}
.detail-item label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}
.detail-level,
.detail-status,
.detail-value {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}
.detail-level.info {
  color: #00d4aa;
}
.detail-level.warning {
  color: #ffd700;
}
.detail-level.error {
  color: #ff6b6b;
}
.detail-status.pending {
  color: #ffd700;
}
.detail-status.resolved {
  color: rgba(255, 255, 255, 0.5);
}
.detail-status.normal {
  color: #00d4aa;
}
.detail-content {
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.btn-resolve {
  padding: 10px 20px;
  background: linear-gradient(90deg, #00d4aa, #00a884);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-resolve:hover {
  box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
}
.btn-close {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Unified deep-sea theme: color-only overrides. */
.filter-section, .logs-header, .pagination { border-color: var(--border-subtle); }
.filter-title, .th, .alarm-title, .legend-value { color: var(--text-strong); }
.type-label, .td, .detail-content, .detail-level, .detail-status, .detail-value { color: var(--text-secondary); }
.time-item label, .stat-label, .online-label, .alarm-time, .detail-item label { color: var(--text-tertiary); }
.radio-mark { border-color: var(--border-default); }
.type-item input:checked + .radio-mark { border-color: var(--accent-cyan); }
.type-item input:checked + .radio-mark::after { background: var(--accent-cyan); }
.time-input { background: var(--control-bg); border-color: var(--border-default); color: var(--text-secondary); }
.quick-btn, .level-tag, .export-btn, .page-btn, .btn-close { background: var(--control-bg); border-color: var(--border-subtle); color: var(--text-tertiary); }
.quick-btn:hover, .export-btn:hover, .page-btn:hover:not(:disabled) { background: var(--control-bg-hover); border-color: var(--border-active); color: var(--accent-cyan); }
.level-tag.info.active { background: var(--info-soft); border-color: var(--info-border); color: var(--accent-cyan); }
.level-tag.warning.active { background: var(--warning-soft); border-color: var(--warning-border); color: var(--warning); }
.level-tag.error.active { background: var(--danger-soft); border-color: var(--danger-border); color: var(--danger); }
.search-btn, .btn-resolve { background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); color: var(--bg-page-deep); }
.search-btn:hover, .btn-resolve:hover { box-shadow: 0 4px 20px rgba(85, 216, 255, 0.20); }
.stat-value, .page-num, .online-value, .modal-header h3 { color: var(--text-primary); }
.logs-table { border-color: var(--border-subtle); background: rgba(7, 24, 42, 0.34); }
.table-header { background: rgba(77, 159, 255, 0.11); }
.table-row { border-bottom-color: rgba(105, 176, 235, 0.11); }
.table-row:hover { background: rgba(85, 216, 255, 0.055); }
.level-dot.info, .legend-dot.info { background: var(--accent-cyan); }
.level-dot.warning, .legend-dot.warning { background: var(--warning); }
.level-dot.error, .legend-dot.error { background: var(--danger); }
.type-badge { background: var(--info-soft); color: var(--accent-cyan); }
.status-badge.normal { background: var(--success-soft); color: var(--success); }
.status-badge.pending { background: var(--warning-soft); color: var(--warning); }
.status-badge.resolved { background: var(--offline-soft); color: var(--offline); }
.legend-label, .page-info { color: var(--text-tertiary); }
.online-item, .alarm-item { background: rgba(7, 24, 42, 0.66); border: 1px solid var(--border-subtle); }
.online-icon.online { color: var(--success); }
.online-icon.offline { color: var(--danger); }
.online-icon.warning { color: var(--warning); }
.alarm-list { scrollbar-color: var(--border-default) transparent; }
.alarm-list::-webkit-scrollbar-thumb { background: var(--border-default); }
.alarm-level.error { background: var(--danger-soft); color: var(--danger); }
.alarm-level.warning { background: var(--warning-soft); color: var(--warning); }
.alarm-level.info { background: var(--info-soft); color: var(--accent-cyan); }
.modal-overlay { background: var(--overlay-bg); }
.modal { background: linear-gradient(145deg, var(--card-bg-strong), var(--bg-page)); border-color: var(--border-default); box-shadow: var(--shadow-elevated); }
.modal-header, .modal-footer { border-color: var(--border-subtle); }
.close-btn { color: var(--text-tertiary); }
.close-btn:hover { color: var(--text-primary); }
.detail-level.info, .detail-status.normal { color: var(--accent-cyan); }
.detail-level.warning, .detail-status.pending { color: var(--warning); }
.detail-level.error { color: var(--danger); }
.detail-status.resolved { color: var(--offline); }
.detail-content { background: var(--control-bg); border: 1px solid var(--border-subtle); }
</style>

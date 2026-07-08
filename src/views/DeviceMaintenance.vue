<template>
  <div class="device-maintenance-page">
    <div class="page-content">
      <DataCard title="设备状态" class="status-card">
        <div class="search-bar">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索设备..."
            class="search-input"
          />
          <button class="search-btn">查询</button>
        </div>
        <div class="device-table">
          <div class="table-header">
            <div class="th">设备名称</div>
            <div class="th">区域</div>
            <div class="th">温度</div>
            <div class="th">电流电压</div>
            <div class="th">能耗</div>
            <div class="th">寿命</div>
          </div>
          <div class="table-body">
            <div
              v-for="(device, index) in paginatedDevices"
              :key="index"
              class="table-row"
            >
              <div class="td">{{ device.name }}</div>
              <div class="td">{{ device.area }}</div>
              <div class="td">
                <span :class="['status-badge', device.temperature]">{{
                  device.temperature === "normal" ? "正常" : "异常"
                }}</span>
              </div>
              <div class="td">
                <span :class="['status-badge', device.voltage]">{{
                  device.voltage === "normal" ? "正常" : "异常"
                }}</span>
              </div>
              <div class="td">
                <span :class="['status-badge', device.energy]">{{
                  device.energy === "normal" ? "正常" : "异常"
                }}</span>
              </div>
              <div class="td">{{ device.life }}h</div>
            </div>
          </div>
        </div>
        <div class="pagination">
          <span class="page-info"
            >显示 {{ (currentPage - 1) * pageSize + 1 }} -
            {{ Math.min(currentPage * pageSize, filteredDevices.length) }} 条，共
            {{ filteredDevices.length }} 条</span
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
        <DataCard title="事件总览" class="event-card">
          <div class="event-grid">
            <div class="event-item">
              <div class="event-value">5</div>
              <div class="event-label">今日事件</div>
            </div>
            <div class="event-item">
              <div class="event-value" style="color: #00d4aa">3</div>
              <div class="event-label">已处理</div>
            </div>
            <div class="event-item">
              <div class="event-value" style="color: #ffd700">2</div>
              <div class="event-label">待处理</div>
            </div>
            <div class="event-item">
              <div class="event-value" style="color: #00a8e8">18</div>
              <div class="event-label">总事件</div>
            </div>
          </div>
        </DataCard>
        <DataCard title="告警统计" class="alarm-card"
          ><div ref="alarmChart" class="alarm-chart"></div
        ></DataCard>
        <DataCard title="分布类型" class="type-card"
          ><div ref="typeChart" class="type-chart"></div
        ></DataCard>
        <DataCard title="处理状态" class="process-card"
          ><div ref="processChart" class="process-chart"></div
        ></DataCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import DataCard from "../components/DataCard.vue";

const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = ref(12);
const devices = ref([
  {
    name: "GWA06#0101-001",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
  {
    name: "GWA06#0101-002",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
  {
    name: "GWA06#0101-003",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
  {
    name: "GWA06#0101-004",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
  {
    name: "GWA06#0101-005",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
  {
    name: "GWA06#0101-006",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
  {
    name: "GWA06#0101",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
  {
    name: "GWA06#0101",
    area: "包装厂房",
    temperature: "normal",
    voltage: "normal",
    energy: "normal",
    life: 10000,
  },
]);
const filteredDevices = computed(() => {
  const result = searchQuery.value
    ? devices.value.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    : devices.value;
  return result;
});
const paginatedDevices = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredDevices.value.slice(start, end);
});
const totalPages = computed(() =>
  Math.ceil(filteredDevices.value.length / pageSize.value)
);
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};
const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
const goToPage = (page) => {
  currentPage.value = page;
};

const alarmChart = ref(null),
  typeChart = ref(null),
  processChart = ref(null);
let alarmChartInstance = null,
  typeChartInstance = null,
  processChartInstance = null;

const initCharts = () => {
  if (!window.echarts) return;
  alarmChartInstance = window.echarts.init(alarmChart.value);
  alarmChartInstance.setOption({
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      axisLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
    },
    series: [
      {
        type: "bar",
        data: [5, 3, 8, 4, 6, 2, 3],
        itemStyle: { color: "#00d4aa" },
        barWidth: "50%",
      },
    ],
  });
  typeChartInstance = window.echarts.init(typeChart.value);
  typeChartInstance.setOption({
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
    },
    series: [
      {
        name: "数据类型",
        type: "pie",
        radius: ["15%", "60%"], // 环形基础尺寸
        roseType: "radius", // 核心：开启玫瑰图，扇形半径随数值变化
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8, // 扇形圆角，更柔和
          borderColor: "#0f172a",
          borderWidth: 2,
        },
        label: {
          show: true,
          fontSize: 16,
          color: "#ffffff",
          formatter: "{b}\n{c}次({d}%)", // 标签格式：名称+次数+百分比
        },
        labelLine: {
          show: true,
          length: 5, // 标签线：延长
          length2: 15, // 标签线：延长
          lineStyle: {
            color: "#94a3b8",
            type: "dashed", // 虚线标签线，匹配参考效果
          },
        },
        // 数据：GW（最大）突出，保留原有配色和数值
        data: [
          {
            value: 35,
            name: "GW",
            selected: true, // 数值最大项突出
            selectedOffset: 25, // 增大偏移量，适配玫瑰图突出效果
            itemStyle: { color: "#22d3ee" },
          },
          {
            value: 25,
            name: "CU",
            itemStyle: { color: "#fde047" },
          },
          {
            value: 22,
            name: "SCU",
            itemStyle: { color: "#fb923c" },
          },
          {
            value: 18,
            name: "OCSR",
            itemStyle: { color: "#3b82f6" },
          },
        ],
      },
    ],
  });
  processChartInstance = window.echarts.init(processChart.value);
  processChartInstance.setOption({
    legend: {
      left: "center",
      top: "10%",
      itemGap: 40, // 图例间距
      data: ["待处理", "处理中", "已处理"],
      textStyle: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        name: "工单状态",
        type: "pie",
        radius: ["25%", "55%"],
        center: ["50%", "55%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8, // 环形扇区圆角（数值越大圆角越明显）
          borderWidth: 3, // 扇区间隔宽度（实现间隔效果）
          borderColor: "#ffffff", // 间隔颜色（白色，透明背景下更清晰）
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        // 颜色改为80%透明度（rgba最后一位0.8）
        data: [
          {
            value: 50,
            name: "待处理",
            itemStyle: { color: "rgba(255, 107, 53, 0.8)" }, // 橙色+80%透明度
          },
          {
            value: 28,
            name: "处理中",
            itemStyle: { color: "rgba(0, 168, 232, 0.8)" }, // 蓝色+80%透明度
          },
          {
            value: 22,
            name: "已处理",
            itemStyle: { color: "rgba(0, 200, 83, 0.8)" }, // 绿色+80%透明度
          },
        ],
        startAngle: 90,
        avoidClipping: true,
      },
    ],
  });
};

const handleResize = () => {
  alarmChartInstance?.resize();
  typeChartInstance?.resize();
  processChartInstance?.resize();
};

onMounted(() => {
  setTimeout(initCharts, 100);
  window.addEventListener("resize", handleResize);
});
onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  alarmChartInstance?.dispose();
  typeChartInstance?.dispose();
  processChartInstance?.dispose();
});
</script>

<style scoped>
.device-maintenance-page {
  width: 100%;
  height: 100%;
  padding: 20px;
}
.page-content {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 16px;
  height: 100%;
}
.status-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.search-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 170, 0.3);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}
.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}
.search-btn {
  padding: 10px 20px;
  background: rgba(0, 212, 170, 0.2);
  border: 1px solid rgba(0, 212, 170, 0.5);
  border-radius: 6px;
  color: #00d4aa;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.search-btn:hover {
  background: rgba(0, 212, 170, 0.3);
}
.device-table {
  border: 1px solid rgba(0, 212, 170, 0.2);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-bottom: 16px;
  min-height: 0;
}
.table-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 1fr;
  background: rgba(0, 212, 170, 0.1);
  padding: 12px 16px;
  flex-shrink: 0;
}
.th {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}
.table-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.table-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 1fr;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}
.table-row:hover {
  background: rgba(0, 212, 170, 0.05);
}
.td {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
}
.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
}
.status-badge.normal {
  background: rgba(0, 212, 170, 0.2);
  color: #00d4aa;
}
.status-badge.abnormal {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
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
.right-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
}
.event-card,
.alarm-card,
.type-card,
.process-card {
  height: 100%;
}
.event-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 10px 0;
}
.event-item {
  text-align: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}
.event-value {
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  font-family: monospace;
  margin-bottom: 6px;
}
.event-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.alarm-chart,
.type-chart,
.process-chart {
  width: 100%;
  height: 100%;
}
</style>

# 能耗分析页面（EnergyAnalysis）结构梳理

## 1. 文档说明

- 页面来源：`src/views/EnergyAnalysis.vue`
- 路由配置：`src/router/index.js`
- 组件依赖：`src/components/DataCard.vue`
- 图表依赖：ECharts 通过 `index.html` 中 CDN 全局注入 `window.echarts`
- 当前实现状态：EnergyAnalysis 页面**暂无真实后端 API 调用**，主要由前端静态数据和图表配置组成

与 Dashboard 页面不同，当前 EnergyAnalysis 页面的数据联动能力更弱，属于“页面骨架 + 静态演示数据”阶段。本文中的 API 接口均为基于当前页面结构反推的建议设计，用于后续联调。

## 2. 页面整体结构

页面整体采用“两栏布局”：

- 左侧：筛选面板
- 右侧：KPI 概览 + 趋势图 + 排行榜 + 对比图

### 2.1 页面层次

1. 页面根节点 `energy-analysis-page`
2. 页面主体 `page-content`
3. 左侧筛选卡片 `filter-card`
4. 右侧内容区 `right-section`

### 2.2 页面功能分区

右侧内容区继续拆分为三层：

1. KPI 行 `kpi-row`
2. 能耗趋势图 `trend-card`
3. 底部双图区 `bottom-charts`
   - Top 10 排行卡片 `rank-card`
   - 能耗环比分析卡片 `compare-card`

## 3. 当前页面真实实现结论

在 `src/views/EnergyAnalysis.vue` 中，当前页面存在以下特点：

- 有筛选 UI，但**大部分筛选尚未接通业务逻辑**
- 无 `computed`
- 无 `watch`
- 无 `axios` / `fetch`
- 无 `/api/...` 请求
- 图表数据直接写在 `setOption()` 中
- KPI 数据直接写在模板中
- 区域树目前是静态 DOM，并非真正的树形数据驱动

这意味着：

1. 页面已具备展示布局
2. 页面尚未完成真正的数据驱动
3. 后续联调时需要同时改造筛选、KPI、图表与排行榜的数据来源

## 4. 功能模块拆解

### 4.1 模块一：筛选面板

#### 4.1.1 元素组成

左侧筛选卡片由 3 个筛选区块组成：

1. 时间筛选
   - 标题
   - 只读时间输入框
   - 日历图标
2. 设备类型筛选
   - 类型按钮组：`CU`、`SCU`、`OCSR`
3. 区域导航
   - 园区 / 建筑 / 楼层 / 区域的树形展示

#### 4.1.2 当前前端数据结构

当前已定义的状态只有两类：

```json
{
  "filterDate": "2026-02-28 16:00:00",
  "selectedType": "CU",
  "deviceTypes": [
    { "label": "CU", "value": "CU" },
    { "label": "SCU", "value": "SCU" },
    { "label": "OCSR", "value": "OCSR" }
  ]
}
```

其中：

- `filterDate`：当前时间字符串，绑定到只读输入框
- `selectedType`：当前选中的设备类型
- `deviceTypes`：设备类型按钮数组

#### 4.1.3 交互逻辑

当前已实现或半实现的交互如下：

1. 时间输入框为 `readonly`
   - 当前仅展示时间值
   - 没有日期面板
   - 没有时间切换逻辑
2. 点击设备类型按钮时
   - 会更新 `selectedType`
   - 会触发按钮高亮状态变化
   - **不会驱动 KPI、图表、排行数据变化**
3. 区域导航区当前为静态 DOM 结构
   - 没有绑定树数据
   - 没有点击事件
   - 没有节点展开/收起逻辑
   - 没有区域切换后的数据刷新逻辑

#### 4.1.4 当前真实取数方式

- 时间值来源：`filterDate` 本地 `ref`
- 设备类型来源：`deviceTypes` 本地常量
- 区域树来源：模板硬编码节点

#### 4.1.5 建议 API 接口

##### 接口 1：获取筛选初始化数据

- 方法：`GET`
- 路径：`/api/energy-analysis/filters`
- 用途：初始化设备类型、默认时间、区域树

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "defaultDate": "2026-02-28 16:00:00",
    "deviceTypes": [
      { "label": "CU", "value": "CU" },
      { "label": "SCU", "value": "SCU" },
      { "label": "OCSR", "value": "OCSR" }
    ],
    "areaTree": [
      {
        "label": "园区",
        "value": "campus-1",
        "children": [
          {
            "label": "建筑单体A",
            "value": "building-a"
          },
          {
            "label": "建筑单体B",
            "value": "building-b"
          },
          {
            "label": "楼层",
            "value": "floor-1",
            "children": [
              { "label": "区域1", "value": "area-1" },
              { "label": "区域2", "value": "area-2" },
              { "label": "区域3", "value": "area-3" }
            ]
          }
        ]
      }
    ]
  }
}
```

### 4.2 模块二：KPI 概览区

#### 4.2.1 元素组成

KPI 区位于右侧顶部，共 4 张卡片：

1. 本月能耗（kWh）
2. 本年能耗（kWh）
3. 节约率（%）
4. 节能目标完成度

每张卡片包含：

- 指标标题
- 图标
- 主数值
- 趋势说明或补充说明
- 进度条

#### 4.2.2 当前前端数据结构

当前 KPI 数据并未抽成数组，而是直接写在模板里。按页面实际展示整理为：

```json
[
  {
    "label": "本月能耗",
    "value": 45280,
    "unit": "kWh",
    "trend": "+5.2%",
    "trendType": "up",
    "progress": 65
  },
  {
    "label": "本年能耗",
    "value": 520150,
    "unit": "kWh",
    "trend": "-3.2%",
    "trendType": "down",
    "progress": 78
  },
  {
    "label": "节约率",
    "value": 15.8,
    "unit": "%",
    "subValue": "同比上季度",
    "progress": 15.8
  },
  {
    "label": "节能目标完成度",
    "value": 82,
    "unit": "%",
    "subValue": "目标: 630,000",
    "progress": 82
  }
]
```

#### 4.2.3 交互逻辑

- 当前 KPI 卡片无点击交互
- 当前 KPI 数据不会随时间、设备类型、区域切换而变化
- 也没有监听器刷新 KPI

#### 4.2.4 当前真实取数方式

- 来源：模板硬编码
- 特征：无状态映射、无接口请求、无统一数据结构

#### 4.2.5 建议 API 接口

##### 接口 2：获取 KPI 概览

- 方法：`GET`
- 路径：`/api/energy-analysis/summary`
- 参数：
  - `dateTime`：时间点或查询时间
  - `deviceType`：设备类型
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/energy-analysis/summary?dateTime=2026-02-28%2016:00:00&deviceType=CU&areaId=area-1
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "kpis": [
      {
        "label": "本月能耗",
        "value": 45280,
        "unit": "kWh",
        "trend": "+5.2%",
        "trendType": "up",
        "progress": 65,
        "icon": "month-energy"
      },
      {
        "label": "本年能耗",
        "value": 520150,
        "unit": "kWh",
        "trend": "-3.2%",
        "trendType": "down",
        "progress": 78,
        "icon": "year-energy"
      },
      {
        "label": "节约率",
        "value": 15.8,
        "unit": "%",
        "subValue": "同比上季度",
        "progress": 15.8,
        "icon": "saving-rate"
      },
      {
        "label": "节能目标完成度",
        "value": 82,
        "unit": "%",
        "subValue": "目标: 630000",
        "progress": 82,
        "icon": "target-finish"
      }
    ]
  }
}
```

### 4.3 模块三：能耗趋势图

#### 4.3.1 元素组成

该模块位于右侧中部，包含：

1. 卡片标题：能耗趋势曲线（时间）
2. ECharts 折线图容器 `trendChart`

#### 4.3.2 当前前端数据结构

当前图表数据直接写在 `setOption()` 中：

```json
{
  "xAxis": ["2/4", "2/5", "2/6", "2/7", "2/8", "2/9", "2/10", "2/11", "2/12", "2/13", "2/14", "2/15", "2/16", "2/17", "2/18"],
  "series": [3200, 3400, 3100, 3300, 3600, 3500, 3400, 3300, 3500, 3600, 3400, 3300, 3500, 3400, 3200]
}
```

#### 4.3.3 交互逻辑

- 当前趋势图无局部筛选按钮
- 页面加载时通过 `initCharts()` 初始化
- 浏览器尺寸变化时执行 `resize()`
- 当前 `selectedType` 改变后，趋势图**不会刷新**

#### 4.3.4 当前真实取数方式

- 来源：`trendChartInstance.setOption()` 中硬编码数组
- 类型：前端静态图表配置

#### 4.3.5 建议 API 接口

##### 接口 3：获取能耗趋势图数据

- 方法：`GET`
- 路径：`/api/energy-analysis/trend`
- 参数：
  - `dateTime`
  - `deviceType`
  - `areaId`
  - `rangeType`：如 `15d` / `30d`

请求示例：

```http
GET /api/energy-analysis/trend?dateTime=2026-02-28%2016:00:00&deviceType=CU&areaId=area-1&rangeType=15d
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "xAxis": ["2/4", "2/5", "2/6", "2/7", "2/8", "2/9", "2/10", "2/11", "2/12", "2/13", "2/14", "2/15", "2/16", "2/17", "2/18"],
    "series": [3200, 3400, 3100, 3300, 3600, 3500, 3400, 3300, 3500, 3600, 3400, 3300, 3500, 3400, 3200],
    "unit": "kWh"
  }
}
```

### 4.4 模块四：Top 10 能效排行

#### 4.4.1 元素组成

该模块位于左下角，包含：

1. 标题：Top 10 能效排行
2. 单位提示：`单位: kWh`
3. 排行列表，每行包含：
   - 名称
   - 横向柱条
   - 数值

#### 4.4.2 当前前端数据结构

当前排行榜来自 `rankList`：

```json
[
  { "name": "酿造一车间", "value": 12450, "percent": 100 },
  { "name": "包装中心", "value": 10200, "percent": 82 },
  { "name": "仓储区", "value": 8900, "percent": 71 },
  { "name": "办公大楼", "value": 5400, "percent": 43 },
  { "name": "物流中心", "value": 4100, "percent": 33 }
]
```

> 标题写的是 Top 10，但当前实际仅提供了 5 条数据。

#### 4.4.3 交互逻辑

- 当前列表无点击交互
- 当前不会随筛选条件变化而刷新
- `percent` 仅用于前端渲染柱条宽度

#### 4.4.4 当前真实取数方式

- 来源：`rankList` 本地常量
- 类型：前端静态数组

#### 4.4.5 建议 API 接口

##### 接口 4：获取能效排行

- 方法：`GET`
- 路径：`/api/energy-analysis/ranking`
- 参数：
  - `dateTime`
  - `deviceType`
  - `areaId`
  - `topN`：默认 10

请求示例：

```http
GET /api/energy-analysis/ranking?dateTime=2026-02-28%2016:00:00&deviceType=CU&areaId=area-1&topN=10
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "unit": "kWh",
    "list": [
      { "name": "酿造一车间", "value": 12450, "percent": 100 },
      { "name": "包装中心", "value": 10200, "percent": 82 },
      { "name": "仓储区", "value": 8900, "percent": 71 },
      { "name": "办公大楼", "value": 5400, "percent": 43 },
      { "name": "物流中心", "value": 4100, "percent": 33 }
    ]
  }
}
```

### 4.5 模块五：能耗环比分析

#### 4.5.1 元素组成

该模块位于右下角，包含：

1. 卡片标题：能耗环比分析
2. ECharts 柱状对比图容器 `compareChart`

#### 4.5.2 当前前端数据结构

当前图表数据直接写在 `setOption()` 中：

```json
{
  "xAxis": ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12"],
  "series": [
    [85, 92, 78, 95, 88, 76, 82, 90, 87, 93, 89, 91],
    [80, 88, 75, 90, 85, 72, 78, 86, 83, 89, 85, 87]
  ]
}
```

从图表结构判断，该模块表达的是“两个统计周期 / 两组对象的能耗对比”。但当前代码中没有图例、系列名称和筛选说明，因此业务语义还不完整。

#### 4.5.3 交互逻辑

- 页面加载时初始化柱状图
- 浏览器尺寸变化时执行 `resize()`
- 当前不随设备类型、时间、区域变化

#### 4.5.4 当前真实取数方式

- 来源：`compareChartInstance.setOption()` 中硬编码数据
- 类型：前端静态图表配置

#### 4.5.5 建议 API 接口

##### 接口 5：获取能耗环比分析数据

- 方法：`GET`
- 路径：`/api/energy-analysis/compare`
- 参数：
  - `dateTime`
  - `deviceType`
  - `areaId`
  - `compareType`：如 `mom`（环比）/ `yoy`（同比）

请求示例：

```http
GET /api/energy-analysis/compare?dateTime=2026-02-28%2016:00:00&deviceType=CU&areaId=area-1&compareType=mom
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "xAxis": ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12"],
    "legends": ["本周期", "上周期"],
    "series": [
      { "name": "本周期", "type": "bar", "data": [85, 92, 78, 95, 88, 76, 82, 90, 87, 93, 89, 91] },
      { "name": "上周期", "type": "bar", "data": [80, 88, 75, 90, 85, 72, 78, 86, 83, 89, 85, 87] }
    ],
    "unit": "kWh"
  }
}
```

## 5. 推荐接口整合方案

如果希望减少页面请求次数，建议提供聚合接口：

### 接口 6：获取能耗分析页总览数据

- 方法：`GET`
- 路径：`/api/energy-analysis/overview`
- 参数：
  - `dateTime`
  - `deviceType`
  - `areaId`

请求示例：

```http
GET /api/energy-analysis/overview?dateTime=2026-02-28%2016:00:00&deviceType=CU&areaId=area-1
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "filters": {
      "dateTime": "2026-02-28 16:00:00",
      "deviceType": "CU",
      "areaId": "area-1"
    },
    "kpis": [
      { "label": "本月能耗", "value": 45280, "unit": "kWh", "trend": "+5.2%", "trendType": "up", "progress": 65 },
      { "label": "本年能耗", "value": 520150, "unit": "kWh", "trend": "-3.2%", "trendType": "down", "progress": 78 },
      { "label": "节约率", "value": 15.8, "unit": "%", "subValue": "同比上季度", "progress": 15.8 },
      { "label": "节能目标完成度", "value": 82, "unit": "%", "subValue": "目标: 630000", "progress": 82 }
    ],
    "trend": {
      "xAxis": ["2/4", "2/5", "2/6", "2/7", "2/8", "2/9", "2/10", "2/11", "2/12", "2/13", "2/14", "2/15", "2/16", "2/17", "2/18"],
      "series": [3200, 3400, 3100, 3300, 3600, 3500, 3400, 3300, 3500, 3600, 3400, 3300, 3500, 3400, 3200],
      "unit": "kWh"
    },
    "ranking": {
      "unit": "kWh",
      "list": [
        { "name": "酿造一车间", "value": 12450, "percent": 100 },
        { "name": "包装中心", "value": 10200, "percent": 82 },
        { "name": "仓储区", "value": 8900, "percent": 71 }
      ]
    },
    "compare": {
      "xAxis": ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12"],
      "legends": ["本周期", "上周期"],
      "series": [
        { "name": "本周期", "type": "bar", "data": [85, 92, 78, 95, 88, 76, 82, 90, 87, 93, 89, 91] },
        { "name": "上周期", "type": "bar", "data": [80, 88, 75, 90, 85, 72, 78, 86, 83, 89, 85, 87] }
      ],
      "unit": "kWh"
    }
  }
}
```

## 6. 前后端联调建议

### 6.1 建议优先改造点

建议按以下顺序改造：

1. 把左侧区域树从静态 DOM 改成树形数据驱动
2. 给时间输入框接入真实日期时间组件
3. 把 KPI 区改成数组渲染
4. 把趋势图、排行榜、环比图改成接口驱动
5. 增加 `watch` 或统一 `loadPageData()`，使筛选条件变化后自动刷新页面

### 6.2 推荐前端状态模型

```js
state = {
  filterDate: '2026-02-28 16:00:00',
  selectedType: 'CU',
  selectedArea: '',
  deviceTypes: [],
  areaTree: [],
  kpis: [],
  trendData: null,
  rankList: [],
  compareData: null
}
```

### 6.3 推荐页面刷新逻辑

```js
watch([filterDate, selectedType, selectedArea], () => {
  loadEnergyAnalysisData()
})
```

## 7. 页面现状评估

从实现完整度看，当前 EnergyAnalysis 页面比 Dashboard 更偏“静态原型”：

- Dashboard 已经具备基础场景联动
- EnergyAnalysis 目前只有样式层和局部状态
- 设备类型按钮虽可切换选中态，但没有带动业务数据变化
- 区域树还不是可配置树结构
- KPI 和图表数据均未抽离为统一数据模型

因此，这一页后续最核心的工作不是“接单个接口”，而是先完成页面的数据结构化改造。

## 8. 结论

当前 EnergyAnalysis 建议按以下接口模块落地：

1. 筛选初始化接口
2. KPI 概览接口
3. 能耗趋势图接口
4. 能效排行接口
5. 能耗环比分析接口
6. 或一个总览聚合接口

如果你要，我下一步可以继续帮你做两件事：

- 直接生成“EnergyAnalysis 接口字段说明表”
- 继续把 `src/views/EnergyAnalysis.vue` 改造成真实 API 驱动版本

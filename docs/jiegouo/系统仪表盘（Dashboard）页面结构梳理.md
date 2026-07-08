# 系统仪表盘（Dashboard）页面结构梳理

## 1. 文档说明

- 页面来源：`src/views/Dashboard.vue`
- 组件依赖：`src/components/DataCard.vue`、`src/components/KPICard.vue`
- 图表依赖：ECharts 通过 `index.html` 中 CDN 全局注入 `window.echarts`
- 当前实现状态：Dashboard 页面**暂无真实后端 API 调用**，页面数据全部来自前端本地静态数据与计算属性，包括：
  - `navigationTree`：区域导航树
  - `baseEnergy`：实时照明能耗基础数据
  - `baseTrend`：近 30 天趋势基础数据
  - `sceneMap`：按园区 / 建筑 / 区域切换后的场景数据映射

本文中的“API 接口”均为**基于当前页面结构反推的建议接口设计**，用于后续前后端联调；并非当前代码中已经存在的真实请求。

## 2. 页面整体结构

Dashboard 页面采用三栏式结构：

- 左侧：区域导航 + 实时照明能耗及节约值
- 中间：顶部 KPI 指标卡
- 右侧：近 30 天设备类型能耗与节能率趋势 + 室内环境监控

页面核心状态链路如下：

1. 用户通过“园区 / 建筑 / 区域”筛选
2. 页面生成 `currentSceneKey`
3. 从 `sceneMap[currentSceneKey]` 取出当前场景数据
4. KPI、能耗图、趋势图、环境监控同步更新
5. 若用户切换“当天 / 当月 / 当季度”，则仅刷新实时能耗图表

关键计算关系：

```js
currentSceneKey = currentArea?.key ?? (selectedBuilding || selectedCampus)
currentScene = sceneMap[currentSceneKey]
energyChartData = currentScene.energy[selectedFilter]
trendChartData = currentScene.trend
```

## 3. 功能模块拆解

### 3.1 模块一：区域导航

#### 3.1.1 元素组成

该模块位于左侧第一张卡片，包含：

1. 标题区：`区域导航`
2. 当前筛选路径：
   - 标签：`当前筛选路径`
   - 路径 chip：园区 / 建筑 / 区域，使用 `/` 拼接
3. 三个筛选入口按钮：
   - 园区按钮
   - 建筑按钮
   - 区域按钮
4. 弹层选择器：
   - 标题：`选择园区 / 建筑 / 区域`
   - 当前值提示
   - 楼层过滤（仅区域弹层展示）
   - 选项列表
   - 关闭按钮
5. 模块说明文案

#### 3.1.2 当前前端数据结构

当前使用 `navigationTree` 本地静态数据，结构示例如下：

```json
[
  {
    "label": "一号园区",
    "value": "park-1",
    "buildings": [
      {
        "label": "制曲车间",
        "value": "building-a",
        "floors": [
          {
            "label": "1层",
            "value": "f1",
            "areas": [
              { "label": "包装区", "value": "packaging", "key": "packaging" },
              { "label": "输送区", "value": "conveyor", "key": "conveyor" }
            ]
          },
          {
            "label": "2层",
            "value": "f2",
            "areas": [
              { "label": "仓储区", "value": "storage", "key": "storage" },
              { "label": "检验区", "value": "inspection", "key": "inspection" }
            ]
          }
        ]
      }
    ]
  }
]
```

派生数据包括：

- `campusOptions`：园区列表
- `buildingOptions`：当前园区下建筑列表
- `areaOptions`：当前建筑下区域列表，并补充 `floorValue` / `floorLabel`
- `currentCampus` / `currentBuilding` / `currentArea`：当前选中项
- `currentPathSegments`：当前路径数组

#### 3.1.3 交互逻辑

1. 点击“园区”按钮：打开园区选择弹层
2. 点击“建筑”按钮：打开建筑选择弹层
3. 点击“区域”按钮：
   - 若未选择建筑，则按钮禁用
   - 若已选择建筑，则打开区域选择弹层
4. 切换园区时：
   - 更新 `selectedCampus`
   - 清空 `selectedBuilding`
   - 清空 `selectedArea`
5. 切换建筑时：
   - 更新 `selectedBuilding`
   - 清空 `selectedArea`
6. 选择区域时：更新 `selectedArea`
7. 区域弹层支持按楼层二次过滤
8. 选择完成或点击遮罩 / 关闭按钮后，弹层关闭

#### 3.1.4 当前真实取数方式

- 来源：`navigationTree`
- 类型：前端静态常量
- 当前代码中无 `axios` / `fetch` 请求

#### 3.1.5 建议 API 接口

- 方法：`GET`
- 路径：`/api/dashboard/navigation-tree`
- 用途：获取园区 / 建筑 / 楼层 / 区域树

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "label": "一号园区",
      "value": "park-1",
      "buildings": [
        {
          "label": "制曲车间",
          "value": "building-a",
          "floors": [
            {
              "label": "1层",
              "value": "f1",
              "areas": [
                { "label": "包装区", "value": "packaging", "key": "packaging" },
                { "label": "输送区", "value": "conveyor", "key": "conveyor" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 3.2 模块二：顶部 KPI 指标卡

#### 3.2.1 元素组成

该模块位于中间区域，共 3 张 KPI 卡片：

1. 累计节约电费
2. 照明节能率
3. 累计碳排放量

每张卡片包含：

- 指标名称 `label`
- 指标值 `value`
- 单位 `unit`
- 辅助说明 `subValue`
- 辅助图标 `subIcon`
- 数值颜色 `valueColor`

#### 3.2.2 当前前端数据结构

当前数据来自 `currentScene.kpis`，示例如下：

```json
[
  {
    "label": "累计节约电费",
    "value": "45,200",
    "unit": "¥",
    "subValue": "节约1,500kWh",
    "subIcon": "⚡",
    "valueColor": "#FFC857"
  },
  {
    "label": "照明节能率",
    "value": "32.5",
    "unit": "%",
    "subValue": "+1.5%效率提升",
    "subIcon": "↗",
    "valueColor": "#35F6D4"
  },
  {
    "label": "累计碳排放量",
    "value": "38.2",
    "unit": "t",
    "subValue": "符合ESG标准",
    "subIcon": "🌿",
    "valueColor": "#59E3FF"
  }
]
```

#### 3.2.3 交互逻辑

1. KPI 卡片本身无点击交互
2. 当区域导航切换后，`currentScene` 变化
3. `KPICard` 通过 `v-for` 自动重渲染

#### 3.2.4 当前真实取数方式

- 来源：`sceneMap[currentSceneKey].kpis`
- 类型：前端静态场景数据

#### 3.2.5 建议 API 接口

- 方法：`GET`
- 路径：`/api/dashboard/summary`
- 参数：
  - `campusId`：园区 ID，必填
  - `buildingId`：建筑 ID，可选
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/dashboard/summary?campusId=park-1&buildingId=building-a&areaId=packaging
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "sceneKey": "packaging",
    "kpis": [
      {
        "label": "累计节约电费",
        "value": "45,200",
        "unit": "¥",
        "subValue": "节约1,500kWh",
        "subIcon": "⚡",
        "valueColor": "#FFC857"
      },
      {
        "label": "照明节能率",
        "value": "32.5",
        "unit": "%",
        "subValue": "+1.5%效率提升",
        "subIcon": "↗",
        "valueColor": "#35F6D4"
      },
      {
        "label": "累计碳排放量",
        "value": "38.2",
        "unit": "t",
        "subValue": "符合ESG标准",
        "subIcon": "🌿",
        "valueColor": "#59E3FF"
      }
    ]
  }
}
```

### 3.3 模块三：实时照明能耗及节约值

#### 3.3.1 元素组成

该模块位于左侧第二张卡片，包含：

1. 标题：`实时照明能耗及节约值`
2. 维度切换按钮：
   - 当天 `day`
   - 当月 `month`
   - 当季度 `quarter`
3. ECharts 图表容器 `energyChart`
4. 图例：标准值 / 当前值 / 节约率

#### 3.3.2 当前前端数据结构

数据来源链路：

- 基础数据：`baseEnergy`
- 场景修正：`shiftEnergy(baseEnergy, config.energyShift, config.rateShift)`
- 当前图表数据：`currentScene.energy[selectedFilter]`

示例（包装区 + 当天）：

```json
{
  "xAxisData": ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
  "baseline": [120, 80, 60, 150, 180, 160, 200, 140],
  "current": [40, 30, 20, 50, 60, 55, 70, 45],
  "saveRate": [25, 27, 25, 25, 25, 26, 26, 24]
}
```

#### 3.3.3 交互逻辑

1. 默认维度为 `day`
2. 用户点击“当天 / 当月 / 当季度”按钮时，执行 `changeFilter(value)`
3. 监听器 `watch([selectedFilter, currentSceneKey], ...)` 触发图表刷新
4. 页面挂载时初始化 ECharts
5. 浏览器尺寸变化时执行图表 `resize()`

#### 3.3.4 当前真实取数方式

- 来源：`sceneMap[currentSceneKey].energy[selectedFilter]`
- 类型：前端静态数据 + 前端计算生成

#### 3.3.5 建议 API 接口

- 方法：`GET`
- 路径：`/api/dashboard/energy`
- 参数：
  - `campusId`：园区 ID，必填
  - `buildingId`：建筑 ID，可选
  - `areaId`：区域 ID，可选
  - `dimension`：`day | month | quarter`

请求示例：

```http
GET /api/dashboard/energy?campusId=park-1&buildingId=building-a&areaId=packaging&dimension=day
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "dimension": "day",
    "xAxisData": ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
    "baseline": [120, 80, 60, 150, 180, 160, 200, 140],
    "current": [40, 30, 20, 50, 60, 55, 70, 45],
    "saveRate": [25, 27, 25, 25, 25, 26, 26, 24],
    "unit": "kWh",
    "rateUnit": "%"
  }
}
```

### 3.4 模块四：近 30 天设备类型能耗与节能率趋势

#### 3.4.1 元素组成

该模块位于右侧第一张卡片，包含：

1. 标题：`近30天设备类型能耗与节能率趋势`
2. ECharts 图表容器 `trendChart`
3. 图例：
   - CU 能耗
   - SCU 能耗
   - OCSR 能耗
   - 节能率

#### 3.4.2 当前前端数据结构

数据来源链路：

- 基础数据：`baseTrend`
- 场景修正：根据 `trendShift` / `rateShift` 对数组偏移
- 当前图表数据：`currentScene.trend`

示例结构：

```json
{
  "days": ["1日", "2日", "3日", "4日", "5日"],
  "cu": [122, 146, 135, 118, 140],
  "scu": [112, 108, 124, 85, 80],
  "ocsr": [83, 74, 85, 84, 80],
  "rate": [36, 31, 34, 30, 37]
}
```

#### 3.4.3 交互逻辑

1. 模块本身无显式筛选按钮
2. 当区域导航变更时，`currentSceneKey` 变化
3. 监听器触发 `updateTrendChart()` 重新渲染图表
4. 页面挂载时初始化 ECharts
5. 浏览器尺寸变化时执行图表自适应

#### 3.4.4 当前真实取数方式

- 来源：`sceneMap[currentSceneKey].trend`
- 类型：前端静态数据 + 前端计算生成

#### 3.4.5 建议 API 接口

- 方法：`GET`
- 路径：`/api/dashboard/device-trend`
- 参数：
  - `campusId`：园区 ID，必填
  - `buildingId`：建筑 ID，可选
  - `areaId`：区域 ID，可选
  - `days`：默认 30

请求示例：

```http
GET /api/dashboard/device-trend?campusId=park-1&buildingId=building-a&areaId=packaging&days=30
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "days": ["1日", "2日", "3日", "4日", "5日", "6日", "7日", "8日", "9日", "10日", "11日", "12日", "13日", "14日", "15日", "16日", "17日", "18日", "19日", "20日", "21日", "22日", "23日", "24日", "25日", "26日", "27日", "28日", "29日", "30日"],
    "cu": [122, 146, 135, 118, 140, 142, 111, 112, 116, 138, 145, 128, 116, 114, 144, 140, 146, 151, 120, 118, 142, 143, 114, 119, 145, 132, 126, 138, 123, 112],
    "scu": [112, 108, 124, 85, 80, 112, 89, 87, 91, 120, 116, 83, 114, 111, 79, 114, 108, 88, 91, 90, 80, 114, 81, 83, 87, 88, 90, 98, 90, 82],
    "ocsr": [83, 74, 85, 84, 80, 66, 62, 60, 61, 79, 82, 61, 84, 82, 72, 90, 84, 85, 74, 86, 87, 74, 77, 79, 83, 85, 72, 62, 60, 61],
    "rate": [36, 31, 34, 30, 37, 35, 32, 34, 33, 38, 31, 35, 30, 31, 32, 34, 33, 34, 35, 30, 37, 31, 30, 32, 39, 35, 34, 31, 33, 28],
    "unit": "kWh",
    "rateUnit": "%"
  }
}
```

### 3.5 模块五：室内环境监控

#### 3.5.1 元素组成

该模块位于右侧第二张卡片，包含两个子区域：

A. AQI 区域

- 标题：`综合空气质量指数 (AQI)`
- 状态文本：如“优良”“良好”
- 5 段式状态条：通过 `activeBars` 控制点亮数量

B. 环境指标列表

每项指标包含：

- 图标缩写
- 指标名称
- 进度条
- 数值
- 状态

当前展示 4 项：PM 2.5、CO₂、温度、湿度。

#### 3.5.2 当前前端数据结构

当前数据来自 `currentScene.aqi` 与 `currentScene.environmentMetrics`，示例如下：

```json
{
  "aqi": {
    "label": "优良",
    "activeBars": 3
  },
  "environmentMetrics": [
    { "name": "PM 2.5", "icon": "PM", "value": "25 ug/m³", "status": "正常", "progress": 35 },
    { "name": "CO₂", "icon": "CO", "value": "434 ppm", "status": "正常", "progress": 45 },
    { "name": "温度", "icon": "温", "value": "22 ℃", "status": "正常", "progress": 55 },
    { "name": "湿度", "icon": "湿", "value": "54 %", "status": "正常", "progress": 54 }
  ]
}
```

#### 3.5.3 交互逻辑

1. 模块本身无主动交互
2. 当园区 / 建筑 / 区域切换时，环境数据随 `currentScene` 同步切换

#### 3.5.4 当前真实取数方式

- 来源：`sceneMap[currentSceneKey].aqi`、`sceneMap[currentSceneKey].environmentMetrics`
- 类型：前端静态场景数据

#### 3.5.5 建议 API 接口

- 方法：`GET`
- 路径：`/api/dashboard/environment`
- 参数：
  - `campusId`：园区 ID，必填
  - `buildingId`：建筑 ID，可选
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/dashboard/environment?campusId=park-1&buildingId=building-a&areaId=packaging
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "aqi": {
      "label": "优良",
      "activeBars": 3
    },
    "environmentMetrics": [
      { "name": "PM 2.5", "icon": "PM", "value": "25 ug/m³", "status": "正常", "progress": 35 },
      { "name": "CO₂", "icon": "CO", "value": "434 ppm", "status": "正常", "progress": 45 },
      { "name": "温度", "icon": "温", "value": "22 ℃", "status": "正常", "progress": 55 },
      { "name": "湿度", "icon": "湿", "value": "54 %", "status": "正常", "progress": 54 }
    ]
  }
}
```

## 4. 当前 Dashboard 的真实实现结论

当前 `Dashboard.vue` 未发现任何真实后端请求行为：

- 无 `axios.get/post`
- 无 `fetch()`
- 无统一 request 封装调用
- 无 `/api/...` 请求

也就是说，当前 Dashboard 仍处于“前端静态 mock 数据驱动”的实现阶段。

## 5. 推荐接口整合方案

如果后端希望减少前端请求次数，可提供聚合接口：

- 方法：`GET`
- 路径：`/api/dashboard/overview`
- 参数：
  - `campusId`
  - `buildingId`
  - `areaId`
  - `dimension`

返回结构建议聚合以下数据块：

- `path`
- `kpis`
- `energy`
- `trend`
- `environment`

示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "sceneKey": "packaging",
    "path": {
      "campusId": "park-1",
      "campusName": "一号园区",
      "buildingId": "building-a",
      "buildingName": "制曲车间",
      "areaId": "packaging",
      "areaName": "包装区"
    },
    "kpis": [
      {
        "label": "累计节约电费",
        "value": "45,200",
        "unit": "¥",
        "subValue": "节约1,500kWh",
        "subIcon": "⚡",
        "valueColor": "#FFC857"
      }
    ],
    "energy": {
      "dimension": "day",
      "xAxisData": ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
      "baseline": [120, 80, 60, 150, 180, 160, 200, 140],
      "current": [40, 30, 20, 50, 60, 55, 70, 45],
      "saveRate": [25, 27, 25, 25, 25, 26, 26, 24]
    },
    "trend": {
      "days": ["1日", "2日", "3日", "4日", "5日"],
      "cu": [122, 146, 135, 118, 140],
      "scu": [112, 108, 124, 85, 80],
      "ocsr": [83, 74, 85, 84, 80],
      "rate": [36, 31, 34, 30, 37]
    },
    "environment": {
      "aqi": { "label": "优良", "activeBars": 3 },
      "environmentMetrics": [
        { "name": "PM 2.5", "icon": "PM", "value": "25 ug/m³", "status": "正常", "progress": 35 }
      ]
    }
  }
}
```

## 6. 前后端联调建议

推荐替换顺序：

1. 先把 `navigationTree` 改成导航树接口
2. 再把 `sceneMap/currentScene` 拆分为真实接口数据
3. 保留 `selectedFilter` 为前端状态，通过参数传给能耗接口
4. ECharts 的 `setOption()` 基本可保持不变，只替换数据来源

## 7. 结论

当前 Dashboard 的页面结构和联动关系已经比较清晰，建议按以下接口模块落地：

1. 区域导航树接口
2. KPI 概览接口
3. 实时照明能耗接口
4. 近 30 天设备趋势接口
5. 室内环境监控接口
6. 或一个聚合总览接口

如果后续你需要，我还可以继续补：

- 接口字段说明表（字段名 / 类型 / 必填 / 备注）
- 把当前 Dashboard 直接改造成真实 API 版

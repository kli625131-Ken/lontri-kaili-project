# 设备运维页面（DeviceMaintenance）结构梳理

## 1. 文档说明

- 页面来源：`src/views/DeviceMaintenance.vue`
- 路由配置：`src/router/index.js`
- 组件依赖：`src/components/DataCard.vue`
- 图表依赖：ECharts 通过 `index.html` 中 CDN 全局注入 `window.echarts`
- 当前实现状态：DeviceMaintenance 页面**暂无真实后端 API 调用**，主要由前端静态设备数据、计算属性和静态图表配置构成

当前页面已经具备“设备列表 + 运维概览 + 统计图”的完整展示骨架，也实现了基础搜索、分页和图表初始化。但它仍处于“静态演示数据驱动”阶段，尚未形成真正的运维业务闭环。本文中的 API 接口均为基于现有页面结构反推的建议设计，用于后续联调与改造。

## 2. 页面整体结构

页面采用左右双栏布局：

- 左侧：设备状态列表
- 右侧：运维事件总览 + 告警统计 + 分布类型 + 处理状态

### 2.1 页面层次

1. 页面根节点 `device-maintenance-page`
2. 页面主体 `page-content`
3. 左侧设备状态卡片 `status-card`
4. 右侧统计区 `right-section`

### 2.2 页面功能分区

页面可以拆成 6 个核心模块：

1. 设备状态查询与列表
2. 设备状态分页
3. 运维事件总览
4. 告警统计图
5. 分布类型图
6. 处理状态图

## 3. 当前页面真实实现结论

在 `src/views/DeviceMaintenance.vue` 中，当前页面具有以下特征：

- 有基础搜索功能
- 有前端分页能力
- 有 `computed` 派生数据
- 有 3 个 ECharts 图表
- 无 `watch`
- 无 `axios` / `fetch`
- 无 `/api/...` 请求
- 事件总览卡片数据直接写在模板中
- 图表数据直接写在 `setOption()` 中

这意味着当前页面已经不是纯静态 HTML，而是一个有基础交互能力的前端原型页；但数据源仍全部来自本地常量，并未接入真实设备运维系统。

## 4. 功能模块拆解

### 4.1 模块一：设备状态查询与列表

#### 4.1.1 元素组成

该模块位于页面左侧主体区域，包含：

1. 标题：设备状态
2. 搜索栏
   - 搜索输入框
   - 查询按钮
3. 设备表格
   - 表头列：
     - 设备名称
     - 区域
     - 温度
     - 电流电压
     - 能耗
     - 寿命
4. 表格行数据
   - 每行展示一台设备
   - 温度 / 电流电压 / 能耗以状态 badge 展示
   - 寿命以小时显示，如 `10000h`

#### 4.1.2 当前前端数据结构

当前列表数据来自 `devices`：

```json
[
  {
    "name": "GWA06#0101-001",
    "area": "包装厂房",
    "temperature": "normal",
    "voltage": "normal",
    "energy": "normal",
    "life": 10000
  },
  {
    "name": "GWA06#0101-002",
    "area": "包装厂房",
    "temperature": "normal",
    "voltage": "normal",
    "energy": "normal",
    "life": 10000
  }
]
```

字段语义如下：

- `name`：设备编号或设备名称
- `area`：所属区域
- `temperature`：温度状态，当前取值 `normal | abnormal`
- `voltage`：电流电压状态，当前取值 `normal | abnormal`
- `energy`：能耗状态，当前取值 `normal | abnormal`
- `life`：剩余寿命或寿命值，单位小时

#### 4.1.3 交互逻辑

当前已经实现的交互如下：

1. 输入搜索关键字时，`searchQuery` 实时变化
2. `filteredDevices` 计算属性根据 `searchQuery` 对设备名称做模糊匹配
3. 若搜索词为空，则返回全部设备
4. 表格真正渲染的数据来源是 `paginatedDevices`
5. 所以搜索与分页是串联关系：先过滤，再分页

当前交互也有两个值得注意的点：

1. 查询按钮没有绑定点击逻辑
   - 因为搜索已经由 `computed` 实时完成
   - 所以按钮当前只是视觉元素
2. 搜索范围只有设备名称
   - 当前不会搜索区域
   - 也不会按状态过滤

#### 4.1.4 当前真实取数方式

- 来源：`devices` 本地 `ref`
- 搜索结果：`filteredDevices`
- 当前页数据：`paginatedDevices`
- 当前无后端查询接口

#### 4.1.5 建议 API 接口

##### 接口 1：获取设备状态列表

- 方法：`GET`
- 路径：`/api/device-maintenance/devices`
- 参数：
  - `keyword`：搜索关键字，可选
  - `pageNum`：页码
  - `pageSize`：每页数量
  - `areaId`：区域 ID，可选
  - `status`：状态筛选，可选

请求示例：

```http
GET /api/device-maintenance/devices?keyword=GWA06&pageNum=1&pageSize=12
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "dev-001",
        "name": "GWA06#0101-001",
        "area": "包装厂房",
        "temperature": "normal",
        "voltage": "normal",
        "energy": "normal",
        "life": 10000
      },
      {
        "id": "dev-002",
        "name": "GWA06#0101-002",
        "area": "包装厂房",
        "temperature": "normal",
        "voltage": "abnormal",
        "energy": "normal",
        "life": 9650
      }
    ],
    "pageNum": 1,
    "pageSize": 12,
    "total": 28
  }
}
```

### 4.2 模块二：设备状态分页

#### 4.2.1 元素组成

分页区位于设备表格底部，包含：

1. 分页信息文案
   - 当前显示起止条数
   - 总条数
2. 分页按钮区
   - 上一页按钮
   - 当前页 / 总页数
   - 下一页按钮

#### 4.2.2 当前前端数据结构

当前分页相关状态为：

```json
{
  "currentPage": 1,
  "pageSize": 12,
  "totalPages": 1
}
```

其中：

- `currentPage`：当前页码
- `pageSize`：每页条数
- `totalPages`：由 `filteredDevices.length / pageSize` 向上取整得到

#### 4.2.3 交互逻辑

1. 点击“上一页”时，直接执行 `currentPage--`
2. 点击“下一页”时，直接执行 `currentPage++`
3. 当处于第一页时，“上一页”按钮禁用
4. 当处于最后一页时，“下一页”按钮禁用
5. 分页统计文案根据当前页和过滤结果实时计算

额外注意点：

- 页面里声明了 `prevPage`、`nextPage`、`goToPage` 方法
- 但模板里实际没有调用这些方法
- 当前分页行为直接写在按钮 `@click` 上

#### 4.2.4 当前真实取数方式

- 全量设备数据：本地 `devices`
- 当前页逻辑：纯前端分页

#### 4.2.5 建议 API 接口

若采用服务端分页，则可沿用“设备状态列表”接口，不需要单独分页接口。返回体建议统一包含：

```json
{
  "pageNum": 1,
  "pageSize": 12,
  "total": 28,
  "pages": 3
}
```

若保留前端分页，则需要一次性拉全量设备列表，不太适合真实运维场景。

### 4.3 模块三：事件总览

#### 4.3.1 元素组成

该模块位于右侧统计区左上角，包含 4 个统计卡块：

1. 今日事件
2. 已处理
3. 待处理
4. 总事件

每个卡块包含：

- 数值
- 标签

#### 4.3.2 当前前端数据结构

当前数据直接写在模板中，按语义整理如下：

```json
{
  "todayEvents": 5,
  "processed": 3,
  "pending": 2,
  "totalEvents": 18
}
```

#### 4.3.3 交互逻辑

- 当前模块无点击交互
- 当前也不会随着列表搜索、分页变化而变化
- 无自动刷新机制

#### 4.3.4 当前真实取数方式

- 来源：模板硬编码
- 类型：静态展示值

#### 4.3.5 建议 API 接口

##### 接口 2：获取运维事件总览

- 方法：`GET`
- 路径：`/api/device-maintenance/event-summary`
- 参数：
  - `date`：统计日期，可选
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/device-maintenance/event-summary?date=2026-03-17
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "todayEvents": 5,
    "processed": 3,
    "pending": 2,
    "totalEvents": 18
  }
}
```

### 4.4 模块四：告警统计

#### 4.4.1 元素组成

该模块位于右侧统计区右上角，包含：

1. 标题：告警统计
2. 柱状图容器 `alarmChart`

#### 4.4.2 当前前端数据结构

图表数据直接写在 `setOption()` 中，整理如下：

```json
{
  "xAxis": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  "series": [5, 3, 8, 4, 6, 2, 3]
}
```

#### 4.4.3 交互逻辑

1. 页面首次加载时执行 `initCharts()`
2. 初始化 ECharts 实例并设置柱状图配置
3. 浏览器窗口变化时调用 `resize()`
4. 当前图表没有筛选条件，也没有点击事件

#### 4.4.4 当前真实取数方式

- 来源：`alarmChartInstance.setOption()` 中的硬编码数组
- 类型：静态图表配置

#### 4.4.5 建议 API 接口

##### 接口 3：获取告警统计

- 方法：`GET`
- 路径：`/api/device-maintenance/alarm-stats`
- 参数：
  - `rangeType`：如 `7d` / `30d`
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/device-maintenance/alarm-stats?rangeType=7d
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "xAxis": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    "series": [5, 3, 8, 4, 6, 2, 3],
    "unit": "count"
  }
}
```

### 4.5 模块五：分布类型

#### 4.5.1 元素组成

该模块位于右侧统计区左下角，包含：

1. 标题：分布类型
2. 玫瑰图 / 饼图容器 `typeChart`

从当前配置看，它想表达的是不同设备类型或数据类型的占比分布。

#### 4.5.2 当前前端数据结构

当前图表数据结构如下：

```json
[
  { "name": "GW", "value": 35 },
  { "name": "CU", "value": 25 },
  { "name": "SCU", "value": 22 },
  { "name": "OCSR", "value": 18 }
]
```

#### 4.5.3 交互逻辑

1. 页面加载时初始化图表
2. 使用 `roseType: "radius"` 展示玫瑰图效果
3. `GW` 默认被选中突出显示
4. 当前图表没有绑定点击联动逻辑

#### 4.5.4 当前真实取数方式

- 来源：`typeChartInstance.setOption()` 中的 `series[0].data`
- 类型：静态图表配置

#### 4.5.5 建议 API 接口

##### 接口 4：获取设备类型分布

- 方法：`GET`
- 路径：`/api/device-maintenance/type-distribution`
- 参数：
  - `date`：统计日期，可选
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/device-maintenance/type-distribution?date=2026-03-17
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      { "name": "GW", "value": 35 },
      { "name": "CU", "value": 25 },
      { "name": "SCU", "value": 22 },
      { "name": "OCSR", "value": 18 }
    ]
  }
}
```

### 4.6 模块六：处理状态

#### 4.6.1 元素组成

该模块位于右侧统计区右下角，包含：

1. 标题：处理状态
2. 图例
   - 待处理
   - 处理中
   - 已处理
3. 环形饼图容器 `processChart`

#### 4.6.2 当前前端数据结构

当前图表数据整理如下：

```json
{
  "legend": ["待处理", "处理中", "已处理"],
  "data": [
    { "name": "待处理", "value": 50 },
    { "name": "处理中", "value": 28 },
    { "name": "已处理", "value": 22 }
  ]
}
```

#### 4.6.3 交互逻辑

1. 页面加载时初始化环形图
2. 图例与饼图数据一一对应
3. 浏览器窗口变化时执行图表自适应
4. 当前图表没有点击筛选或联动逻辑

#### 4.6.4 当前真实取数方式

- 来源：`processChartInstance.setOption()` 中的静态饼图数据
- 类型：静态图表配置

#### 4.6.5 建议 API 接口

##### 接口 5：获取工单处理状态分布

- 方法：`GET`
- 路径：`/api/device-maintenance/process-status`
- 参数：
  - `date`：统计日期，可选
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/device-maintenance/process-status?date=2026-03-17
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "legend": ["待处理", "处理中", "已处理"],
    "data": [
      { "name": "待处理", "value": 50 },
      { "name": "处理中", "value": 28 },
      { "name": "已处理", "value": 22 }
    ]
  }
}
```

## 5. 推荐接口整合方案

如果希望减少首屏请求次数，建议增加聚合接口。

### 接口 6：获取设备运维页总览数据

- 方法：`GET`
- 路径：`/api/device-maintenance/overview`
- 参数：
  - `keyword`：搜索关键字，可选
  - `pageNum`
  - `pageSize`
  - `date`
  - `areaId`

请求示例：

```http
GET /api/device-maintenance/overview?keyword=GWA06&pageNum=1&pageSize=12&date=2026-03-17
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "devicePage": {
      "list": [
        {
          "id": "dev-001",
          "name": "GWA06#0101-001",
          "area": "包装厂房",
          "temperature": "normal",
          "voltage": "normal",
          "energy": "normal",
          "life": 10000
        }
      ],
      "pageNum": 1,
      "pageSize": 12,
      "total": 28
    },
    "eventSummary": {
      "todayEvents": 5,
      "processed": 3,
      "pending": 2,
      "totalEvents": 18
    },
    "alarmStats": {
      "xAxis": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      "series": [5, 3, 8, 4, 6, 2, 3]
    },
    "typeDistribution": {
      "list": [
        { "name": "GW", "value": 35 },
        { "name": "CU", "value": 25 },
        { "name": "SCU", "value": 22 },
        { "name": "OCSR", "value": 18 }
      ]
    },
    "processStatus": {
      "legend": ["待处理", "处理中", "已处理"],
      "data": [
        { "name": "待处理", "value": 50 },
        { "name": "处理中", "value": 28 },
        { "name": "已处理", "value": 22 }
      ]
    }
  }
}
```

## 6. 前后端联调建议

### 6.1 建议优先改造点

建议按下面顺序推进，会比较稳：

1. 先把设备列表改成接口驱动，并切换为服务端分页
2. 给搜索按钮绑定真实查询行为，或直接改为输入即查询
3. 把事件总览从模板硬编码改为对象渲染
4. 把三个图表的数据改成接口响应驱动
5. 增加统一的 `loadDeviceMaintenanceData()` 来拉取页面数据

### 6.2 推荐前端状态模型

```js
state = {
  searchQuery: '',
  currentPage: 1,
  pageSize: 12,
  selectedDate: '',
  selectedArea: '',
  devices: [],
  total: 0,
  eventSummary: null,
  alarmStats: null,
  typeDistribution: null,
  processStatus: null
}
```

### 6.3 推荐页面刷新逻辑

```js
watch([searchQuery, currentPage, pageSize, selectedDate, selectedArea], () => {
  loadDeviceMaintenanceData()
})
```

如果担心搜索框输入时请求过于频繁，可以对 `searchQuery` 做防抖处理。

## 7. 页面现状评估

从当前代码成熟度来看，这个页面处于“中间状态”：

- 比 `EnergyAnalysis` 更进一步，因为它已经有搜索、分页和计算属性
- 但比 `Dashboard` 弱在没有跨模块联动
- 右侧所有统计模块都还没有和左侧设备状态列表打通
- 查询按钮目前没有真正参与业务逻辑
- 页面已经适合作为真实运维页的第一版骨架

换句话说，这页的基础已经不错，后续重点是“把静态统计数据接到真实设备与工单数据上”。

## 8. 结论

当前 DeviceMaintenance 页面建议按以下接口模块落地：

1. 设备状态列表接口
2. 运维事件总览接口
3. 告警统计接口
4. 设备类型分布接口
5. 工单处理状态接口
6. 或一个总览聚合接口

如果你愿意，我们下一步可以继续往前推进两种方向中的任意一种：

- 继续生成“DeviceMaintenance 接口字段说明表”
- 直接把 `src/views/DeviceMaintenance.vue` 改造成真实 API 驱动版本

# 系统日志页面（SystemLogs）结构梳理

## 1. 文档说明

- 页面来源：`src/views/SystemLogs.vue`
- 路由配置：`src/router/index.js`
- 组件依赖：`src/components/DataCard.vue`
- 图表依赖：ECharts 通过 `index.html` 中 CDN 全局注入 `window.echarts`
- 当前实现状态：SystemLogs 页面**暂无真实后端 API 调用**，主要由前端静态日志数据、局部交互逻辑和静态图表配置构成

当前页面已经具备“筛选区 + 日志列表 + 统计面板 + 详情弹窗”的完整业务骨架，也实现了分页、详情查看、日志状态修改、最近告警滚动等交互。但页面仍然处于“静态演示数据驱动”阶段，筛选条件和导出动作尚未真正接通业务。本文中的 API 接口均为基于现有页面结构反推的建议设计，用于后续联调与改造。

## 2. 页面整体结构

页面采用三栏布局：

- 左侧：日志筛选面板
- 中间：日志列表与分页
- 右侧：日志统计、设备在线状态、最近告警

页面底部还包含一个全局日志详情弹窗。

### 2.1 页面层次

1. 页面根节点 `system-logs-page`
2. 页面主体 `page-content`
3. 左侧筛选卡片 `filter-card`
4. 中间日志列表卡片 `logs-card`
5. 右侧统计区 `right-section`
6. 弹窗层 `modal-overlay`

### 2.2 页面功能分区

页面可以拆成 8 个核心模块：

1. 日志筛选面板
2. 日志统计头部与导出
3. 日志列表表格
4. 日志分页
5. 日志统计图
6. 设备在线状态
7. 最近告警滚动列表
8. 日志详情弹窗

## 3. 当前页面真实实现结论

在 `src/views/SystemLogs.vue` 中，当前页面具有以下特征：

- 有筛选 UI
- 有 `computed` 派生数据
- 有前端分页能力
- 有日志详情弹窗
- 有“标记为已处理”本地修改能力
- 有最近告警自动滚动逻辑
- 有 2 个 ECharts 图表
- 无 `watch`
- 无 `axios` / `fetch`
- 无 `/api/...` 请求
- 快捷时间按钮尚未实现
- 查询按钮仅弹出提示，不真正筛选
- 导出按钮仅弹出提示，不真正导出

这意味着：页面的展示结构和操作骨架已经相当完整，但筛选、导出、统计与真实日志数据之间尚未打通。

## 4. 功能模块拆解

### 4.1 模块一：日志筛选面板

#### 4.1.1 元素组成

该模块位于页面左侧，包含 4 个区块：

1. 日志类型筛选
   - 单选按钮组
   - 类型包括：登录日志、操作日志、设备日志、系统日志
2. 时间范围筛选
   - 开始时间输入框
   - 结束时间输入框
   - 快捷时间按钮
3. 日志级别筛选
   - 信息
   - 警告
   - 异常
4. 查询按钮

#### 4.1.2 当前前端数据结构

当前筛选相关数据如下：

```json
{
  "logTypes": [
    { "label": "登录日志", "value": "login" },
    { "label": "操作日志", "value": "operation" },
    { "label": "设备日志", "value": "device" },
    { "label": "系统日志", "value": "system" }
  ],
  "logLevels": [
    { "label": "信息", "value": "info" },
    { "label": "警告", "value": "warning" },
    { "label": "异常", "value": "error" }
  ],
  "quickBtns": [
    { "label": "今天", "value": "today" },
    { "label": "昨天", "value": "yesterday" },
    { "label": "近7天", "value": "week" },
    { "label": "近30天", "value": "month" }
  ],
  "selectedType": "login",
  "selectedLevels": ["info", "warning", "error"],
  "startTime": "2026-03-07T00:00",
  "endTime": "2026-03-08T23:59"
}
```

#### 4.1.3 交互逻辑

当前已实现或部分实现的交互如下：

1. 切换日志类型时
   - `selectedType` 会变化
   - 中间日志卡片标题会同步变化
   - **不会真正过滤日志列表**
2. 点击日志级别标签时
   - 通过 `toggleLevel(level)` 在 `selectedLevels` 中增删对应值
   - 标签高亮状态会同步变化
   - **不会真正过滤日志列表**
3. 修改开始时间 / 结束时间时
   - `startTime` 与 `endTime` 会变化
   - **不会真正触发筛选**
4. 点击快捷时间按钮时
   - 调用 `setQuickTime(type)`
   - 但该方法当前是空实现
5. 点击“查询日志”按钮时
   - 调用 `searchLogs()`
   - 只会把 `currentPage` 重置为 1，并弹出“日志查询完成”提示
   - **不会真正更新日志数据**

#### 4.1.4 当前真实取数方式

- 筛选项来源：本地常量 `logTypes`、`logLevels`、`quickBtns`
- 当前筛选状态：本地 `ref`
- 当前无真实日志查询逻辑

#### 4.1.5 建议 API 接口

##### 接口 1：获取日志筛选项与默认值

- 方法：`GET`
- 路径：`/api/system-logs/filters`
- 用途：初始化日志类型、日志级别、默认时间范围

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "logTypes": [
      { "label": "登录日志", "value": "login" },
      { "label": "操作日志", "value": "operation" },
      { "label": "设备日志", "value": "device" },
      { "label": "系统日志", "value": "system" }
    ],
    "logLevels": [
      { "label": "信息", "value": "info" },
      { "label": "警告", "value": "warning" },
      { "label": "异常", "value": "error" }
    ],
    "defaultFilter": {
      "selectedType": "login",
      "selectedLevels": ["info", "warning", "error"],
      "startTime": "2026-03-07 00:00:00",
      "endTime": "2026-03-08 23:59:59"
    }
  }
}
```

### 4.2 模块二：日志统计头部与导出

#### 4.2.1 元素组成

该模块位于中间日志列表卡片顶部，包含：

1. 左侧统计区
   - 总记录数
   - 异常数
   - 警告数
2. 右侧导出按钮组
   - 导出 CSV
   - 导出 Excel

#### 4.2.2 当前前端数据结构

当前统计值来自 `logs` 与计算属性：

```json
{
  "total": 5,
  "errorCount": 1,
  "warningCount": 1
}
```

其中：

- `total`：`logs.length`
- `errorCount`：`logs` 中 `level === "error"` 的数量
- `warningCount`：`logs` 中 `level === "warning"` 的数量

#### 4.2.3 交互逻辑

1. 统计数字随着 `logs` 数组变化而变化
2. 点击导出按钮时，执行 `exportLogs(format)`
3. 当前导出逻辑只是弹出提示，不实际下载文件

#### 4.2.4 当前真实取数方式

- 来源：`logs` 本地 `ref`
- 统计方式：前端 `computed`
- 导出：前端占位方法

#### 4.2.5 建议 API 接口

##### 接口 2：获取日志统计概览

- 方法：`GET`
- 路径：`/api/system-logs/summary`
- 参数：
  - `type`
  - `levels`
  - `startTime`
  - `endTime`

请求示例：

```http
GET /api/system-logs/summary?type=login&levels=info,warning,error&startTime=2026-03-07%2000:00:00&endTime=2026-03-08%2023:59:59
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 5,
    "errorCount": 1,
    "warningCount": 1
  }
}
```

### 4.3 模块三：日志列表表格

#### 4.3.1 元素组成

该模块位于页面中间主体，包含：

1. 表头列：
   - 级别
   - 时间
   - 来源
   - 类型
   - 内容
   - 状态
2. 日志列表行
3. 每行支持点击查看详情

#### 4.3.2 当前前端数据结构

当前日志数据来自 `logs`，单条结构示例如下：

```json
{
  "id": 1,
  "level": "info",
  "levelText": "信息",
  "time": "2026-03-08 14:32:15",
  "source": "系统",
  "type": "login",
  "typeText": "登录",
  "content": "用户 admin 登录系统",
  "detail": "用户 admin 从 IP 192.168.1.100 登录系统，登录方式：网页端",
  "status": "normal",
  "statusText": "正常"
}
```

字段语义如下：

- `level`：日志级别，取值如 `info | warning | error`
- `levelText`：级别中文名
- `time`：发生时间
- `source`：来源对象，如用户、设备、系统
- `type`：日志类型，如 `login | operation | device | system`
- `typeText`：类型中文名
- `content`：简要内容
- `detail`：详情内容
- `status`：处理状态，当前存在 `normal | pending | resolved`
- `statusText`：状态中文名

#### 4.3.3 交互逻辑

1. 列表渲染来源是 `paginatedLogs`
2. 点击任一日志行时，执行 `showLogDetail(log)`
3. 该方法会把当前日志对象赋值给 `selectedLog`
4. 赋值成功后弹出详情弹窗

当前列表和筛选之间的真实关系需要特别说明：

- 当前 `selectedType` 不会过滤 `logs`
- 当前 `selectedLevels` 不会过滤 `logs`
- 当前时间范围不会过滤 `logs`
- 所以列表实际上始终展示 `logs` 原始数组的分页结果

#### 4.3.4 当前真实取数方式

- 来源：`logs` 本地 `ref`
- 分页结果：`paginatedLogs`
- 当前无筛选后的真正列表结果

#### 4.3.5 建议 API 接口

##### 接口 3：获取日志列表

- 方法：`GET`
- 路径：`/api/system-logs/list`
- 参数：
  - `type`：日志类型
  - `levels`：日志级别列表
  - `startTime`
  - `endTime`
  - `pageNum`
  - `pageSize`

请求示例：

```http
GET /api/system-logs/list?type=device&levels=warning,error&startTime=2026-03-07%2000:00:00&endTime=2026-03-08%2023:59:59&pageNum=1&pageSize=10
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 3,
        "level": "warning",
        "levelText": "警告",
        "time": "2026-03-08 14:15:22",
        "source": "GWA06#0102",
        "type": "device",
        "typeText": "设备",
        "content": "设备信号弱",
        "detail": "设备 GWA06#0102 信号强度低于阈值，当前 -78dBm，建议检查设备位置",
        "status": "pending",
        "statusText": "待处理"
      },
      {
        "id": 5,
        "level": "error",
        "levelText": "异常",
        "time": "2026-03-08 13:42:05",
        "source": "GWA06#0103",
        "type": "device",
        "typeText": "设备",
        "content": "设备离线",
        "detail": "设备 GWA06#0103 已离线超过 5 分钟，最后在线时间 13:37:00",
        "status": "pending",
        "statusText": "待处理"
      }
    ],
    "pageNum": 1,
    "pageSize": 10,
    "total": 2
  }
}
```

### 4.4 模块四：日志分页

#### 4.4.1 元素组成

分页区位于日志表格底部，包含：

1. 当前显示条数信息
2. 上一页按钮
3. 当前页 / 总页数
4. 下一页按钮

#### 4.4.2 当前前端数据结构

当前分页相关状态如下：

```json
{
  "currentPage": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

其中：

- `currentPage`：当前页码
- `pageSize`：固定为 10
- `totalPages`：由 `logs.length / pageSize` 向上取整

#### 4.4.3 交互逻辑

1. 点击“上一页”时，直接执行 `currentPage--`
2. 点击“下一页”时，直接执行 `currentPage++`
3. 按钮在边界页自动禁用
4. `paginatedLogs` 根据当前页截取 `logs`

#### 4.4.4 当前真实取数方式

- 来源：本地 `logs`
- 分页：前端分页

#### 4.4.5 建议 API 接口

如果使用服务端分页，可直接复用“日志列表接口”，返回体中建议统一包含：

```json
{
  "pageNum": 1,
  "pageSize": 10,
  "total": 56,
  "pages": 6
}
```

### 4.5 模块五：日志统计图

#### 4.5.1 元素组成

该模块位于右侧顶部，包含：

1. 标题：日志统计
2. 饼图容器 `statsChart`
3. 底部图例说明
   - 信息 65%
   - 警告 25%
   - 异常 10%

#### 4.5.2 当前前端数据结构

当前图表数据来自 `setOption()` 静态配置：

```json
{
  "series": [
    { "name": "信息", "value": 65 },
    { "name": "警告", "value": 25 },
    { "name": "异常", "value": 10 }
  ]
}
```

#### 4.5.3 交互逻辑

1. 页面加载时初始化饼图
2. 浏览器尺寸变化时执行 `resize()`
3. 图例和数值是固定展示内容
4. 当前图表不会随着日志列表筛选结果变化

#### 4.5.4 当前真实取数方式

- 来源：`statsChartInstance.setOption()` 中的静态配置
- 图例文字和百分比：模板硬编码

#### 4.5.5 建议 API 接口

##### 接口 4：获取日志级别统计

- 方法：`GET`
- 路径：`/api/system-logs/stats`
- 参数：
  - `type`
  - `levels`
  - `startTime`
  - `endTime`

请求示例：

```http
GET /api/system-logs/stats?type=all&startTime=2026-03-07%2000:00:00&endTime=2026-03-08%2023:59:59
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      { "name": "信息", "value": 65, "level": "info" },
      { "name": "警告", "value": 25, "level": "warning" },
      { "name": "异常", "value": 10, "level": "error" }
    ]
  }
}
```

### 4.6 模块六：设备在线状态

#### 4.6.1 元素组成

该模块位于右侧中部，包含：

1. 三个状态卡块
   - 在线设备
   - 离线设备
   - 异常设备
2. 仪表盘图容器 `onlineChart`

#### 4.6.2 当前前端数据结构

当前展示值可整理为：

```json
{
  "online": 186,
  "offline": 14,
  "warning": 3,
  "onlineRate": 93
}
```

其中：

- `online`、`offline`、`warning` 来自模板硬编码
- `onlineRate` 来自仪表盘图 `data: [{ value: 93 }]`

#### 4.6.3 交互逻辑

1. 页面加载时初始化仪表盘图
2. 浏览器变化时自适应
3. 当前数值不与日志筛选联动
4. 当前状态卡块没有点击交互

#### 4.6.4 当前真实取数方式

- 卡片数字：模板硬编码
- 仪表盘数据：`onlineChartInstance.setOption()` 中的静态配置

#### 4.6.5 建议 API 接口

##### 接口 5：获取设备在线状态统计

- 方法：`GET`
- 路径：`/api/system-logs/device-online-status`
- 参数：
  - `dateTime`：统计时间点，可选
  - `areaId`：区域 ID，可选

请求示例：

```http
GET /api/system-logs/device-online-status?dateTime=2026-03-08%2023:59:59
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "online": 186,
    "offline": 14,
    "warning": 3,
    "onlineRate": 93
  }
}
```

### 4.7 模块七：最近告警滚动列表

#### 4.7.1 元素组成

该模块位于右侧底部，包含：

1. 标题：最近告警
2. 可滚动告警列表
3. 每条告警包含：
   - 级别标签
   - 标题
   - 时间

#### 4.7.2 当前前端数据结构

当前告警数据来自 `recentAlarms`：

```json
[
  {
    "id": 1,
    "level": "error",
    "levelText": "异常",
    "title": "设备 GWA06#0103 离线",
    "time": "13:42"
  },
  {
    "id": 2,
    "level": "warning",
    "levelText": "警告",
    "title": "设备 GWA06#0102 信号弱",
    "time": "14:15"
  }
]
```

#### 4.7.3 交互逻辑

这个模块的交互是当前页里比较完整的一块：

1. 页面挂载后，延迟调用 `startScroll()`
2. `startScroll()` 通过 `setInterval` 每 50ms 自动滚动列表
3. 当滚动到底部时，自动回到顶部，形成循环滚动
4. 鼠标移入列表时：`isPaused = true`
5. 鼠标移出列表时：`isPaused = false`
6. 鼠标滚轮滚动时：执行 `handleWheel()`，当前逻辑会让自动滚动暂停

需要特别说明的是：

- `handleWheel()` 只负责暂停，不负责恢复
- 当前恢复依赖鼠标离开列表区域

#### 4.7.4 当前真实取数方式

- 来源：`recentAlarms` 本地 `ref`
- 滚动行为：前端定时器驱动

#### 4.7.5 建议 API 接口

##### 接口 6：获取最近告警列表

- 方法：`GET`
- 路径：`/api/system-logs/recent-alarms`
- 参数：
  - `limit`：默认 10

请求示例：

```http
GET /api/system-logs/recent-alarms?limit=10
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "level": "error",
        "levelText": "异常",
        "title": "设备 GWA06#0103 离线",
        "time": "13:42"
      },
      {
        "id": 2,
        "level": "warning",
        "levelText": "警告",
        "title": "设备 GWA06#0102 信号弱",
        "time": "14:15"
      }
    ]
  }
}
```

### 4.8 模块八：日志详情弹窗

#### 4.8.1 元素组成

该模块在点击日志行后出现，包含：

1. 弹窗标题：日志详情
2. 关闭按钮
3. 详情区字段：
   - 日志级别
   - 发生时间
   - 来源
   - 日志类型
   - 详细内容
   - 处理状态
4. 底部操作按钮：
   - 标记为已处理（条件展示）
   - 关闭

#### 4.8.2 当前前端数据结构

弹窗数据来源于 `selectedLog`，其结构与日志列表单条数据一致。

#### 4.8.3 交互逻辑

1. 点击日志行时，执行 `showLogDetail(log)`
2. `selectedLog` 被赋值后，弹窗显示
3. 点击遮罩层空白处可关闭弹窗
4. 点击右上角关闭按钮可关闭弹窗
5. 当 `selectedLog.status !== 'resolved'` 时，显示“标记为已处理”按钮
6. 点击“标记为已处理”时，执行 `resolveLog()`：
   - 将当前日志对象状态改为 `resolved`
   - `statusText` 改为“已处理”
   - 关闭弹窗

这里有一个重要特点：

- 当前状态修改是直接改本地对象
- 因为 `selectedLog` 引用的是 `logs` 数组中的对象，所以列表状态也会同步变化
- 但刷新页面后不会持久化

#### 4.8.4 当前真实取数方式

- 来源：本地 `selectedLog`
- 处理动作：前端本地变更，不调用接口

#### 4.8.5 建议 API 接口

##### 接口 7：获取日志详情

- 方法：`GET`
- 路径：`/api/system-logs/detail/{id}`

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 5,
    "level": "error",
    "levelText": "异常",
    "time": "2026-03-08 13:42:05",
    "source": "GWA06#0103",
    "type": "device",
    "typeText": "设备",
    "content": "设备离线",
    "detail": "设备 GWA06#0103 已离线超过 5 分钟，最后在线时间 13:37:00",
    "status": "pending",
    "statusText": "待处理"
  }
}
```

##### 接口 8：标记日志为已处理

- 方法：`POST`
- 路径：`/api/system-logs/resolve`

请求 JSON 示例：

```json
{
  "id": 5,
  "status": "resolved"
}
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "处理成功",
  "data": {
    "id": 5,
    "status": "resolved",
    "statusText": "已处理"
  }
}
```

## 5. 导出能力建议

当前页面有两个导出按钮，但尚未实现实际下载。建议补充导出接口：

### 接口 9：导出日志

- 方法：`POST`
- 路径：`/api/system-logs/export`
- 参数：
  - `format`：`csv | excel`
  - `type`
  - `levels`
  - `startTime`
  - `endTime`

请求 JSON 示例：

```json
{
  "format": "csv",
  "type": "device",
  "levels": ["warning", "error"],
  "startTime": "2026-03-07 00:00:00",
  "endTime": "2026-03-08 23:59:59"
}
```

返回方式建议：

- 直接返回文件流
- 或返回下载地址

## 6. 推荐接口整合方案

如果希望减少页面请求次数，建议增加聚合接口。

### 接口 10：获取系统日志页总览数据

- 方法：`GET`
- 路径：`/api/system-logs/overview`
- 参数：
  - `type`
  - `levels`
  - `startTime`
  - `endTime`
  - `pageNum`
  - `pageSize`

请求示例：

```http
GET /api/system-logs/overview?type=login&levels=info,warning,error&startTime=2026-03-07%2000:00:00&endTime=2026-03-08%2023:59:59&pageNum=1&pageSize=10
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "summary": {
      "total": 5,
      "errorCount": 1,
      "warningCount": 1
    },
    "page": {
      "list": [
        {
          "id": 1,
          "level": "info",
          "levelText": "信息",
          "time": "2026-03-08 14:32:15",
          "source": "系统",
          "type": "login",
          "typeText": "登录",
          "content": "用户 admin 登录系统",
          "detail": "用户 admin 从 IP 192.168.1.100 登录系统，登录方式：网页端",
          "status": "normal",
          "statusText": "正常"
        }
      ],
      "pageNum": 1,
      "pageSize": 10,
      "total": 5
    },
    "stats": {
      "list": [
        { "name": "信息", "value": 65, "level": "info" },
        { "name": "警告", "value": 25, "level": "warning" },
        { "name": "异常", "value": 10, "level": "error" }
      ]
    },
    "deviceOnline": {
      "online": 186,
      "offline": 14,
      "warning": 3,
      "onlineRate": 93
    },
    "recentAlarms": {
      "list": [
        {
          "id": 1,
          "level": "error",
          "levelText": "异常",
          "title": "设备 GWA06#0103 离线",
          "time": "13:42"
        }
      ]
    }
  }
}
```

## 7. 前后端联调建议

### 7.1 建议优先改造点

建议按下面顺序推进，会比较顺：

1. 先把筛选条件真正接到日志列表查询接口上
2. 把日志统计头部改成接口驱动
3. 把右侧统计面板改为和筛选条件联动
4. 给详情弹窗的“标记为已处理”接真实接口
5. 补齐导出 CSV / Excel 的真实下载逻辑

### 7.2 推荐前端状态模型

```js
state = {
  selectedType: 'login',
  selectedLevels: ['info', 'warning', 'error'],
  startTime: '',
  endTime: '',
  currentPage: 1,
  pageSize: 10,
  logs: [],
  total: 0,
  summary: null,
  stats: null,
  deviceOnline: null,
  recentAlarms: [],
  selectedLog: null
}
```

### 7.3 推荐页面刷新逻辑

```js
watch([selectedType, selectedLevels, startTime, endTime, currentPage], () => {
  loadSystemLogsData()
})
```

如果不希望筛选项每次变更都自动查询，也可以只在点击“查询日志”时统一触发 `loadSystemLogsData()`。

## 8. 页面现状评估

从实现完整度来看，`SystemLogs` 页面是当前几个页面里业务感比较强的一页：

- 它已经有完整筛选结构
- 有日志列表、统计、详情和处理动作
- 有最近告警滚动这样的增强交互

但同时也存在比较明显的“原型特征”：

- 筛选条件尚未真正生效
- 快捷时间未实现
- 导出未实现
- 右侧统计没有和中间日志结果联动
- 数据修改不持久化

换句话说，这页离“可联调版本”已经不远，主要还差数据流真正闭环。

## 9. 结论

当前 `SystemLogs` 页面建议按以下接口模块落地：

1. 筛选项初始化接口
2. 日志统计概览接口
3. 日志列表接口
4. 日志级别统计接口
5. 设备在线状态接口
6. 最近告警接口
7. 日志详情接口
8. 标记已处理接口
9. 导出接口
10. 或一个总览聚合接口

如果你愿意，我们下一步可以继续推进两种方向中的任意一种：

- 我继续帮你生成“SystemLogs 接口字段说明表”
- 我直接把 `src/views/SystemLogs.vue` 改造成真实 API 驱动版
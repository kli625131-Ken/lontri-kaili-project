# 能耗分析页面 `getdashboard` API 对接分析

> 分析日期：2026-07-14  
> 接口地址：`http://192.168.0.84/SmartIoTWCFService/IoTRESTService.svc/getdashboard`  
> 分析范围：不评估“节能目标完成度”和“能耗环比分析”，评估能耗页面其余 KPI、趋势、区域 TOP10 及左侧筛选联动。

## 1. 结论

**该接口不能满足能耗分析页面除“节能目标完成度”和“能耗环比分析”以外的全部需求。**

它可以直接提供项目级的本月能耗、本年能耗和节约率；可以有限提供固定近 30 天的照明能耗趋势；但不能直接支持页面现有的任意日期范围趋势，也不能直接生成 TOP10 区域能耗排行。

此外，当前项目的建筑、楼层、地图区域节点没有完整映射到该接口要求的后台 `Location GUID`。在解决空间节点 ID 映射前，即使字段本身可用，也无法保证返回的是当前开利项目、当前建筑或当前楼层的数据。

| 页面板块 | 满足程度 | 判断 |
| --- | --- | --- |
| 本月能耗 | 基本满足 | `MTDkWh` / `currentMonthkWh` 可直接提供主值 |
| 本年能耗 | 基本满足 | `YTDkWh` / `currentYearkWh` 可直接提供主值 |
| 节约率 | 满足字段需求 | `energySavingRatio` 可直接提供主值，但需确认业务统计口径 |
| 能耗趋势曲线 | 部分满足 | 仅有固定近 30 天数据，无法支持当日、近 3/6 个月、近 1 年和自定义范围 |
| TOP10 区域能耗排行 | 不满足 | 单次响应没有子区域明细、名称和区域能耗列表 |
| 左侧时间筛选联动 | 不满足 | 请求体只有 `id`，没有开始日期、结束日期或粒度参数 |
| 左侧设备类型联动 | 部分满足 | 响应分了照明/空调/风机数组，但请求不支持设备类型参数，且样例中只有照明有数据 |
| 左侧建筑/楼层联动 | 有条件满足 | 接口可按 `id` 查询，但前提是每个节点都有正确的后台 Location GUID |

因此，推荐将 `getdashboard` 用于顶部项目级 KPI；能耗趋势和 TOP10 区域排行需要补充面向分析场景的后端接口。

## 2. 实际请求验证

### 2.1 请求方式

接口只允许 `POST`：

- 使用 `GET` 请求返回 `HTTP 405 Method Not Allowed`，响应头包含 `Allow: POST`。
- 空 `POST` 返回 `HTTP 400`，服务端提示请求对象为空。
- 正确请求体为：

```json
{
  "id": "Location GUID"
}
```

请求示例：

```http
POST /SmartIoTWCFService/IoTRESTService.svc/getdashboard HTTP/1.1
Content-Type: application/json;charset=UTF-8

{"id":"ebb8dfeb-8d6f-49e9-8206-c5dbb47e17dd"}
```

服务端方法签名从错误信息可确认是：

```text
getReportByLocationID(DashBoardHeader request)
```

### 2.2 有数据 Location GUID 的实测结果

当前项目代码中的临时 GUID：

```text
ebb8dfeb-8d6f-49e9-8206-c5dbb47e17dd
```

该 GUID 在 `src/services/dashboardEnergyApi.js` 中被明确标记为旧项目 27F 的临时位置，不是当前开利项目正式 Location GUID。

实测关键响应：

```json
{
  "MTDkWh": "4.073",
  "YTDkWh": "25.706",
  "MTDSavedkWh": "4.407",
  "YTDSavedkWh": "196.252",
  "energySavingRatio": "98.900",
  "samePeriodOfLastMonthkWh": "0.305",
  "samePeriodOfLastYearkWh": null,
  "numOfLights": "30",
  "numOfStoreys": "1"
}
```

`recently30DayskWhReport` 中实际包含 29 个照明日数据点，日期从 `2026-06-08` 到 `2026-07-06`。本次验证日期为 `2026-07-14`，最新能耗数据落后 8 天，不能当作“统计截至当前时间”的完整数据使用。

### 2.3 当前地图楼层 GUID 的实测结果

当前绿地地图数据包含楼层 GUID：

```text
be5f3560-c683-4073-ace3-9e0e70cd5ff3
```

使用该 GUID 调用接口时返回：

```json
{
  "MTDkWh": "0.000",
  "YTDkWh": "0.000",
  "energySavingRatio": "0.000",
  "numOfStoreys": "1",
  "numOfLights": "0",
  "recently30DayskWhReport": {
    "lightsDates": [],
    "lightsActualkWh": ["lightsActualkWh"]
  }
}
```

这说明地图包中的 `FloorId` 虽然格式上是 GUID，但不能直接视为已具备可用能耗数据的 Location ID。默认的开利一楼地图 `floor1.data.json` 使用的是本地代码和区域名称，也没有后台 Location GUID。

## 3. 页面需求与接口字段对照

### 3.1 顶部 KPI

#### 本月能耗

可使用字段：

```text
MTDkWh
currentMonthkWh
```

两个字段在样例响应中值相同，建议优先使用 `MTDkWh`，`currentMonthkWh` 作为兼容字段。

卡片中的月度变化百分比不能直接使用 `samePeriodOfLastMonthkWh` 展示。该字段是上月同期能耗值，不是百分比，需要在确认周期定义一致后计算：

```text
(MTDkWh - samePeriodOfLastMonthkWh) / samePeriodOfLastMonthkWh × 100%
```

当上一周期为 0 或空时应显示 `--`。

#### 本年能耗

可使用字段：

```text
YTDkWh
currentYearkWh
```

主值可以满足。但样例中的 `samePeriodOfLastYearkWh` 为 `null`，因此本年能耗卡片附带的同比百分比无法稳定提供。

#### 节约率

可使用：

```text
energySavingRatio
```

字段可以直接映射，但样例值为 `98.900%`，与页面现有演示值 `15.8%` 差异较大。正式接入前必须由后端确认其计算口径、分母和是否已经乘以 100，前端不能自行调整成“看起来合理”的数值。

### 3.2 能耗趋势曲线

照明趋势可使用：

```text
recently30DayskWhReport.lightsDates
recently30DayskWhReport.lightsActualkWh
```

全部设备趋势可使用：

```text
recently30DayskWhReport.Dates
recently30DayskWhReport.ActualkWh
```

主要限制：

1. 接口名称和响应结构固定为近 30 天，没有 `startDate`、`endDate` 参数。
2. 无法满足近 3 个月、近 6 个月、近 1 年和自定义日期范围。
3. 无法由固定 30 天数据可靠聚合出更长周期的周、月趋势。
4. `the24HoursSavingRatioReport` 在样例中没有有效小时数据，不能可靠支持“当日”趋势。
5. 响应数组结构不统一：部分数组第一项是标题字符串，`lightsDates` 则直接从日期开始；对接层必须过滤标题并按最短有效长度对齐。
6. 样例数据存在 8 天延迟，需要增加数据截止日期判断和“不完整数据”提示。

结论：该接口只能作为“最近约 1 个月照明趋势”的临时数据源，不能支撑当前能耗分析页面完整的时间筛选能力。

### 3.3 TOP10 区域能耗排行

当前页面的排行对象来源于地图包中的 `regions`，但能耗值仍由前端模拟分配。`getdashboard` 单次响应只返回传入 Location ID 的汇总数据，不返回以下排行必需信息：

- 子区域 Location ID；
- 子区域名称；
- 每个区域在所选时间范围内的能耗；
- 区域层级；
- 设备类型维度；
- 排名结果。

理论上可以为每个区域分别调用一次 `getdashboard`，再在前端排序，但当前不可行且不推荐：

1. 地图区域 ID 如 `GWA06#0102` 不是 Location GUID。
2. 尚无地图区域到后台 Location GUID 的映射。
3. 每个区域一次请求会形成 N+1 请求，区域多时性能和稳定性较差。
4. 即使请求成功，也只能拿到 MTD/YTD 或固定近 30 天数据，不能跟随任意日期范围。
5. 各请求的数据更新时间可能不一致，排名结果可能失真。

结论：现有接口不能满足 TOP10 区域能耗排行。

## 4. 当前项目已有实现

### 4.1 已有仪表盘 API 客户端

`src/services/dashboardEnergyApi.js` 已实现：

- `POST getdashboard`；
- `{ id: locationId }` 请求体；
- 20 秒超时；
- 可选 Bearer Token；
- 数字字符串转换；
- 响应数组标题过滤；
- Dashboard 页面使用的标准化适配结构。

该客户端目前默认使用旧项目 27F GUID，并已在代码注释中提示必须替换为当前项目真实 Location GUID。

### 4.2 能耗分析页仍是模拟数据

`src/services/energyAnalysisService.js` 当前通过 `createDailySeries()` 生成模拟日能耗，再计算：

- 趋势；
- TOP10 排行；
- 环比数据。

因此，Dashboard 页面已经使用真实 `getdashboard` 数据，但 EnergyAnalysis 页面还没有接入该接口。

### 4.3 区域数据与后台 ID 未对齐

能耗页区域树复用了 `src/config/deviceVisualizationMaps.js`，其节点主要使用前端 ID 和 `mapId`。地图区域来自 `public/maps/*.data.json`，当前没有稳定的 `energyLocationId` 字段。

正式对接前需要建立以下映射：

```text
前端建筑/楼层节点 ID -> 后台 Location GUID
地图区域 ID          -> 后台 Location GUID
```

## 5. 推荐 API 对接方案

### 5.1 `getdashboard` 的推荐使用范围

保留 `getdashboard` 作为项目级汇总接口，仅用于不跟随左侧筛选的 KPI：

```text
本月能耗 <- MTDkWh ?? currentMonthkWh
本年能耗 <- YTDkWh ?? currentYearkWh
节约率   <- energySavingRatio
```

请求应始终使用当前项目总节点的正式 Location GUID，不应使用左侧选中的楼层或区域 ID，避免 KPI 被筛选条件影响。

### 5.2 新增能耗趋势接口

建议新增：

```http
POST /energy-analysis/trend
Content-Type: application/json
```

请求：

```json
{
  "locationId": "项目、建筑或楼层 Location GUID",
  "deviceType": "LIGHTING",
  "startDate": "2026-01-15",
  "endDate": "2026-07-14",
  "granularity": "MONTH"
}
```

响应：

```json
{
  "locationId": "...",
  "deviceType": "LIGHTING",
  "startDate": "2026-01-15",
  "endDate": "2026-07-14",
  "dataUpdatedAt": "2026-07-14T09:30:00+08:00",
  "complete": true,
  "points": [
    { "periodStart": "2026-01-15", "periodEnd": "2026-01-31", "energyKWh": 123.45 }
  ]
}
```

后端应支持 `DAY`、`WEEK`、`MONTH` 三种粒度，避免前端下载大量原始数据后自行聚合。

### 5.3 新增区域排行接口

建议新增：

```http
POST /energy-analysis/ranking
Content-Type: application/json
```

请求：

```json
{
  "parentLocationId": "当前建筑或楼层 Location GUID",
  "deviceType": "LIGHTING",
  "startDate": "2026-06-15",
  "endDate": "2026-07-14",
  "targetLevel": "REGION",
  "limit": 10
}
```

响应：

```json
{
  "dataUpdatedAt": "2026-07-14T09:30:00+08:00",
  "items": [
    {
      "locationId": "...",
      "regionCode": "GWA06#0102",
      "regionName": "包装区",
      "energyKWh": 58.32,
      "rank": 1
    }
  ]
}
```

排行必须由后端一次聚合返回，不建议前端按区域逐个调用 `getdashboard`。

### 5.4 空间节点配置

建议在独立配置或后端区域树响应中增加能耗 Location GUID，不要把地图 `FloorId`、`MapId` 或区域代码直接当成能耗 Location ID：

```js
{
  id: 'carrier-101-1f',
  label: '一楼车间',
  mapId: 'floor1',
  energyLocationId: '由后台确认的 Location GUID'
}
```

如果建筑节点和楼层节点使用不同 Location GUID，应分别配置，确保左侧选择整栋建筑或楼层时能传递正确统计范围。

### 5.5 前端适配层

建议保留页面现有统一分析数据结构，在服务层完成字段转换：

```js
{
  trend: [{ label, value }],
  ranking: [{ id, name, value, percent }]
}
```

页面组件不应直接读取 WCF 原始字段。可将现有 `dashboardEnergyApi.js` 中的超时、错误处理、Token 和数值转换逻辑抽成共享请求工具，再分别实现：

```text
loadProjectEnergyKpis()
loadEnergyTrend(filters)
loadEnergyRanking(filters)
```

三个请求需要使用明确的加载、空数据和错误状态，不能在真实请求失败后静默回退到模拟数值。

## 6. 建议实施顺序

1. 后端确认当前开利项目、建筑、楼层、区域的 Location GUID。
2. 确认 `energySavingRatio`、`MTDkWh`、`YTDkWh` 的正式统计口径和更新时间。
3. 先用 `getdashboard` 接入三个项目级 KPI，并保持它们不跟随左侧筛选刷新。
4. 新增支持日期范围和粒度的趋势接口。
5. 新增一次返回子区域聚合结果的排行接口。
6. 在区域树节点补充 `energyLocationId`，联调建筑与楼层切换。
7. 对接口空值、上一周期为 0、数据延迟、无设备数据等情况进行验收。

## 7. 验收清单

- 请求方法为 `POST`，请求体包含有效 Location GUID。
- KPI 使用当前项目总节点 GUID，不受左侧筛选影响。
- 本月、本年、节约率均显示接口真实值，并标明数据更新时间。
- 时间范围切换后，趋势接口收到正确的起止日期和粒度。
- 楼层切换后，传递的是对应 `energyLocationId`，不是 `mapId` 或前端节点 ID。
- TOP10 一次请求返回完整区域列表，无 N+1 请求。
- 所有数值字段统一转为数字后再计算和格式化。
- 数据日期落后当前日期时显示“数据截至 YYYY-MM-DD”。
- 空数组、标题字符串、`null`、`0` 均有明确处理。
- 真实接口失败时展示错误/空状态，不回退为模拟数据。

## 8. 最终判断

如果目标只是接入项目级的本月能耗、本年能耗和节约率，`getdashboard` 可以使用；如果目标是满足当前能耗分析页面除两个排除板块外的所有需求，该接口单独使用仍然不够。

当前至少还缺少：

1. 当前项目完整的 Location GUID 映射；
2. 支持任意日期范围与日/周/月粒度的能耗趋势接口；
3. 支持按父级空间、设备类型和日期范围聚合的 TOP10 区域排行接口。

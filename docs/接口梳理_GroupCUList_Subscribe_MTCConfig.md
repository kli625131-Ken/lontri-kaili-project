# Group CU List、Subscribe、MTC Config 接口梳理

## 1. 范围与说明

本文档基于以下前端页面的静态代码梳理，不包含真实网关或服务端抓包结果：

- `src/views/GroupCUList.vue`
- `src/views/Subscribe.vue`
- `src/views/MTCConfig.vue`
- `src/api/url.js`
- `src/api/request.js`

因此，本文的“返回结构”是前端实际读取、解析和展示所依赖的契约；服务端是否存在额外字段，以服务端接口实现或联调抓包为准。

## 2. 通用调用规则

### 2.1 接口基地址

```text
{window.bURL}/SmartIoTWCFService/IoTRESTService.svc
```

`window.bURL` 在运行时由 `public/project.path.js` 提供，因此本地源码中不固定具体主机地址。

### 2.2 请求方式

- 默认请求头：`Content-Type: application/json;charset=UTF-8`
- 身份认证：`Authorization: Bearer {sessionStorage.token}`
- 绝大多数写操作：`POST /接口名`，Body 为 `JSON.stringify(param)`
- 少数基础查询：`GET /接口名`，或通过 Query String 传参。

示例：

```js
const param = { Gateway_Mongo: gatewayId };
await this.post('/getgwgrouplistdb', JSON.stringify(param));
```

### 2.3 返回类型约定

| 类型 | 前端实际读取方式 | 示例 |
| --- | --- | --- |
| 指令结果 | 读取 `success`，失败时读取可选 `message` | `{ "success": true, "message": "..." }` |
| 封装查询结果 | `data` 是 JSON 字符串，前端 `JSON.parse(result.data)` | `{ "success": true, "data": "[{...}]" }` |
| 基础列表 | 直接返回数组，不使用 `success` 包装 | `[{ "gatewayName": "GW-01" }]` |

## 3. Group CU List

页面：`src/views/GroupCUList.vue`。

### 3.1 组、网关、设备基础数据

| 功能 | 方法与接口 | 请求参数 | 前端预期返回 |
| --- | --- | --- | --- |
| 查询组列表 | `GET /getsmallareawithgroups` | 无 | 直接数组；页面读取组字段 `groupid`、`sareaName`、`zigbeeID`、`sName` |
| 查询网关 | `GET /getallgateways` | 无 | 直接数组；页面读取 `gatewayName` 等字段 |
| 查询全部设备 | `GET /getalldevices` | 无 | 直接数组；页面读取 `deviceName`、`zigbeeid`、`groupid`、`gateway` |
| 查询网关下驱动灯 | `GET /getalldriverlights?q={gatewayId}` | Query：`q` 为网关 ID | 直接数组 |
| 搜索设备 | `GET /getalldevices?q={keyword}&code={languageCode}` | Query：搜索词和语言码 | 直接数组 |
| 保存地图组映射 | `POST /setmaps` | `MAPID`、`GROUPNAME`、`GROUPID`、`GATEWAYID`、`ZIGBEES`（逗号分隔 CU） | 指令结果 |

### 3.2 查询组、配置组和删除组关系

| 功能 | 接口 | Body JSON | 前端预期返回 |
| --- | --- | --- | --- |
| 查询单 CU 所属组 | `POST /loopsinglecuingroup` | `{ "zigbeeId": "CU Zigbee ID", "gatewayId": "网关ID" }` | 指令结果 |
| 查询当前组内 CU | `POST /loopcuingroup` | `{ "value": "组名", "gatewayId": "网关ID" }` | 指令结果 |
| 查询组成员 | `POST /loopgroupcu` | `{ "value": "组名" }` | `data` 为 JSON 字符串；成员记录读取 `ZigbeeID`、`GroupName` |
| 配置 CU 加入组 | `POST /autoaddcutogroup` | `{ "zigbeeId": "CU Zigbee ID", "gatewayId": "网关ID" }` | 指令结果 |
| 移除 CU 组关系 | `POST /removecuingroup` | `{ "gatewayId": "网关ID", "zigbeeId": "CU Zigbee ID", "value": "" }` | 指令结果 |
| 移除 CU 场景/槽位 | `POST /removecusolt` | `{ "gatewayId": "网关ID", "zigbeeId": "CU Zigbee ID", "value": "" }` | 指令结果 |

### 3.3 场景配置、查询和控制

| 功能 | 接口 | Body JSON | 前端预期返回 |
| --- | --- | --- | --- |
| 生成组默认场景 | `POST /setgwgroupsoltsnew` | `{ "GroupID": "组ID", "GatewayID": "网关ID" }` | 指令结果 |
| 保存自定义组场景 | `POST /setgwgroupsoltplus` | 直接传数组；每项包含 `GatewayID`、`GroupID`、`SOLT`、`Brightness`、`ColorTemperature`、`Cmd_485` 等 | 指令结果 |
| 查询组场景 | `POST /getgatewaygroupsolt` | `{ "gatewayId": "网关ID", "value": "组ID" }` | `data` 为 JSON 字符串；场景字段见下方 |
| 查询 CU 场景 | `POST /getgatewayzigbeesolts` | `{ "GatewayID": "网关ID", "GroupID": "组ID", "SOLT": "槽位" }` | `data` 为 JSON 字符串或数组 |
| 下发组场景 | `POST /triggergatewaygroupsolt` | `{ "GatewayID": "网关ID", "GroupID": "组ID", "SOLT": "槽位" }` | 指令结果 |
| 写入 CU 组场景槽 | `POST /setGatewayGroupSOLT` | `{ "GatewayID": "网关ID", "ZigbeeID": "CU ID", "GroupID": "组ID", "SOLT": "01" }` | 指令结果 |
| 创建设备场景 | `POST /sendcreatescenebydevice` | `{ "GatewayID": "网关ID", "ZigbeeID": "CU ID", "GroupID": "组ID", "SOLT": "01" }` | 指令结果 |
| 查询 CU 场景状态 | `POST /getlightsence` | `{ "gatewayId": "网关ID", "zigbeeId": "CU ID", "value": "01" }` | 指令结果 |
| 查询已存场景 | `POST /getlightsencefromdb` | `{ "value": "组名" }` | `data` 为 JSON 字符串；页面读取 `DriverLightName`、`Slot`、`Settings`、`Created` |

组场景查询的前端解析示例：

```json
{
  "success": true,
  "data": "[{\"ID\":\"...\",\"GroupID\":\"0600\",\"SOLT\":\"01\",\"Brightness\":\"80\",\"ColorTemperature\":\"4000\",\"Cmd_485\":\"...\"}]"
}
```

### 3.4 组播开、关、调光和色温

| 功能 | 接口 | Body JSON | 前端预期返回 |
| --- | --- | --- | --- |
| 组播开灯 | `POST /turnon` | `{ "id": "组名", "type": "group" }` | 指令结果 |
| 组播关灯 | `POST /turnoff` | `{ "id": "组名", "type": "group" }` | 指令结果 |
| 组播调光 | `POST /setchange` | `{ "id": "组名", "type": "group", "value": "亮度值" }` | 指令结果 |
| 网关调色温 | `POST /setcolor` | `{ "gatewayId": "网关ID", "type": "gw", "value": 3000 }` | 指令结果 |

### 3.5 无线场景

| 功能 | 接口 | Body JSON |
| --- | --- | --- |
| 保存无线场景 | `POST /setwirelessscene` | `{ "type": "组ID", "gatewayId": "网关ID", "zigbeeId": "CU ID", "value": "槽位" }` |
| 执行无线场景 | `POST /executewirelessscene` | 同上 |
| 删除无线场景 | `POST /deletewirelessscene` | 同上 |
| 查询无线场景 | `POST /querywirelessscene` | `{ "type": "组ID", "gatewayId": "网关ID", "zigbeeId": "CU ID" }` |

## 4. Subscribe

页面：`src/views/Subscribe.vue`。

> “创建面板 / 联动订阅 / 配置面板订阅”在此页面中没有独立的创建面板接口，实际通过订阅记录接口 `/setgatewaysubtodb` 保存。

### 4.1 绑定、属性和心跳

| 功能 | 接口 | Body JSON | 前端预期返回 |
| --- | --- | --- | --- |
| 读取网关绑定信息 | `POST /getbindrequestfromgw` | `{ "Gateway_Mongo": "网关ID" }`；单项追加 `SourceAddress`、`SourceEndpoint`、`ClusterID` | `data` 为 JSON 字符串 |
| 设置无线属性 | `POST /setwirelessattribute` | `{ "Gateway_Mongo": "网关ID", "SourceAddress": "地址", "SourceEndpoint": "端点", "ClusterID": "簇", "HoldTime": "600" }` | 指令结果 |
| 建立无线绑定 | `POST /setwirelessbind` | 上述字段加 `DestAddress` | 指令结果 |
| 解除无线绑定 | `POST /setwirelessunbind` | 上述字段加 `DestAddress` | 指令结果 |
| 配置心跳/上报 | `POST /setwirelesssetreported` | `{ "Gateway_Mongo": "网关ID", "SourceAddress": "地址", "SourceEndpoint": "端点", "ClusterID": "簇" }` | 指令结果 |
| 下发绑定查询 | `POST /querybindrequest` | `{ "Gateway_Mongo": "网关ID", "SourceAddress": "地址" }` | 指令结果 |
| 查询心跳配置 | `POST /getwirelesssetreported` | `{ "Gateway_Mongo": "网关ID" }` | `data` 为 JSON 字符串 |
| 查询属性配置 | `POST /getwirelesssetattribute` | `{ "Gateway_Mongo": "网关ID" }` | `data` 为 JSON 字符串 |
| 查询绑定记录 | `POST /getbindrequest` | `{ "Gateway_Mongo": "网关ID" }` | `data` 为 JSON 字符串 |
| 保存绑定请求 | `POST /savebindrequest` | `{ "Gateway_Mongo": "网关ID", "Modes": "模式", "ZigbeeID": "触发设备ID" }` | 指令结果 |

### 4.2 创建、配置、查询和下发订阅

| 功能 | 接口 | Body JSON | 前端预期返回 |
| --- | --- | --- | --- |
| 创建/更新订阅记录 | `POST /setgatewaysubtodb` | 订阅对象，见下方 | 指令结果 |
| 查询已配置订阅 | `POST /querygatewaysubfromdb` | `{ "Gateway_Mongo": "网关ID" }` | `data` 为 JSON 字符串 |
| 删除订阅 | `POST /removegatewaysubfromdb` | `{ "Gateway_Mongo": "网关ID", "LocationIndex": "位置索引" }` | 指令结果 |
| 下发订阅到网关 | `POST /setGatewaysubtogateway` | `{ "Gateway_Mongo": "网关ID", "LocationIndex": "位置索引" }` | 指令结果 |
| 查询网关订阅 | `POST /querygatewaysubfromgateway` | 单项：`LocationIndex`；全量：`LocationIndex: "255"` | 指令结果 |
| 读取网关订阅结果 | `POST /querygatewaysubfromgatewaydb` | `{ "Gateway_Mongo": "网关ID" }`；可追加 `LocationIndex` | `data` 为 JSON 字符串 |
| 开启 CU 订阅参数 | `POST setCUsubscriptions` | `{ "Gateway_Mongo": "网关ID", "ZigbeeID": "源地址", "CUParameters": "FC0F" }` | 指令结果 |

订阅对象通用结构：

```json
{
  "Gateway_Mongo": "网关ID",
  "ZigbeeID": "可选 CU ID",
  "SourceAddress": "源设备地址",
  "SourceType": "01",
  "SourceAppId": "02",
  "EventIDType": "04",
  "EventIDValue": "FF",
  "DestType": "02",
  "DestAppId": "40",
  "GroupID": "组ID",
  "GroupName": "组名"
}
```

订阅查询的前端解析示例：

```json
{
  "success": true,
  "data": "[{\"LocationIndex\":\"01\",\"Gateway_Mongo\":\"...\",\"SourceAddress\":\"...\",\"SourceType\":\"01\",\"EventIDType\":\"04\",\"DestType\":\"02\",\"GroupID\":\"0600\"}]"
}
```

注意：`setCUsubscriptions` 在源码中没有使用前导 `/`，与其他接口写法不一致，联调时应优先验证其最终请求 URL。

## 5. MTC Config

页面：`src/views/MTCConfig.vue`。

### 5.1 RelationTable

| 功能 | 接口 | Body JSON | 前端预期返回 |
| --- | --- | --- | --- |
| 读取网关 RelationTable | `POST /getrelationtablefromgw` | `{ "Gateway_Mongo": "网关ID" }`；单项加 `RelationIndex` | `data` 为 JSON 字符串 |
| 删除 RelationTable | `POST /deletegwrelationtable` | `{ "Gateway_Mongo": "网关ID", "ZigbeeID": "设备ID", "RelationIndex": "索引" }` | 指令结果 |
| 按网关生成默认关系表 | `POST /setrelationtabletodbbygw` | `{ "Gateway_Mongo": "网关ID", "T_Duration": "1260" }` | 指令结果 |
| 新增关系表配置 | `POST /setgwrelationtabletodb` | `{ "Gateway_Mongo": "网关ID", "GroupID": "组ID", "T_Countdown": "0", "T_Duration": "秒" }` | 指令结果 |
| 下发关系表到网关 | `POST /setrelationtabletogw` | `{ "Gateway_Mongo": "网关ID", "ZigbeeID": "设备ID", "RelationIndex": "索引" }` | 指令结果 |
| 查询数据库关系表 | `POST /getgwrelationtabledb` | `{ "Gateway_Mongo": "网关ID" }` | `data` 为 JSON 字符串 |
| 下发关系表查询 | `POST /queryrelationtabletogw` | `{ "Gateway_Mongo": "网关ID" }`；单项加 `ZigbeeID`、`RelationIndex` | 指令结果 |

### 5.2 GroupList

| 功能 | 接口 | Body JSON | 前端预期返回 |
| --- | --- | --- | --- |
| 删除网关组表项 | `POST /deletegwgrouplist` | `{ "Gateway_Mongo": "网关ID", "GroupIndex": "索引" }` | 指令结果 |
| 下发组表到网关 | `POST /setgrouplisttogw` | `{ "Gateway_Mongo": "网关ID", "GroupIndex": "索引" }` | 指令结果 |
| 新增组表配置 | `POST /setgwgrouplisttodb` | `{ "Gateway_Mongo": "网关ID", "GroupID": "组ID", "Tg_Countdown": "0", "ZigbeeID": "EEEEEEEEEEEEEEEEEEEE", "Tg_Duration": "秒" }` | 指令结果 |
| 读取网关组表 | `POST /getgrouplistfromgw` | `{ "Gateway_Mongo": "网关ID" }`；单项加 `GroupIndex` | `data` 为 JSON 字符串 |
| 下发组表查询 | `POST /querygrouplisttogw` | `{ "Gateway_Mongo": "网关ID" }`；单项加 `GroupIndex` | 指令结果 |
| 查询数据库组表 | `POST /getgwgrouplistdb` | `{ "Gateway_Mongo": "网关ID" }` | `data` 为 JSON 字符串 |

组表和关系表的前端解析示例：

```json
{
  "success": true,
  "data": "[{\"GroupID\":\"0600\",\"GroupName\":\"区域组\",\"GroupIndex\":\"01\",\"Tg_Duration\":\"120\"}]"
}
```

```json
{
  "success": true,
  "data": "[{\"RelationIndex\":\"01\",\"GroupID\":\"0600\",\"ZigbeeID\":\"...\",\"T_Countdown\":\"0\",\"T_Duration\":\"1260\"}]"
}
```

## 6. 复用的基础查询接口

三个页面均会复用以下接口，主要用于网关、组、设备和场景的下拉选择或列表展示：

| 接口 | 用途 |
| --- | --- |
| `GET /getallgateways` | 查询网关列表 |
| `GET /getsmallareawithgroups` | 查询区域和组列表 |
| `GET /getalldevices` | 查询设备列表 |
| `GET /getalldriverlights?q={gatewayId}` | 查询指定网关下的驱动灯 |
| `POST /getgatewaygroupsolt` | 查询指定网关、指定组的场景槽 |

## 7. 对接注意事项

1. 网关字段名称不能自行统一：不同接口分别使用 `gatewayId`、`GatewayID`、`Gateway_Mongo`。
2. 组字段同样存在 `value`、`GroupID`、`GroupName`、`groupid` 等多种命名，必须遵循具体接口。
3. 查询接口常返回 `data` 字符串而不是数组；调用方需按页面现有逻辑执行 `JSON.parse`。
4. 查询网关或下发查询指令后，通常还需调用“从数据库读取结果”的接口，才能展示网关返回的数据。
5. 本文档只覆盖上述三个页面直接调用的接口及其共用基础查询接口；未对服务端实现和实际设备协议作推断。

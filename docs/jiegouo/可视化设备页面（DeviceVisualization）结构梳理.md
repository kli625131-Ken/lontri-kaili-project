# 可视化设备页面（DeviceVisualization）结构梳理

## 1. 结论

当前“可视化设备”页面已经具备“空间导航 + SVG 数字地图 + CU/GW 设备点位 + 区域图层 + 控制抽屉 + 区域绘制”的完整前端原型能力。

但它目前仍是前端静态/半静态实现：

- 无真实设备 API 调用
- 无控制指令下发接口
- 无区域绘制保存接口
- 无 WebSocket、MQTT 或轮询实时状态
- 仅请求本地静态底图 `/maps/floor1.svg`
- 设备、网关、区域数据主要来自本地种子数据、SVG 自动识别结果和 override 配置

页面适合做数字地图与交互原型展示；若要进入真实设备控制，需要补齐后端接口、权限校验、指令确认、状态回写和持久化能力。

## 2. 页面入口

### 2.1 路由

- 文件：`src/router/index.js`
- 路径：`/device-visualization`
- 组件：`DeviceVisualization`
- 页面标题：`可视化设备`

```js
{ path: '/device-visualization', name: 'DeviceVisualization', component: DeviceVisualization, meta: { title: '可视化设备' } }
```

### 2.2 顶部导航

- 文件：`src/components/Header.vue`
- 导航项中已配置：

```js
{ path: '/device-visualization', title: '可视化设备' }
```

### 2.3 页面容器

- 文件：`src/App.vue`
- 全局布局为：
  - 顶部 `Header`
  - 主内容区 `router-view`
  - 页面切换带 `fade` 过渡

## 3. 当前页面结构

页面主文件：

- `src/views/DeviceVisualization.vue`

整体采用左右两栏布局：

```text
DeviceVisualization
├─ 左侧：空间层级导航
│  ├─ 园区
│  ├─ 包装中心
│  ├─ 一层
│  └─ 区域：AR包装厂房、灯检走廊、输送缓冲区
│
└─ 右侧：数字地图
   ├─ 地图工具栏
   ├─ SVG 底图
   ├─ 区域 polygon 图层
   ├─ GW 网关点位
   ├─ CU 设备点位
   ├─ 绘制草稿图层
   ├─ 图例
   ├─ 状态提示
   ├─ Debug 面板
   └─ 右侧控制抽屉
```

## 4. 主要模块现状

### 4.1 空间层级导航

位置：左侧 `DataCard title="空间层级导航"`

当前内容：

- 园区
- 包装中心
- 一层
- AR包装厂房
- 灯检走廊
- 输送缓冲区

当前状态：

- 导航树是模板内静态 HTML
- 默认 `AR包装厂房` 为 active
- 没有点击事件
- 没有与地图区域联动
- 没有从接口或配置动态生成

底部统计来自响应式数组：

- `cuDevices.length`
- `gwDevices.length`
- `regions.length`

### 4.2 数字地图

位置：右侧 `DataCard title="数字地图"`

地图底图：

- 静态文件：`public/maps/floor1.svg`
- 请求路径：`/maps/floor1.svg`
- 元数据文件：`public/maps/floor1.meta.json`

`floor1.meta.json` 当前定义：

```json
{
  "floorId": "floor1",
  "svgUrl": "/maps/floor1.svg",
  "unit": "mm",
  "flipY": true,
  "bbox": { "minX": 0, "minY": 0, "maxX": 50000, "maxY": 30000 }
}
```

注意：当前页面代码没有读取 `floor1.meta.json`，实际只读取 SVG 本身。

### 4.3 地图工具栏

工具栏能力：

- 显示当前缩放倍率
- 开启/退出区域绘制
- 重置视图
- 清空绘制草稿
- 设备图层筛选
  - 全选
  - CU
  - 网关
- Debug 面板开关

Debug 按钮仅开发环境显示：

```js
const isDebugAvailable = import.meta.env.DEV
```

### 4.4 SVG 底图渲染

核心逻辑：

```js
const response = await fetch('/maps/floor1.svg')
const svgText = await response.text()
const svgRoot = svgDoc.documentElement
mapMarkup.value = svgRoot.innerHTML
```

底图不是通过 `<img>` 或 `<object>` 渲染，而是：

1. 读取 SVG 文件文本
2. 解析出 `svgRoot.innerHTML`
3. 写入页面内的 `<g ref="mapContentRef" class="map-floor-layer">`

对应 watch：

```js
watch(
  [mapMarkup, mapContentRef],
  ([markup, element]) => {
    if (!element) return
    element.innerHTML = markup || ''
  },
  { immediate: true, flush: 'post' }
)
```

这种方式的优点是可在同一个 SVG 坐标系内叠加区域、设备、调试图层；风险是直接 `innerHTML` 注入 SVG，后续如果 SVG 来源变成用户上传，需要做安全清洗。

## 5. 数据来源与生成方式

### 5.1 主流程

页面挂载后执行：

```js
onMounted(async () => {
  await loadFloorMap()
})
```

`loadFloorMap()` 主流程：

1. 请求 `/maps/floor1.svg`
2. 解析 SVG `viewBox`
3. 设置 `originalViewBox` 和 `currentViewBox`
4. 将 SVG 内容写入 `mapMarkup`
5. 调用 `parseFloorSvg(svgText)` 自动识别区域和设备候选点
6. 调用 `buildRecognizedOverlay()` 结合 override 配置生成业务图层
7. 如果识别结果可渲染，则应用识别数据
8. 如果识别为空或加载失败，则回退到本地 fallback 数据

### 5.2 SVG 自动识别

文件：

- `src/utils/floorSvgRecognition.js`

识别规则：

- 遍历 SVG 内所有 `path`
- 黄色路径：
  - `stroke === 'yellow'` 或 `fill === 'yellow'`
  - 作为区域候选
- 青色路径：
  - `stroke === 'cyan'`
  - 且 bbox 宽高不超过 `12`
  - 作为设备原始点位

区域候选过滤条件：

- 闭合路径
- 点数 4 到 12
- 最小宽度 28
- 最小高度 28
- 最小面积 1800
- 最大长宽比 6.5
- 最小填充率 0.4

设备候选会按距离聚类：

- 聚类距离：6
- 生成 `device-candidate-001` 这类候选点
- 带识别置信度 `confidence`

### 5.3 override 映射配置

文件：

- `src/config/floorRecognition/floor1.overrides.json`

作用：

- 将 SVG 识别出来的候选区域映射成业务区域名
- 将 SVG 识别出来的候选设备点映射成 CU 或 GW
- 用坐标 + tolerance 匹配最近候选点

当前配置区域：

- AR包装厂房
- 灯检走廊
- 输送缓冲区

当前配置设备：

- GW-A：`GWA06#0101`
- GW-B：`GWA06#0102`
- CU-001：`GWA06#0101-001`
- CU-002：`GWA06#0101-002`
- CU-003：`GWA06#0101-003`
- CU-004：`GWA06#0101-004`
- CU-005：`GWA06#0101-005`

### 5.4 本地种子数据

页面内定义了两类设备种子：

- `cuDeviceSeeds`
- `gwDeviceSeeds`

CU 当前字段：

- `id`
- `shortName`
- `ratioX`
- `ratioY`
- `online`
- `power`
- `mode`
- `brightness`
- `bgBrightness`
- `bgTime`
- `offTime`
- `manualTime`
- `firmware`
- `updatedAt`

GW 当前字段：

- `id`
- `shortName`
- `ratioX`
- `ratioY`
- `online`
- `power`
- `firmware`
- `updatedAt`

这些数据用于：

- SVG 识别匹配成功后补齐业务字段
- SVG 识别失败时生成 fallback 点位

### 5.5 fallback 数据

如果 SVG 加载失败或识别结果为空，会调用：

```js
applyOverlayData(buildFallbackOverlayData(parsedViewBox))
```

fallback 来源：

- `cuDeviceSeeds`
- `gwDeviceSeeds`
- `fallbackRegionSeeds`

区域 fallback 当前只有：

- AR包装厂房
- 灯检走廊

### 5.6 未使用逻辑

页面中还有一个 `initializeOverlayData(viewBox)`，但当前主流程没有调用它。

实际使用路径是：

- 成功：`loadFloorMap()` → `buildRecognizedOverlay()` → `applyOverlayData()`
- 失败：`loadFloorMap()` → `buildFallbackOverlayData()` → `applyOverlayData()`

## 6. 图层渲染方式

### 6.1 区域图层

区域由 SVG polygon 渲染：

```vue
<polygon :points="pointsToString(region.points)" class="region-shape" />
<polygon :points="pointsToString(region.points)" class="region-outline" />
```

区域名称显示在多边形点位中心：

```js
getRegionLabel(region)
```

区域点击：

```vue
@click.stop="handleRegionClick(region)"
```

点击后会：

1. 聚焦区域
2. 打开区域控制抽屉
3. 显示“已聚焦到 xxx”

### 6.2 GW 网关图层

GW 使用：

- 外层光晕 circle
- 核心 rect
- 标签 `GW`
- 名称 `shortName`

点击后：

```js
openDrawer('gw', device)
```

### 6.3 CU 设备图层

CU 使用：

- 外层光晕 circle
- 核心 circle
- 设备环 circle
- 标签 `CU`
- 名称 `shortName`

点击后：

```js
openDrawer('cu', device)
```

### 6.4 在线/离线表现

设备核心节点使用：

```vue
:class="{ offline: !device.online, active: activeDrawer?.type === 'cu' && activeDrawer.entity.id === device.id }"
```

当前表现：

- 在线：青绿色或蓝色
- 离线：红色
- 当前抽屉选中：黄色描边

## 7. 交互逻辑

### 7.1 缩放

用户滚轮触发：

```js
handleWheel(event)
```

逻辑：

- 向上滚动放大，向下滚动缩小
- 缩放范围：1x 到 5x
- 以鼠标所在地图坐标为缩放中心
- 通过修改 `currentViewBox` 实现缩放
- 使用 `clampViewBox()` 限制视图不超出原始底图范围

当前没有拖拽平移逻辑。

### 7.2 重置视图

点击“重置视图”：

```js
resetView()
```

效果：

- 停止正在执行的区域聚焦动画
- 将 `currentViewBox` 恢复为 `originalViewBox`

### 7.3 区域聚焦

点击区域后调用：

```js
handleRegionClick(region)
```

核心流程：

1. `focusRegion(region)`
2. 根据区域点位计算 bbox
3. `fitViewBoxToBBox()` 计算目标视图
4. `animateViewBoxTo()` 使用 `requestAnimationFrame` 做 280ms 动画
5. 动画完成后打开区域抽屉

聚焦参数：

- padding：10%
- 最大缩放：3.8x
- 动画时长：280ms

### 7.4 图层筛选

工具栏按钮修改：

```js
deviceLayerFilter
```

取值：

- `all`
- `cu`
- `gw`

渲染控制：

```js
const visibleCuDevices = computed(() => (deviceLayerFilter.value === 'gw' ? [] : cuDevices.value))
const visibleGwDevices = computed(() => (deviceLayerFilter.value === 'cu' ? [] : gwDevices.value))
```

注意：图层筛选只控制设备点显示，不影响区域图层。

### 7.5 区域绘制

点击“区域绘制”进入绘制模式：

```js
toggleDrawMode()
```

进入绘制模式时：

- 关闭当前抽屉
- 清空提示
- 地图进入 crosshair 捕获状态

绘制方式：

- 左键连续落点：`handleDrawClick()`
- 鼠标移动显示预览线：`handleDrawMove()`
- 右键结束绘制：`finishDrawing()`
- 清空草稿：`clearDraft()`

完成绘制条件：

- 至少 3 个点

完成后：

1. 创建 `新区域-${regions.length + 1}`
2. 计算区域内 CU 设备
3. 追加到 `regions`
4. 退出绘制模式
5. 打开区域抽屉
6. 显示“已生成 xxx”

当前限制：

- 新区域只存在内存中
- 页面刷新后丢失
- 没有保存到后端或 localStorage
- 没有编辑/删除区域能力

### 7.6 控制抽屉

抽屉由：

```js
activeDrawer = { type, entity }
```

驱动。

支持三种类型：

- `cu`
- `gw`
- `area`

#### CU 抽屉

展示/控制项：

- 运行控制
  - 开启
  - 关闭
- 控制模式
  - 手动
  - 自动感应
- 亮度设置
  - 开机亮度
  - 背景亮度
- 无人感配置策略
  - 进入背景亮度时间
  - 进入关灯时间
  - 手动模式持续时间
- 设备状态
  - 固件版本
  - 最新查询时间
- 修改参数配置按钮

当前控制方式：

- 直接修改本地响应式对象，例如 `selectedCu.power = true`
- `v-model` 直接绑定 slider/input
- 点击“修改参数配置”只调用 `commitDrawerMessage()`
- 没有 API 提交
- 没有失败回滚

#### GW 抽屉

展示/控制项：

- 场景控制
  - 开启
  - 关闭
- 设备状态
  - 固件版本
  - 最新查询时间

当前控制方式：

- 直接修改 `selectedGw.power`
- 没有 API 提交

#### 区域抽屉

展示/控制项：

- 场景控制
  - 开启
  - 关闭
  - 会议模式
  - 讨论模式
- 场景配方参数只读表格
  - 设备名称
  - 亮度
  - 色温

区域内设备通过点在多边形内算法计算：

```js
collectDevicesInPolygon(points, deviceSource)
```

场景配方由当前区域内 CU 生成：

```js
createSceneConfigs(memberIds, deviceSource)
```

当前场景配置规则：

- 开启：全部 100%，色温 4000K
- 关闭：全部 0%，色温显示 `--`
- 会议模式：首个设备 0%，其他 100%，色温 4000K
- 讨论模式：首个设备 60%，其他 80%，色温 3500K

场景切换只改变本地区域对象的 `sceneMode`。

## 8. Debug 能力

开发环境可打开 Debug 面板。

显示内容：

- 黄色路径数量
- 识别区域数量
- 青色设备聚类数量
- 已映射 CU 数量
- 已映射 GW 数量
- 未映射候选数量
- warnings 数量

地图上会叠加：

- 区域候选 bbox
- 未映射设备候选点

当前代码中 `resolveDeviceOverrides()` 最终返回：

```js
unmappedCandidates: []
```

这意味着未映射候选当前不会真正展示，虽然 Debug UI 预留了该能力。

## 9. 当前已实现能力清单

已实现：

- 可通过顶部导航进入页面
- 可加载本地 SVG 楼层底图
- 可解析 SVG viewBox
- 可将 SVG 底图注入统一坐标系
- 可自动识别黄色区域候选
- 可自动识别青色设备候选并聚类
- 可通过 override 配置映射区域、CU、GW
- 可渲染区域图层、CU 点位、GW 点位
- 可通过滚轮缩放地图
- 可点击区域聚焦并打开区域抽屉
- 可点击 CU/GW 打开设备抽屉
- 可筛选 CU/GW 图层
- 可绘制临时自定义区域
- 可展示区域场景配方
- 可在开发环境查看识别 Debug 信息
- 可在 SVG 加载或识别失败时回退到本地 fallback 数据

## 10. 当前缺口与风险

### 10.1 数据侧

- 没有真实楼层/区域/设备列表接口
- 没有设备实时状态接口
- 没有设备控制接口
- 没有参数保存接口
- 没有场景模式下发接口
- 没有自定义区域保存接口
- 没有设备点位维护接口
- 没有权限或操作审计

### 10.2 交互侧

- 左侧空间树不可点击
- 左侧空间树不跟地图联动
- 地图没有拖拽平移
- 区域绘制后不能编辑、删除、重命名
- 设备控制没有确认弹窗
- 控制操作没有 loading、成功、失败、超时状态
- 离线设备仍可在 UI 上切换控制状态

### 10.3 工程侧

- 页面文件较大，模板、数据、识别映射、交互逻辑、样式都集中在一个 `.vue` 文件内
- `initializeOverlayData()` 当前未使用，容易造成维护误判
- `floor1.meta.json` 当前未被页面读取
- SVG 通过 `innerHTML` 注入，后续若 SVG 来源不可信需要安全处理
- 识别规则依赖 SVG 颜色约定：黄色代表区域、青色代表设备

## 11. 建议后续接口方向

若后续要接真实业务，建议优先补齐以下接口。

### 11.1 获取空间树

```http
GET /api/device-visualization/space-tree
```

用途：

- 替换左侧静态空间树
- 支持园区、楼栋、楼层、区域动态切换

### 11.2 获取楼层地图配置

```http
GET /api/device-visualization/floor-map?floorId=floor1
```

用途：

- 返回 SVG URL、viewBox、坐标单位、bbox、楼层信息
- 页面不再硬编码 `/maps/floor1.svg`

### 11.3 获取地图叠加层

```http
GET /api/device-visualization/overlay?floorId=floor1
```

用途：

- 返回区域、CU、GW 的业务数据和坐标
- 避免前端依赖 SVG 颜色自动识别作为正式数据源

### 11.4 获取设备实时状态

```http
GET /api/device-visualization/devices/status?floorId=floor1
```

或使用 WebSocket/MQTT 推送。

用途：

- 更新在线状态
- 更新电源状态
- 更新亮度、模式、固件、最后上报时间

### 11.5 控制 CU 参数

```http
POST /api/device-visualization/cu/{deviceId}/control
```

用途：

- 开关控制
- 模式控制
- 亮度参数
- 无人感策略时间参数

### 11.6 控制 GW

```http
POST /api/device-visualization/gw/{gatewayId}/control
```

用途：

- 网关开关
- 后续可扩展网关级场景控制

### 11.7 区域场景控制

```http
POST /api/device-visualization/regions/{regionId}/scene
```

用途：

- 下发开启、关闭、会议模式、讨论模式
- 返回执行任务 ID，便于追踪执行结果

### 11.8 保存自定义区域

```http
POST /api/device-visualization/regions
```

用途：

- 保存绘制区域
- 保存区域点位
- 保存区域内设备关系

## 12. 推荐改造顺序

1. 先把左侧空间树和地图配置改成接口驱动。
2. 再把设备、网关、区域叠加层改成接口驱动，保留 SVG 识别作为导入/调试能力。
3. 接入设备实时状态，避免页面展示过期状态。
4. 控制类操作增加确认、loading、失败回滚和操作审计。
5. 区域绘制增加保存、编辑、删除、重命名。
6. 将大文件拆成地图组件、抽屉组件、识别数据适配模块，降低维护成本。

## 13. 总结

这页当前不是简单静态图，而是一个已经具备 SVG 数字地图叠加、设备点位交互、区域聚焦、区域绘制和控制抽屉的前端原型。

它的核心实现方式是“本地 SVG 底图 + SVG 颜色规则识别 + override 映射 + Vue 响应式状态驱动”。当前最大缺口是业务闭环：所有控制与配置修改都停留在本地状态，没有后端持久化、真实下发和状态回写。

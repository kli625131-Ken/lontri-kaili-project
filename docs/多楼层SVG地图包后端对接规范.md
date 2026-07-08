# 多楼层 SVG 地图包后端对接规范

## 目标

前端支持多个项目、多个楼层、多个 SVG 底图切换时，后端需要为每一张 SVG 独立生成一套地图包数据。

前端不应该猜测坐标系，也不应该针对某一张 SVG 写特殊修正逻辑。前端只负责：

1. 根据用户选择的项目 / 楼栋 / 楼层请求对应地图包。
2. 加载地图包里的 `svgUrl`。
3. 按地图包返回的 `regions`、`devices`、`relations` 渲染区域和设备点。

## 核心原则

每张 SVG 都必须有自己独立的坐标体系。

不能复用其他楼层的 transform，也不能默认把 SVG 的 `viewBox` 当作 CAD 坐标映射范围。

错误示例：

```json
{
  "SvgBounds": {
    "MinX": 0,
    "MinY": 0,
    "MaxX": 800,
    "MaxY": 600,
    "Width": 800,
    "Height": 600
  }
}
```

如果 SVG 的 `viewBox` 是 `0 0 800 600`，这只代表整张 SVG 画布，不代表 CAD 主体图层范围。

正确做法是：后端需要识别当前 SVG 中与 CAD 坐标对应的主体图层范围，并基于这个范围生成 `CoordinateTransform`。

## 推荐地图包结构

```json
{
  "Map": {
    "MapId": "uuid",
    "ProjectId": "uuid",
    "BuildingId": "uuid",
    "FloorId": "uuid",
    "MapName": "绿地项目 1F 数字地图",
    "SvgUrl": "/resource/maps/{floorId}/{hash}.svg",
    "ViewBox": {
      "X": 0,
      "Y": 0,
      "Width": 800,
      "Height": 600
    },
    "CoordinateTransform": {
      "Type": "affine",
      "A": 0.05037299993227306,
      "B": 0,
      "C": 150.49894467109275,
      "D": 0,
      "E": -0.05037149421480847,
      "F": 645.5128182076019,
      "CadBounds": {
        "MinX": 2471.5831,
        "MinY": 1670.0481,
        "MaxX": 7623.1524,
        "MaxY": 11231.4083,
        "Width": 5151.5693,
        "Height": 9561.3602
      },
      "SvgBounds": {
        "MinX": 275,
        "MinY": 79.77,
        "MaxX": 534.5,
        "MaxY": 561.39,
        "Width": 259.5,
        "Height": 481.62
      },
      "Source": "SVG_LAYER_BOUNDS"
    },
    "Version": 1,
    "Status": "PUBLISHED"
  },
  "Regions": [],
  "Devices": [],
  "Relations": [],
  "Warnings": []
}
```

## 坐标生成规则

### 1. 每张 SVG 独立计算 CoordinateTransform

每个楼层都要独立计算：

```text
当前楼层 CAD 坐标范围 -> 当前楼层 SVG 主体图层范围
```

不能这样做：

```text
所有楼层统一映射到 0~800 / 0~600
```

也不能这样做：

```text
2F 复用 1F 的 CoordinateTransform
```

### 2. 设备 X/Y 必须由当前楼层 transform 计算

设备可以保留原始 CAD 坐标：

```json
{
  "CadX": 5416.4011,
  "CadY": 9984.8507
}
```

但前端实际渲染应该使用后端计算好的 SVG 坐标：

```json
{
  "X": 423.3393,
  "Y": 142.561
}
```

计算公式：

```text
svg.x = cad.x * A + cad.y * B + C
svg.y = cad.x * D + cad.y * E + F
```

### 3. 区域 SvgPoints 必须由当前楼层 transform 计算

区域可以保留原始 CAD 点：

```json
"Points": [
  { "X": 2471.5831, "Y": 1670.0481 },
  { "X": 7623.1524, "Y": 1670.0481 },
  { "X": 7623.1524, "Y": 11231.4083 },
  { "X": 2471.5831, "Y": 11231.4083 }
]
```

同时必须返回正确 SVG 点：

```json
"SvgPoints": [
  { "X": 275, "Y": 561.39 },
  { "X": 534.5, "Y": 561.39 },
  { "X": 534.5, "Y": 79.77 },
  { "X": 275, "Y": 79.77 }
]
```

前端优先使用 `SvgPoints` 渲染区域。

## 多楼层切换流程

前端切换楼层时，流程应该是：

```text
选择项目 / 楼栋 / 楼层
-> 请求该楼层地图包
-> 加载该楼层 svgUrl
-> 渲染该楼层 Regions / Devices / Relations
```

示例：

```text
绿地项目 / A 栋 / 1F
-> /api/maps/package?floorId=lvdi-a-1f
-> lvdi_1F.svg
-> lvdi_1F 的 CoordinateTransform

绿地项目 / A 栋 / 2F
-> /api/maps/package?floorId=lvdi-a-2f
-> lvdi_2F.svg
-> lvdi_2F 的 CoordinateTransform
```

每个楼层的地图包都应该完整、独立、可单独渲染。

## 不应返回为真实设备的数据

CAD 边界点、总图辅助点、最大值点、原点标记等数据不能混成真实设备。

错误示例：

```json
{
  "UniqueNo": "总图 X轴最大点-GW-05",
  "Name": "总图 X轴最大点 Gateway",
  "Type": "GW"
}
```

这类点不是实际网关，不应该出现在真实设备列表里。

如果后端必须返回辅助点，建议放到独立字段：

```json
{
  "CalibrationPoints": [
    {
      "Name": "总图 X轴最大点",
      "CadX": 7623.1524,
      "CadY": 11231.4083,
      "X": 534.5,
      "Y": 79.77
    }
  ]
}
```

或者显式标记：

```json
{
  "Type": "GW",
  "IsRealDevice": false,
  "IsCalibrationPoint": true
}
```

前端只渲染：

```text
IsRealDevice !== false
```

## 后端需要校验的内容

每次生成地图包后，建议后端自动校验：

1. `SvgUrl` 是否能访问到实际 SVG 文件。
2. `ViewBox` 是否和 SVG 文件一致。
3. `SvgBounds` 是否是主体图层范围，而不是整张 viewBox。
4. `CadBounds` 宽高比和 `SvgBounds` 宽高比是否基本一致。
5. 所有设备 `X/Y` 是否落在 `SvgBounds` 附近。
6. 所有区域 `SvgPoints` 是否落在当前 SVG 的有效范围内。
7. 辅助点是否没有混入真实设备列表。
8. `Relations.RegionId`、`Relations.MapDeviceId` 是否能对应到实际区域和设备。

## 前端期望

后端修正后，前端不需要针对不同 SVG 写特殊逻辑。

前端只需要按统一规则消费：

```text
Map.SvgUrl -> 加载 SVG
Map.ViewBox -> 设置 SVG viewBox
Regions[].SvgPoints -> 渲染区域
Devices[].X / Devices[].Y -> 渲染设备
Relations -> 建立区域和设备关联
```

## 本次问题参考

本次 `lvdi_1F.svg` 的问题是：

```text
后端把 SvgBounds 返回为 0~800 / 0~600
但实际 CAD 主体图层范围约为 x=275~534.5, y=79.77~561.39
```

导致：

1. 区域面铺满整张 SVG 画布。
2. 设备点横向放大，部分落到底图主体外。
3. 4 个总图辅助点被派生成假 GW。

对应详细文档：

- `docs/backend-svg-map-package-issues.md`
- `docs/backend-svg-map-package-corrected-example.md`


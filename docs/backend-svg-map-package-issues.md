# GETsvg 地图包返回问题汇总

## 结论

当前 `GETsvg地图包.txt` 可以按 UTF-8 解析成 JSON，但返回的数据不能直接用于 `lvdi_1F.svg` 底图渲染。

问题不在 JSON 语法，也不在 SVG 文件是否能加载，而在后端返回的坐标映射范围、设备点 `X/Y`、区域 `SvgPoints`、派生网关数据不符合实际 SVG 主体图层。

## 测试输入

- 原始返回文件：
  `D:/Users/xwechat_files/wxid_iyoha333s7cc22_87db/temp/RWTemp/2026-07/c595bd8734d5e40381b061a91d47a92a/GETsvg地图包.txt`
- 后端返回的 `SvgUrl`：
  `/resource/maps/BE5F3560-C683-4073-ACE3-9E0E70CD5FF3/05a55c49813d46ec81049767ba1001a7.svg`
- 本地实际 SVG 文件：
  `D:/code/lontri/kailicode/dist/maps/be5f3560-c683-4073-ace3-9e0e70cd5ff3/05a55c49813d46ec81049767ba1001a7.svg`

## 问题 1：SvgUrl 路径不适合当前前端直接访问

后端返回：

```json
"SvgUrl": "/resource/maps/BE5F3560-C683-4073-ACE3-9E0E70CD5FF3/05a55c49813d46ec81049767ba1001a7.svg"
```

当前项目中实际文件路径为：

```text
D:/code/lontri/kailicode/dist/maps/be5f3560-c683-4073-ace3-9e0e70cd5ff3/05a55c49813d46ec81049767ba1001a7.svg
```

建议后端确认资源服务路径和前端部署路径是否一致。前端不能依赖本地 `dist/maps/...` 路径访问生产资源。

## 问题 2：CoordinateTransform.SvgBounds 错误

后端返回：

```json
"SvgBounds": {
  "MinX": 0,
  "MinY": 0,
  "MaxX": 800,
  "MaxY": 600,
  "Width": 800,
  "Height": 600
}
```

但 `05a55c49813d46ec81049767ba1001a7.svg` 的 `viewBox=0 0 800 600` 只是整张画布，不是 CAD 主体图层范围。

经 SVG 图层边界反查，与 `CadBounds` 宽高比匹配的主体图层范围约为：

```json
{
  "MinX": 275,
  "MinY": 79.77,
  "MaxX": 534.5,
  "MaxY": 561.39,
  "Width": 259.5,
  "Height": 481.62
}
```

宽高比对比：

```text
CadBounds: 5151.5693 / 9561.3602 = 0.53879
SVG 主体图层: 259.5 / 481.62 = 0.53881
```

因此后端不能把 SVG `viewBox` 当作坐标映射范围。

## 问题 3：设备 X/Y 被按错误 SvgBounds 计算

原始返回的设备 `X/Y` 是按 `0~800, 0~600` 映射出来的，导致设备点横向放大、部分点落到底图主体外。

示例：

| UniqueNo | 原始 X | 原始 Y | 问题 |
|---|---:|---:|---|
| GWGlH#0101-OCSR-006-0002 | 126.0438 | 251.7162 | 明显跑到底图主体左侧外 |
| GWGlH#0101-OCSR-008-0005 | 121.5749 | 456.1521 | 明显跑到底图主体左侧外 |
| GWGlH#0101-AC-002-0006 | 634.3755 | 54.2073 | 明显跑到底图主体右上外 |

## 问题 4：区域 SvgPoints 错误

真实区域 `GWGIH#0101` 返回：

```json
"SvgPoints": [
  { "X": 0, "Y": 600 },
  { "X": 800, "Y": 600 },
  { "X": 800, "Y": 0 },
  { "X": 0, "Y": 0 }
]
```

这会把区域面画成整张 SVG 画布，而不是 CAD 主体区域。

正确区域面至少应该落在主体图层范围：

```text
275,561.39 534.5,561.39 534.5,79.77 275,79.77
```

## 问题 5：辅助边界点被派生成了 4 个假 GW

后端返回了 5 个 `Type=GW`：

| UniqueNo | 是否应展示 | 原因 |
|---|---|---|
| GWGIH#0101-GW-01 | 是 | 实际区域网关 |
| 总图 Y轴最大点-GW-02 | 否 | 边界辅助点派生 |
| 总图 XY轴最大点-GW-03 | 否 | 边界辅助点派生 |
| 总图 -GW-04 | 否 | 边界辅助点派生 |
| 总图 X轴最大点-GW-05 | 否 | 边界辅助点派生 |

建议后端不要把 `总图...最大点` 这类辅助点生成网关设备；如果必须返回，需要加字段标识，例如：

```json
{
  "Type": "GW",
  "PlacementSource": "REGION_CENTROID",
  "IsDerivedBoundaryPoint": true
}
```

## 对比截图

使用正确本地 SVG 路径，但仍使用原始后端返回坐标：

![原始后端坐标测试](D:/code/lontri/kailicode/output/playwright/backend-svgurl-original-coordinates.png)

坐标问题:返回数据的坐标映射。


# 配置调试右侧抽屉 Design QA

## Comparison target

- Source visual truth: `D:\code\lontri\lontri-kaili-project\output\design-qa\region-reference-1810x994.jpg`，对应已通过 Stitch 校准的区域抽屉；颜色继续以 `D:\code\lontri\lontri-kaili-project\docs\stitch\right-drawer\5ef13c193ba84baa94bd09fd4a64554f\screenshot.png` 为准。
- Browser annotation truth: `browser:区域名称 网关`，要求“区域名称 / 网关”同排且宽度 1:1。
- Implementation screenshots:
  - `D:\code\lontri\lontri-kaili-project\output\design-qa\cu-drawer-1810x994.jpg`
  - `D:\code\lontri\lontri-kaili-project\output\design-qa\gw-scene-drawer-1810x994.jpg`
  - `D:\code\lontri\lontri-kaili-project\output\design-qa\gw-params-drawer-1810x994.jpg`
- Combined comparison: `D:\code\lontri\lontri-kaili-project\output\design-qa\comparison-device-drawers.jpg`
- Viewport: 1810 × 994；响应式复查为 700 × 900。
- State: 可视化设备 → 配置调试 → 分别点击区域、CU、GW；GW 覆盖“场景控制 / 参数配置”两个页签。

## Full-view comparison evidence

- `comparison-device-drawers.jpg` 将区域抽屉、CU 抽屉和 GW 抽屉置于同一比较画面，统一检查抽屉宽度、白色主体、浅灰内容层级、蓝色主操作和滚动结构。
- CU/GW 抽屉桌面宽度实测为 680px，与同视口的区域抽屉一致；主体和滚动区计算背景均为 `rgb(255, 255, 255)`。
- GW 子页签位于根节点第一个子元素，实测顺序为 `device-config-tabs → drawer-head → drawer-body`，不再随正文滚动。

## Focused comparison evidence

- 区域字段：1810px 视口下“区域名称 / 网关”顶部坐标均为 240px、宽度均为 313px；区域组 ID 保留在下一行，宽度 637px。
- CU 抽屉：运行控制、控制模式、亮度、无人感策略、设备状态和提交按钮内容均保留；仅调整视觉和布局。
- GW 场景页：四个场景按钮、说明和下属设备列表内容均保留。
- GW 参数页：原有 `DeviceParameterConfigPanel` 内容和输入行为保留，卡片计算背景均为白色；两个页签可正常切换且 `aria-selected` 同步。
- 700 × 900：CU 抽屉宽度 637px，与父容器 638px 对齐；亮度字段改单列，正文保持独立纵向滚动且无抽屉级横向溢出。

## Comparison history

- P1：CU/GW 抽屉复用 `control-drawer`，配置调试模式仍被深色主题和 420px 宽度覆盖。已在配置调试模式切换到独立 `stitch-device-drawer` 命名空间，并统一使用区域抽屉的 520–680px 宽度与浅色 token；复查背景、边框和控件均已一致。
- P1：GW 的“场景控制 / 参数配置”页签位于滚动正文内部。已移动到抽屉根节点最顶部，页签固定、正文独立滚动。
- P2：区域参数页“区域名称 / 网关”分处两行。已改为同一两列网格，桌面宽度精确 1:1；小于 760px 时按既定响应式规则堆叠。
- P2：GW 参数子组件存在深色硬编码卡片背景。已通过抽屉命名空间覆盖为白色卡片、浅灰容器、蓝色激活态，不影响其他页面中的组件主题。

## Fidelity surfaces

- Fonts and typography: 延续区域抽屉的 Inter/中文系统字体，设备编号使用 JetBrains Mono/Consolas；标题、标签、说明文字和编码字段层级一致。
- Spacing and layout: 16px 正文内边距、12–16px 分区间距、2–4px 控件圆角；桌面 `clamp(520px, 38vw, 680px)`，760px 以下全宽。
- Colors and tokens: `#FFFFFF`、`#F7F9FB`、`#F2F4F6`、`#ECEEF0`、`#004AC6`、`#191C1E`、`#434655`、`#505F76`、`#C3C6D7`、`#E2E8F0`、`#10B981`、`#F43F5E`。
- Image quality: 地图、CU/GW 图片和既有品牌资源未修改；本次无新增位图或占位图形。
- Copy and content: CU/GW 原有业务文案、字段、按钮、状态和数据结构均未更改；仅移动 GW 现有页签位置。

## Interaction and rendering evidence

- CU 抽屉可正常打开、滚动和关闭。
- GW 抽屉可正常打开，“场景控制 / 参数配置”可双向切换，顶部选中态正确。
- 区域抽屉六个页签及固定删除底栏仍正常，注释对应字段在区域信息和参数配置状态均已验证。
- 浏览器 console error 数量为 0。
- `npm run build` 通过；仅保留项目原有的大包体积提示。

## Findings

- 无剩余 P0/P1/P2 问题。
- 可接受差异：CU 没有原生子页签，因此未新增无业务依据的分页；GW 仅移动现有两个页签，符合“内容不变”的约束。

## 场景信息列表增量复查（2026-07-15）

- Source visual truth:
  - `C:\Users\15465\AppData\Local\Temp\codex-clipboard-e88d4889-f790-4124-bd73-6105c8a41bf2.png`：默认场景的四行操作均为“执行场景”。
  - `C:\Users\15465\AppData\Local\Temp\codex-clipboard-66268e29-31e9-4608-8f01-b4349fbf6403.png`：自定义场景保留同一批场景行，并在操作栏增加“编辑”。
- Implementation: `http://localhost:3000/#/device-visualization`，配置调试 → 区域 → 场景信息，1810 × 994 视口。
- Verification:
  - 默认场景：四行“全开 / 全关 / 节能 / 会议”均显示单个“执行场景”按钮。
  - 自定义场景：同四行内容均显示“编辑 + 执行场景”；编辑按钮为蓝色描边、Fluent 设置图标，紧随参考图的操作栏层级。
  - 点击“编辑”可打开既有场景参数弹窗；关闭后未保存测试数据。
  - 浏览器 console error 数量为 0；构建通过。
- Findings: 无剩余 P0/P1/P2 问题。

## 自定义场景参数配置弹窗增量复查（2026-07-15）

- Source visual truth: `C:\Users\15465\AppData\Local\Temp\codex-clipboard-b4ab5665-3dd4-4006-892e-57aebf98c756.png`。
- Implementation: `http://localhost:3000/#/device-visualization`，配置调试 → 区域 → 场景信息 → 自定义场景 → 编辑；1280 × 900 视口下弹窗实测宽度 976px。
- Layout: 白色标题区、场景号蓝色胶囊标签、浅灰正文区、配置卡片头部和固定底部操作区均与目标稿对齐；卡片内为色温/亮度/设备与 485 命令双列布局。
- Interaction verification:
  - 点击卡片标题栏“新增配置信息”后出现完整复制的“配置信息2”。
  - 点击“删除配置信息2”后仅删除第二张卡片，保留“配置信息1”。
  - 点击 485 命令行“新增”后，单张卡片内命令行从 1 条变为 2 条；点击第二条的“删除此命令”后回到 1 条，配置卡片数量不变。
  - 编辑弹窗关闭时未保存测试数据；浏览器 console error 数量为 0。
- Findings: 无剩余 P0/P1/P2 问题。

## 抽屉操作按钮一致性复查（2026-07-15）

- Scope: 配置调试 → 区域右侧抽屉内所有可见的“一键查询 / 一键配置”入口。
- Result: 查询统一为 30px 白底、主蓝边框与主蓝图标文字；配置统一为 30px 主蓝实底、白色图标文字；两者最小宽度均为 88px，图标为 14px、文字为 12px。
- Coverage: 区域信息和场景信息的设备列表操作区，以及面板配置、订阅管理、MTC 模式的查询入口。
- Runtime verification: 区域信息与场景信息均实测查询按钮 `30px / 88px / #FFFFFF / #004AC6`，配置按钮 `30px / 88px / #004AC6 / #FFFFFF`；浏览器 console error 数量为 0。

final result: passed

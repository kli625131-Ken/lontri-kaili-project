# Deep Sea Dashboard Theme Package

这个文件夹是可整包复制的主题包。

## 目录结构

- `theme-package/deep-sea-dashboard/styles/deep-sea-dashboard.css`
- `theme-package/deep-sea-dashboard/components/Header.vue`
- `theme-package/deep-sea-dashboard/components/DataCard.vue`
- `theme-package/deep-sea-dashboard/components/KPICard.vue`
- `theme-package/deep-sea-dashboard/README.md`
- `theme-package/deep-sea-dashboard/App.style-snippet.txt`

## 最小接入方式

1. 把 `styles/deep-sea-dashboard.css` 复制到你的项目里
2. 在你的根组件里引入主题样式
3. 复制 3 个配套组件到你的组件目录
4. 按需把页面里的卡片、KPI、头部替换成这些组件

## 根组件引入示例

```vue
<style>
@import './styles/deep-sea-dashboard.css';
</style>
```

## 主题包含

- 深海大屏配色 token
- 背景渐变 / 网格 / 雾光层
- 按钮、输入框、表格、滚动条统一皮肤
- 常见大屏页面交互动效
- Header / DataCard / KPICard 配套组件

## 迁移建议

- 如果新项目的类名和当前项目不同，可以先只接入 `deep-sea-dashboard.css`
- 如果想快速得到一致效果，推荐连同 `Header.vue`、`DataCard.vue`、`KPICard.vue` 一起复制
- 如果你后续要做多主题，可以按同级目录继续扩展，比如：
  - `theme-package/dark-gold-dashboard/`
  - `theme-package/blue-purple-command/`

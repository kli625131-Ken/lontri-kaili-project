<template>
  <div class="map-edit-toolbar" :class="{ expanded }" @click.stop>
    <div class="tool-rail">
      <button
        v-for="item in primaryTools"
        :key="item.group"
        class="rail-btn"
        :class="{ active: activeGroup === item.group || isGroupActive(item.group) }"
        :aria-pressed="activeGroup === item.group || isGroupActive(item.group)"
        :title="item.label"
        @click="toggleGroup(item.group)"
      >
        <span class="rail-icon">
          <svg class="tool-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path v-for="path in getIconPaths(item.icon)" :key="path" :d="path"></path>
            <text v-if="getIconText(item.icon)" x="12" y="14.5">{{ getIconText(item.icon) }}</text>
          </svg>
        </span>
      </button>

      <button
        class="rail-btn expand-btn"
        :class="{ active: expanded }"
        :aria-pressed="expanded"
        :title="expanded ? '收起' : '展开'"
        @click="toggleExpanded"
      >
        <span class="rail-icon">
          <svg class="tool-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="expanded ? 'M10 6 4 12l6 6M18 6l-6 6 6 6' : 'M6 6l6 6-6 6M14 6l6 6-6 6'"></path>
          </svg>
        </span>
      </button>
    </div>

    <div v-if="expanded" class="tool-panel">
      <section v-for="section in toolSections" :key="section.group" class="tool-section">
        <div class="section-title">{{ section.title }}</div>
        <div class="section-grid">
          <button
            v-for="tool in section.tools"
            :key="tool.value"
            class="panel-tool-btn"
            :class="{ active: activeTool === tool.value }"
            :aria-pressed="activeTool === tool.value"
            :title="tool.label"
            @click="selectTool(tool.value)"
          >
            <span class="panel-icon">
              <svg class="tool-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path v-for="path in getIconPaths(tool.icon)" :key="path" :d="path"></path>
                <text v-if="getIconText(tool.icon)" x="12" y="14.5">{{ getIconText(tool.icon) }}</text>
              </svg>
            </span>
            <span class="panel-label">{{ tool.label }}</span>
          </button>
        </div>
      </section>

      <div v-if="activeTool === 'add-device'" class="add-device-panel">
        <select :value="deviceDraft.type" @change="updateDraft('type', $event.target.value)">
          <option value="cu">CU</option>
          <option value="gw">GW</option>
        </select>
        <select :value="deviceDraft.gatewayId" @change="updateDraft('gatewayId', $event.target.value)">
          <option value="">选择网关</option>
          <option v-for="gateway in gatewayOptions" :key="gateway.value" :value="gateway.value">
            {{ gateway.label }}
          </option>
        </select>
        <input
          :value="deviceDraft.deviceNo"
          placeholder="设备编号"
          @input="updateDraft('deviceNo', $event.target.value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  activeTool: {
    type: String,
    required: true
  },
  expanded: {
    type: Boolean,
    default: false
  },
  activeGroup: {
    type: String,
    default: 'region'
  },
  deviceDraft: {
    type: Object,
    required: true
  },
  gatewayOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'tool-change',
  'device-draft-change',
  'save-draft',
  'validate',
  'update:expanded',
  'update:active-group'
])

const primaryTools = [
  { label: '选择', icon: 'cursor', group: 'select' },
  { label: '区域工具', icon: 'rect', group: 'region' },
  { label: '设备工具', icon: 'device', group: 'device' },
  { label: '配置工具', icon: 'config', group: 'config' },
  { label: '调试工具', icon: 'debug', group: 'debug' }
]

const toolSections = [
  {
    group: 'region',
    title: '区域工具',
    tools: [
      { label: '选择', icon: 'cursor', value: 'select' },
      { label: '新建矩形区域', icon: 'rect', value: 'draw-rect' },
      { label: '新建圆形区域', icon: 'circle', value: 'draw-circle' },
      { label: '新建多边形区域', icon: 'poly', value: 'draw-polygon' },
      { label: '编辑区域', icon: 'pencil', value: 'edit-region' },
      { label: '删除区域', icon: 'trash', value: 'delete-region' }
    ]
  },
  {
    group: 'device',
    title: '设备工具',
    tools: [
      { label: '添加设备', icon: 'plus', value: 'add-device' },
      { label: '移动设备', icon: 'move', value: 'move-device' },
      { label: '删除设备', icon: 'trash', value: 'delete-device' }
    ]
  },
  {
    group: 'config',
    title: '配置工具',
    tools: [
      { label: '区域配置', icon: 'configBox', value: 'area-group' },
      { label: '场景配置', icon: 'scene', value: 'scene' },
      { label: 'CU 参数', icon: 'cu', value: 'cu-param' }
    ]
  },
  {
    group: 'debug',
    title: '调试工具',
    tools: [
      { label: '测试校准', icon: 'debug', value: 'validate' }
    ]
  }
]

const toolsByGroup = toolSections.reduce((result, section) => {
  result[section.group] = new Set(section.tools.map((tool) => tool.value))
  return result
}, {})

const iconPaths = {
  cursor: ['M5.5 4.5 18.5 11l-5.2 1.8 3 5.7-2.8 1.4-3-5.7-4 4.2v-14z'],
  rect: ['M6 6h12v12H6z'],
  circle: ['M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z'],
  poly: ['M12 4.5 19 8.5v7L12 19.5 5 15.5v-7z'],
  pencil: ['M5 17.5 6.2 13.4 15.6 4l4.4 4.4-9.4 9.4-4.1 1.2z', 'M13.8 5.8l4.4 4.4'],
  trash: ['M7 8h10M10 8V6h4v2M8.5 10v8h7v-8'],
  plus: ['M12 6v12M6 12h12'],
  move: ['M12 4v16M4 12h16M8 8l4-4 4 4M8 16l4 4 4-4M8 8l-4 4 4 4M16 8l4 4-4 4'],
  device: ['M8 8h8v10H8z', 'M10 6h4', 'M10 11h4M10 14h4'],
  config: ['M12 5v14M5 12h14M7.5 7.5l9 9M16.5 7.5l-9 9', 'M9.2 9.2a4 4 0 1 0 5.6 5.6 4 4 0 0 0-5.6-5.6z'],
  configBox: ['M6 6h12v12H6z', 'M9 9h6v6H9z'],
  scene: ['M8.5 5.5h2.5a3.5 3.5 0 0 1 0 7H8.5a3.5 3.5 0 0 1 0-7z', 'M13 11.5h2.5a3.5 3.5 0 0 1 0 7H13a3.5 3.5 0 0 1 0-7z'],
  debug: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18'],
  cu: []
}

const iconText = {
  cu: 'CU'
}

function toggleGroup(group) {
  if (group === 'select') {
    selectTool('select')
    emit('update:active-group', 'region')
    emit('update:expanded', false)
    return
  }

  emit('update:active-group', group)
  emit('update:expanded', props.expanded && props.activeGroup === group ? false : true)
}

function toggleExpanded() {
  emit('update:expanded', !props.expanded)
}

function selectTool(value) {
  emit('tool-change', value)
  if (value === 'validate') emit('validate')
}

function isGroupActive(group) {
  if (group === 'select') return props.activeTool === 'select'
  return toolsByGroup[group]?.has(props.activeTool)
}

function updateDraft(key, value) {
  emit('device-draft-change', {
    ...props.deviceDraft,
    [key]: value
  })
}

function getIconPaths(name) {
  return iconPaths[name] || []
}

function getIconText(name) {
  return iconText[name] || ''
}
</script>

<style scoped>
.map-edit-toolbar {
  position: relative;
  z-index: 14;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: max-content;
  max-width: min(390px, calc(100vw - 340px));
}

.tool-rail,
.tool-panel {
  border: 1px solid rgba(100, 167, 205, 0.26);
  background:
    linear-gradient(145deg, rgba(20, 45, 66, 0.95), rgba(8, 24, 39, 0.96) 60%, rgba(8, 22, 36, 0.98)),
    rgba(7, 21, 36, 0.94);
  box-shadow:
    0 18px 30px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
}

.tool-rail {
  width: 47px;
  display: grid;
  gap: 9px;
  padding: 7px 6px 8px;
  border-radius: 10px;
}

.rail-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(127, 178, 211, 0.24);
  border-radius: 7px;
  background: rgba(12, 31, 50, 0.9);
  color: rgba(211, 227, 239, 0.74);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.rail-btn:active {
  transform: translateY(1px) scale(0.96);
}

.rail-btn:focus-visible,
.panel-tool-btn:focus-visible {
  outline: 2px solid rgba(85, 242, 223, 0.78);
  outline-offset: 2px;
}

.rail-btn:hover,
.rail-btn.active {
  color: #56f4df;
  border-color: rgba(43, 238, 217, 0.88);
  background: rgba(15, 73, 83, 0.72);
  box-shadow:
    0 0 0 1px rgba(43, 238, 217, 0.36),
    0 0 14px rgba(43, 238, 217, 0.42),
    inset 0 0 14px rgba(43, 238, 217, 0.12);
}

.expand-btn {
  position: relative;
  margin-top: 8px;
  color: #d7e6ef;
}

.expand-btn::before {
  content: '';
  position: absolute;
  top: -9px;
  left: 3px;
  right: 3px;
  height: 1px;
  background: rgba(111, 170, 204, 0.22);
}

.expand-mark {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}

.tool-panel {
  width: 222px;
  max-width: calc(100vw - 360px);
  max-height: min(490px, calc(100vh - 330px));
  display: grid;
  gap: 11px;
  padding: 13px 15px 15px;
  border-radius: 10px;
  overflow-y: auto;
}

.tool-section + .tool-section {
  padding-top: 11px;
  border-top: 1px solid rgba(108, 166, 198, 0.18);
}

.section-title {
  margin-bottom: 9px;
  color: rgba(223, 236, 246, 0.82);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(4, 38px);
  gap: 10px 10px;
  align-items: start;
}

.panel-tool-btn {
  position: relative;
  min-width: 0;
  min-height: 57px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: rgba(214, 229, 241, 0.72);
  cursor: pointer;
  font-size: 9px;
  text-align: center;
  line-height: 1.15;
  transition:
    color 160ms ease,
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.panel-tool-btn:hover,
.panel-tool-btn.active {
  color: #55f2df;
  border-color: rgba(43, 238, 217, 0.22);
  background: rgba(30, 87, 99, 0.34);
}

.panel-tool-btn:active {
  transform: translateY(1px) scale(0.98);
}

.panel-tool-btn.active::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #55f2df;
  box-shadow: 0 0 8px rgba(85, 242, 223, 0.72);
}

.panel-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid rgba(126, 179, 212, 0.23);
  border-radius: 7px;
  background: rgba(16, 38, 58, 0.78);
  color: currentColor;
  font-family: var(--font-num);
  font-weight: 700;
  flex: 0 0 auto;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease,
    color 160ms ease;
}

.panel-tool-btn:hover .panel-icon,
.panel-tool-btn.active .panel-icon {
  color: #55f2df;
  border-color: rgba(43, 238, 217, 0.7);
  background: rgba(20, 78, 90, 0.86);
  box-shadow:
    0 0 12px rgba(43, 238, 217, 0.28),
    inset 0 0 10px rgba(43, 238, 217, 0.08);
}

.panel-label {
  min-width: 0;
  width: 44px;
  color: currentColor;
  white-space: normal;
}

.panel-tool-btn.active .panel-label {
  font-weight: 700;
}

.rail-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tool-svg {
  width: 20px;
  height: 20px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.panel-icon .tool-svg {
  width: 19px;
  height: 19px;
}

.tool-svg text {
  fill: currentColor;
  stroke: none;
  font-family: var(--font-num);
  font-size: 7px;
  font-weight: 800;
  text-anchor: middle;
}

.add-device-panel {
  display: grid;
  grid-template-columns: 72px minmax(92px, 1fr) minmax(92px, 1fr);
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(89, 227, 255, 0.14);
}

.add-device-panel select,
.add-device-panel input {
  height: 30px;
  min-width: 0;
  border-radius: 9px;
  border: 1px solid rgba(89, 227, 255, 0.24);
  background: rgba(4, 14, 28, 0.9);
  color: rgba(234, 243, 252, 0.9);
  font-size: 12px;
  padding: 0 9px;
}

@media (max-width: 1180px) {
  .tool-panel {
    width: 222px;
  }

  .section-grid {
    grid-template-columns: repeat(4, 38px);
  }

  .add-device-panel {
    grid-template-columns: 1fr;
  }
}
</style>

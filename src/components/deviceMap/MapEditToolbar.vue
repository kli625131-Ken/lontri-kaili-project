<template>
  <div class="map-edit-toolbar" @click.stop>
    <div class="toolbar-rail" aria-label="地图编辑工具">
      <button
        class="tool-btn expand-btn"
        :class="{ active: expanded }"
        :aria-expanded="expanded"
        title="展开工具"
        type="button"
        @click="emit('update:expanded', !expanded)"
      >
        <svg class="tool-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h14M5 12h14M5 17h14"></path>
        </svg>
      </button>

      <button
        v-for="tool in railTools"
        :key="tool.value"
        class="tool-btn"
        :class="{ active: activeTool === tool.value }"
        :aria-pressed="activeTool === tool.value"
        :title="tool.label"
        type="button"
        @click="selectTool(tool)"
      >
        <svg class="tool-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path v-for="path in iconPaths[tool.icon]" :key="path" :d="path"></path>
        </svg>
      </button>
    </div>

    <div v-if="expanded" class="toolbar-panel">
      <div
        v-for="group in toolGroups"
        :key="group.value"
        class="tool-group"
      >
        <button
          class="group-title"
          type="button"
          :class="{ active: activeGroup === group.value }"
          @click="emit('update:active-group', group.value)"
        >
          {{ group.label }}
        </button>

        <div class="tool-list">
          <button
            v-for="tool in group.tools"
            :key="tool.value"
            class="panel-tool"
            :class="{ active: activeTool === tool.value }"
            type="button"
            @click="selectTool(tool)"
          >
            <span class="panel-icon">
              <svg class="tool-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path v-for="path in iconPaths[tool.icon]" :key="path" :d="path"></path>
              </svg>
            </span>
            <span class="panel-copy">
              <strong>{{ tool.label }}</strong>
              <small>{{ tool.hint }}</small>
            </span>
          </button>
        </div>
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
  }
})

const emit = defineEmits([
  'tool-change',
  'update:expanded',
  'update:active-group'
])

const regionTools = [
  { label: '选择', hint: '查看区域配置', icon: 'cursor', value: 'select' },
  { label: '新建矩形区域', hint: '拖拽生成矩形', icon: 'rect', value: 'draw-rect' },
  { label: '新建圆形区域', hint: '拖拽生成圆形', icon: 'circle', value: 'draw-circle' },
  { label: '新建多边形区域', hint: '点击添加顶点', icon: 'poly', value: 'draw-polygon' },
  { label: '编辑区域', hint: '移动和调整顶点', icon: 'pencil', value: 'edit-region' },
  { label: '删除区域', hint: '点击区域删除', icon: 'regionTrash', value: 'delete-region' }
]

const deviceTools = [
  { label: '新增设备', hint: '点击地图空白位置添加设备', icon: 'add', value: 'add-device' },
  { label: '移动设备', hint: '拖动设备点位', icon: 'move', value: 'move-device' },
  { label: '删除设备', hint: '点击设备删除', icon: 'trash', value: 'delete-device' }
]

const toolGroups = [
  { label: '区域工具', value: 'region', tools: regionTools },
  { label: '设备工具', value: 'device', tools: deviceTools }
]

const railTools = [
  regionTools[0],
  regionTools[1],
  regionTools[3],
  regionTools[4],
  regionTools[5],
  deviceTools[0],
  deviceTools[1],
  deviceTools[2]
]

const iconPaths = {
  cursor: ['M5.5 4.5 18.5 11l-5.2 1.8 3 5.7-2.8 1.4-3-5.7-4 4.2v-14z'],
  rect: ['M6 6h12v12H6z'],
  circle: ['M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z'],
  poly: ['M12 4.5 19 8.5v7L12 19.5 5 15.5v-7z'],
  pencil: ['M5 17.5 6.2 13.4 15.6 4l4.4 4.4-9.4 9.4-4.1 1.2z', 'M13.8 5.8l4.4 4.4'],
  regionTrash: ['M7 7h10M9 7V5.5h6V7M8.5 9.5v8h7v-8', 'M5.5 19h13'],
  add: ['M12 5v14M5 12h14'],
  trash: ['M7 8h10M10 8V6h4v2M8.5 10v8h7v-8'],
  move: ['M12 4v16M4 12h16M8 8l4-4 4 4M8 16l4 4 4-4M8 8l-4 4 4 4M16 8l4 4-4 4']
}

function selectTool(tool) {
  const group = deviceTools.some((item) => item.value === tool.value) ? 'device' : 'region'
  if (props.activeGroup !== group) emit('update:active-group', group)
  emit('tool-change', tool.value)
}
</script>

<style scoped>
.map-edit-toolbar {
  position: relative;
  z-index: 14;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: max-content;
}

.toolbar-rail {
  width: 42px;
  display: grid;
  gap: 6px;
  padding: 6px;
  border: 1px solid rgba(89, 227, 255, 0.2);
  border-radius: 8px;
  background: rgba(7, 21, 36, 0.9);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(12px);
}

.tool-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(214, 229, 241, 0.72);
  cursor: pointer;
}

.tool-btn:hover,
.tool-btn.active {
  color: #55f2df;
  background: rgba(53, 246, 212, 0.14);
}

.expand-btn {
  border-bottom: 1px solid rgba(89, 227, 255, 0.14);
}

.tool-btn:focus-visible,
.panel-tool:focus-visible,
.group-title:focus-visible {
  outline: 2px solid rgba(85, 242, 223, 0.72);
  outline-offset: 2px;
}

.tool-svg {
  width: 18px;
  height: 18px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.toolbar-panel {
  width: 218px;
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  border-radius: 10px;
  background: rgba(7, 21, 36, 0.92);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(14px);
}

.tool-group {
  display: grid;
  gap: 7px;
}

.group-title {
  justify-self: start;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(89, 227, 255, 0.18);
  border-radius: 6px;
  background: rgba(8, 24, 40, 0.72);
  color: rgba(234, 243, 252, 0.76);
  font-size: 12px;
}

.group-title.active {
  color: #55f2df;
  border-color: rgba(53, 246, 212, 0.42);
  background: rgba(53, 246, 212, 0.1);
}

.tool-list {
  display: grid;
  gap: 5px;
}

.panel-tool {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(226, 238, 248, 0.78);
  text-align: left;
}

.panel-tool:hover,
.panel-tool.active {
  color: #f3f9ff;
  border-color: rgba(53, 246, 212, 0.36);
  background: rgba(53, 246, 212, 0.1);
}

.panel-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(89, 227, 255, 0.08);
  color: #55f2df;
}

.panel-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.panel-copy strong,
.panel-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-copy strong {
  font-size: 12px;
  font-weight: 600;
}

.panel-copy small {
  color: rgba(211, 225, 239, 0.56);
  font-size: 11px;
}

/* Shared map control palette. */
.toolbar-rail, .toolbar-panel { border-color: var(--border-default); background: rgba(7, 24, 42, 0.95); box-shadow: var(--shadow-panel); }
.tool-btn { color: var(--text-tertiary); }
.tool-btn:hover, .tool-btn.active { color: var(--accent-cyan); background: var(--info-soft); }
.expand-btn { border-bottom-color: var(--border-subtle); }
.tool-btn:focus-visible, .panel-tool:focus-visible, .group-title:focus-visible { outline-color: var(--border-active); }
.group-title { border-color: var(--border-subtle); background: var(--control-bg); color: var(--text-secondary); }
.group-title.active { color: var(--accent-cyan); border-color: var(--border-active); background: var(--info-soft); }
.panel-tool { background: rgba(10, 29, 51, 0.56); color: var(--text-secondary); }
.panel-tool:hover, .panel-tool.active { color: var(--text-primary); border-color: var(--border-active); background: var(--info-soft); }
.panel-icon { background: var(--info-soft); color: var(--accent-cyan); }
.panel-copy small { color: var(--text-tertiary); }
</style>

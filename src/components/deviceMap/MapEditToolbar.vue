<template>
  <div class="map-edit-toolbar" @click.stop>
    <button
      v-for="tool in tools"
      :key="tool.value"
      class="tool-btn"
      :class="{ active: activeTool === tool.value }"
      :aria-pressed="activeTool === tool.value"
      :title="tool.label"
      type="button"
      @click="$emit('tool-change', tool.value)"
    >
      <svg class="tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path v-for="path in iconPaths[tool.icon]" :key="path" :d="path"></path>
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
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

defineEmits([
  'tool-change',
  'update:expanded',
  'update:active-group'
])

const tools = [
  { label: '选择', icon: 'cursor', value: 'select' },
  { label: '新建矩形区域', icon: 'rect', value: 'draw-rect' },
  { label: '新建圆形区域', icon: 'circle', value: 'draw-circle' },
  { label: '新建多边形区域', icon: 'poly', value: 'draw-polygon' },
  { label: '编辑区域', icon: 'pencil', value: 'edit-region' },
  { label: '删除区域', icon: 'regionTrash', value: 'delete-region' },
  { label: '移动设备', icon: 'move', value: 'move-device' },
  { label: '删除设备', icon: 'trash', value: 'delete-device' }
]

const iconPaths = {
  cursor: ['M5.5 4.5 18.5 11l-5.2 1.8 3 5.7-2.8 1.4-3-5.7-4 4.2v-14z'],
  rect: ['M6 6h12v12H6z'],
  circle: ['M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z'],
  poly: ['M12 4.5 19 8.5v7L12 19.5 5 15.5v-7z'],
  pencil: ['M5 17.5 6.2 13.4 15.6 4l4.4 4.4-9.4 9.4-4.1 1.2z', 'M13.8 5.8l4.4 4.4'],
  regionTrash: ['M7 7h10M9 7V5.5h6V7M8.5 9.5v8h7v-8', 'M5.5 19h13'],
  trash: ['M7 8h10M10 8V6h4v2M8.5 10v8h7v-8'],
  move: ['M12 4v16M4 12h16M8 8l4-4 4 4M8 16l4 4 4-4M8 8l-4 4 4 4M16 8l4 4-4 4']
}
</script>

<style scoped>
.map-edit-toolbar {
  position: relative;
  z-index: 14;
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

.tool-btn:hover {
  color: rgba(234, 243, 252, 0.95);
  background: rgba(89, 227, 255, 0.1);
}

.tool-btn.active {
  color: #55f2df;
  background: rgba(53, 246, 212, 0.16);
}

.tool-btn:focus-visible {
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
</style>

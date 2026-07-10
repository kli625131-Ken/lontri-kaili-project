<template>
  <div class="tree-item" :class="`level-${depth + 1}`">
    <button
      type="button"
      class="tree-node"
      :class="{ active: selectedId === node.id, disabled: isDisabled, selectable: isSelectable }"
      :disabled="isDisabled"
      @click="handleNodeClick"
    >
      <span
        v-if="hasChildren"
        class="arrow"
        role="button"
        :aria-label="isExpanded ? '收起' : '展开'"
        @click.stop="$emit('toggle', node.id)"
      >{{ isExpanded ? '▾' : '▸' }}</span>
      <span v-else class="arrow placeholder"></span>
      <span class="node-icon">{{ node.icon }}</span>
      <span class="node-text">{{ node.label }}</span>
      <span v-if="depth === 2" class="level-tag">整栋</span>
    </button>

    <div v-if="hasChildren" v-show="isExpanded" class="tree-children">
      <EnergyAreaTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        :selected-id="selectedId"
        :map-config="mapConfig"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  expandedIds: { type: Object, required: true },
  selectedId: { type: String, default: '' },
  mapConfig: { type: Object, required: true }
})

const emit = defineEmits(['toggle', 'select'])

const hasChildren = computed(() => Boolean(props.node.children?.length))
const isExpanded = computed(() => props.expandedIds.has(props.node.id))
const isSelectable = computed(() => props.depth === 2 || Boolean(props.node.mapId))
const isDisabled = computed(() => Boolean(props.node.mapId && props.mapConfig[props.node.mapId]?.available === false))

function handleNodeClick() {
  if (isSelectable.value) {
    emit('select', props.node)
    return
  }
  if (hasChildren.value) emit('toggle', props.node.id)
}
</script>

<style scoped>
.tree-item { margin: 2px 0; }
.tree-node {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
}
.tree-node:hover { background: var(--info-soft); color: var(--text-primary); }
.tree-node.active { background: rgba(77, 159, 255, 0.15); border-color: var(--border-default); color: var(--accent-cyan); }
.tree-node.disabled { color: var(--text-disabled); cursor: not-allowed; opacity: 0.58; }
.arrow { width: 12px; flex: 0 0 12px; color: var(--text-muted); font-size: 10px; text-align: center; }
.arrow.placeholder { opacity: 0; }
.node-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(85, 216, 255, 0.08);
  color: var(--text-tertiary);
  font-size: 10px;
  flex: 0 0 20px;
}
.node-text { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.level-tag { padding: 2px 5px; border-radius: 999px; background: var(--info-soft); color: var(--text-tertiary); font-size: 9px; }
.tree-children { padding-left: 12px; }
</style>

<template>
  <div class="map-mode-switch">
    <button
      v-for="mode in modes"
      :key="mode.value"
      class="mode-btn"
      :class="{ active: modelValue === mode.value }"
      @click="$emit('change', mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  },
  modes: {
    type: Array,
    default: () => [
      { label: '默认模式', value: 'default' },
      { label: '配置调试', value: 'config' }
    ]
  }
})

defineEmits(['change'])
</script>

<style scoped>
.map-mode-switch {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  background: var(--control-bg);
}

.mode-btn {
  min-width: 76px;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
}

.mode-btn.active {
  color: var(--bg-page-deep);
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan));
  box-shadow: 0 0 16px rgba(85, 216, 255, 0.16);
}
</style>

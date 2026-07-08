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
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(6, 17, 31, 0.72);
}

.mode-btn {
  min-width: 76px;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(234, 243, 252, 0.72);
  font-size: 12px;
}

.mode-btn.active {
  color: #06111f;
  background: linear-gradient(90deg, #7ef3ff, #9ff5cc);
  box-shadow: 0 0 16px rgba(89, 227, 255, 0.22);
}
</style>

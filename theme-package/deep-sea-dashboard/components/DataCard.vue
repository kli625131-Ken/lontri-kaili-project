<template>
  <div class="data-card" :class="customClass">
    <div class="card-header" v-if="showHeader">
      <template v-if="$slots.header">
        <slot name="header"></slot>
      </template>
      <template v-else>
        <div class="title-bar"></div>
        <span class="title-text">{{ title }}</span>
        <slot name="header-extra"></slot>
      </template>
    </div>
    <div class="card-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  title: String,
  customClass: String
})

const slots = useSlots()
const showHeader = computed(() => Boolean(props.title || slots.header || slots['header-extra']))
</script>

<style scoped>
.data-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    linear-gradient(180deg, rgba(12, 28, 48, 0.94), rgba(8, 20, 35, 0.88));
  border: 1px solid var(--line-main);
  box-shadow:
    var(--shadow-panel),
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    inset 0 0 0 1px rgba(89, 227, 255, 0.03);
  backdrop-filter: blur(10px);
}

.data-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(89, 227, 255, 0.65) 20%, rgba(53, 246, 212, 0.42) 60%, transparent 100%);
  opacity: 0.9;
}

.data-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 88px;
  height: 88px;
  background: radial-gradient(circle at top right, rgba(89, 227, 255, 0.12), transparent 70%);
  pointer-events: none;
}

.card-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(89, 227, 255, 0.12);
  flex-shrink: 0;
}

.card-header::after {
  content: '';
  position: absolute;
  left: 16px;
  bottom: -1px;
  width: 56px;
  height: 1px;
  background: linear-gradient(90deg, var(--accent-cyan), transparent);
}

.title-bar {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-teal));
  box-shadow:
    0 0 0 4px rgba(89, 227, 255, 0.08),
    0 0 12px rgba(89, 227, 255, 0.22);
}

.title-text {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: 0.6px;
}

.card-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

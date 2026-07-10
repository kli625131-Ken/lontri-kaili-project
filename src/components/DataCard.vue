<template>
  <div class="data-card" :class="{ 'with-border': showBorder }">
    <div v-if="title" class="card-header">
      <div class="title-bar"></div>
      <span v-if="icon" class="card-icon">{{ icon }}</span>
      <span class="title-text">{{ title }}</span>
      <slot name="header-extra"></slot>
    </div>
    <div class="card-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  showBorder: { type: Boolean, default: true }
})
</script>

<style scoped>
.data-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, var(--inner-highlight), transparent 24%),
    linear-gradient(180deg, rgba(13, 39, 67, 0.96), var(--card-bg));
  border: 1px solid var(--border-subtle);
  box-shadow:
    var(--shadow-panel),
    inset 0 1px 0 var(--inner-highlight),
    inset 0 0 0 1px rgba(85, 216, 255, 0.025);
  backdrop-filter: blur(14px);
}

.data-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(85, 216, 255, 0.48), rgba(77, 159, 255, 0.18), transparent);
  opacity: 0.72;
}

.data-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 136px;
  height: 136px;
  background: radial-gradient(circle at top right, rgba(85, 216, 255, 0.08), transparent 66%);
  pointer-events: none;
}

.card-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(85, 216, 255, 0.035), transparent);
}

.card-header::after {
  content: '';
  position: absolute;
  left: 16px;
  bottom: -1px;
  width: 72px;
  height: 1px;
  background: linear-gradient(90deg, var(--accent-cyan), rgba(85, 216, 255, 0.18), transparent);
}

.title-bar {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green));
  box-shadow:
    0 0 0 4px var(--info-soft),
    0 0 12px rgba(85, 216, 255, 0.18);
}

.card-icon {
  font-size: 18px;
  margin-right: 4px;
}

.title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-strong);
  flex: 1;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 10px rgba(214, 232, 247, 0.08);
}

.card-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

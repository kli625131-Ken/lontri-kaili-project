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
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.02) 22%, transparent 54%),
    linear-gradient(135deg, rgba(255, 203, 114, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(34, 56, 82, 0.9), rgba(19, 37, 57, 0.84));
  border: 1px solid rgba(175, 210, 230, 0.24);
  box-shadow:
    var(--shadow-panel),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 0 0 1px rgba(120, 232, 255, 0.04),
    0 12px 32px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(14px);
}

.data-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(214, 232, 247, 0.82) 18%, rgba(88, 239, 219, 0.44) 54%, rgba(255, 203, 114, 0.36) 78%, rgba(255, 255, 255, 0));
  opacity: 0.95;
}

.data-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 136px;
  height: 136px;
  background: radial-gradient(circle at top right, rgba(220, 236, 252, 0.2), transparent 64%);
  pointer-events: none;
}

.card-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(183, 214, 235, 0.14);
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
}

.card-header::after {
  content: '';
  position: absolute;
  left: 16px;
  bottom: -1px;
  width: 72px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.82), var(--accent-cyan), transparent);
}

.title-bar {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green));
  box-shadow:
    0 0 0 4px rgba(120, 232, 255, 0.1),
    0 0 14px rgba(120, 232, 255, 0.18);
}

.card-icon {
  font-size: 18px;
  margin-right: 4px;
}

.title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
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

<template>
  <div class="kpi-card">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value" :class="valueClass">
      {{ value }}<span class="kpi-unit">{{ unit }}</span>
    </div>
    <div class="kpi-sub" v-if="subText">
      {{ subText }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  value: [String, Number],
  unit: String,
  valueClass: String,
  subText: String
})
</script>

<style scoped>
.kpi-card {
  position: relative;
  flex: 1;
  overflow: hidden;
  padding: 16px 20px 18px;
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(89, 227, 255, 0.03), transparent 22%),
    linear-gradient(180deg, rgba(12, 28, 48, 0.95), rgba(8, 20, 35, 0.9));
  border: 1px solid var(--line-main);
  box-shadow:
    var(--shadow-panel),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.kpi-card::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 72px;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-cyan), transparent);
}

.kpi-card::after {
  content: '';
  position: absolute;
  right: -18px;
  top: -18px;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(89, 227, 255, 0.08), transparent 70%);
  pointer-events: none;
}

.kpi-label {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-2);
  letter-spacing: 0.4px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.15;
  font-family: var(--font-num);
  color: var(--text-1);
  text-shadow: 0 0 12px rgba(89, 227, 255, 0.1);
}

.kpi-unit {
  margin-left: 6px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-3);
}

.kpi-sub {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-2);
}
</style>

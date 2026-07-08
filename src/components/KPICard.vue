<template>
  <div class="kpi-card">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value" :style="{ color: valueColor }">
      {{ value }}
      <span v-if="unit" class="kpi-unit">{{ unit }}</span>
    </div>
    <div v-if="subValue" class="kpi-sub">
      <span class="sub-icon" v-if="subIcon">{{ subIcon }}</span>
      {{ subValue }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  valueColor: { type: String, default: 'var(--text-1)' },
  subValue: { type: String, default: '' },
  subIcon: { type: String, default: '' }
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
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02) 24%, transparent 50%),
    linear-gradient(135deg, rgba(255, 203, 114, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(39, 63, 90, 0.92), rgba(24, 43, 65, 0.86));
  border: 1px solid rgba(180, 214, 235, 0.28);
  box-shadow:
    var(--shadow-panel),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 0 0 1px rgba(120, 232, 255, 0.04);
}

.kpi-card::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 84px;
  height: 2px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.86), var(--accent-cyan), transparent);
}

.kpi-card::after {
  content: '';
  position: absolute;
  right: -24px;
  top: -28px;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 236, 252, 0.18), transparent 68%);
  pointer-events: none;
}

.kpi-label {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-2);
  letter-spacing: 0.45px;
  font-weight: 600;
}

.kpi-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.15;
  font-family: var(--font-num);
  color: var(--text-1);
  text-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
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
  color: rgba(234, 243, 252, 0.88);
  text-shadow: 0 1px 8px rgba(255, 255, 255, 0.04);
}
</style>

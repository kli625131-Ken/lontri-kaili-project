<template>
  <section class="drawer-section">
    <div class="section-head">
      <span>控制模式</span>
    </div>
    <div class="button-grid two">
      <button
        class="action-btn"
        :class="{ active: model.mode === 'manual' }"
        type="button"
        @click="setMode('manual')"
      >
        手动
      </button>
      <button
        class="action-btn"
        :class="{ active: model.mode === 'auto' }"
        type="button"
        @click="setMode('auto')"
      >
        自动感应
      </button>
    </div>
    <p class="section-desc">参数配置沿用 CU 参数项，不包含运行控制。</p>
  </section>

  <section class="drawer-section">
    <div class="section-head">
      <span>亮度设置</span>
      <span class="section-tag">0 - 100%</span>
    </div>
    <div class="metric-grid">
      <datalist :id="brightnessListId">
        <option v-for="value in brightnessOptions" :key="value" :value="`${value}%`"></option>
      </datalist>
      <div class="metric-card">
        <span class="metric-label">开机亮度</span>
        <label class="metric-input-wrap" :class="{ invalid: getError('brightness') }">
          <input
            :value="model.brightness"
            :list="brightnessListId"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            class="metric-input"
            @input="handlePercentChange($event, 'brightness')"
            @blur="handlePercentBlur('brightness')"
          />
          <span>%</span>
        </label>
        <small v-if="getError('brightness')" class="metric-error">{{ getError('brightness') }}</small>
      </div>
      <div class="metric-card">
        <span class="metric-label">背景亮度</span>
        <label class="metric-input-wrap" :class="{ invalid: getError('bgBrightness') }">
          <input
            :value="model.bgBrightness"
            :list="brightnessListId"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            class="metric-input"
            @input="handlePercentChange($event, 'bgBrightness')"
            @blur="handlePercentBlur('bgBrightness')"
          />
          <span>%</span>
        </label>
        <small v-if="getError('bgBrightness')" class="metric-error">{{ getError('bgBrightness') }}</small>
      </div>
    </div>
  </section>

  <section class="drawer-section">
    <div class="section-head">
      <span>无人感配置策略</span>
      <span class="section-tag">单位：秒</span>
    </div>
    <div class="time-stack">
      <label v-for="field in timeFields" :key="field.key" class="time-card">
        <span class="time-title">{{ field.label }}</span>
        <span class="time-copy">{{ field.hint }}</span>
        <span class="time-input-wrap" :class="{ invalid: getError(field.key) }">
          <input
            :value="model[field.key]"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            class="time-input"
            @input="handleDurationChange($event, field.key)"
            @blur="handleDurationBlur(field.key)"
          />
          <span>秒</span>
        </span>
        <small v-if="getError(field.key)" class="metric-error">{{ getError(field.key) }}</small>
      </label>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  model: {
    type: Object,
    required: true
  },
  brightnessOptions: {
    type: Array,
    default: () => [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  },
  timeFields: {
    type: Array,
    default: () => [
      {
        key: 'bgTime',
        label: '进入背景亮度时间',
        hint: '无人感后，降低到“背景亮度”所需时间'
      },
      {
        key: 'offTime',
        label: '进入关灯时间',
        hint: '无人感后，彻底关闭灯所需时间'
      },
      {
        key: 'manualTime',
        label: '手动模式持续时间',
        hint: '手动模式下无人感保持时长，到期恢复自动'
      }
    ]
  },
  brightnessListId: {
    type: String,
    default: 'brightness-percent-options'
  },
  getFieldError: {
    type: Function,
    default: () => ''
  },
  onPercentChange: {
    type: Function,
    default: null
  },
  onPercentBlur: {
    type: Function,
    default: null
  },
  onDurationChange: {
    type: Function,
    default: null
  },
  onDurationBlur: {
    type: Function,
    default: null
  }
})

function getError(key) {
  return props.getFieldError(key)
}

function setMode(mode) {
  props.model.mode = mode
}

function handlePercentChange(event, key) {
  if (props.onPercentChange) {
    props.onPercentChange(event, key)
    return
  }
  props.model[key] = event.target.value
}

function handlePercentBlur(key) {
  if (props.onPercentBlur) {
    props.onPercentBlur(key)
  }
}

function handleDurationChange(event, key) {
  if (props.onDurationChange) {
    props.onDurationChange(event, key)
    return
  }
  props.model[key] = event.target.value
}

function handleDurationBlur(key) {
  if (props.onDurationBlur) {
    props.onDurationBlur(key)
  }
}
</script>

<style scoped>
.drawer-section {
  display: grid;
  gap: 14px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-1);
  font-size: 14px;
}

.section-tag {
  padding: 4px 10px;
  border: 1px solid rgba(89, 227, 255, 0.2);
  border-radius: 999px;
  color: var(--text-2);
  background: rgba(89, 227, 255, 0.08);
  font-size: 11px;
}

.button-grid {
  display: grid;
  gap: 8px;
}

.button-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.action-btn {
  min-height: 34px;
  border: 1px solid rgba(89, 227, 255, 0.18);
  border-radius: 8px;
  background: rgba(8, 26, 44, 0.76);
  color: rgba(232, 244, 255, 0.78);
  font-size: 12px;
  cursor: pointer;
}

.action-btn.active,
.action-btn:hover {
  color: #07141e;
  border-color: rgba(85, 242, 223, 0.84);
  background: linear-gradient(135deg, rgba(85, 242, 223, 0.95), rgba(67, 169, 255, 0.9));
}

.section-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(89, 227, 255, 0.26);
  background: rgba(6, 17, 31, 0.7);
}

.metric-label {
  display: block;
  margin-bottom: 10px;
  color: var(--text-2);
  font-size: 12px;
}

.metric-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(4, 14, 28, 0.74);
  color: var(--accent-teal);
  font-family: var(--font-num);
}

.metric-input-wrap.invalid,
.time-input-wrap.invalid {
  border-color: rgba(255, 111, 118, 0.78);
}

.metric-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--accent-teal);
  font-size: 22px;
  font-family: var(--font-num);
  text-align: right;
}

.metric-error {
  display: block;
  margin-top: 8px;
  color: #ff8d88;
  font-size: 11px;
  line-height: 1.35;
}

.metric-input::-webkit-outer-spin-button,
.metric-input::-webkit-inner-spin-button,
.time-input::-webkit-outer-spin-button,
.time-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.time-stack {
  display: grid;
  gap: 12px;
}

.time-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(89, 227, 255, 0.18);
  background: rgba(6, 17, 31, 0.72);
}

.time-title {
  color: var(--text-1);
  font-size: 14px;
}

.time-copy {
  color: var(--text-3);
  font-size: 12px;
}

.time-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(4, 14, 28, 0.74);
  color: var(--accent-teal);
  font-family: var(--font-num);
}

.time-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--accent-teal);
  font-family: var(--font-num);
  text-align: left;
}
</style>

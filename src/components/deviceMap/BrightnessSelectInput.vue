<template>
  <div
    ref="rootRef"
    class="brightness-select"
    :class="{ invalid, open: isOpen, readonly }"
  >
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      :readonly="readonly"
      aria-label="亮度"
      :aria-expanded="isOpen"
      @input="emit('input', $event)"
      @blur="emit('blur')"
      @keydown.down.prevent="openOptions"
      @keydown.esc.prevent="closeOptions"
    />
    <span class="brightness-unit">%</span>
    <button
      type="button"
      class="brightness-toggle"
      title="选择亮度"
      aria-label="选择亮度"
      :disabled="readonly"
      @click="toggleOptions"
    >
      <span aria-hidden="true"></span>
    </button>
    <div v-if="isOpen" class="brightness-options" role="listbox">
      <button
        v-for="value in options"
        :key="value"
        type="button"
        role="option"
        :aria-selected="Number(modelValue) === value"
        :class="{ selected: Number(modelValue) === value }"
        @mousedown.prevent
        @click="selectOption(value)"
      >
        {{ value }}%
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { DEVICE_MAP_BRIGHTNESS_OPTIONS } from './deviceMapOptions'

defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    default: () => DEVICE_MAP_BRIGHTNESS_OPTIONS
  },
  readonly: {
    type: Boolean,
    default: false
  },
  invalid: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['input', 'blur'])
const rootRef = ref(null)
const inputRef = ref(null)
const isOpen = ref(false)

onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointerDown))

function toggleOptions() {
  isOpen.value = !isOpen.value
}

function openOptions() {
  isOpen.value = true
}

function closeOptions() {
  isOpen.value = false
}

function selectOption(value) {
  emit('input', { target: { value: String(value) } })
  emit('blur')
  closeOptions()
  inputRef.value?.focus()
}

function handleDocumentPointerDown(event) {
  if (!rootRef.value?.contains(event.target)) closeOptions()
}
</script>

<style scoped>
.brightness-select {
  position: relative;
  width: 100%;
  height: 34px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26px 30px;
  align-items: center;
  box-sizing: border-box;
  border: 1px solid var(--border-default, rgba(89, 227, 255, 0.24));
  border-radius: 5px;
  background: var(--control-bg, rgba(4, 18, 31, 0.82));
}

.brightness-select:focus-within,
.brightness-select.open {
  border-color: var(--border-active, rgba(83, 225, 210, 0.66));
}

.brightness-select.invalid {
  border-color: var(--danger-border, rgba(240, 105, 105, 0.72));
}

.brightness-select input {
  width: 100%;
  min-width: 0;
  height: 32px;
  box-sizing: border-box;
  padding: 0 5px 0 9px;
  border: 0;
  outline: 0;
  color: var(--accent-cyan, #5be1d3);
  background: transparent;
  font: inherit;
}

.brightness-select.readonly {
  opacity: 0.78;
}

.brightness-unit {
  color: var(--accent-cyan, #5be1d3);
  text-align: center;
  pointer-events: none;
}

.brightness-toggle {
  width: 30px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--border-subtle, rgba(89, 227, 255, 0.16));
  border-radius: 0 4px 4px 0;
  color: var(--text-secondary, #bdd6e2);
  background: var(--control-bg-hover, rgba(24, 61, 79, 0.5));
  cursor: pointer;
}

.brightness-toggle:disabled {
  cursor: default;
  opacity: 0.45;
}

.brightness-toggle span {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}

.brightness-options {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 30;
  width: max(150px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  padding: 5px;
  box-sizing: border-box;
  border: 1px solid var(--border-active, rgba(83, 225, 210, 0.45));
  border-radius: 5px;
  background: rgba(7, 24, 42, 0.98);
  box-shadow: 0 10px 24px rgba(0, 7, 18, 0.38);
}

.brightness-options button {
  height: 27px;
  padding: 0 8px;
  border: 0;
  border-radius: 3px;
  color: var(--text-secondary, #bdd6e2);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.brightness-options button:hover,
.brightness-options button.selected {
  color: var(--accent-cyan, #5be1d3);
  background: var(--info-soft, rgba(53, 246, 212, 0.1));
}
</style>

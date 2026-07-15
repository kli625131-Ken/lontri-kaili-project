<template>
  <Teleport to="body">
    <div class="region-dialog-backdrop" role="presentation" @mousedown.self="$emit('cancel')">
      <section v-if="mode === 'create'" class="region-dialog create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-region-title">
        <header class="dialog-header">
          <h2 id="create-region-title">新建区域</h2>
          <button type="button" class="icon-button" aria-label="关闭" @click="$emit('cancel')">×</button>
        </header>

        <form class="dialog-body create-body" @submit.prevent="submitCreate">
          <label class="dialog-field">
            <span>区域名称</span>
            <input v-model.trim="regionName" type="text" maxlength="32" autofocus :aria-invalid="!!error" />
            <small :class="{ error: !!error }">{{ error || '名称在此位置内必须唯一。' }}</small>
          </label>

          <div class="dialog-field-grid">
            <label class="dialog-field">
              <span>区域组 ID</span>
              <input :value="groupId" class="readonly-field" type="text" readonly />
            </label>
            <label class="dialog-field">
              <span>网关</span>
              <input :value="gatewayName" class="readonly-field" type="text" readonly />
            </label>
          </div>

          <section class="auto-device-section">
            <h3>自动获取设备 ({{ devices.length }})</h3>
            <div class="auto-device-list">
              <div v-for="device in devices" :key="device.id" class="auto-device-row">
                <span class="dialog-device-icon" aria-hidden="true">{{ deviceIcon(device) }}</span>
                <span>{{ device.shortName || device.name || device.id }}</span>
                <span class="dialog-device-state" :class="{ pending: device.online === false }">
                  <i></i>{{ device.online === false ? '待入网' : '已入网' }}
                </span>
              </div>
              <div v-if="!devices.length" class="dialog-empty">当前区域内暂无设备</div>
            </div>
          </section>
        </form>

        <footer class="dialog-footer">
          <button type="button" class="secondary-button" @click="$emit('cancel')">取消</button>
          <button type="button" class="primary-button" :disabled="!regionName || busy" @click="submitCreate">创建区域</button>
        </footer>
      </section>

      <section v-else class="region-dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-region-title">
        <div class="danger-accent"></div>
        <div class="delete-content">
          <div class="warning-icon fluent-icon" aria-hidden="true">{{ warningIcon }}</div>
          <div>
            <h2 id="delete-region-title">删除区域？</h2>
            <p>删除区域将同步删除其对应的组、场景、面板和联动订阅信息。设备点位将保留。确认删除？</p>
          </div>
        </div>
        <footer class="dialog-footer delete-footer">
          <button type="button" class="secondary-button" @click="$emit('cancel')">取消</button>
          <button type="button" class="danger-button" :disabled="busy" @click="$emit('confirm')">删除区域并同步</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  mode: { type: String, required: true },
  region: { type: Object, default: null },
  devices: { type: Array, default: () => [] },
  groupId: { type: String, default: '--' },
  gatewayName: { type: String, default: '未识别' },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['cancel', 'confirm'])
const warningIcon = '\uE7BA'
const regionName = ref('')

watch(() => props.region, (region) => {
  regionName.value = region?.name || ''
}, { immediate: true })

function submitCreate() {
  if (!regionName.value || props.busy) return
  emit('confirm', { name: regionName.value })
}

function deviceIcon(device) {
  return /OCSR|SENSOR|PIR/i.test(`${device?.shortName || ''} ${device?.name || ''} ${device?.id || ''}`) ? '◉' : '♧'
}
</script>

<style scoped>
.region-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(25, 28, 30, 0.42);
}

.region-dialog {
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #191c1e;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.2);
  font-family: Inter, "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
}

.fluent-icon { font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets"; font-weight: 400; line-height: 1; }

.create-dialog { width: min(448px, calc(100vw - 32px)); }
.delete-dialog { width: min(380px, calc(100vw - 32px)); }
.dialog-header { min-height: 58px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid #e2e8f0; }
.dialog-header h2, .delete-content h2 { margin: 0; font-size: 18px; font-weight: 600; line-height: 24px; }
.icon-button { width: 32px; height: 32px; border: 0; border-radius: 4px; color: #434655; background: transparent; cursor: pointer; font-size: 27px; line-height: 1; }
.icon-button:hover { background: #f2f4f6; }
.dialog-body { padding: 24px; }
.create-body { display: grid; gap: 20px; }
.dialog-field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.dialog-field { min-width: 0; display: grid; gap: 6px; }
.dialog-field > span, .auto-device-section h3 { color: #434655; font-size: 11px; font-weight: 700; line-height: 16px; }
.dialog-field input { width: 100%; height: 36px; box-sizing: border-box; padding: 0 12px; border: 1px solid #c3c6d7; border-radius: 2px; color: #191c1e; background: #f2f4f6; outline: none; font-size: 14px; }
.dialog-field input:focus { border-color: #004ac6; box-shadow: 0 0 0 2px rgba(0, 74, 198, .14); }
.dialog-field input.readonly-field { color: #475569; background: #e6e8ea; font-family: "JetBrains Mono", Consolas, monospace; }
.dialog-field small { color: #434655; font-size: 12px; line-height: 16px; }
.dialog-field small.error { color: #ba1a1a; }
.dialog-field input[aria-invalid="true"] { border-color: #ba1a1a; }
.auto-device-section { display: grid; gap: 8px; }
.auto-device-section h3 { margin: 0; }
.auto-device-list { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 2px; }
.auto-device-row { min-height: 34px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-top: 1px solid #e2e8f0; font-size: 12px; }
.auto-device-row:first-child { border-top: 0; }
.dialog-device-icon { color: #505f76; }
.dialog-device-state { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: #10b981; }
.dialog-device-state.pending { color: #f59e0b; }
.dialog-device-state i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.dialog-empty { min-height: 72px; display: grid; place-items: center; color: #737686; font-size: 12px; }
.dialog-footer { min-height: 64px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 0 24px; border-top: 1px solid #e2e8f0; background: #f2f4f6; }
.dialog-footer button { min-width: 76px; height: 36px; padding: 0 16px; border-radius: 2px; cursor: pointer; font-size: 14px; }
.secondary-button { border: 1px solid #c3c6d7; color: #191c1e; background: #ffffff; }
.primary-button { border: 1px solid #004ac6; color: #ffffff; background: #004ac6; }
.danger-button { border: 1px solid #f43f5e; color: #f43f5e; background: #ffffff; }
.primary-button:hover:not(:disabled) { background: #003ea8; }
.danger-button:hover:not(:disabled) { background: #fff1f2; }
.dialog-footer button:disabled { cursor: wait; opacity: .55; }
.danger-accent { height: 4px; background: #f43f5e; }
.delete-content { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 16px; padding: 26px 24px 24px; }
.warning-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 8px; color: #ba1a1a; background: #ffdad6; font-size: 22px; }
.delete-content p { margin: 8px 0 0; color: #434655; font-size: 14px; line-height: 1.65; }
.delete-footer { padding-right: 24px; }

@media (max-width: 560px) {
  .region-dialog-backdrop { padding: 12px; }
  .dialog-body { padding: 18px; }
  .dialog-field-grid { grid-template-columns: 1fr; }
  .dialog-footer { padding: 0 18px; }
}
</style>

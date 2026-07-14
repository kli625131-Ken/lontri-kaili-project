<template>
  <Teleport to="body">
    <div class="scene-dialog-backdrop" @mousedown.self="$emit('close')">
      <section class="scene-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-dialog-title">
        <header class="scene-dialog-header">
          <div>
            <h2 id="scene-dialog-title">参数配置</h2>
            <p>场景号: {{ sceneNumber }}</p>
          </div>
          <button type="button" aria-label="关闭" @click="$emit('close')">×</button>
        </header>

        <div class="scene-dialog-body">
          <section class="scene-config-block">
            <div class="block-actions">
              <button type="button" class="delete-command" title="删除命令" :disabled="commands.length <= 1" @click="removeCommand(commands.length - 1)">−</button>
              <button type="button" title="新增命令" @click="commands.push('')">＋</button>
            </div>
            <div class="scene-config-grid">
              <div class="simple-fields">
                <label>
                  <span>色温</span>
                  <span class="unit-field"><input :value="form.colorTemperature" type="text" inputmode="numeric" @input="setDigits('colorTemperature', $event, 4)" /><i>K</i></span>
                </label>
                <label>
                  <span>亮度</span>
                  <span class="unit-field"><input :value="form.brightness" type="text" inputmode="numeric" @input="setDigits('brightness', $event, 3)" /><i>%</i></span>
                </label>
                <label>
                  <span>设备</span>
                  <select v-model="form.deviceId">
                    <option value="">请选择区域内设备</option>
                    <option v-for="device in devices" :key="device.id" :value="device.id">{{ device.name || device.id }}</option>
                  </select>
                </label>
              </div>

              <div class="command-fields">
                <span class="command-label">485命令</span>
                <div v-for="(command, index) in commands" :key="index" class="command-row">
                  <input v-model.trim="commands[index]" type="text" placeholder="请输入命令" />
                  <button v-if="commands.length > 1" type="button" aria-label="删除此命令" @click="removeCommand(index)">−</button>
                  <button type="button" aria-label="在下方新增命令" @click="commands.splice(index + 1, 0, '')">＋</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer class="scene-dialog-footer">
          <button type="button" class="secondary" @click="$emit('close')">取消</button>
          <button type="button" class="primary" :disabled="busy || !isValid" @click="save">保存配置</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  scene: { type: Object, required: true },
  devices: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save'])
const form = reactive({ brightness: '', colorTemperature: '', deviceId: '' })
const commands = ref([])
const sceneNumber = computed(() => String(props.scene?.slot ?? '').padStart(2, '0'))
const isValid = computed(() => {
  const brightness = Number(form.brightness)
  const temperature = Number(form.colorTemperature)
  return Number.isInteger(brightness) && brightness >= 0 && brightness <= 100
    && Number.isInteger(temperature) && temperature >= 2700 && temperature <= 6500
})

watch(() => props.scene, (scene) => {
  form.brightness = String(scene?.brightness ?? 0)
  form.colorTemperature = String(scene?.colorTemperature ?? 4000)
  form.deviceId = scene?.deviceId || ''
  commands.value = Array.isArray(scene?.commands485) && scene.commands485.length ? [...scene.commands485] : ['']
}, { immediate: true })

function setDigits(key, event, maxLength) {
  const value = String(event.target.value || '').replace(/\D/g, '').slice(0, maxLength)
  form[key] = value
  event.target.value = value
}

function removeCommand(index) {
  if (commands.value.length <= 1) return
  commands.value.splice(index, 1)
}

function save() {
  if (!isValid.value || props.busy) return
  emit('save', {
    ...props.scene,
    brightness: Number(form.brightness),
    colorTemperature: Number(form.colorTemperature),
    deviceId: form.deviceId,
    commands485: commands.value.map((item) => item.trim()).filter(Boolean)
  })
}
</script>

<style scoped>
.scene-dialog-backdrop { position: fixed; inset: 0; z-index: 1250; display: grid; place-items: center; padding: 24px; background: rgba(25, 28, 30, .42); }
.scene-dialog { width: min(660px, calc(100vw - 32px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 4px; color: #191c1e; background: #ffffff; box-shadow: 0 18px 48px rgba(15, 23, 42, .22); font-family: Inter, "Microsoft YaHei", "PingFang SC", Arial, sans-serif; }
.scene-dialog-header { min-height: 78px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid #e2e8f0; }
.scene-dialog-header h2 { margin: 0; font-size: 24px; font-weight: 600; line-height: 32px; }
.scene-dialog-header p { margin: 3px 0 0; color: #434655; font-size: 12px; }
.scene-dialog-header button { width: 34px; height: 34px; border: 0; border-radius: 3px; color: #434655; background: transparent; cursor: pointer; font-size: 28px; }
.scene-dialog-header button:hover { background: #f2f4f6; }
.scene-dialog-body { min-height: 0; overflow: auto; padding: 24px; background: #f2f4f6; }
.scene-config-block { position: relative; padding: 34px 20px 20px; border: 1px solid #e2e8f0; border-radius: 2px; background: #ffffff; }
.block-actions { position: absolute; top: 12px; right: 16px; display: flex; gap: 8px; }
.block-actions button, .command-row button { width: 24px; height: 24px; padding: 0; border: 0; border-radius: 3px; color: #004ac6; background: transparent; cursor: pointer; font-size: 20px; line-height: 1; }
.block-actions .delete-command { color: #f43f5e; }
.scene-config-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .95fr); gap: 28px; }
.simple-fields { display: grid; gap: 16px; }
.simple-fields label { display: grid; gap: 6px; }
.simple-fields label > span:first-child, .command-label { color: #434655; font-size: 11px; font-weight: 700; line-height: 16px; }
.unit-field { height: 34px; display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 2px; background: #f7f9fb; }
.unit-field input, .command-row input, select { width: 100%; min-width: 0; height: 32px; box-sizing: border-box; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 2px; color: #191c1e; background: #f7f9fb; outline: none; font-family: "JetBrains Mono", Consolas, monospace; }
.unit-field input { border: 0; background: transparent; }
.unit-field i { padding: 0 12px; color: #434655; font-size: 12px; font-style: normal; }
select { font-family: Inter, "Microsoft YaHei", sans-serif; }
.command-fields { display: grid; align-content: start; gap: 8px; }
.command-row { display: grid; grid-template-columns: minmax(0, 1fr) 24px 24px; align-items: center; gap: 6px; }
.scene-dialog-footer { min-height: 66px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 0 24px; border-top: 1px solid #e2e8f0; }
.scene-dialog-footer button { height: 36px; min-width: 82px; padding: 0 16px; border-radius: 2px; cursor: pointer; font-size: 14px; }
.scene-dialog-footer .secondary { border: 1px solid #e2e8f0; color: #191c1e; background: #ffffff; }
.scene-dialog-footer .primary { border: 1px solid #004ac6; color: #ffffff; background: #004ac6; }
.scene-dialog-footer .primary:disabled { cursor: wait; opacity: .55; }

@media (max-width: 680px) {
  .scene-dialog-backdrop { padding: 12px; }
  .scene-config-grid { grid-template-columns: 1fr; }
}
</style>

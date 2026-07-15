<template>
  <Teleport to="body">
    <div class="scene-dialog-backdrop" @mousedown.self="$emit('close')">
      <section class="scene-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-dialog-title">
        <header class="scene-dialog-header">
          <div>
            <h2 id="scene-dialog-title">参数配置</h2>
            <p>场景号: <strong>{{ sceneNumber }}</strong></p>
          </div>
          <button type="button" aria-label="关闭" @click="$emit('close')"><span class="fluent-icon" aria-hidden="true">{{ icons.close }}</span></button>
        </header>

        <div class="scene-dialog-body">
          <section v-for="(configuration, configurationIndex) in configurations" :key="configuration.key" class="scene-config-block">
            <header class="config-block-header">
              <h3>配置信息{{ configurationIndex + 1 }}</h3>
              <div class="config-block-actions">
                <button
                  type="button"
                  class="delete-configuration"
                  :disabled="configurations.length <= 1"
                  :aria-label="`删除配置信息${configurationIndex + 1}`"
                  @click="removeConfiguration(configurationIndex)"
                >
                  <span class="fluent-icon" aria-hidden="true">{{ icons.delete }}</span>
                </button>
                <button type="button" :aria-label="`在下方新增配置信息`" @click="addConfiguration(configurationIndex)">
                  <span class="fluent-icon" aria-hidden="true">{{ icons.add }}</span>
                </button>
              </div>
            </header>

            <div class="config-block-content">
              <div class="scene-config-grid">
                <div class="simple-fields">
                  <label>
                    <span>色温</span>
                    <span class="unit-field"><input :value="configuration.colorTemperature" type="text" inputmode="numeric" @input="setDigits(configuration, 'colorTemperature', $event, 4)" /><i>K</i></span>
                  </label>
                  <label>
                    <span>亮度</span>
                    <span class="unit-field"><input :value="configuration.brightness" type="text" inputmode="numeric" @input="setDigits(configuration, 'brightness', $event, 3)" /><i>%</i></span>
                  </label>
                  <label>
                    <span>设备</span>
                    <select v-model="configuration.deviceId">
                      <option value="">请选择区域内设备</option>
                      <option v-for="device in devices" :key="device.id" :value="device.id">{{ device.name || device.id }}</option>
                    </select>
                  </label>
                </div>

                <div class="command-fields">
                  <span class="command-label">485命令</span>
                  <div v-for="(command, commandIndex) in configuration.commands485" :key="command.key" class="command-row">
                    <input v-model.trim="command.value" type="text" placeholder="请输入命令" />
                    <div class="command-actions">
                      <button
                        v-if="commandIndex > 0"
                        type="button"
                        aria-label="删除此命令"
                        @click="removeCommand(configurationIndex, commandIndex)"
                      ><span class="fluent-icon" aria-hidden="true">{{ icons.remove }}</span></button>
                      <button type="button" aria-label="在下方新增命令" @click="addCommand(configurationIndex, commandIndex)"><span class="fluent-icon" aria-hidden="true">{{ icons.add }}</span></button>
                    </div>
                  </div>
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
import { computed, ref, watch } from 'vue'

const props = defineProps({
  scene: { type: Object, required: true },
  devices: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save'])
const icons = { close: '\uE711', add: '\uE710', remove: '\uE738', delete: '\uE74D' }
const configurations = ref([])
const sceneNumber = computed(() => String(props.scene?.slot ?? '').padStart(2, '0'))
const isValid = computed(() => configurations.value.length > 0 && configurations.value.every((configuration) => {
  const brightness = Number(configuration.brightness)
  const temperature = Number(configuration.colorTemperature)
  return Number.isInteger(brightness) && brightness >= 0 && brightness <= 100
    && Number.isInteger(temperature) && temperature >= 2700 && temperature <= 6500
}))

watch(() => props.scene, (scene) => {
  const sourceConfigurations = Array.isArray(scene?.configurations) && scene.configurations.length
    ? scene.configurations
    : [scene]
  configurations.value = sourceConfigurations.map((configuration) => createConfiguration(configuration, scene))
}, { immediate: true })

function createCommand(value = '') {
  return { key: `${Date.now()}-${Math.random()}`, value: String(value || '') }
}

function createConfiguration(source = {}, scene = props.scene) {
  const sourceCommands = Array.isArray(source?.commands485) && source.commands485.length
    ? source.commands485
    : (Array.isArray(scene?.commands485) && scene.commands485.length ? scene.commands485 : [''])
  return {
    key: `${Date.now()}-${Math.random()}`,
    brightness: String(source?.brightness ?? scene?.brightness ?? 0),
    colorTemperature: String(source?.colorTemperature ?? scene?.colorTemperature ?? 4000),
    deviceId: source?.deviceId || scene?.deviceId || '',
    commands485: sourceCommands.map((command) => createCommand(command))
  }
}

function setDigits(configuration, key, event, maxLength) {
  const value = String(event.target.value || '').replace(/\D/g, '').slice(0, maxLength)
  configuration[key] = value
  event.target.value = value
}

function addConfiguration(index) {
  const source = configurations.value[index]
  configurations.value.splice(index + 1, 0, createConfiguration({
    brightness: source.brightness,
    colorTemperature: source.colorTemperature,
    deviceId: source.deviceId,
    commands485: source.commands485.map((command) => command.value)
  }))
}

function removeConfiguration(index) {
  if (configurations.value.length <= 1) return
  configurations.value.splice(index, 1)
}

function addCommand(configurationIndex, commandIndex) {
  configurations.value[configurationIndex].commands485.splice(commandIndex + 1, 0, createCommand())
}

function removeCommand(configurationIndex, commandIndex) {
  const commands = configurations.value[configurationIndex].commands485
  if (commands.length <= 1) return
  commands.splice(commandIndex, 1)
}

function serializeConfiguration(configuration) {
  return {
    brightness: Number(configuration.brightness),
    colorTemperature: Number(configuration.colorTemperature),
    deviceId: configuration.deviceId,
    commands485: configuration.commands485.map((command) => command.value.trim()).filter(Boolean)
  }
}

function save() {
  if (!isValid.value || props.busy) return
  const serializedConfigurations = configurations.value.map(serializeConfiguration)
  const primaryConfiguration = serializedConfigurations[0]
  emit('save', {
    ...props.scene,
    ...primaryConfiguration,
    configurations: serializedConfigurations
  })
}
</script>

<style scoped>
.scene-dialog-backdrop { position: fixed; inset: 0; z-index: 1250; display: grid; place-items: center; padding: 24px; background: rgba(25, 28, 30, .42); }
.scene-dialog { width: min(976px, calc(100vw - 32px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 4px; color: #191c1e; color-scheme: light; background: #ffffff; box-shadow: 0 18px 48px rgba(15, 23, 42, .22); font-family: Inter, "Microsoft YaHei", "PingFang SC", Arial, sans-serif; }
.fluent-icon { font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets"; font-size: 16px; font-weight: 400; line-height: 1; }
.scene-dialog-header { min-height: 132px; display: flex; align-items: flex-start; justify-content: space-between; padding: 26px 36px; border-bottom: 1px solid #e2e8f0; }
.scene-dialog-header h2 { margin: 0; font-size: 24px; font-weight: 600; line-height: 32px; }
.scene-dialog-header p { display: inline-flex; align-items: center; min-height: 30px; margin: 10px 0 0; padding: 0 14px; border-radius: 999px; color: #004ac6; background: #dbe6ff; font-size: 15px; font-weight: 600; }
.scene-dialog-header button { width: 34px; height: 34px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 3px; color: #434655; background: transparent; cursor: pointer; }
.scene-dialog-header button .fluent-icon { font-size: 22px; }
.scene-dialog-header button:hover { background: #f2f4f6; }
.scene-dialog-body { min-height: 0; overflow: auto; padding: 36px; background: #f2f4f6; }
.scene-config-block { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 2px; background: #ffffff; }
.scene-config-block + .scene-config-block { margin-top: 20px; }
.config-block-header { min-height: 84px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; background: #f7f9fb; }
.config-block-header h3 { margin: 0; color: #191c1e; font-size: 18px; font-weight: 600; }
.config-block-actions { display: flex; align-items: center; gap: 18px; }
.config-block-actions button { width: 26px; height: 26px; display: grid; place-items: center; padding: 0; border: 0; color: #004ac6; background: transparent; cursor: pointer; }
.config-block-actions button .fluent-icon { font-size: 18px; }
.config-block-actions .delete-configuration { color: #f43f5e; }
.config-block-actions button:disabled { cursor: not-allowed; opacity: .35; }
.config-block-content { padding: 26px 28px 28px; }
.scene-config-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 34px; }
.simple-fields { display: grid; gap: 18px; }
.simple-fields label { display: grid; gap: 8px; }
.simple-fields label > span:first-child, .command-label { color: #434655; font-size: 14px; font-weight: 700; line-height: 20px; }
.unit-field { height: 48px; display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 2px; background: #f7f9fb; }
.unit-field input, .command-row input, select { width: 100%; min-width: 0; height: 46px; box-sizing: border-box; padding: 0 16px; border: 1px solid #e2e8f0; border-radius: 2px; color: #191c1e; background: #f7f9fb; outline: none; font-family: "JetBrains Mono", Consolas, monospace; font-size: 16px; }
.unit-field input { border: 0; background: transparent; }
.unit-field i { padding: 0 16px; color: #434655; font-size: 14px; font-style: normal; }
select { font-family: Inter, "Microsoft YaHei", sans-serif; }
.command-fields { display: grid; align-content: start; gap: 8px; }
.command-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; }
.command-actions { display: flex; align-items: center; gap: 14px; }
.command-actions button { width: 30px; height: 30px; display: grid; place-items: center; padding: 0; border: 1px solid #737686; border-radius: 50%; color: #434655; background: #ffffff; cursor: pointer; line-height: 1; }
.command-actions button .fluent-icon { font-size: 18px; }
.command-actions button:hover { border-color: #004ac6; color: #004ac6; }
.scene-dialog-footer { min-height: 96px; display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding: 0 36px; border-top: 1px solid #e2e8f0; background: #ffffff; }
.scene-dialog-footer button { height: 48px; min-width: 108px; padding: 0 20px; border-radius: 2px; cursor: pointer; font-size: 16px; font-weight: 600; }
.scene-dialog-footer .secondary { border: 1px solid #e2e8f0; color: #191c1e; background: #ffffff; }
.scene-dialog-footer .primary { border: 1px solid #004ac6; color: #ffffff; background: #004ac6; }
.scene-dialog-footer .primary:disabled { cursor: wait; opacity: .55; }

@media (max-width: 760px) {
  .scene-dialog-backdrop { padding: 12px; }
  .scene-dialog { max-height: calc(100vh - 24px); }
  .scene-dialog-header { min-height: 100px; padding: 20px; }
  .scene-dialog-body { padding: 16px; }
  .config-block-header, .config-block-content { padding-right: 18px; padding-left: 18px; }
  .scene-config-grid { grid-template-columns: 1fr; gap: 24px; }
  .scene-dialog-footer { min-height: 72px; padding: 0 20px; }
}
</style>

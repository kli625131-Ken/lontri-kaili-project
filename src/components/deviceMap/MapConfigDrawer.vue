<template>
  <aside class="control-drawer config-drawer">
    <div class="drawer-head">
      <div class="drawer-ident">
        <div class="drawer-icon">CFG</div>
        <div class="drawer-title-box">
          <h3 class="drawer-title">配置调试</h3>
          <p class="drawer-subtitle">{{ targetName }}</p>
        </div>
      </div>
      <button class="drawer-close" @click="$emit('close')">×</button>
    </div>

    <div class="drawer-body">
      <div class="config-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="scene-tab"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <section v-if="activeTab === 'base'" class="drawer-section">
        <div class="section-head">
          <span>基础信息</span>
          <span class="section-tag">本地草稿</span>
        </div>
        <div class="status-card">
          <div class="status-row"><span>对象类型</span><strong>{{ targetTypeText }}</strong></div>
          <div class="status-row"><span>名称</span><strong>{{ targetName }}</strong></div>
          <div class="status-row"><span>编号</span><strong>{{ target?.code || target?.id || '--' }}</strong></div>
          <div class="status-row"><span>图形类型</span><strong>{{ target?.shapeType || 'POLYGON' }}</strong></div>
        </div>
      </section>

      <section v-if="activeTab === 'devices'" class="drawer-section">
        <div class="section-head">
          <span>区域设备</span>
          <span class="section-tag">{{ regionDevices.length }} 台 CU</span>
        </div>
        <div class="table-card">
          <div class="table-head compact">
            <span>设备</span>
            <span>网关</span>
          </div>
          <div class="table-body compact">
            <div v-for="device in regionDevices" :key="device.id" class="table-row compact">
              <span>{{ device.shortName || device.id }}</span>
              <span>{{ device.gatewayId || '--' }}</span>
            </div>
            <div v-if="!regionDevices.length" class="table-empty">当前区域暂无 CU 设备</div>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'areaGroup'" class="drawer-section">
        <div class="section-head">
          <span>区域组</span>
          <span class="section-tag">组播控制</span>
        </div>
        <div class="button-grid">
          <button class="action-btn" @click="$emit('create-area-group', target)">创建区域组</button>
          <button class="action-btn" @click="$emit('bind-area-group', target)">绑定已有区域组</button>
          <button class="action-btn" @click="$emit('skip-area-group', target)">暂不配置</button>
        </div>
        <p class="section-desc">
          区域组只由同一网关下选定 CU 组成；网关广播控制与区域组组播控制保持独立。
        </p>
        <div v-if="areaGroup" class="status-card">
          <div class="status-row"><span>区域组</span><strong>{{ areaGroup.name }}</strong></div>
          <div class="status-row"><span>所属网关</span><strong>{{ areaGroup.gatewayId || '--' }}</strong></div>
          <div class="status-row"><span>成员数</span><strong>{{ areaGroup.memberIds.length }}</strong></div>
        </div>
      </section>

      <section v-if="activeTab === 'scene'" class="drawer-section">
        <div class="section-head">
          <span>场景配置</span>
          <span class="section-tag">前端预演</span>
        </div>
        <div class="button-grid">
          <button class="action-btn" @click="$emit('create-default-scenes', target)">创建默认场景</button>
          <button class="action-btn" @click="$emit('bind-scene', target)">绑定已有场景</button>
          <button class="action-btn" @click="$emit('create-custom-scene', target)">创建自定义场景</button>
          <button class="action-btn" @click="$emit('skip-scene', target)">暂不配置</button>
        </div>
      </section>

      <section v-if="activeTab === 'params'" class="drawer-section">
        <div class="section-head">
          <span>CU 参数</span>
          <span class="section-tag">前端草稿</span>
        </div>
        <div class="button-grid">
          <button class="action-btn" @click="$emit('use-param-template', target)">使用参数模板</button>
          <button class="action-btn" @click="$emit('copy-param', target)">复制其他区域参数</button>
          <button class="action-btn" @click="$emit('custom-param', target)">自定义参数</button>
          <button class="action-btn" @click="$emit('skip-param', target)">暂不配置</button>
        </div>
      </section>

      <section v-if="activeTab === 'validate'" class="drawer-section">
        <div class="section-head">
          <span>测试校验</span>
          <button class="section-tag action-tag" @click="$emit('validate')">重新校验</button>
        </div>
        <div v-if="validationMessages.length" class="validation-list">
          <p v-for="message in validationMessages" :key="message">{{ message }}</p>
        </div>
        <div v-else class="table-empty">当前本地草稿暂无校验错误</div>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  target: {
    type: Object,
    default: null
  },
  targetType: {
    type: String,
    default: ''
  },
  devices: {
    type: Array,
    default: () => []
  },
  draftState: {
    type: Object,
    required: true
  },
  validationMessages: {
    type: Array,
    default: () => []
  },
  initialTab: {
    type: String,
    default: 'base'
  }
})

defineEmits([
  'close',
  'create-area-group',
  'bind-area-group',
  'skip-area-group',
  'create-default-scenes',
  'bind-scene',
  'create-custom-scene',
  'skip-scene',
  'use-param-template',
  'copy-param',
  'custom-param',
  'skip-param',
  'validate'
])

const tabs = [
  { label: '基础信息', value: 'base' },
  { label: '区域设备', value: 'devices' },
  { label: '区域组', value: 'areaGroup' },
  { label: '场景配置', value: 'scene' },
  { label: 'CU 参数', value: 'params' },
  { label: '测试校验', value: 'validate' }
]

const activeTab = ref(props.initialTab)

watch(
  () => props.initialTab,
  (tab) => {
    activeTab.value = tab || 'base'
  }
)

const targetName = computed(() => props.target?.name || props.target?.shortName || props.target?.id || '未选择对象')
const targetTypeText = computed(() => {
  if (props.targetType === 'area') return '地图区域'
  if (props.targetType === 'map') return '当前地图'
  return props.targetType || '--'
})
const regionDevices = computed(() => {
  if (!props.target?.memberIds) return []
  return props.devices.filter((device) => props.target.memberIds.includes(device.id))
})
const areaGroup = computed(() => props.draftState.areaGroups.find((group) => group.regionId === props.target?.id) || null)
</script>

<style scoped>
.control-drawer {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  width: 392px;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  border: 1px solid rgba(0, 225, 255, 0.55);
  background:
    linear-gradient(180deg, rgba(7, 21, 40, 0.98), rgba(3, 11, 24, 0.98)),
    radial-gradient(circle at top right, rgba(89, 227, 255, 0.12), transparent 42%);
  box-shadow:
    0 18px 44px rgba(0, 0, 0, 0.42),
    inset 0 0 0 1px rgba(89, 227, 255, 0.08);
  overflow: hidden;
}

.config-drawer {
  z-index: 5;
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 16px;
  border-bottom: 1px solid rgba(0, 225, 255, 0.24);
}

.drawer-ident {
  display: flex;
  gap: 12px;
  min-width: 0;
}

.drawer-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(0, 225, 255, 0.28);
  background: rgba(89, 227, 255, 0.08);
  color: #78e8ff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.drawer-title-box {
  min-width: 0;
}

.drawer-title {
  font-size: 16px;
  color: #f3f9ff;
  margin-bottom: 4px;
}

.drawer-subtitle {
  color: rgba(211, 225, 239, 0.56);
  font-size: 12px;
}

.drawer-close {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(89, 227, 255, 0.34);
  background: rgba(8, 24, 40, 0.86);
  color: #f3f9ff;
  font-size: 22px;
  line-height: 1;
}

.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 18px;
}

.drawer-section {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(0, 225, 255, 0.38);
  background: rgba(10, 23, 40, 0.74);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: #f3f9ff;
  font-size: 15px;
}

.section-tag {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(89, 227, 255, 0.34);
  color: #f3f9ff;
  background: rgba(89, 227, 255, 0.08);
  font-size: 11px;
}

.config-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.scene-tab {
  padding: 9px 14px;
  border: 1px solid rgba(89, 227, 255, 0.34);
  border-radius: 999px;
  background: rgba(6, 17, 31, 0.66);
  color: rgba(234, 243, 252, 0.82);
  font-size: 13px;
}

.scene-tab.active {
  color: #58efdb;
  border-color: rgba(53, 246, 212, 0.58);
  background: linear-gradient(90deg, rgba(89, 227, 255, 0.12), rgba(53, 246, 212, 0.12));
}

.button-grid {
  display: grid;
  gap: 12px;
}

.action-btn {
  min-height: 42px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 225, 255, 0.35);
  background: rgba(6, 17, 31, 0.76);
  color: rgba(234, 243, 252, 0.82);
  font-size: 14px;
}

.action-btn:hover {
  color: #58efdb;
  border-color: rgba(53, 246, 212, 0.58);
}

.section-desc {
  margin-top: 10px;
  color: rgba(211, 225, 239, 0.56);
  font-size: 12px;
  line-height: 1.55;
}

.status-card {
  display: grid;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(6, 17, 31, 0.7);
  border: 1px solid rgba(89, 227, 255, 0.18);
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(234, 243, 252, 0.82);
  font-size: 13px;
}

.status-row strong {
  color: #f3f9ff;
  font-weight: 600;
}

.table-card {
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(6, 17, 31, 0.72);
}

.table-head,
.table-row {
  display: grid;
  gap: 12px;
  padding: 12px 14px;
  font-size: 12px;
}

.table-head {
  color: #f3f9ff;
  border-bottom: 1px solid rgba(89, 227, 255, 0.2);
}

.table-row {
  color: rgba(234, 243, 252, 0.82);
}

.table-empty {
  padding: 24px 14px;
  color: rgba(211, 225, 239, 0.56);
  text-align: center;
  font-size: 12px;
}

.table-head.compact,
.table-row.compact {
  grid-template-columns: 1.4fr 1fr;
}

.table-body.compact {
  max-height: 220px;
}

.action-tag {
  cursor: pointer;
}

.validation-list {
  display: grid;
  gap: 8px;
  color: #ffcb72;
  font-size: 12px;
  line-height: 1.5;
}
</style>

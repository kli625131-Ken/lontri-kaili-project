<template>
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <img class="logo-icon" :src="carrierLogo" alt="Carrier" />
        <span class="logo-text">开利物联网照明智慧系统</span>
      </div>
    </div>
    <nav class="header-nav">
      <router-link v-for="item in visibleNavItems" :key="item.path" :to="item.path" :class="['nav-item', { active: $route.path === item.path }]">
        {{ item.title }}
      </router-link>
    </nav>
    <div class="header-right">
      <div class="datetime">
        <div class="date">{{ currentDate }}</div>
        <div class="time">{{ currentTime }}</div>
      </div>
      <div class="weather">
        <span class="weather-icon">☀️</span>
        <span>天气:晴</span>
      </div>
      <div class="user">
        <span>用户</span>
        <div class="user-avatar">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import carrierLogo from '../assets/images/logo.png'

const navItems = [
  { path: '/dashboard', title: '系统仪表盘' },
  { path: '/energy-analysis', title: '能耗分析' },
  { path: '/device-visualization', title: '可视化设备' },
  { path: '/device-maintenance', title: '设备运维' },
  { path: '/system-logs', title: '系统日志' },
  { path: '/user-management', title: '用户管理' },
  { path: '/parameter-config', title: '参数配置' },
  // { path: '/production-linkage', title: '生产联动' }

]

const hiddenNavPaths = new Set(['/device-maintenance', '/user-management', '/parameter-config'])
const visibleNavItems = navItems.filter((item) => !hiddenNavPaths.has(item.path))

const currentDate = ref('')
const currentTime = ref('')
let timer = null

const updateDateTime = () => {
  const now = new Date()
  currentDate.value = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  currentTime.value = now.toTimeString().slice(0, 8)
}

onMounted(() => {
  updateDateTime()
  timer = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.header {
  position: relative;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 74px;
  padding: 0 24px;
  background:
    linear-gradient(180deg, var(--inner-highlight), transparent 24%),
    linear-gradient(180deg, rgba(10, 29, 51, 0.97), rgba(5, 17, 31, 0.94));
  border-bottom: 1px solid var(--border-subtle);
  box-shadow:
    0 12px 28px rgba(0, 6, 16, 0.28),
    inset 0 1px 0 var(--inner-highlight),
    inset 0 -1px 0 rgba(85, 216, 255, 0.08);
  backdrop-filter: blur(18px);
}

.header::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(85, 216, 255, 0.46), rgba(77, 159, 255, 0.26), transparent);
}

.header::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 420px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(85, 216, 255, 0.14), rgba(85, 216, 255, 0.52), rgba(255, 209, 102, 0.20), transparent);
}

.header-left { flex: 0 0 auto; }

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px 10px 14px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, var(--inner-highlight), transparent),
    rgba(10, 29, 51, 0.78);
  border: 1px solid var(--border-subtle);
  box-shadow:
    inset 0 1px 0 var(--inner-highlight),
    0 10px 24px rgba(0, 6, 16, 0.18);
}

.logo-icon {
  width: 72px;
  height: 36px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(85, 216, 255, 0.16));
}

.logo-text {
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 2px;
  text-shadow: 0 0 16px rgba(214, 232, 247, 0.14);
}

.header-nav {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-item {
  position: relative;
  padding: 10px 22px;
  color: var(--text-2);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgba(10, 29, 51, 0.42);
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.nav-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(85, 216, 255, 0.12), rgba(77, 159, 255, 0.05) 64%, transparent);
  opacity: 0;
  transition: opacity var(--dur-mid) var(--ease-out);
}

.nav-item:hover {
  color: var(--text-primary);
  border-color: var(--border-default);
  background: var(--info-soft);
  box-shadow: inset 0 1px 0 var(--inner-highlight);
}

.nav-item:hover::before,
.nav-item.active::before {
  opacity: 1;
}

.nav-item.active {
  color: var(--text-primary);
  border-color: var(--border-active);
  background: linear-gradient(135deg, rgba(77, 159, 255, 0.34), rgba(85, 216, 255, 0.20));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 8px 20px rgba(0, 9, 22, 0.24),
    0 0 18px rgba(85, 216, 255, 0.10);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 4px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-gold), transparent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
  color: var(--text-2);
  font-size: 14px;
}

.datetime {
  min-width: 136px;
  padding: 8px 14px;
  text-align: right;
  line-height: 1.4;
  border-radius: 18px;
  background:
    linear-gradient(180deg, var(--inner-highlight), transparent),
    var(--control-bg);
  border: 1px solid var(--border-subtle);
  box-shadow: inset 0 1px 0 var(--inner-highlight);
}
.date { font-size: 13px; color: var(--text-tertiary); }
.time {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-cyan);
  font-family: var(--font-num);
  text-shadow: 0 0 14px rgba(85, 216, 255, 0.18);
}

.weather {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, var(--inner-highlight), transparent),
    var(--control-bg);
  border: 1px solid var(--border-subtle);
  box-shadow: inset 0 1px 0 var(--inner-highlight);
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px 7px 14px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, var(--inner-highlight), transparent),
    var(--control-bg);
  border: 1px solid var(--border-subtle);
  box-shadow: inset 0 1px 0 var(--inner-highlight);
}

.user-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--accent-green);
  background: linear-gradient(180deg, var(--success-soft), var(--info-soft));
  border: 1px solid var(--success-border);
  box-shadow: inset 0 1px 0 var(--inner-highlight), var(--glow-soft);
}

.user-avatar svg { width: 20px; height: 20px; }
</style>

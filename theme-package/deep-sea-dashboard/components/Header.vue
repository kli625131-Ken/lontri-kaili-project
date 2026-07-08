<template>
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#59E3FF" stroke-width="2" />
          <path d="M12 6v6l4 2" stroke="#59E3FF" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="12" r="3" fill="#35F6D4" />
        </svg>
        <span class="logo-text">Lighting Center</span>
      </div>
    </div>
    <nav class="header-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="['nav-item', { active: $route.path === item.path }]"
      >
        {{ item.title }}
      </router-link>
    </nav>
    <div class="header-right">
      <div class="datetime">
        <div class="date">{{ currentDate }}</div>
        <div class="time">{{ currentTime }}</div>
      </div>
      <div class="weather">
        <span>☀</span>
        <span>Weather: Clear</span>
      </div>
      <div class="user">
        <span>User</span>
        <div class="user-avatar">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#59E3FF" stroke-width="2" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#59E3FF" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const navItems = [
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/energy-analysis', title: 'Energy' },
  { path: '/device-visualization', title: 'Devices' },
  { path: '/device-maintenance', title: 'Maintenance' },
  { path: '/production-linkage', title: 'Production' },
  { path: '/parameter-config', title: 'Config' },
  { path: '/system-logs', title: 'Logs' },
  { path: '/user-management', title: 'Users' }
]

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
  background: linear-gradient(180deg, rgba(7, 19, 33, 0.96) 0%, rgba(10, 23, 40, 0.88) 100%);
  border-bottom: 1px solid var(--line-main);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24), inset 0 -1px 0 rgba(89, 227, 255, 0.08);
  backdrop-filter: blur(12px);
}

.header::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(89, 227, 255, 0.55), transparent);
}

.header::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 320px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(89, 227, 255, 0.7), transparent);
}

.header-left {
  flex: 0 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  filter: drop-shadow(0 0 10px rgba(89, 227, 255, 0.22));
}

.logo-text {
  color: var(--text-1);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 2px;
  text-shadow: 0 0 16px rgba(89, 227, 255, 0.14);
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
  background: rgba(255, 255, 255, 0.015);
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(89, 227, 255, 0.08), transparent 70%);
  opacity: 0;
  transition: opacity var(--dur-mid) var(--ease-out);
}

.nav-item:hover {
  color: var(--text-1);
  border-color: var(--line-main);
  box-shadow: var(--glow-soft);
}

.nav-item:hover::before,
.nav-item.active::before {
  opacity: 1;
}

.nav-item.active {
  color: var(--accent-cyan);
  border-color: var(--line-strong);
  box-shadow: 0 0 0 1px rgba(89, 227, 255, 0.08), 0 0 16px rgba(89, 227, 255, 0.16);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 4px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
  color: var(--text-2);
  font-size: 14px;
}

.datetime {
  text-align: right;
  line-height: 1.4;
}

.date {
  font-size: 13px;
  color: var(--text-3);
}

.time {
  color: var(--accent-cyan);
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-num);
}

.weather {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(89, 227, 255, 0.18), rgba(89, 227, 255, 0.06));
  border: 1px solid var(--line-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), var(--glow-soft);
}

.user-avatar svg {
  width: 20px;
  height: 20px;
}
</style>

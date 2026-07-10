<template>
  <div class="app-container">
    <Header />
    <div class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
</script>

<style>
:root {
  --bg-page-deep: #040c17;
  --bg-page: #06111f;
  --bg-surface-1: #0a1d33;
  --bg-surface-2: #0d2743;
  --bg-surface-3: #123352;
  --bg-hover: #153d61;
  --bg-0: var(--bg-page-deep);
  --bg-1: var(--bg-page);
  --bg-2: var(--bg-surface-1);
  --bg-3: var(--bg-surface-2);

  --card-bg: rgba(10, 29, 51, 0.94);
  --card-bg-strong: rgba(12, 39, 67, 0.96);
  --card-bg-soft: rgba(15, 46, 76, 0.82);
  --panel-base: var(--card-bg);
  --panel-strong: var(--card-bg-strong);
  --panel-hover: rgba(21, 61, 97, 0.94);
  --panel-soft: rgba(85, 216, 255, 0.07);
  --control-bg: rgba(7, 24, 42, 0.84);
  --control-bg-hover: rgba(18, 51, 82, 0.92);
  --overlay-bg: rgba(2, 9, 18, 0.72);

  --border-subtle: rgba(105, 176, 235, 0.20);
  --border-default: rgba(90, 190, 245, 0.34);
  --border-active: rgba(85, 216, 255, 0.62);
  --inner-highlight: rgba(255, 255, 255, 0.07);
  --line-soft: var(--border-subtle);
  --line-main: var(--border-default);
  --line-strong: var(--border-active);
  --line-warm: rgba(255, 209, 102, 0.32);

  --accent-cyan: #55d8ff;
  --accent-teal: #45dfcf;
  --accent-green: #5ee79a;
  --accent-lime: #8ee88b;
  --accent-gold: #ffd166;
  --accent-yellow: var(--accent-gold);
  --accent-orange: #ff9b4a;
  --accent-blue: #4d9fff;
  --accent-purple: #b98cff;
  --accent-red: #ff6678;
  --accent-cloud: #dbeaff;

  --success: var(--accent-green);
  --success-soft: rgba(94, 231, 154, 0.13);
  --success-border: rgba(94, 231, 154, 0.42);
  --info: var(--accent-cyan);
  --info-soft: rgba(85, 216, 255, 0.12);
  --info-border: rgba(85, 216, 255, 0.38);
  --warning: var(--accent-gold);
  --warning-soft: rgba(255, 209, 102, 0.13);
  --warning-border: rgba(255, 209, 102, 0.42);
  --danger: var(--accent-red);
  --danger-soft: rgba(255, 102, 120, 0.13);
  --danger-border: rgba(255, 102, 120, 0.42);
  --offline: #718ca6;
  --offline-soft: rgba(113, 140, 166, 0.14);

  --text-primary: #f4f8ff;
  --text-strong: #e7f2ff;
  --text-secondary: #c1d3e7;
  --text-tertiary: #8fa8c1;
  --text-muted: #6e879f;
  --text-disabled: #50677d;
  --text-1: var(--text-primary);
  --text-2: var(--text-secondary);
  --text-3: var(--text-tertiary);

  --shadow-panel: 0 16px 40px rgba(0, 6, 16, 0.32);
  --shadow-elevated: 0 22px 54px rgba(0, 5, 14, 0.46);
  --glow-soft: 0 0 18px rgba(85, 216, 255, 0.10);
  --glow-mid: 0 0 26px rgba(85, 216, 255, 0.14);
  --glow-strong: 0 0 38px rgba(85, 216, 255, 0.20);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-num: 'Bahnschrift', 'DIN Alternate', 'JetBrains Mono', monospace;

  --dur-fast: 180ms;
  --dur-mid: 240ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  --bg-primary: var(--bg-page);
  --bg-panel: var(--panel-base);
  --border-primary: var(--line-main);
  --highlight-cyan: var(--accent-cyan);
  --data-green: var(--accent-teal);
  --status-green: var(--success);
  --amount-yellow: var(--warning);
  --border-glow: rgba(85, 216, 255, 0.22);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

*::selection {
  background: var(--info-soft);
  color: var(--text-1);
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% -10%, rgba(77, 159, 255, 0.12), transparent 30%),
    radial-gradient(circle at 12% 10%, rgba(85, 216, 255, 0.08), transparent 28%),
    radial-gradient(circle at 90% 14%, rgba(69, 223, 207, 0.06), transparent 25%),
    linear-gradient(180deg, #0a1b30 0%, var(--bg-page) 28%, var(--bg-page-deep) 100%);
  color: var(--text-primary);
  font-family: var(--font-ui);
  letter-spacing: 0.2px;
}

body {
  position: relative;
}

body::before,
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

body::before {
  background-image:
    linear-gradient(rgba(105, 176, 235, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(105, 176, 235, 0.03) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(180deg, rgba(255,255,255,.72), transparent 86%);
}

body::after {
  background:
    linear-gradient(180deg, rgba(77, 159, 255, 0.06), transparent 17%),
    radial-gradient(circle at 50% 12%, rgba(85, 216, 255, 0.06), transparent 31%);
  opacity: 1;
}

button,
input,
select,
textarea {
  font: inherit;
}

button,
input,
select,
textarea,
.data-card,
.kpi-card,
.nav-item,
.page-btn,
.search-btn,
.add-btn,
.action-btn,
.ctrl-btn,
.btn-primary,
.btn-secondary,
.config-btn {
  transition:
    border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    background var(--dur-mid) var(--ease-out),
    box-shadow var(--dur-mid) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

button {
  cursor: pointer;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

input,
select,
textarea {
  background: var(--control-bg);
  border: 1px solid var(--line-main);
  color: var(--text-1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

input::placeholder,
textarea::placeholder {
  color: var(--text-3);
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--line-strong);
  box-shadow:
    0 0 0 1px var(--info-soft),
    0 0 18px rgba(85, 216, 255, 0.14);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(156, 181, 255, 0.34), rgba(88, 239, 219, 0.32));
  border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(156, 181, 255, 0.48), rgba(88, 239, 219, 0.42));
}

#app {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: transparent;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

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
  --bg-0: #091421;
  --bg-1: #12253A;
  --bg-2: #19334C;
  --bg-3: #24435F;

  --panel-base: rgba(25, 45, 67, 0.7);
  --panel-strong: rgba(31, 54, 81, 0.84);
  --panel-hover: rgba(38, 64, 94, 0.92);
  --panel-soft: rgba(228, 241, 255, 0.08);

  --line-soft: rgba(171, 206, 233, 0.16);
  --line-main: rgba(143, 210, 230, 0.34);
  --line-strong: rgba(132, 232, 221, 0.56);
  --line-warm: rgba(255, 202, 118, 0.32);

  --accent-cyan: #78E8FF;
  --accent-teal: #58EFDB;
  --accent-green: #8EE88B;
  --accent-lime: #C1F3A0;
  --accent-gold: #FFCB72;
  --accent-blue: #9CB5FF;
  --accent-cloud: #D7E6F6;

  --success: #68EBA2;
  --warning: var(--accent-gold);
  --danger: #FF7B8A;

  --text-1: #F3F9FF;
  --text-2: rgba(234, 243, 252, 0.82);
  --text-3: rgba(211, 225, 239, 0.56);

  --shadow-panel: 0 16px 40px rgba(3, 12, 23, 0.22);
  --glow-soft: 0 0 18px rgba(120, 232, 255, 0.12);
  --glow-mid: 0 0 26px rgba(120, 232, 255, 0.16);
  --glow-strong: 0 0 42px rgba(142, 232, 139, 0.18);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-num: 'Bahnschrift', 'DIN Alternate', 'JetBrains Mono', monospace;

  --dur-fast: 180ms;
  --dur-mid: 240ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  --bg-primary: var(--bg-0);
  --bg-panel: var(--panel-base);
  --border-primary: var(--line-main);
  --highlight-cyan: var(--accent-cyan);
  --data-green: var(--accent-teal);
  --status-green: var(--success);
  --amount-yellow: var(--warning);
  --text-primary: var(--text-1);
  --text-secondary: var(--text-2);
  --border-glow: rgba(120, 232, 255, 0.22);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

*::selection {
  background: rgba(120, 232, 255, 0.22);
  color: var(--text-1);
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% -10%, rgba(255, 214, 143, 0.14), transparent 28%),
    radial-gradient(circle at 15% 8%, rgba(156, 181, 255, 0.16), transparent 26%),
    radial-gradient(circle at 88% 16%, rgba(88, 239, 219, 0.11), transparent 24%),
    linear-gradient(180deg, #19324D 0%, var(--bg-1) 24%, var(--bg-0) 100%);
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
    linear-gradient(rgba(186, 214, 237, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(186, 214, 237, 0.04) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(180deg, rgba(255,255,255,.72), transparent 86%);
}

body::after {
  background:
    linear-gradient(180deg, rgba(226, 240, 255, 0.08), transparent 16%),
    radial-gradient(circle at 50% -6%, rgba(255, 214, 143, 0.1), transparent 24%),
    radial-gradient(circle at 50% 18%, rgba(120, 232, 255, 0.08), transparent 30%);
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
  background: rgba(20, 39, 59, 0.74);
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
    0 0 0 1px rgba(120, 232, 255, 0.14),
    0 0 18px rgba(120, 232, 255, 0.16);
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

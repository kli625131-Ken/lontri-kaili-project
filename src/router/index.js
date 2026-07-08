import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import DeviceVisualization from '../views/DeviceVisualization.vue'
import EnergyAnalysis from '../views/EnergyAnalysis.vue'
import DeviceMaintenance from '../views/DeviceMaintenance.vue'
import UserManagement from '../views/UserManagement.vue'
import SystemLogs from '../views/SystemLogs.vue'
import ParameterConfig from '../views/ParameterConfig.vue'
import ProductionLinkage from '../views/ProductionLinkage.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { title: '系统仪表盘' } },
  { path: '/device-visualization', name: 'DeviceVisualization', component: DeviceVisualization, meta: { title: '可视化设备' } },
  { path: '/energy-analysis', name: 'EnergyAnalysis', component: EnergyAnalysis, meta: { title: '能耗分析' } },
  { path: '/device-maintenance', name: 'DeviceMaintenance', component: DeviceMaintenance, meta: { title: '设备运维' } },
  { path: '/user-management', name: 'UserManagement', component: UserManagement, meta: { title: '用户管理' } },
  { path: '/system-logs', name: 'SystemLogs', component: SystemLogs, meta: { title: '系统日志' } },
  { path: '/parameter-config', name: 'ParameterConfig', component: ParameterConfig, meta: { title: '参数配置' } },
  // { path: '/production-linkage', name: 'ProductionLinkage', component: ProductionLinkage, meta: { title: '生产联动' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

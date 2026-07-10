<template>
  <div class="user-management-page">
    <div class="page-content">
      <DataCard title="用户组管理" class="group-card">
        <div class="section-header">
          <button class="add-btn" @click="showAddGroup = true"><span>+</span> 新增用户组</button>
        </div>
        <div class="group-list">
          <div v-for="group in userGroups" :key="group.id" :class="['group-item', { active: selectedGroup?.id === group.id }]" @click="selectGroup(group)">
            <div class="group-info">
              <span class="group-icon">👥</span>
              <div class="group-detail">
                <span class="group-name">{{ group.name }}</span>
                <span class="group-desc">{{ group.description }}</span>
              </div>
            </div>
            <div class="group-stats">
              <span class="user-count">{{ group.userCount }}人</span>
              <span :class="['perm-badge', group.permission]">{{ group.permissionText }}</span>
            </div>
          </div>
        </div>
      </DataCard>
      <DataCard :title="selectedGroup ? selectedGroup.name + ' - 用户列表' : '用户列表'" class="user-list-card">
        <div class="section-header">
          <div class="search-box"><input type="text" v-model="userSearch" placeholder="搜索用户..." class="search-input"/></div>
          <button class="add-btn" @click="showAddUser = true"><span>+</span> 新增用户</button>
        </div>
        <div class="user-table">
          <div class="table-header">
            <div class="th">用户名</div>
            <div class="th">所属用户组</div>
            <div class="th">创建时间</div>
            <div class="th">最后登录</div>
            <div class="th">状态</div>
            <div class="th">操作</div>
          </div>
          <div class="table-body">
            <div v-for="user in filteredUsers" :key="user.id" class="table-row">
              <div class="td user-cell"><div class="user-avatar-small">{{ user.username.charAt(0).toUpperCase() }}</div><span>{{ user.username }}</span></div>
              <div class="td">{{ user.groupName }}</div>
              <div class="td">{{ user.createTime }}</div>
              <div class="td">{{ user.lastLogin }}</div>
              <div class="td"><span :class="['status-dot', user.status]"></span><span class="status-text">{{ user.status === 'active' ? '正常' : '禁用' }}</span></div>
              <div class="td actions"><button class="action-btn" @click="editUser(user)">编辑</button><button class="action-btn danger" @click="resetPassword(user)">重置密码</button></div>
            </div>
          </div>
        </div>
        <div class="pagination">
          <span class="page-info">共 {{ filteredUsers.length }} 条记录</span>
          <div class="page-buttons">
            <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">上一页</button>
            <span class="page-num">{{ currentPage }} / {{ totalPages }}</span>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">下一页</button>
          </div>
        </div>
      </DataCard>
      <DataCard title="权限配置" class="permission-card">
        <div v-if="selectedGroup" class="permission-content">
          <div class="perm-section">
            <div class="perm-title">页面访问权限</div>
            <div class="perm-list">
              <label v-for="page in pagePermissions" :key="page.value" class="perm-item"><input type="checkbox" v-model="selectedPermissions" :value="page.value"/><span class="checkmark"></span><span class="perm-label">{{ page.label }}</span></label>
            </div>
          </div>
          <div class="perm-section">
            <div class="perm-title">操作权限</div>
            <div class="perm-list">
              <label v-for="op in operationPermissions" :key="op.value" class="perm-item"><input type="checkbox" v-model="selectedPermissions" :value="op.value"/><span class="checkmark"></span><span class="perm-label">{{ op.label }}</span></label>
            </div>
          </div>
          <div class="perm-section">
            <div class="perm-title">数据权限</div>
            <div class="perm-list">
              <label v-for="data in dataPermissions" :key="data.value" class="perm-item"><input type="checkbox" v-model="selectedPermissions" :value="data.value"/><span class="checkmark"></span><span class="perm-label">{{ data.label }}</span></label>
            </div>
          </div>
          <button class="save-perm-btn" @click="savePermissions">保存权限配置</button>
        </div>
        <div v-else class="empty-state"><span class="empty-icon">🔐</span><span class="empty-text">请选择用户组查看权限配置</span></div>
      </DataCard>
    </div>
    <div v-if="showAddGroup" class="modal-overlay" @click.self="showAddGroup = false">
      <div class="modal">
        <div class="modal-header"><h3>新增用户组</h3><button class="close-btn" @click="showAddGroup = false">×</button></div>
        <div class="modal-body">
          <div class="form-item"><label>用户组名称</label><input type="text" v-model="newGroup.name" placeholder="请输入用户组名称"/></div>
          <div class="form-item"><label>描述</label><textarea v-model="newGroup.description" placeholder="请输入描述信息"></textarea></div>
          <div class="form-item"><label>权限级别</label><select v-model="newGroup.permission"><option value="admin">管理员</option><option value="operator">操作员</option><option value="viewer">观察员</option></select></div>
        </div>
        <div class="modal-footer"><button class="btn-cancel" @click="showAddGroup = false">取消</button><button class="btn-confirm" @click="addGroup">确定</button></div>
      </div>
    </div>
    <div v-if="showAddUser" class="modal-overlay" @click.self="showAddUser = false">
      <div class="modal">
        <div class="modal-header"><h3>新增用户</h3><button class="close-btn" @click="showAddUser = false">×</button></div>
        <div class="modal-body">
          <div class="form-item"><label>用户名</label><input type="text" v-model="newUser.username" placeholder="请输入用户名"/></div>
          <div class="form-item"><label>密码</label><input type="password" v-model="newUser.password" placeholder="请输入密码"/></div>
          <div class="form-item"><label>确认密码</label><input type="password" v-model="newUser.confirmPassword" placeholder="请再次输入密码"/></div>
          <div class="form-item"><label>所属用户组</label><select v-model="newUser.groupId"><option v-for="group in userGroups" :key="group.id" :value="group.id">{{ group.name }}</option></select></div>
        </div>
        <div class="modal-footer"><button class="btn-cancel" @click="showAddUser = false">取消</button><button class="btn-confirm" @click="addUser">确定</button></div>
      </div>
    </div>
    <div v-if="showEditUser" class="modal-overlay" @click.self="showEditUser = false">
      <div class="modal">
        <div class="modal-header"><h3>编辑用户</h3><button class="close-btn" @click="showEditUser = false">×</button></div>
        <div class="modal-body">
          <div class="form-item"><label>用户名</label><input type="text" v-model="editUserData.username" disabled/></div>
          <div class="form-item"><label>所属用户组</label><select v-model="editUserData.groupId"><option v-for="group in userGroups" :key="group.id" :value="group.id">{{ group.name }}</option></select></div>
          <div class="form-item"><label>状态</label><select v-model="editUserData.status"><option value="active">正常</option><option value="disabled">禁用</option></select></div>
        </div>
        <div class="modal-footer"><button class="btn-cancel" @click="showEditUser = false">取消</button><button class="btn-confirm" @click="saveUser">保存</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import DataCard from '../components/DataCard.vue'

const userGroups = ref([{ id: 1, name: '系统管理员', description: '拥有系统全部权限', userCount: 3, permission: 'admin', permissionText: '管理员' }, { id: 2, name: '运维人员', description: '设备运维与监控权限', userCount: 8, permission: 'operator', permissionText: '操作员' }, { id: 3, name: '普通用户', description: '仅查看权限', userCount: 15, permission: 'viewer', permissionText: '观察员' }, { id: 4, name: '生产管理人员', description: '生产联动相关权限', userCount: 5, permission: 'operator', permissionText: '操作员' }])
const users = ref([{ id: 1, username: 'admin', groupId: 1, groupName: '系统管理员', createTime: '2024-01-15', lastLogin: '2026-03-08 09:30:00', status: 'active' }, { id: 2, username: 'zhangsan', groupId: 2, groupName: '运维人员', createTime: '2024-02-20', lastLogin: '2026-03-07 18:45:00', status: 'active' }, { id: 3, username: 'lisi', groupId: 2, groupName: '运维人员', createTime: '2024-03-10', lastLogin: '2026-03-08 08:20:00', status: 'active' }, { id: 4, username: 'wangwu', groupId: 3, groupName: '普通用户', createTime: '2024-05-12', lastLogin: '2026-03-06 14:30:00', status: 'active' }, { id: 5, username: 'zhaoliu', groupId: 4, groupName: '生产管理人员', createTime: '2024-06-18', lastLogin: '2026-03-08 10:15:00', status: 'active' }, { id: 6, username: 'testuser', groupId: 3, groupName: '普通用户', createTime: '2025-01-20', lastLogin: '2026-02-28 16:00:00', status: 'disabled' }])
const pagePermissions = [{ label: '系统仪表盘', value: 'dashboard' }, { label: '能耗分析', value: 'energy' }, { label: '可视化设备', value: 'device' }, { label: '设备运维', value: 'maintenance' }, { label: '系统日志', value: 'logs' }, { label: '用户管理', value: 'users' }, { label: '生产联动', value: 'production' }]
const operationPermissions = [{ label: '设备控制', value: 'device_control' }, { label: '参数配置', value: 'config' }, { label: '告警处理', value: 'alarm_handle' }, { label: '数据导出', value: 'export' }]
const dataPermissions = [{ label: '全部园区', value: 'all_parks' }, { label: '指定建筑', value: 'buildings' }, { label: '指定楼层', value: 'floors' }, { label: '仅查看本人数据', value: 'self_only' }]

const selectedGroup = ref(null), selectedPermissions = ref([]), userSearch = ref(''), currentPage = ref(1), pageSize = 10
const showAddGroup = ref(false), showAddUser = ref(false), showEditUser = ref(false)
const newGroup = reactive({ name: '', description: '', permission: 'viewer' })
const newUser = reactive({ username: '', password: '', confirmPassword: '', groupId: 1 })
const editUserData = reactive({ id: null, username: '', groupId: 1, status: 'active' })

const filteredUsers = computed(() => { let result = users.value; if (selectedGroup.value) result = result.filter(u => u.groupId === selectedGroup.value.id); if (userSearch.value) result = result.filter(u => u.username.toLowerCase().includes(userSearch.value.toLowerCase())); return result })
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / pageSize))

const selectGroup = (group) => { selectedGroup.value = group; selectedPermissions.value = ['dashboard', 'energy', 'device'] }
const addGroup = () => { if (!newGroup.name) return; userGroups.value.push({ id: userGroups.value.length + 1, name: newGroup.name, description: newGroup.description, userCount: 0, permission: newGroup.permission, permissionText: newGroup.permission === 'admin' ? '管理员' : newGroup.permission === 'operator' ? '操作员' : '观察员' }); showAddGroup.value = false; newGroup.name = ''; newGroup.description = '' }
const addUser = () => { if (!newUser.username || !newUser.password) return; const group = userGroups.value.find(g => g.id === newUser.groupId); users.value.push({ id: users.value.length + 1, username: newUser.username, groupId: newUser.groupId, groupName: group.name, createTime: '2026-03-08', lastLogin: '-', status: 'active' }); group.userCount++; showAddUser.value = false; newUser.username = ''; newUser.password = ''; newUser.confirmPassword = '' }
const editUser = (user) => { editUserData.id = user.id; editUserData.username = user.username; editUserData.groupId = user.groupId; editUserData.status = user.status; showEditUser.value = true }
const saveUser = () => { const user = users.value.find(u => u.id === editUserData.id); if (user) { const oldGroup = userGroups.value.find(g => g.id === user.groupId); const newGroup = userGroups.value.find(g => g.id === editUserData.groupId); if (oldGroup !== newGroup) { oldGroup.userCount--; newGroup.userCount++ } user.groupId = editUserData.groupId; user.groupName = newGroup.name; user.status = editUserData.status } showEditUser.value = false }
const resetPassword = (user) => { alert(`已重置用户 "${user.username}" 的密码为: 123456`) }
const savePermissions = () => { alert('权限配置已保存！') }
</script>

<style scoped>
.user-management-page { width: 100%; height: 100%; padding: 20px; }
.page-content { display: grid; grid-template-columns: 280px 1fr 300px; gap: 16px; height: 100%; }
.group-card, .permission-card { height: 100%; overflow: auto; }
.user-list-card { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.add-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(0, 212, 170, 0.2); border: 1px solid rgba(0, 212, 170, 0.5); border-radius: 6px; color: #00d4aa; font-size: 13px; cursor: pointer; transition: all 0.3s ease; }
.add-btn:hover { background: rgba(0, 212, 170, 0.3); }
.group-list { display: flex; flex-direction: column; gap: 8px; }
.group-item { display: flex; justify-content: space-between; align-items: center; padding: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; cursor: pointer; transition: all 0.3s ease; }
.group-item:hover { background: rgba(0, 212, 170, 0.1); border-color: rgba(0, 212, 170, 0.3); }
.group-item.active { background: rgba(0, 212, 170, 0.15); border-color: #00d4aa; }
.group-info { display: flex; align-items: center; gap: 10px; }
.group-icon { font-size: 20px; }
.group-detail { display: flex; flex-direction: column; gap: 4px; }
.group-name { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.9); }
.group-desc { font-size: 11px; color: rgba(255, 255, 255, 0.4); }
.group-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.user-count { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
.perm-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; }
.perm-badge.admin { background: rgba(255, 107, 107, 0.2); color: #ff6b6b; }
.perm-badge.operator { background: rgba(0, 168, 232, 0.2); color: #00a8e8; }
.perm-badge.viewer { background: rgba(0, 212, 170, 0.2); color: #00d4aa; }
.search-box { flex: 1; max-width: 200px; }
.search-input { width: 100%; padding: 8px 14px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(0, 212, 170, 0.3); border-radius: 6px; color: rgba(255, 255, 255, 0.8); font-size: 13px; }
.user-table { border: 1px solid rgba(0, 212, 170, 0.2); border-radius: 8px; overflow: hidden; margin-bottom: 16px; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.table-header { display: grid; grid-template-columns: 1.5fr 1.2fr 1.2fr 1.5fr 0.8fr 1.5fr; background: rgba(0, 212, 170, 0.1); padding: 12px 16px; flex-shrink: 0; }
.th { font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.8); }
.table-body { flex: 1; overflow-y: auto; min-height: 0; }
.table-row { display: grid; grid-template-columns: 1.5fr 1.2fr 1.2fr 1.5fr 0.8fr 1.5fr; padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s ease; }
.table-row:hover { background: rgba(0, 212, 170, 0.05); }
.td { font-size: 12px; color: rgba(255, 255, 255, 0.7); display: flex; align-items: center; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.user-avatar-small { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #00d4aa, #00a884); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.active { background: #00d4aa; }
.status-dot.disabled { background: #ff6b6b; }
.status-text { font-size: 11px; }
.actions { display: flex; gap: 8px; }
.action-btn { padding: 4px 10px; background: rgba(0, 212, 170, 0.15); border: 1px solid rgba(0, 212, 170, 0.3); border-radius: 4px; color: #00d4aa; font-size: 11px; cursor: pointer; transition: all 0.3s ease; }
.action-btn:hover { background: rgba(0, 212, 170, 0.25); }
.action-btn.danger { background: rgba(255, 107, 107, 0.15); border-color: rgba(255, 107, 107, 0.3); color: #ff6b6b; }
.action-btn.danger:hover { background: rgba(255, 107, 107, 0.25); }
.pagination { display: flex; justify-content: space-between; align-items: center; padding: 0 8px; }
.page-info { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
.page-buttons { display: flex; align-items: center; gap: 12px; }
.page-btn { padding: 6px 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: rgba(255, 255, 255, 0.7); font-size: 12px; cursor: pointer; transition: all 0.3s ease; }
.page-btn:hover:not(:disabled) { border-color: rgba(0, 212, 170, 0.5); }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-num { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
.permission-content { padding: 10px 0; }
.perm-section { margin-bottom: 20px; }
.perm-title { font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.8); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.perm-list { display: flex; flex-direction: column; gap: 10px; }
.perm-item { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 0; }
.perm-item input { display: none; }
.checkmark { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 3px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.perm-item input:checked + .checkmark { background: #00d4aa; border-color: #00d4aa; }
.perm-item input:checked + .checkmark::after { content: '✓'; color: #fff; font-size: 11px; }
.perm-label { font-size: 12px; color: rgba(255, 255, 255, 0.7); }
.save-perm-btn { width: 100%; padding: 12px; background: linear-gradient(90deg, #00d4aa, #00a884); border: none; border-radius: 6px; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; margin-top: 10px; }
.save-perm-btn:hover { box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4); }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: rgba(255, 255, 255, 0.4); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-text { font-size: 14px; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: linear-gradient(135deg, #0d1f35 0%, #0a1628 100%); border: 1px solid rgba(0, 212, 170, 0.3); border-radius: 12px; width: 420px; max-width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.modal-header h3 { font-size: 18px; font-weight: 600; color: #fff; }
.close-btn { background: none; border: none; color: rgba(255, 255, 255, 0.5); font-size: 24px; cursor: pointer; transition: all 0.3s ease; }
.close-btn:hover { color: #fff; }
.modal-body { padding: 24px; }
.form-item { margin-bottom: 16px; }
.form-item label { display: block; font-size: 13px; color: rgba(255, 255, 255, 0.7); margin-bottom: 8px; }
.form-item input, .form-item textarea, .form-item select { width: 100%; padding: 10px 14px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(0, 212, 170, 0.3); border-radius: 6px; color: rgba(255, 255, 255, 0.9); font-size: 14px; outline: none; transition: all 0.3s ease; }
.form-item input:focus, .form-item textarea:focus, .form-item select:focus { border-color: #00d4aa; }
.form-item textarea { min-height: 80px; resize: vertical; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.btn-cancel { padding: 10px 20px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: rgba(255, 255, 255, 0.7); font-size: 14px; cursor: pointer; transition: all 0.3s ease; }
.btn-cancel:hover { background: rgba(255, 255, 255, 0.1); }
.btn-confirm { padding: 10px 24px; background: linear-gradient(90deg, #00d4aa, #00a884); border: none; border-radius: 6px; color: #fff; font-size: 14px; cursor: pointer; transition: all 0.3s ease; }
.btn-confirm:hover { box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4); }

/* Unified deep-sea theme: color-only overrides. */
.add-btn { background: var(--info-soft); border-color: var(--border-active); color: var(--accent-cyan); }
.add-btn:hover { background: rgba(85, 216, 255, 0.18); }
.group-item { background: rgba(7, 24, 42, 0.58); border-color: var(--border-subtle); }
.group-item:hover { background: var(--control-bg-hover); border-color: var(--border-default); }
.group-item.active { background: rgba(77, 159, 255, 0.16); border-color: var(--border-active); }
.group-name { color: var(--text-strong); }
.group-desc { color: var(--text-tertiary); }
.user-count { color: var(--text-tertiary); }
.perm-badge.admin { background: var(--danger-soft); color: var(--danger); }
.perm-badge.operator { background: var(--info-soft); color: var(--accent-blue); }
.perm-badge.viewer { background: var(--success-soft); color: var(--success); }
.search-input { background: var(--control-bg); border-color: var(--border-default); color: var(--text-secondary); }
.user-table { border-color: var(--border-subtle); background: rgba(7, 24, 42, 0.34); }
.table-header { background: rgba(77, 159, 255, 0.11); }
.th { color: var(--text-strong); }
.table-row { border-bottom-color: rgba(105, 176, 235, 0.11); }
.table-row:hover { background: rgba(85, 216, 255, 0.055); }
.td, .perm-label { color: var(--text-secondary); }
.user-avatar-small { background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); color: var(--bg-page-deep); }
.status-dot.active { background: var(--success); }
.status-dot.disabled { background: var(--offline); }
.action-btn { background: var(--info-soft); border-color: var(--info-border); color: var(--accent-cyan); }
.action-btn:hover { background: rgba(85, 216, 255, 0.18); }
.action-btn.danger { background: var(--danger-soft); border-color: var(--danger-border); color: var(--danger); }
.action-btn.danger:hover { background: rgba(255, 102, 120, 0.20); }
.pagination, .perm-title { border-color: var(--border-subtle); }
.page-info, .page-num { color: var(--text-tertiary); }
.page-btn, .btn-cancel { background: var(--control-bg); border-color: var(--border-subtle); color: var(--text-secondary); }
.page-btn:hover:not(:disabled) { border-color: var(--border-active); color: var(--accent-cyan); }
.perm-title { color: var(--text-strong); }
.checkmark { border-color: var(--border-default); }
.perm-item input:checked + .checkmark { background: var(--accent-cyan); border-color: var(--accent-cyan); }
.perm-item input:checked + .checkmark::after { color: var(--bg-page-deep); }
.save-perm-btn, .btn-confirm { background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); color: var(--bg-page-deep); }
.save-perm-btn:hover, .btn-confirm:hover { box-shadow: 0 4px 20px rgba(85, 216, 255, 0.20); }
.empty-state { color: var(--text-muted); }
.modal-overlay { background: var(--overlay-bg); }
.modal { background: linear-gradient(145deg, var(--card-bg-strong), var(--bg-page)); border-color: var(--border-default); box-shadow: var(--shadow-elevated); }
.modal-header, .modal-footer { border-color: var(--border-subtle); }
.modal-header h3 { color: var(--text-primary); }
.close-btn { color: var(--text-tertiary); }
.close-btn:hover { color: var(--text-primary); }
.form-item label { color: var(--text-secondary); }
.form-item input, .form-item textarea, .form-item select { background: var(--control-bg); border-color: var(--border-default); color: var(--text-primary); }
.form-item input:focus, .form-item textarea:focus, .form-item select:focus { border-color: var(--border-active); }
</style>

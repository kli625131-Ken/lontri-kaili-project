# 用户管理页面（UserManagement）结构梳理

## 1. 文档说明

- 页面来源：`src/views/UserManagement.vue`
- 路由配置：`src/router/index.js`
- 组件依赖：`src/components/DataCard.vue`
- 当前实现状态：UserManagement 页面**暂无真实后端 API 调用**，主要由前端静态用户组、用户数据、本地筛选和本地弹窗表单构成

当前页面已经具备“用户组管理 + 用户列表 + 权限配置 + 弹窗编辑”的完整业务骨架，也实现了用户组选择、用户搜索、用户新增、用户编辑、权限勾选等交互。但页面仍然处于“静态演示数据驱动”阶段，尚未接入真实用户体系、角色权限体系与持久化接口。本文中的 API 接口均为基于现有页面结构反推的建议设计，用于后续联调与改造。

## 2. 页面整体结构

页面采用三栏布局：

- 左侧：用户组管理
- 中间：用户列表管理
- 右侧：权限配置

页面底部还包含三类弹窗：

- 新增用户组弹窗
- 新增用户弹窗
- 编辑用户弹窗

### 2.1 页面层次

1. 页面根节点 `user-management-page`
2. 页面主体 `page-content`
3. 左侧用户组卡片 `group-card`
4. 中间用户列表卡片 `user-list-card`
5. 右侧权限配置卡片 `permission-card`
6. 弹窗层 `modal-overlay`

### 2.2 页面功能分区

页面可以拆成 7 个核心模块：

1. 用户组列表
2. 用户列表与搜索
3. 用户分页
4. 权限配置
5. 新增用户组弹窗
6. 新增用户弹窗
7. 编辑用户弹窗

## 3. 当前页面真实实现结论

在 `src/views/UserManagement.vue` 中，当前页面具有以下特征：

- 有用户组列表
- 有用户搜索
- 有用户组筛选
- 有权限勾选配置
- 有新增用户组弹窗
- 有新增用户弹窗
- 有编辑用户弹窗
- 有本地数据变更能力
- 有 `computed` 派生数据
- 无 `watch`
- 无 `axios` / `fetch`
- 无 `/api/...` 请求
- 无真实密码重置流程
- 权限保存仅弹提示

还需要特别指出一个实现现状：

- 页面展示了分页信息和分页按钮
- 也维护了 `currentPage` 和 `totalPages`
- 但表格实际渲染的是 `filteredUsers`
- **并没有真正对用户列表做分页切片**

也就是说，当前分页 UI 是“半完成状态”。

## 4. 功能模块拆解

### 4.1 模块一：用户组列表

#### 4.1.1 元素组成

该模块位于左侧，包含：

1. 标题：用户组管理
2. 新增用户组按钮
3. 用户组列表
4. 每个用户组项包含：
   - 图标
   - 用户组名称
   - 描述
   - 用户数量
   - 权限级别标签

#### 4.1.2 当前前端数据结构

当前用户组数据来自 `userGroups`：

```json
[
  {
    "id": 1,
    "name": "系统管理员",
    "description": "拥有系统全部权限",
    "userCount": 3,
    "permission": "admin",
    "permissionText": "管理员"
  },
  {
    "id": 2,
    "name": "运维人员",
    "description": "设备运维与监控权限",
    "userCount": 8,
    "permission": "operator",
    "permissionText": "操作员"
  }
]
```

字段语义如下：

- `id`：用户组 ID
- `name`：用户组名称
- `description`：用户组描述
- `userCount`：组内用户数
- `permission`：权限级别，如 `admin | operator | viewer`
- `permissionText`：权限级别中文名

#### 4.1.3 交互逻辑

1. 点击某个用户组项时，执行 `selectGroup(group)`
2. `selectedGroup` 被设置为当前组
3. 中间用户列表标题同步变为“组名 - 用户列表”
4. 用户列表会按 `selectedGroup.id` 做过滤
5. 右侧权限配置区从空状态切换为可编辑状态
6. 同时 `selectedPermissions` 会被直接重置为固定值：

```js
['dashboard', 'energy', 'device']
```

这说明当前权限数据并不是从用户组真实数据里读取，而是一个演示级占位逻辑。

#### 4.1.4 当前真实取数方式

- 来源：`userGroups` 本地 `ref`
- 用户组选择：本地状态 `selectedGroup`
- 权限值：`selectGroup()` 中本地赋值

#### 4.1.5 建议 API 接口

##### 接口 1：获取用户组列表

- 方法：`GET`
- 路径：`/api/user-management/groups`

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "系统管理员",
        "description": "拥有系统全部权限",
        "userCount": 3,
        "permission": "admin",
        "permissionText": "管理员"
      },
      {
        "id": 2,
        "name": "运维人员",
        "description": "设备运维与监控权限",
        "userCount": 8,
        "permission": "operator",
        "permissionText": "操作员"
      }
    ]
  }
}
```

### 4.2 模块二：用户列表与搜索

#### 4.2.1 元素组成

该模块位于中间，包含：

1. 动态标题
   - 若已选用户组：`用户组名 - 用户列表`
   - 否则：`用户列表`
2. 顶部操作区
   - 搜索输入框
   - 新增用户按钮
3. 用户表格
   - 用户名
   - 所属用户组
   - 创建时间
   - 最后登录
   - 状态
   - 操作
4. 操作按钮
   - 编辑
   - 重置密码

#### 4.2.2 当前前端数据结构

当前用户数据来自 `users`：

```json
[
  {
    "id": 1,
    "username": "admin",
    "groupId": 1,
    "groupName": "系统管理员",
    "createTime": "2024-01-15",
    "lastLogin": "2026-03-08 09:30:00",
    "status": "active"
  },
  {
    "id": 6,
    "username": "testuser",
    "groupId": 3,
    "groupName": "普通用户",
    "createTime": "2025-01-20",
    "lastLogin": "2026-02-28 16:00:00",
    "status": "disabled"
  }
]
```

字段语义如下：

- `id`：用户 ID
- `username`：用户名
- `groupId`：所属用户组 ID
- `groupName`：所属用户组名称
- `createTime`：创建时间
- `lastLogin`：最后登录时间
- `status`：状态，当前为 `active | disabled`

#### 4.2.3 交互逻辑

当前用户列表的真实数据来源是 `filteredUsers`，逻辑如下：

1. 默认展示全部用户
2. 若已选用户组，则按 `groupId === selectedGroup.id` 过滤
3. 若输入了 `userSearch`，则按用户名做模糊匹配
4. 所以筛选顺序为：
   - 先按用户组过滤
   - 再按用户名搜索
5. 点击“编辑”按钮时，执行 `editUser(user)`
6. 点击“重置密码”按钮时，执行 `resetPassword(user)`

需要额外注意：

- 当前搜索只支持 `username`
- 不支持按状态、用户组名称、最后登录时间搜索
- 当前列表没有排序能力

#### 4.2.4 当前真实取数方式

- 来源：`users` 本地 `ref`
- 列表结果：`filteredUsers`
- 当前无真实查询接口

#### 4.2.5 建议 API 接口

##### 接口 2：获取用户列表

- 方法：`GET`
- 路径：`/api/user-management/users`
- 参数：
  - `groupId`：用户组 ID，可选
  - `keyword`：用户名关键字，可选
  - `pageNum`
  - `pageSize`
  - `status`：状态，可选

请求示例：

```http
GET /api/user-management/users?groupId=2&keyword=zhang&pageNum=1&pageSize=10
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 2,
        "username": "zhangsan",
        "groupId": 2,
        "groupName": "运维人员",
        "createTime": "2024-02-20",
        "lastLogin": "2026-03-07 18:45:00",
        "status": "active"
      },
      {
        "id": 3,
        "username": "lisi",
        "groupId": 2,
        "groupName": "运维人员",
        "createTime": "2024-03-10",
        "lastLogin": "2026-03-08 08:20:00",
        "status": "active"
      }
    ],
    "pageNum": 1,
    "pageSize": 10,
    "total": 2
  }
}
```

### 4.3 模块三：用户分页

#### 4.3.1 元素组成

分页区位于用户表格底部，包含：

1. 总记录数展示
2. 上一页按钮
3. 当前页 / 总页数
4. 下一页按钮

#### 4.3.2 当前前端数据结构

当前分页相关状态如下：

```json
{
  "currentPage": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

其中：

- `currentPage`：当前页码
- `pageSize`：每页数量
- `totalPages`：由 `filteredUsers.length / pageSize` 向上取整

#### 4.3.3 交互逻辑

1. 点击上一页时，执行 `currentPage--`
2. 点击下一页时，执行 `currentPage++`
3. 边界页按钮自动禁用
4. 但当前表格渲染的仍然是 `filteredUsers`
5. 并没有类似 `paginatedUsers` 的分页切片结果

所以当前分页存在“UI 生效、数据未分页”的问题：

- 页码会变化
- 页数会计算
- 但表格数据不会跟着切换页码而变化

#### 4.3.4 当前真实取数方式

- 来源：`filteredUsers`
- 当前没有真正分页切片逻辑

#### 4.3.5 建议 API 接口

如果采用服务端分页，可直接复用“用户列表接口”，并返回：

```json
{
  "pageNum": 1,
  "pageSize": 10,
  "total": 26,
  "pages": 3
}
```

如果保留前端分页，则建议新增：

```js
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredUsers.value.slice(start, start + pageSize)
})
```

然后让表格改为渲染 `paginatedUsers`。

### 4.4 模块四：权限配置

#### 4.4.1 元素组成

该模块位于右侧，分为三组权限：

1. 页面访问权限
2. 操作权限
3. 数据权限

每组权限由多个复选框构成，并在底部有一个“保存权限配置”按钮。

若未选择用户组，则显示空状态提示。

#### 4.4.2 当前前端数据结构

当前权限项来源于 3 组本地常量：

```json
{
  "pagePermissions": [
    { "label": "系统仪表盘", "value": "dashboard" },
    { "label": "能耗分析", "value": "energy" },
    { "label": "可视化设备", "value": "device" }
  ],
  "operationPermissions": [
    { "label": "设备控制", "value": "device_control" },
    { "label": "参数配置", "value": "config" }
  ],
  "dataPermissions": [
    { "label": "全部园区", "value": "all_parks" },
    { "label": "指定建筑", "value": "buildings" }
  ],
  "selectedPermissions": ["dashboard", "energy", "device"]
}
```

#### 4.4.3 交互逻辑

1. 未选择用户组时，右侧显示空状态
2. 选择用户组后，显示权限配置内容
3. 权限复选框通过 `v-model="selectedPermissions"` 双向绑定
4. 点击保存按钮时，执行 `savePermissions()`
5. 当前保存动作只弹出“权限配置已保存”提示

当前实现中的关键特点：

- `selectedPermissions` 不是从每个组的真实权限字段读取
- 每次选择用户组时都会被写死为：
  - `dashboard`
  - `energy`
  - `device`
- 所以不同组并没有真实差异化权限配置

#### 4.4.4 当前真实取数方式

- 权限项来源：本地常量
- 当前选中权限：本地 `selectedPermissions`
- 保存动作：本地提示，不落库

#### 4.4.5 建议 API 接口

##### 接口 3：获取用户组权限详情

- 方法：`GET`
- 路径：`/api/user-management/group-permissions/{groupId}`

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "groupId": 2,
    "permissions": [
      "dashboard",
      "energy",
      "device",
      "maintenance",
      "alarm_handle",
      "buildings"
    ]
  }
}
```

##### 接口 4：保存用户组权限

- 方法：`POST`
- 路径：`/api/user-management/group-permissions/save`

请求 JSON 示例：

```json
{
  "groupId": 2,
  "permissions": [
    "dashboard",
    "energy",
    "device",
    "maintenance",
    "alarm_handle",
    "buildings"
  ]
}
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "保存成功"
}
```

### 4.5 模块五：新增用户组弹窗

#### 4.5.1 元素组成

该模块在点击“新增用户组”后出现，包含：

1. 用户组名称输入框
2. 描述输入框
3. 权限级别下拉框
4. 取消按钮
5. 确定按钮

#### 4.5.2 当前前端数据结构

表单数据来自 `newGroup`：

```json
{
  "name": "",
  "description": "",
  "permission": "viewer"
}
```

#### 4.5.3 交互逻辑

1. 点击左侧“新增用户组”按钮时，`showAddGroup = true`
2. 弹窗展示
3. 点击遮罩或关闭按钮时，关闭弹窗
4. 点击“确定”时，执行 `addGroup()`
5. `addGroup()` 校验逻辑非常轻量：
   - 只要求 `newGroup.name` 非空
6. 校验通过后：
   - 向 `userGroups` 追加新对象
   - 自动生成 `id`
   - 默认 `userCount = 0`
   - 根据 `permission` 生成 `permissionText`
   - 关闭弹窗
   - 清空名称和描述

#### 4.5.4 当前真实取数方式

- 来源：弹窗本地表单 `newGroup`
- 提交行为：前端本地追加数组

#### 4.5.5 建议 API 接口

##### 接口 5：新增用户组

- 方法：`POST`
- 路径：`/api/user-management/groups/create`

请求 JSON 示例：

```json
{
  "name": "生产管理人员",
  "description": "生产联动相关权限",
  "permission": "operator"
}
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": 5,
    "name": "生产管理人员",
    "description": "生产联动相关权限",
    "userCount": 0,
    "permission": "operator",
    "permissionText": "操作员"
  }
}
```

### 4.6 模块六：新增用户弹窗

#### 4.6.1 元素组成

该模块在点击“新增用户”后出现，包含：

1. 用户名输入框
2. 密码输入框
3. 确认密码输入框
4. 所属用户组下拉框
5. 取消按钮
6. 确定按钮

#### 4.6.2 当前前端数据结构

表单数据来自 `newUser`：

```json
{
  "username": "",
  "password": "",
  "confirmPassword": "",
  "groupId": 1
}
```

#### 4.6.3 交互逻辑

1. 点击“新增用户”按钮时，`showAddUser = true`
2. 点击“确定”时，执行 `addUser()`
3. 当前校验逻辑只有：
   - `username` 非空
   - `password` 非空
4. 当前**没有校验**：
   - 确认密码是否一致
   - 用户名是否重复
   - 密码强度
5. 提交成功后：
   - 根据 `groupId` 找到用户组
   - 向 `users` 追加新用户
   - `group.userCount++`
   - 默认状态为 `active`
   - `lastLogin = '-'`
   - 关闭弹窗
   - 清空用户名、密码、确认密码

#### 4.6.4 当前真实取数方式

- 来源：弹窗本地表单 `newUser`
- 提交行为：前端本地追加 `users`

#### 4.6.5 建议 API 接口

##### 接口 6：新增用户

- 方法：`POST`
- 路径：`/api/user-management/users/create`

请求 JSON 示例：

```json
{
  "username": "newoperator",
  "password": "123456",
  "confirmPassword": "123456",
  "groupId": 2
}
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": 7,
    "username": "newoperator",
    "groupId": 2,
    "groupName": "运维人员",
    "createTime": "2026-03-17",
    "lastLogin": "-",
    "status": "active"
  }
}
```

### 4.7 模块七：编辑用户弹窗

#### 4.7.1 元素组成

该模块在点击“编辑”后出现，包含：

1. 用户名输入框（禁用）
2. 所属用户组下拉框
3. 状态下拉框
4. 取消按钮
5. 保存按钮

#### 4.7.2 当前前端数据结构

编辑表单数据来自 `editUserData`：

```json
{
  "id": null,
  "username": "",
  "groupId": 1,
  "status": "active"
}
```

#### 4.7.3 交互逻辑

1. 点击某用户“编辑”按钮时，执行 `editUser(user)`
2. 当前用户数据被写入 `editUserData`
3. 弹窗打开
4. 点击“保存”时，执行 `saveUser()`
5. `saveUser()` 的逻辑如下：
   - 根据 `editUserData.id` 找到原用户
   - 找到旧用户组和新用户组
   - 若用户组发生变化：
     - 旧组 `userCount--`
     - 新组 `userCount++`
   - 更新用户的 `groupId`
   - 更新用户的 `groupName`
   - 更新用户的 `status`
   - 关闭弹窗

这个模块的本地逻辑其实已经比较完整，尤其是用户组人数统计联动做得不错。

#### 4.7.4 当前真实取数方式

- 来源：`editUserData` 本地表单
- 提交行为：前端本地修改 `users`
- 用户组人数变化：本地同步修正 `userGroups`

#### 4.7.5 建议 API 接口

##### 接口 7：更新用户信息

- 方法：`POST`
- 路径：`/api/user-management/users/update`

请求 JSON 示例：

```json
{
  "id": 3,
  "groupId": 4,
  "status": "disabled"
}
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "保存成功",
  "data": {
    "id": 3,
    "username": "lisi",
    "groupId": 4,
    "groupName": "生产管理人员",
    "status": "disabled"
  }
}
```

##### 接口 8：重置用户密码

- 方法：`POST`
- 路径：`/api/user-management/users/reset-password`

请求 JSON 示例：

```json
{
  "id": 3
}
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "密码重置成功",
  "data": {
    "id": 3,
    "temporaryPassword": "123456"
  }
}
```

## 5. 推荐接口整合方案

如果希望减少页面请求次数，建议增加聚合接口。

### 接口 9：获取用户管理页总览数据

- 方法：`GET`
- 路径：`/api/user-management/overview`
- 参数：
  - `groupId`：用户组 ID，可选
  - `keyword`：用户名关键字，可选
  - `pageNum`
  - `pageSize`

请求示例：

```http
GET /api/user-management/overview?groupId=2&keyword=zhang&pageNum=1&pageSize=10
```

返回 JSON 示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "groups": [
      {
        "id": 1,
        "name": "系统管理员",
        "description": "拥有系统全部权限",
        "userCount": 3,
        "permission": "admin",
        "permissionText": "管理员"
      },
      {
        "id": 2,
        "name": "运维人员",
        "description": "设备运维与监控权限",
        "userCount": 8,
        "permission": "operator",
        "permissionText": "操作员"
      }
    ],
    "selectedGroupPermissions": {
      "groupId": 2,
      "permissions": [
        "dashboard",
        "energy",
        "device",
        "maintenance",
        "alarm_handle",
        "buildings"
      ]
    },
    "userPage": {
      "list": [
        {
          "id": 2,
          "username": "zhangsan",
          "groupId": 2,
          "groupName": "运维人员",
          "createTime": "2024-02-20",
          "lastLogin": "2026-03-07 18:45:00",
          "status": "active"
        }
      ],
      "pageNum": 1,
      "pageSize": 10,
      "total": 2
    }
  }
}
```

## 6. 前后端联调建议

### 6.1 建议优先改造点

建议按下面顺序推进，会比较顺：

1. 先把用户列表改为真实接口驱动，并补齐真正分页
2. 把选中用户组后的权限明细改为接口查询
3. 把新增用户组、新增用户、编辑用户改为提交接口
4. 给重置密码接真实接口
5. 把权限保存改成真正持久化

### 6.2 推荐前端状态模型

```js
state = {
  selectedGroup: null,
  selectedPermissions: [],
  userSearch: '',
  currentPage: 1,
  pageSize: 10,
  groups: [],
  users: [],
  total: 0,
  showAddGroup: false,
  showAddUser: false,
  showEditUser: false,
  newGroup: {},
  newUser: {},
  editUserData: {}
}
```

### 6.3 推荐页面刷新逻辑

```js
watch([selectedGroup, userSearch, currentPage], () => {
  loadUserList()
})
```

如果担心搜索输入时请求过于频繁，可以对 `userSearch` 做防抖处理。

## 7. 页面现状评估

从实现完整度看，`UserManagement` 页面在这几个页面里属于“交互骨架比较完整”的类型：

- 有分组
- 有列表
- 有弹窗
- 有权限配置
- 有本地数据联动

尤其是以下两点是做得比较好的：

- 编辑用户时，同步维护了用户组人数
- 页面三栏职责划分很清晰

但也有几个明显的原型特征：

- 分页尚未真正生效
- 权限数据并非真实按组读取
- 新增用户没有确认密码校验
- 重置密码只是提示，不是真实流程
- 所有变更刷新后都会丢失

换句话说，这一页离“可联调版本”已经很近，主要差的是把本地状态改造成真实数据流。

## 8. 结论

当前 `UserManagement` 页面建议按以下接口模块落地：

1. 用户组列表接口
2. 用户列表接口
3. 用户组权限详情接口
4. 用户组权限保存接口
5. 新增用户组接口
6. 新增用户接口
7. 更新用户接口
8. 重置密码接口
9. 或一个总览聚合接口

如果你愿意，我们下一步可以继续往前走两种方向中的任意一种：

- 我继续帮你生成“UserManagement 接口字段说明表”
- 我直接把 `src/views/UserManagement.vue` 改造成真实 API 驱动版本

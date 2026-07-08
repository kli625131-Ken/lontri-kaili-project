<template>
  <div class="device-visualization-page">
    <div class="page-content">
      <DataCard title="空间层级导航" class="nav-card">
        <div class="tree-nav">
          <template v-for="project in mapTree" :key="project.id">
            <div class="tree-item level-1" :class="{ expanded: isTreeExpanded(project.id), collapsed: !isTreeExpanded(project.id) }">
              <div class="tree-node" @click="toggleTreeNode(project.id)">
                <span class="arrow">{{ isTreeExpanded(project.id) ? '▾' : '▸' }}</span>
                <span class="node-icon">{{ project.icon }}</span>
                <span class="node-text">{{ project.label }}</span>
              </div>
              <div v-show="isTreeExpanded(project.id)" class="tree-children">
                <template v-for="city in project.children" :key="city.id">
                  <div class="tree-item level-2" :class="{ expanded: isTreeExpanded(city.id), collapsed: !isTreeExpanded(city.id) }">
                    <div class="tree-node" @click="toggleTreeNode(city.id)">
                      <span class="arrow">{{ isTreeExpanded(city.id) ? '▾' : '▸' }}</span>
                      <span class="node-icon">{{ city.icon }}</span>
                      <span class="node-text">{{ city.label }}</span>
                    </div>
                    <div v-show="isTreeExpanded(city.id)" class="tree-children">
                      <template v-for="building in city.children" :key="building.id">
                        <div class="tree-item level-3" :class="{ expanded: isTreeExpanded(building.id), collapsed: !isTreeExpanded(building.id) }">
                          <div class="tree-node" @click="toggleTreeNode(building.id)">
                            <span class="arrow">{{ isTreeExpanded(building.id) ? '▾' : '▸' }}</span>
                            <span class="node-icon">{{ building.icon }}</span>
                            <span class="node-text">{{ building.label }}</span>
                          </div>
                          <div v-show="isTreeExpanded(building.id)" class="tree-children">
                            <template v-for="floor in building.children" :key="floor.id">
                              <div
                                v-if="floor.children"
                                class="tree-item level-4"
                                :class="{ expanded: isTreeExpanded(floor.id), collapsed: !isTreeExpanded(floor.id) }"
                              >
                                <div class="tree-node" @click="toggleTreeNode(floor.id)">
                                  <span class="arrow">{{ isTreeExpanded(floor.id) ? '▾' : '▸' }}</span>
                                  <span class="node-icon">{{ floor.icon }}</span>
                                  <span class="node-text">{{ floor.label }}</span>
                                </div>
                                <div v-show="isTreeExpanded(floor.id)" class="tree-children">
                                  <div
                                    v-for="leaf in floor.children"
                                    :key="leaf.id"
                                    class="tree-item level-5 clickable"
                                    :class="getMapNodeClass(leaf.mapId)"
                                    @click.stop="selectMap(leaf.mapId)"
                                  >
                                    <div class="tree-node">
                                      <span class="node-icon">{{ leaf.icon }}</span>
                                      <span class="node-text">{{ leaf.label }}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                v-else
                                class="tree-item level-4 clickable"
                                :class="getMapNodeClass(floor.mapId)"
                                @click.stop="selectMap(floor.mapId)"
                              >
                                <div class="tree-node">
                                  <span class="node-icon">{{ floor.icon }}</span>
                                  <span class="node-text">{{ floor.label }}</span>
                                </div>
                              </div>
                            </template>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>

        <div class="nav-summary">
          <div class="summary-chip">
            <span class="summary-label">CU</span>
            <strong>{{ cuDevices.length }}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">GW</span>
            <strong>{{ gwDevices.length }}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">区域</span>
            <strong>{{ regions.length }}</strong>
          </div>
        </div>
      </DataCard>

      <DataCard title="数字地图" class="map-card">
        <template #header-extra>
          <div class="map-toolbar">
            <MapModeSwitch :model-value="mapMode" @change="handleMapModeChange" />
            <div class="layer-switch">
              <button
                v-for="option in deviceLayerOptions"
                :key="option.value"
                class="toolbar-btn ghost layer-btn"
                :class="{ active: deviceLayerFilter === option.value }"
                @click="deviceLayerFilter = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <button v-if="isDebugAvailable" class="toolbar-btn ghost" :class="{ active: debugVisible }" @click="debugEnabled = !debugEnabled">
              Debug
            </button>
          </div>
        </template>

        <div class="map-shell">
          <div class="map-backdrop"></div>

          <svg
            ref="mapSvgRef"
            class="map-svg"
            :class="mapSvgClasses"
            :viewBox="viewBoxString"
            preserveAspectRatio="xMidYMid meet"
            @click="handleMapBlankClick"
            @mousedown.capture="handleMapMouseDownCapture"
            @mousedown="handleMapMouseDown"
            @wheel.prevent="handleWheel"
            @auxclick.prevent
            @contextmenu.prevent
          >
            <defs>
              <mask v-if="displayFocusedRegion" :id="focusMaskId" maskUnits="userSpaceOnUse">
                <rect
                  :x="originalViewBox.x"
                  :y="originalViewBox.y"
                  :width="originalViewBox.width"
                  :height="originalViewBox.height"
                  fill="white"
                />
                <rect
                  :x="displayFocusedRegionBounds.x - 4"
                  :y="displayFocusedRegionBounds.y - 4"
                  :width="displayFocusedRegionBounds.width + 8"
                  :height="displayFocusedRegionBounds.height + 8"
                  rx="6"
                  fill="black"
                />
              </mask>
            </defs>

            <rect
              class="map-base-bg"
              :x="originalViewBox.x"
              :y="originalViewBox.y"
              :width="originalViewBox.width"
              :height="originalViewBox.height"
            />
            <g ref="mapContentRef" class="map-floor-layer" :class="floorLayerClasses"></g>

            <g class="map-overlay">
              <g v-if="displayFocusedRegion" class="focus-mask-layer">
                <rect
                  class="focus-dim"
                  :x="originalViewBox.x"
                  :y="originalViewBox.y"
                  :width="originalViewBox.width"
                  :height="originalViewBox.height"
                  :mask="`url(#${focusMaskId})`"
                />
              </g>

              <g class="region-layer">
                <g
                  v-for="region in regions"
                  :key="region.id"
                  class="interactive-node"
                  @mousedown.stop="handleRegionMouseDown($event, region)"
                  @click.stop="handleRegionClick(region)"
                >
                  <rect
                    v-if="getRegionShapeType(region) === 'RECT'"
                    :x="getRegionGeometry(region).x"
                    :y="getRegionGeometry(region).y"
                    :width="getRegionGeometry(region).width"
                    :height="getRegionGeometry(region).height"
                    class="region-shape"
                    :class="{ active: displayFocusedRegion?.id === region.id, dimmed: displayFocusedRegion && displayFocusedRegion.id !== region.id }"
                    :style="getRegionStyle(region)"
                  />
                  <circle
                    v-else-if="getRegionShapeType(region) === 'CIRCLE'"
                    :cx="getRegionGeometry(region).cx"
                    :cy="getRegionGeometry(region).cy"
                    :r="getRegionGeometry(region).radius"
                    class="region-shape"
                    :class="{ active: displayFocusedRegion?.id === region.id, dimmed: displayFocusedRegion && displayFocusedRegion.id !== region.id }"
                    :style="getRegionStyle(region)"
                  />
                  <polygon
                    v-else
                    :points="pointsToString(region.points)"
                    class="region-shape"
                    :class="{ active: displayFocusedRegion?.id === region.id, dimmed: displayFocusedRegion && displayFocusedRegion.id !== region.id }"
                    :style="getRegionStyle(region)"
                  />
                  <g class="region-label-group">
                    <text
                      class="region-label"
                      :x="getRegionLabel(region).x"
                      :y="getRegionLabel(region).y - 4"
                      :font-size="getRegionCodeFontSize()"
                      :stroke-width="getRegionTextStrokeWidth()"
                    >
                      {{ getRegionDisplayCode(region) }}
                    </text>
                    <text
                      class="region-badge"
                      :x="getRegionLabel(region).x"
                      :y="getRegionLabel(region).y + 8"
                      :font-size="getRegionBadgeFontSize()"
                      :stroke-width="getRegionTextStrokeWidth()"
                    >
                      {{ region.memberIds.length }}台
                    </text>
                  </g>
                  <g v-if="isConfigMode && activeEditTool === 'edit-region'" class="region-edit-handles">
                    <circle
                      v-for="handle in getRegionHandles(region)"
                      :key="`${region.id}-${handle.key}`"
                      class="region-edit-handle"
                      :cx="handle.x"
                      :cy="handle.y"
                      r="4"
                      @mousedown.stop="handleRegionHandleMouseDown($event, region, handle)"
                    />
                  </g>
                </g>
              </g>

              <g class="device-layer">
                <g
                  v-for="device in visibleGwDevices"
                  :key="device.id"
                  class="interactive-node"
                  :class="{ dimmed: displayFocusedRegion && !isDeviceInFocusedRegion(device) }"
                  @mouseenter="hoveredDeviceId = device.id"
                  @mouseleave="hoveredDeviceId = ''"
                  @mousedown.stop="handleDeviceMouseDown($event, device)"
                  @click.stop="openDrawer('gw', device)"
                >
                  <rect
                    class="device-hit-area"
                    :x="device.x - getDeviceHitSize(device) / 2"
                    :y="device.y - getDeviceHitSize(device) / 2"
                    :width="getDeviceHitSize(device)"
                    :height="getDeviceHitSize(device)"
                  />
                  <image
                    class="device-icon"
                    :class="{ offline: !device.online, active: isActiveDevice('gw', device) }"
                    :data-device-type="device.type"
                    :href="getDeviceIconUrl(device)"
                    :x="device.x - getDeviceIconSize(device) / 2"
                    :y="device.y - getDeviceIconSize(device) / 2"
                    :width="getDeviceIconSize(device)"
                    :height="getDeviceIconSize(device)"
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <rect
                    v-if="isActiveDevice('gw', device)"
                    class="device-icon-outline"
                    :x="device.x - getDeviceIconSize(device) / 2"
                    :y="device.y - getDeviceIconSize(device) / 2"
                    :width="getDeviceIconSize(device)"
                    :height="getDeviceIconSize(device)"
                    rx="3"
                  />
                  <text
                    v-if="shouldShowDeviceCode(device)"
                    class="device-code"
                    :x="getDeviceCodeLabel(device).x"
                    :y="getDeviceCodeLabel(device).y"
                    :font-size="getDeviceCodeLabel(device).fontSize"
                    :stroke-width="getDeviceCodeLabel(device).strokeWidth"
                  >
                    {{ getDeviceCodeLabel(device).text }}
                  </text>
                </g>

                <g
                  v-for="device in visibleCuDevices"
                  :key="device.id"
                  class="interactive-node"
                  :class="{ dimmed: displayFocusedRegion && !isDeviceInFocusedRegion(device) }"
                  @mouseenter="hoveredDeviceId = device.id"
                  @mouseleave="hoveredDeviceId = ''"
                  @mousedown.stop="handleDeviceMouseDown($event, device)"
                  @click.stop="openDrawer('cu', device)"
                >
                  <rect
                    class="device-hit-area"
                    :x="device.x - getDeviceHitSize(device) / 2"
                    :y="device.y - getDeviceHitSize(device) / 2"
                    :width="getDeviceHitSize(device)"
                    :height="getDeviceHitSize(device)"
                  />
                  <image
                    class="device-icon"
                    :class="{ offline: !device.online, active: isActiveDevice('cu', device) }"
                    :data-device-type="device.type"
                    :href="getDeviceIconUrl(device)"
                    :x="device.x - getDeviceIconSize(device) / 2"
                    :y="device.y - getDeviceIconSize(device) / 2"
                    :width="getDeviceIconSize(device)"
                    :height="getDeviceIconSize(device)"
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <rect
                    v-if="isActiveDevice('cu', device)"
                    class="device-icon-outline"
                    :x="device.x - getDeviceIconSize(device) / 2"
                    :y="device.y - getDeviceIconSize(device) / 2"
                    :width="getDeviceIconSize(device)"
                    :height="getDeviceIconSize(device)"
                    rx="3"
                  />
                  <text
                    v-if="shouldShowDeviceCode(device)"
                    class="device-code"
                    :x="getDeviceCodeLabel(device).x"
                    :y="getDeviceCodeLabel(device).y"
                    :font-size="getDeviceCodeLabel(device).fontSize"
                    :stroke-width="getDeviceCodeLabel(device).strokeWidth"
                  >
                    {{ getDeviceCodeLabel(device).text }}
                  </text>
                </g>
              </g>

              <g v-if="debugVisible">
                <g v-for="candidate in debugRegionCandidates" :key="`debug-region-${candidate.id}`" class="debug-region-layer">
                  <rect
                    class="debug-region-box"
                    :x="candidate.sourceBBox.minX"
                    :y="candidate.sourceBBox.minY"
                    :width="candidate.sourceBBox.width"
                    :height="candidate.sourceBBox.height"
                  />
                </g>
                <g v-for="candidate in debugUnmappedDeviceCandidates" :key="`debug-device-${candidate.id}`" class="debug-device-layer">
                  <circle class="debug-device-point" :cx="candidate.x" :cy="candidate.y" r="6" />
                  <text class="debug-device-label" :x="candidate.x + 8" :y="candidate.y - 8">{{ candidate.id }}</text>
                </g>
              </g>

              <g v-if="isConfigMode && drawingShape">
                <rect
                  v-if="drawingShape.shapeType === 'RECT'"
                  class="drawing-preview"
                  :x="drawingShape.geometry.x"
                  :y="drawingShape.geometry.y"
                  :width="drawingShape.geometry.width"
                  :height="drawingShape.geometry.height"
                />
                <circle
                  v-else-if="drawingShape.shapeType === 'CIRCLE'"
                  class="drawing-preview"
                  :cx="drawingShape.geometry.cx"
                  :cy="drawingShape.geometry.cy"
                  :r="drawingShape.geometry.radius"
                />
              </g>

              <g v-if="isConfigMode && drawMode">
                <polygon
                  v-if="drawingPoints.length >= 2"
                  :points="drawPreviewPolygon"
                  class="drawing-preview"
                />
                <polyline
                  v-if="drawingPoints.length"
                  :points="drawPreviewLine"
                  class="drawing-line"
                />
                <circle
                  v-for="(point, index) in drawingPoints"
                  :key="`draft-${index}`"
                  class="drawing-point"
                  :cx="point.x"
                  :cy="point.y"
                  r="5"
                />
                <circle
                  v-if="drawingPoints.length"
                  class="drawing-start"
                  :cx="drawingPoints[0].x"
                  :cy="drawingPoints[0].y"
                  r="8"
                />
                <rect
                  class="draw-capture"
                  :x="originalViewBox.x"
                  :y="originalViewBox.y"
                  :width="originalViewBox.width"
                  :height="originalViewBox.height"
                  @click.stop="handleDrawClick"
                  @dblclick.prevent.stop="finishDrawing"
                  @mousemove="handleDrawMove"
                  @mouseleave="hoverPoint = null"
                  @contextmenu.prevent.stop="finishDrawing"
                />
              </g>
            </g>
          </svg>

          <div class="map-tools-panel">
            <div class="map-minimap">
              <svg
                ref="miniMapSvgRef"
                class="minimap-svg"
                :viewBox="originalViewBoxString"
                preserveAspectRatio="xMidYMid meet"
                @click.stop="handleMiniMapClick"
              >
                <rect
                  class="minimap-bg"
                  :x="originalViewBox.x"
                  :y="originalViewBox.y"
                  :width="originalViewBox.width"
                  :height="originalViewBox.height"
                />
                <g ref="miniMapContentRef" class="minimap-floor-layer"></g>
                <g class="minimap-region-layer">
                  <polygon
                    v-for="region in regions"
                    :key="`mini-region-${region.id}`"
                    :points="pointsToString(region.points)"
                    class="minimap-region"
                    :class="{ active: focusedRegion?.id === region.id }"
                    :style="getRegionStyle(region)"
                  />
                </g>
                <g class="minimap-device-layer">
                  <circle
                    v-for="device in miniMapDevices"
                    :key="`mini-device-${device.id}`"
                    class="minimap-device"
                    :cx="device.x"
                    :cy="device.y"
                    r="1.3"
                  />
                </g>
                <rect
                  class="minimap-viewbox"
                  :x="currentViewBox.x"
                  :y="currentViewBox.y"
                  :width="currentViewBox.width"
                  :height="currentViewBox.height"
                />
              </svg>
            </div>

            <MapEditToolbar
              v-if="isConfigMode"
              :active-tool="activeEditTool"
              :expanded="configToolbarExpanded"
              :active-group="configToolbarGroup"
              :device-draft="deviceDraft"
              :gateway-options="gatewayOptions"
              @tool-change="setEditTool"
              @device-draft-change="deviceDraft = $event"
              @save-draft="handleSaveLocalDraft"
              @validate="handleValidateDraft"
              @update:expanded="configToolbarExpanded = $event"
              @update:active-group="configToolbarGroup = $event"
            />
          </div>

          <div v-if="operationStatusVisible" class="map-operation-bar">
            <span class="operation-title">{{ operationStatusTitle }}</span>
            <button class="operation-btn" @click="handleOperationUndo">撤销</button>
            <button class="operation-btn primary" :disabled="!operationPrimaryEnabled" @click="handleOperationPrimary">
              {{ operationPrimaryLabel }}
            </button>
            <button class="operation-btn danger" @click="handleOperationCancel">取消</button>
          </div>

          <div class="map-control-dock">
            <div class="dock-zoom">
              <button class="dock-icon-btn" @click="zoomOut">-</button>
              <span class="dock-label">缩放 {{ zoomPercent }}%</span>
              <button class="dock-icon-btn" @click="zoomIn">+</button>
            </div>
            <button class="dock-action-btn" @click="resetView">重置视图</button>
            <button class="dock-action-btn" @click="fitFullMap">全图</button>
            <span v-if="drawerMessage" class="status-feedback">{{ drawerMessage }}</span>
          </div>

          <div v-if="mapError" class="map-error">{{ mapError }}</div>

          <div v-if="isConfigMode" class="map-shortcut-hint">
            Ctrl+Z 撤销　Esc 取消　中键拖动平移
          </div>

          <div v-if="debugVisible && recognitionDebug" class="debug-panel">
            <div class="debug-title">SVG Debug</div>
            <div v-if="debugStats" class="debug-stats">
              <span>Yellow {{ debugStats.yellowPathCount }}</span>
              <span>Regions {{ debugStats.acceptedRegionCount }}</span>
              <span>Cyan {{ debugStats.cyanClusterCount }}</span>
              <span>CU {{ debugStats.mappedCuCount }}</span>
              <span>GW {{ debugStats.mappedGwCount }}</span>
            </div>
            <div class="debug-copy">Unmapped candidates: {{ debugUnmappedDeviceCandidates.length }}</div>
            <div v-if="recognitionDebug.warnings.length" class="debug-copy">
              Warnings: {{ recognitionDebug.warnings.length }}
            </div>
          </div>

          <transition name="drawer-slide">
            <MapConfigDrawer
              v-if="configDrawerVisible"
              :target="configDrawerTarget"
              :target-type="configDrawerTargetType"
              :devices="cuDevices"
              :draft-state="draftState"
              :validation-messages="validationMessages"
              :initial-tab="configDrawerTab"
              @close="closeConfigDrawer"
              @create-area-group="handleCreateAreaGroup"
              @bind-area-group="handleBindAreaGroup"
              @skip-area-group="markDraftAction('已暂不配置区域组')"
              @create-default-scenes="handleCreateDefaultScenes"
              @bind-scene="markDraftAction('已绑定已有场景到本地草稿')"
              @create-custom-scene="handleCreateCustomScene"
              @skip-scene="markDraftAction('已暂不配置场景')"
              @use-param-template="handleUseParamTemplate"
              @copy-param="markDraftAction('已复制其他区域参数到本地草稿')"
              @custom-param="handleCustomParam"
              @skip-param="markDraftAction('已暂不配置 CU 参数')"
              @validate="handleValidateDraft"
            />
            <aside v-else-if="activeDrawer" class="control-drawer" :class="`drawer-${activeDrawer.type}`">
              <div class="drawer-head">
                <div class="drawer-ident">
                  <div class="drawer-icon">{{ drawerIcon }}</div>
                  <div class="drawer-title-box">
                    <h3 class="drawer-title">{{ drawerTitle }}</h3>
                    <p class="drawer-subtitle">{{ drawerSubtitle }}</p>
                  </div>
                </div>

                <div class="drawer-actions">
                  <span class="online-badge" :class="{ offline: !drawerOnline }">
                    <i></i>
                    {{ drawerOnline ? '在线' : '离线' }}
                  </span>
                  <button class="drawer-close" @click="closeDrawer">×</button>
                </div>
              </div>

              <div class="drawer-body">
                <template v-if="selectedCu">
                  <section class="drawer-section">
                    <div class="section-head">
                      <span>运行控制</span>
                      <span class="section-tag">控制</span>
                    </div>
                    <div class="button-grid two">
                      <button class="action-btn" :class="{ active: selectedCu.power }" @click="selectedCu.power = true">
                        开启
                      </button>
                      <button class="action-btn" :class="{ active: !selectedCu.power }" @click="selectedCu.power = false">
                        关闭
                      </button>
                    </div>
                    <p class="section-desc">当前状态依据设备真实状态默认选中，手动切换后即时生效。</p>
                  </section>

                  <section class="drawer-section">
                    <div class="section-head">
                      <span>控制模式</span>
                    </div>
                    <div class="button-grid two">
                      <button
                        class="action-btn"
                        :class="{ active: selectedCu.mode === 'manual' }"
                        @click="selectedCu.mode = 'manual'"
                      >
                        手动
                      </button>
                      <button
                        class="action-btn"
                        :class="{ active: selectedCu.mode === 'auto' }"
                        @click="selectedCu.mode = 'auto'"
                      >
                        自动感应
                      </button>
                    </div>
                    <p class="section-desc">手动模式下忽略无人感策略，达到持续时长后恢复自动模式。</p>
                  </section>

                  <section class="drawer-section">
                    <div class="section-head">
                      <span>亮度设置</span>
                      <span class="section-tag">0 - 100%</span>
                    </div>
                    <div class="metric-grid">
                      <div class="metric-card">
                        <span class="metric-label">开机亮度</span>
                        <label class="metric-input-wrap">
                          <input
                            v-model.number="selectedCu.brightness"
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            class="metric-input"
                          />
                          <span>%</span>
                        </label>
                      </div>
                      <div class="metric-card">
                        <span class="metric-label">背景亮度</span>
                        <label class="metric-input-wrap">
                          <input
                            v-model.number="selectedCu.bgBrightness"
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            class="metric-input"
                          />
                          <span>%</span>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section class="drawer-section">
                    <div class="section-head">
                      <span>无人感配置策略</span>
                      <span class="section-tag">单位：秒</span>
                    </div>
                    <div class="time-stack">
                      <label class="time-card">
                        <span class="time-title">进入背景亮度时间</span>
                        <span class="time-copy">无人感后，降低到“背景亮度”所需时间</span>
                        <input v-model="selectedCu.bgTime" type="number" min="0" class="time-input" />
                      </label>
                      <label class="time-card">
                        <span class="time-title">进入关灯时间</span>
                        <span class="time-copy">无人感后，彻底关闭灯所需时间</span>
                        <input v-model="selectedCu.offTime" type="number" min="0" class="time-input" />
                      </label>
                      <label class="time-card">
                        <span class="time-title">手动模式持续时间</span>
                        <span class="time-copy">手动模式下无人感保持时长，到期恢复自动</span>
                        <input v-model="selectedCu.manualTime" type="number" min="0" class="time-input" />
                      </label>
                    </div>
                    <p class="section-desc dim">
                      提示：自动感应模式下策略生效；手动模式下会参考持续时长配置。
                    </p>
                  </section>

                  <section class="drawer-section">
                    <div class="section-head">
                      <span>设备状态</span>
                      <span class="section-tag">只读</span>
                    </div>
                    <div class="status-card">
                      <div class="status-row">
                        <span>固件版本</span>
                        <strong>{{ selectedCu.firmware }}</strong>
                      </div>
                      <div class="status-row">
                        <span>最新查询时间</span>
                        <strong>{{ selectedCu.updatedAt }}</strong>
                      </div>
                    </div>
                  </section>

                  <button class="footer-btn" @click="commitDrawerMessage(`已更新 ${selectedCu.shortName} 参数配置`)">
                    修改参数配置
                  </button>
                </template>

                <template v-else-if="selectedGw">
                  <section class="drawer-section">
                    <div class="section-head">
                      <span>场景控制</span>
                      <span class="section-tag">网关控制</span>
                    </div>
                    <div class="button-grid two">
                      <button class="action-btn" :class="{ active: selectedGw.power }" @click="selectedGw.power = true">
                        开启
                      </button>
                      <button class="action-btn" :class="{ active: !selectedGw.power }" @click="selectedGw.power = false">
                        关闭
                      </button>
                    </div>
                    <p class="section-desc">
                      云端网关控制模式：忽略无人感策略，按手动持续时间到期后恢复自动模式。
                    </p>
                  </section>

                  <section class="drawer-section">
                    <div class="section-head">
                      <span>设备状态</span>
                      <span class="section-tag">只读</span>
                    </div>
                    <div class="status-card">
                      <div class="status-row">
                        <span>固件版本</span>
                        <strong>{{ selectedGw.firmware }}</strong>
                      </div>
                      <div class="status-row">
                        <span>最新查询时间</span>
                        <strong>{{ selectedGw.updatedAt }}</strong>
                      </div>
                    </div>
                  </section>
                </template>

                <template v-else-if="selectedArea">
                  <section class="drawer-section">
                    <div class="section-head">
                      <span>场景控制</span>
                      <span class="section-tag">场景控制</span>
                    </div>
                    <div class="button-grid two by-two">
                      <button
                        v-for="mode in areaModes"
                        :key="mode.value"
                        class="action-btn icon-btn"
                        :class="{ active: selectedArea.sceneMode === mode.value }"
                        @click="selectedArea.sceneMode = mode.value"
                      >
                        {{ mode.label }}
                      </button>
                    </div>
                    <p class="section-desc">
                      云端场景模式下忽略无人感策略，按手动持续时间到期后恢复自动模式。
                    </p>
                  </section>

                  <section class="drawer-section">
                    <div class="section-head">
                      <span>场景配方参数</span>
                      <span class="section-tag">只读</span>
                    </div>
                    <div class="scene-tabs">
                      <button
                        v-for="mode in areaModes"
                        :key="`tab-${mode.value}`"
                        class="scene-tab"
                        :class="{ active: selectedArea.sceneMode === mode.value }"
                        @click="selectedArea.sceneMode = mode.value"
                      >
                        {{ mode.label }}
                      </button>
                    </div>

                    <div class="table-card">
                      <div class="table-head">
                        <span>设备名称</span>
                        <span>亮度</span>
                        <span>色温</span>
                      </div>
                      <div v-if="selectedAreaRows.length" class="table-body">
                        <div v-for="row in selectedAreaRows" :key="`${selectedArea.id}-${row.deviceId}`" class="table-row">
                          <span>{{ row.deviceId }}</span>
                          <span>{{ row.brightness }}</span>
                          <span>{{ row.colorTemp }}</span>
                        </div>
                      </div>
                      <div v-else class="table-empty">当前区域内暂无关联 CU 设备</div>
                    </div>

                    <p class="section-desc dim">
                      提示：当前底图界面可只读预览；后续提交配置参数后，由相关人员下发配置。
                    </p>
                  </section>
                </template>
              </div>
            </aside>
          </transition>
        </div>
      </DataCard>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DataCard from '../components/DataCard.vue'
import MapConfigDrawer from '../components/deviceMap/MapConfigDrawer.vue'
import MapEditToolbar from '../components/deviceMap/MapEditToolbar.vue'
import MapModeSwitch from '../components/deviceMap/MapModeSwitch.vue'
import cuIconUrl from '../assets/images/devices/CU.png'
import gwIconUrl from '../assets/images/devices/GW.png'
import {
  DEFAULT_DEVICE_VISUALIZATION_MAP_ID,
  DEVICE_VISUALIZATION_MAPS,
  DEVICE_VISUALIZATION_MAP_TREE
} from '../config/deviceVisualizationMaps'
import {
  collectDevicesInShape,
  geometryToCadGeometry,
  moveGeometry,
  normalizeRegionShape,
  resizeRectFromHandle,
  shapeToPoints
} from '../utils/deviceMapGeometry'
import {
  createDraftFromOverlay,
  createInitialDraftState,
  loadLocalDraft,
  removeDeviceFromDraft,
  saveLocalDraft,
  upsertAreaGroup,
  validateAreaGroupGateway,
  validateDraftState
} from '../services/deviceMapLocalService'

const mapSvgRef = ref(null)
const mapContentRef = ref(null)
const miniMapSvgRef = ref(null)
const miniMapContentRef = ref(null)
const mapMarkup = ref('')
const mapError = ref('')
const mapMeta = ref(null)

const originalViewBox = ref({ x: 0, y: 0, width: 800, height: 600 })
const currentViewBox = ref({ x: 0, y: 0, width: 800, height: 600 })

const drawMode = ref(false)
const drawingPoints = ref([])
const hoverPoint = ref(null)
const activeDrawer = ref(null)
const drawerMessage = ref('')
const recognitionDebug = ref(null)
const debugEnabled = ref(false)
const deviceLayerFilter = ref('all')
const focusedRegionId = ref('')
const selectedMapId = ref(DEFAULT_DEVICE_VISUALIZATION_MAP_ID)
const isMiddlePanning = ref(false)
const hoveredDeviceId = ref('')
const mapViewportSize = ref({ width: 1200, height: 700 })
const expandedTreeIds = ref(new Set(getInitialExpandedTreeIds(DEVICE_VISUALIZATION_MAP_TREE)))
const mapMode = ref('default')
const activeEditTool = ref('select')
const configToolbarExpanded = ref(false)
const configToolbarGroup = ref('region')
const draftState = ref(createInitialDraftState(DEFAULT_DEVICE_VISUALIZATION_MAP_ID))
const configDrawerTarget = ref(null)
const configDrawerTargetType = ref('')
const configDrawerTab = ref('base')
const validationMessages = ref([])
const drawingShape = ref(null)
const editDragState = ref(null)
const editHistory = ref([])
const deviceDraft = ref({
  type: 'cu',
  gatewayId: '',
  deviceNo: ''
})

const cuDevices = ref([])
const gwDevices = ref([])
const regions = ref([])
const isDebugAvailable = import.meta.env.DEV
const mapTree = DEVICE_VISUALIZATION_MAP_TREE

const areaModes = [
  { label: '开启', value: 'on' },
  { label: '关闭', value: 'off' },
  { label: '会议模式', value: 'meeting' },
  { label: '讨论模式', value: 'discussion' }
]

const REGION_FOCUS_PADDING_RATIO = 0.1
const REGION_FOCUS_ANIMATION_MS = 240
const REGION_GLOW_DISABLE_ZOOM = 2.6
const MAX_ZOOM = 15
const EDIT_HISTORY_LIMIT = 30
const focusMaskId = 'floor1-region-focus-mask'
const REGION_COLORS = ['#9b6df0', '#5b8fe8', '#72b982', '#f0ad48', '#58bfd1', '#e86b6b']

let drawerMessageTimer = null
let viewBoxAnimationFrame = null
let viewBoxAnimationToken = 0
let middlePanState = null
let mapResizeObserver = null

const viewBoxString = computed(() => {
  const { x, y, width, height } = currentViewBox.value
  return `${x} ${y} ${width} ${height}`
})

const originalViewBoxString = computed(() => {
  const { x, y, width, height } = originalViewBox.value
  return `${x} ${y} ${width} ${height}`
})

const zoomLevel = computed(() => {
  const scale = originalViewBox.value.width / currentViewBox.value.width
  return Number(scale.toFixed(2))
})

const zoomPercent = computed(() => Math.round(((zoomLevel.value - 1) / (MAX_ZOOM - 1)) * 100))
const isConfigMode = computed(() => mapMode.value === 'config')
const isDrawingTool = computed(() => ['draw-rect', 'draw-circle', 'draw-polygon'].includes(activeEditTool.value))
const isRegionOperationTool = computed(() => isDrawingTool.value || activeEditTool.value === 'edit-region')
const operationStatusVisible = computed(() => isConfigMode.value && isRegionOperationTool.value)
const operationStatusTitle = computed(() => {
  if (activeEditTool.value === 'draw-rect') return '新建矩形区域'
  if (activeEditTool.value === 'draw-circle') return '新建圆形区域'
  if (activeEditTool.value === 'draw-polygon') return '新建多边形区域'
  return '区域编辑'
})
const operationPrimaryLabel = computed(() => (activeEditTool.value === 'edit-region' ? '保存' : '完成'))
const operationPrimaryEnabled = computed(() => {
  if (activeEditTool.value === 'draw-polygon') return drawingPoints.value.length >= 3
  if (activeEditTool.value === 'draw-rect' || activeEditTool.value === 'draw-circle') return !!drawingShape.value
  return true
})
const gatewayOptions = computed(() => {
  const gateways = new Map()
  gwDevices.value.forEach((device) => {
    gateways.set(device.gatewayId || device.id, device.shortName || device.name || device.id)
  })
  cuDevices.value.forEach((device) => {
    if (device.gatewayId) gateways.set(device.gatewayId, device.gatewayId)
  })
  return Array.from(gateways.entries()).map(([value, label]) => ({ value, label }))
})
const configDrawerVisible = computed(() => isConfigMode.value && !!configDrawerTarget.value)

const mapSvgClasses = computed(() => ({
  'is-zoomed': zoomLevel.value > 1.4,
  'is-high-zoom': zoomLevel.value >= REGION_GLOW_DISABLE_ZOOM,
  'is-middle-panning': isMiddlePanning.value
}))

const floorLayerClasses = computed(() => ({
  crisp: zoomLevel.value > 1.4,
  detail: zoomLevel.value >= 2.1
}))

const selectedCu = computed(() => (activeDrawer.value?.type === 'cu' ? activeDrawer.value.entity : null))
const selectedGw = computed(() => (activeDrawer.value?.type === 'gw' ? activeDrawer.value.entity : null))
const selectedArea = computed(() => (activeDrawer.value?.type === 'area' ? activeDrawer.value.entity : null))
const focusedRegion = computed(() => regions.value.find((region) => region.id === focusedRegionId.value) || null)
const focusedRegionBounds = computed(() => {
  if (!focusedRegion.value) return { x: 0, y: 0, width: 0, height: 0 }
  const bbox = getPointsBBox(focusedRegion.value.points)
  return { x: bbox.minX, y: bbox.minY, width: bbox.width, height: bbox.height }
})
const displayFocusedRegion = computed(() => (isConfigMode.value ? null : focusedRegion.value))
const displayFocusedRegionBounds = computed(() => {
  if (!displayFocusedRegion.value) return { x: 0, y: 0, width: 0, height: 0 }
  const bbox = getPointsBBox(displayFocusedRegion.value.points)
  return { x: bbox.minX, y: bbox.minY, width: bbox.width, height: bbox.height }
})

const drawerTitle = computed(() => {
  if (selectedCu.value) return '控制面板-CU'
  if (selectedGw.value) return '控制面板-网关'
  if (selectedArea.value) return '控制面板-区域'
  return ''
})

const drawerSubtitle = computed(() => {
  if (selectedArea.value) return selectedArea.value.name
  return activeDrawer.value?.entity?.id ?? ''
})

const drawerIcon = computed(() => {
  if (selectedCu.value) return 'CU'
  if (selectedGw.value) return 'GW'
  if (selectedArea.value) return 'AR'
  return ''
})

const drawerOnline = computed(() => activeDrawer.value?.entity?.online ?? false)

const selectedAreaRows = computed(() => {
  if (!selectedArea.value) return []
  return selectedArea.value.sceneConfigs?.[selectedArea.value.sceneMode] ?? []
})

const drawPreviewLine = computed(() => {
  const points = hoverPoint.value ? [...drawingPoints.value, hoverPoint.value] : [...drawingPoints.value]
  return pointsToString(points)
})

const drawPreviewPolygon = computed(() => {
  const points = [...drawingPoints.value]
  if (hoverPoint.value) points.push(hoverPoint.value)
  if (drawingPoints.value.length) points.push(drawingPoints.value[0])
  return pointsToString(points)
})

const deviceLayerOptions = [
  { label: '全选', value: 'all' },
  { label: 'CU', value: 'cu' },
  { label: '网关', value: 'gw' }
]

const visibleCuDevices = computed(() => (deviceLayerFilter.value === 'gw' ? [] : cuDevices.value))
const visibleGwDevices = computed(() => (deviceLayerFilter.value === 'cu' ? [] : gwDevices.value))
const miniMapDevices = computed(() => [...visibleCuDevices.value, ...visibleGwDevices.value])
const focusedCodeDevices = computed(() => {
  if (!focusedRegion.value) return []
  return [...visibleGwDevices.value, ...visibleCuDevices.value].filter((device) => isDeviceInFocusedRegion(device))
})
const deviceCodeLabelMap = computed(() => buildDeviceCodeLabelMap())
const isDenseDeviceMap = computed(() => cuDevices.value.length + gwDevices.value.length > 80)
const showDeviceLabels = computed(() => !isDenseDeviceMap.value || zoomLevel.value >= 2.4)
const debugVisible = computed(() => isDebugAvailable && debugEnabled.value && !!recognitionDebug.value)
const debugRegionCandidates = computed(() => recognitionDebug.value?.regionCandidates ?? [])
const debugUnmappedDeviceCandidates = computed(() => recognitionDebug.value?.unmappedDeviceCandidates ?? [])
const debugStats = computed(() => recognitionDebug.value?.stats ?? null)

watch(
  [mapMarkup, mapContentRef, miniMapContentRef],
  ([markup, mainElement, miniElement]) => {
    if (mainElement) mainElement.innerHTML = markup || ''
    if (miniElement) miniElement.innerHTML = markup || ''
  },
  { immediate: true, flush: 'post' }
)

onMounted(async () => {
  window.addEventListener('keydown', handleMapKeydown)
  window.addEventListener('resize', updateMapViewportSize)
  updateMapViewportSize()
  if (window.ResizeObserver && mapSvgRef.value) {
    mapResizeObserver = new ResizeObserver(updateMapViewportSize)
    mapResizeObserver.observe(mapSvgRef.value)
  }
  await loadFloorMap()
})

onBeforeUnmount(() => {
  if (drawerMessageTimer) window.clearTimeout(drawerMessageTimer)
  stopViewBoxAnimation()
  stopMiddlePan()
  stopEditDragListeners()
  stopShapeDrawingListeners()
  if (mapResizeObserver) mapResizeObserver.disconnect()
  window.removeEventListener('keydown', handleMapKeydown)
  window.removeEventListener('resize', updateMapViewportSize)
})

async function selectMap(mapId) {
  const config = DEVICE_VISUALIZATION_MAPS[mapId]
  if (!config) return
  if (config.available === false) {
    mapError.value = config.errorMessage
    commitDrawerMessage(config.errorMessage)
    return
  }
  if (selectedMapId.value === mapId) return

  resetMapInteractionState()
  selectedMapId.value = mapId
  await loadFloorMap(config)
}

function getMapNodeClass(mapId) {
  const config = DEVICE_VISUALIZATION_MAPS[mapId]
  return {
    active: selectedMapId.value === mapId,
    disabled: config?.available === false
  }
}

function isTreeExpanded(nodeId) {
  return expandedTreeIds.value.has(nodeId)
}

function toggleTreeNode(nodeId) {
  const nextExpanded = new Set(expandedTreeIds.value)
  if (nextExpanded.has(nodeId)) {
    nextExpanded.delete(nodeId)
  } else {
    nextExpanded.add(nodeId)
  }
  expandedTreeIds.value = nextExpanded
}

function getInitialExpandedTreeIds(nodes) {
  return nodes.reduce((result, node) => {
    if (node.children?.length) {
      result.push(node.id, ...getInitialExpandedTreeIds(node.children))
    }
    return result
  }, [])
}

function handleMapModeChange(mode) {
  if (mode === mapMode.value) return
  if (mode === 'config') {
    const confirmed = window.confirm('进入配置调试模式后可新增、移动、删除设备和区域。本阶段仅保存前端本地草稿，确认进入？')
    if (!confirmed) return
  }

  mapMode.value = mode
  if (editDragState.value) {
    cancelActiveEditDrag('已取消编辑')
  } else {
    stopEditDragListeners()
  }
  stopShapeDrawingListeners()
  activeEditTool.value = 'select'
  clearDraft()
  drawingShape.value = null
  editDragState.value = null
  if (mode === 'config') {
    focusedRegionId.value = ''
  }
  if (mode === 'default') {
    closeConfigToolbarPanel()
  }
  closeConfigDrawer()
  if (mode === 'default') {
    drawMode.value = false
  }
}

function setEditTool(tool) {
  if (editDragState.value) {
    cancelActiveEditDrag('已取消编辑')
  } else {
    stopEditDragListeners()
  }
  stopShapeDrawingListeners()
  activeEditTool.value = tool
  syncConfigToolbarGroup(tool)
  clearDraft()
  drawingShape.value = null
  editDragState.value = null
  drawMode.value = tool === 'draw-polygon'

  if (tool === 'validate') {
    handleValidateDraft()
    openConfigDrawer(selectedArea.value || { id: 'current-map', name: '当前地图' }, selectedArea.value ? 'area' : 'map', 'validate')
    return
  }

  if (['area-group', 'scene', 'cu-param'].includes(tool)) {
    if (selectedArea.value) {
      openConfigDrawer(selectedArea.value, 'area', getConfigTabByTool(tool))
      commitDrawerMessage(`已打开${getEditToolLabel(tool)}`)
    } else {
      closeConfigDrawer()
      commitDrawerMessage(`请先选择区域，再进行${getEditToolLabel(tool)}`)
    }
    return
  }

  commitDrawerMessage(getEditToolFeedback(tool))
}

function syncConfigToolbarGroup(tool) {
  if (['draw-rect', 'draw-circle', 'draw-polygon', 'edit-region', 'delete-region', 'select'].includes(tool)) {
    configToolbarGroup.value = 'region'
    return
  }
  if (['add-device', 'move-device', 'delete-device'].includes(tool)) {
    configToolbarGroup.value = 'device'
    return
  }
  if (['area-group', 'scene', 'cu-param'].includes(tool)) {
    configToolbarGroup.value = 'config'
    return
  }
  if (tool === 'validate') {
    configToolbarGroup.value = 'debug'
  }
}

function closeConfigToolbarPanel() {
  configToolbarExpanded.value = false
}

function getConfigTabByTool(tool) {
  return {
    'area-group': 'areaGroup',
    scene: 'scene',
    'cu-param': 'params',
    validate: 'validate'
  }[tool] || 'base'
}

function getEditToolLabel(tool) {
  return {
    select: '选择',
    'draw-rect': '新建矩形区域',
    'draw-circle': '新建圆形区域',
    'draw-polygon': '新建多边形区域',
    'edit-region': '编辑区域',
    'delete-region': '删除区域',
    'add-device': '添加设备',
    'move-device': '移动设备',
    'delete-device': '删除设备',
    'area-group': '区域配置',
    scene: '场景配置',
    'cu-param': 'CU 参数',
    validate: '测试校准'
  }[tool] || '工具'
}

function getEditToolFeedback(tool) {
  return {
    select: '已切换到选择工具',
    'draw-rect': '已进入新建矩形区域',
    'draw-circle': '已进入新建圆形区域',
    'draw-polygon': '已进入新建多边形区域',
    'edit-region': '已进入区域编辑，点击区域开始编辑',
    'delete-region': '已进入删除区域，点击区域删除',
    'add-device': '已进入添加设备，点击地图放置设备',
    'move-device': '已进入移动设备，拖动设备调整位置',
    'delete-device': '已进入删除设备，点击设备删除'
  }[tool] || `已切换到${getEditToolLabel(tool)}`
}

function resetMapInteractionState() {
  stopViewBoxAnimation()
  stopMiddlePan()
  stopEditDragListeners()
  stopShapeDrawingListeners()
  activeDrawer.value = null
  focusedRegionId.value = ''
  hoveredDeviceId.value = ''
  drawerMessage.value = ''
  clearDraft()
  drawMode.value = false
  drawingShape.value = null
  editDragState.value = null
  editHistory.value = []
  closeConfigDrawer()
  if (mapMeta.value) currentViewBox.value = { ...originalViewBox.value }
}

function updateMapViewportSize() {
  const rect = mapSvgRef.value?.getBoundingClientRect()
  if (!rect?.width || !rect?.height) return
  mapViewportSize.value = {
    width: rect.width,
    height: rect.height
  }
}

async function loadFloorMap(mapConfig = DEVICE_VISUALIZATION_MAPS[selectedMapId.value]) {
  const config = mapConfig || DEVICE_VISUALIZATION_MAPS[DEFAULT_DEVICE_VISUALIZATION_MAP_ID]

  try {
    mapError.value = ''
    recognitionDebug.value = null

    const svgResponse = await fetch(config.svgUrl)
    if (!svgResponse.ok) throw new Error(`底图请求失败: ${svgResponse.status}`)

    const svgText = await svgResponse.text()
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
    const svgRoot = svgDoc.documentElement
    let meta = null
    let data = null

    if (config.metaUrl) {
      meta = await fetchJson(config.metaUrl)
      data = await fetchJson(meta.dataUrl || config.dataUrl)
    } else {
      data = await fetchJson(config.dataUrl)
      meta = createMetaFromBackendMapPackage(data, config)
    }

    const parsedViewBox = normalizeViewBox(meta.viewBox) || parseViewBox(svgRoot)
    const drawableBounds = getSvgDrawableBBox(svgRoot)
    const cadAlignedBounds = getSvgCadAlignedBBox(svgRoot, meta.coordinateTransform?.cadBounds)

    if (config.dataType === 'backendMapPackage' && (cadAlignedBounds || drawableBounds)) {
      applyDrawableBoundsToBackendTransform(meta, cadAlignedBounds || drawableBounds)
    }

    mapMeta.value = meta
    originalViewBox.value = parsedViewBox
    currentViewBox.value = { ...parsedViewBox }
    normalizeFloorSvg(svgRoot)
    mapMarkup.value = svgRoot.innerHTML

    const overlay = config.dataType === 'backendMapPackage'
      ? buildBackendMapPackageOverlay(data)
      : config.dataType === 'rawBackendMapPackage'
        ? buildRawBackendMapPackageOverlay(data)
        : buildFloorOverlay(data, meta)

    applyOverlayData(overlay)
    recognitionDebug.value = {
      regionCandidates: [],
      unmappedDeviceCandidates: [],
      warnings: [],
      stats: {
        yellowPathCount: 0,
        acceptedRegionCount: overlay.regions.length,
        cyanClusterCount: 0,
        mappedCuCount: overlay.cuDevices.length,
        mappedGwCount: overlay.gwDevices.length
      }
    }
  } catch (error) {
    console.error(error)
    mapMeta.value = null
    recognitionDebug.value = null
    mapError.value = config.errorMessage
    applyOverlayData({ cuDevices: [], gwDevices: [], regions: [] })
  }
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} 请求失败: ${response.status}`)
  return response.json()
}

function createMetaFromBackendMapPackage(data, config) {
  const map = data?.Map || {}
  return {
    floorId: config.id,
    name: map.MapName || config.name,
    svgUrl: config.svgUrl,
    dataUrl: config.dataUrl,
    viewBox: normalizeViewBox(map.ViewBox) || { x: 0, y: 0, width: 800, height: 600 },
    coordinateTransform: normalizeBackendCoordinateTransform(map.CoordinateTransform)
  }
}

function normalizeBackendCoordinateTransform(transform) {
  if (!transform) return null

  return {
    type: String(transform.Type || transform.type || '').toLowerCase(),
    a: Number(transform.A ?? transform.a ?? 0),
    b: Number(transform.B ?? transform.b ?? 0),
    c: Number(transform.C ?? transform.c ?? 0),
    d: Number(transform.D ?? transform.d ?? 0),
    e: Number(transform.E ?? transform.e ?? 0),
    f: Number(transform.F ?? transform.f ?? 0),
    cadBounds: normalizeBounds(transform.CadBounds || transform.cadBounds),
    svgBounds: normalizeBounds(transform.SvgBounds || transform.svgBounds)
  }
}

function normalizeBounds(value) {
  if (!value) return null
  return {
    minX: Number(value.MinX ?? value.minX ?? 0),
    minY: Number(value.MinY ?? value.minY ?? 0),
    maxX: Number(value.MaxX ?? value.maxX ?? 0),
    maxY: Number(value.MaxY ?? value.maxY ?? 0),
    width: Number(value.Width ?? value.width ?? 0),
    height: Number(value.Height ?? value.height ?? 0)
  }
}

function parseViewBox(svgRoot) {
  const viewBox = svgRoot.getAttribute('viewBox')
  if (viewBox) {
    const [x, y, width, height] = viewBox.split(/\s+/).map(Number)
    if ([x, y, width, height].every((value) => Number.isFinite(value))) {
      return { x, y, width, height }
    }
  }

  const width = parseFloat(svgRoot.getAttribute('width') || '800')
  const height = parseFloat(svgRoot.getAttribute('height') || '600')
  return { x: 0, y: 0, width, height }
}

function normalizeViewBox(value) {
  if (!value) return null
  const x = value.x ?? value.X
  const y = value.y ?? value.Y
  const width = value.width ?? value.Width
  const height = value.height ?? value.Height
  if ([x, y, width, height].every((item) => Number.isFinite(Number(item)))) {
    return {
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height)
    }
  }
  return null
}

function normalizeFloorSvg(svgRoot) {
  const drawableTags = new Set(['path', 'rect', 'line', 'polyline', 'polygon', 'circle', 'ellipse'])
  svgRoot.querySelectorAll('*').forEach((element) => {
    const tag = element.tagName.toLowerCase()
    if (tag === 'title' || tag === 'desc') return

    if (element.hasAttribute('stroke') && element.getAttribute('stroke') !== 'none') {
      element.setAttribute('stroke', '#566373')
      element.setAttribute('stroke-opacity', '0.7')
    }

    if (element.hasAttribute('fill') && element.getAttribute('fill') !== 'none') {
      element.setAttribute('fill', '#9aa4b2')
      element.setAttribute('fill-opacity', '0.12')
    } else if (drawableTags.has(tag)) {
      element.setAttribute('fill', 'none')
    }
  })
}

function getSvgDrawableBBox(svgRoot) {
  const boxes = []

  svgRoot.querySelectorAll('path').forEach((pathNode) => {
    const bbox = getPathDataBBox(pathNode.getAttribute('d') || '')
    if (bbox) boxes.push(bbox)
  })

  svgRoot.querySelectorAll('line').forEach((lineNode) => {
    const x1 = Number(lineNode.getAttribute('x1'))
    const y1 = Number(lineNode.getAttribute('y1'))
    const x2 = Number(lineNode.getAttribute('x2'))
    const y2 = Number(lineNode.getAttribute('y2'))
    if ([x1, y1, x2, y2].every(Number.isFinite)) boxes.push(getPointsBBox([{ x: x1, y: y1 }, { x: x2, y: y2 }]))
  })

  svgRoot.querySelectorAll('rect').forEach((rectNode) => {
    const x = Number(rectNode.getAttribute('x') || 0)
    const y = Number(rectNode.getAttribute('y') || 0)
    const width = Number(rectNode.getAttribute('width') || 0)
    const height = Number(rectNode.getAttribute('height') || 0)
    if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
      boxes.push({ minX: x, minY: y, maxX: x + width, maxY: y + height, width, height })
    }
  })

  return mergeBBoxes(boxes)
}

function getPathDataBBox(d) {
  const values = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || []
  const points = []
  for (let index = 0; index < values.length - 1; index += 2) {
    const x = values[index]
    const y = values[index + 1]
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y })
  }
  return points.length ? getPointsBBox(points) : null
}

function mergeBBoxes(boxes) {
  const validBoxes = boxes.filter((bbox) => bbox && Number.isFinite(bbox.minX) && Number.isFinite(bbox.minY))
  if (!validBoxes.length) return null

  const merged = validBoxes.reduce(
    (result, bbox) => ({
      minX: Math.min(result.minX, bbox.minX),
      minY: Math.min(result.minY, bbox.minY),
      maxX: Math.max(result.maxX, bbox.maxX),
      maxY: Math.max(result.maxY, bbox.maxY)
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  )

  return {
    ...merged,
    width: merged.maxX - merged.minX,
    height: merged.maxY - merged.minY
  }
}

function getSvgCadAlignedBBox(svgRoot, cadBounds) {
  if (!cadBounds?.width || !cadBounds?.height) return null

  const targetRatio = cadBounds.width / cadBounds.height
  const boxesByStroke = new Map()

  svgRoot.querySelectorAll('path').forEach((pathNode) => {
    const stroke = pathNode.getAttribute('stroke') || 'none'
    const bbox = getPathDataBBox(pathNode.getAttribute('d') || '')
    if (!bbox) return

    const boxes = boxesByStroke.get(stroke) || []
    boxes.push(bbox)
    boxesByStroke.set(stroke, boxes)
  })

  const candidates = Array.from(boxesByStroke.entries())
    .map(([stroke, boxes]) => {
      const bbox = mergeBBoxes(boxes)
      const ratio = bbox?.height ? bbox.width / bbox.height : 0
      return {
        stroke,
        bbox,
        ratio,
        ratioDiff: Math.abs(ratio - targetRatio)
      }
    })
    .filter((candidate) => candidate.bbox?.width > 100 && candidate.bbox?.height > 100)
    .sort((left, right) => left.ratioDiff - right.ratioDiff || getBBoxArea(right.bbox) - getBBoxArea(left.bbox))

  const best = candidates[0]
  return best && best.ratioDiff <= 0.02 ? best.bbox : null
}

function getBBoxArea(bbox) {
  return bbox.width * bbox.height
}

function applyDrawableBoundsToBackendTransform(meta, drawableBounds) {
  const transform = meta.coordinateTransform
  const cadBounds = transform?.cadBounds
  if (!transform || !cadBounds?.width || !cadBounds?.height || !drawableBounds.width || !drawableBounds.height) return

  const a = drawableBounds.width / cadBounds.width
  const e = -drawableBounds.height / cadBounds.height

  transform.type = 'affine'
  transform.a = a
  transform.b = 0
  transform.c = drawableBounds.minX - cadBounds.minX * a
  transform.d = 0
  transform.e = e
  transform.f = drawableBounds.maxY - cadBounds.minY * e
  transform.svgBounds = {
    minX: drawableBounds.minX,
    minY: drawableBounds.minY,
    maxX: drawableBounds.maxX,
    maxY: drawableBounds.maxY,
    width: drawableBounds.width,
    height: drawableBounds.height
  }
}

function buildFloorOverlay(data, meta) {
  const sourceDevices = Array.isArray(data.devices) ? data.devices : []
  const mappedDevices = sourceDevices.map((device, index) => createDeviceFromFloorData(device, meta, index))
  const cuList = mappedDevices.filter((device) => device.type === 'cu')
  const gwList = mappedDevices.filter((device) => device.type === 'gw')

  const regionList = (Array.isArray(data.regions) ? data.regions : []).map((region, index) => {
    const points = (region.points || []).map((point) => cadToSvg(point, meta))
    return createRegion(region.name || region.id, points, {
      id: region.id,
      code: region.code,
      color: REGION_COLORS[index % REGION_COLORS.length],
      deviceSource: cuList,
      sourceBBox: getPointsBBox(points),
      sourceColor: 'data',
      cadPoints: region.points || [],
      sourceRows: region.sourceRows || []
    })
  })

  return {
    cuDevices: cuList,
    gwDevices: gwList,
    regions: regionList
  }
}

function buildBackendMapPackageOverlay(data) {
  const relationByDeviceId = new Map(
    (Array.isArray(data?.Relations) ? data.Relations : []).map((relation) => [relation.MapDeviceId, relation])
  )
  const validRegionCodes = new Set(
    (Array.isArray(data?.Regions) ? data.Regions : [])
      .filter((region) => (region.Points || region.SvgPoints || []).length >= 3)
      .map((region) => region.Code || region.Name || region.Id)
      .filter(Boolean)
  )
  const sourceDevices = Array.isArray(data?.Devices) ? data.Devices : []
  const mappedDevices = sourceDevices.map((device, index) => createDeviceFromBackendMapPackage(device, index, relationByDeviceId))
  const cuList = mappedDevices.filter((device) => device.type === 'cu')
  const gwList = mappedDevices.filter((device) => device.type === 'gw' && isBackendGwForValidRegion(device, validRegionCodes))

  const regionList = (Array.isArray(data?.Regions) ? data.Regions : [])
    .map((region, index) => {
      const points = (region.Points || [])
        .map(normalizeBackendPoint)
        .filter(Boolean)
        .map((point) => cadToSvg(point))
      if (points.length < 3) return null

      return createRegion(region.Name || region.Code || region.Id, points, {
        id: region.Id,
        code: region.Code,
        color: region.Color || REGION_COLORS[index % REGION_COLORS.length],
        deviceSource: cuList,
        memberIds: Array.isArray(region.MemberIds) ? region.MemberIds : [],
        sourceBBox: getPointsBBox(points),
        sourceColor: 'backend-map-package',
        cadPoints: region.Points || [],
        sourceRows: region.SourceRows || []
      })
    })
    .filter(Boolean)

  return {
    cuDevices: cuList,
    gwDevices: gwList,
    regions: regionList
  }
}

function buildRawBackendMapPackageOverlay(data) {
  const relationByDeviceId = new Map(
    (Array.isArray(data?.Relations) ? data.Relations : []).map((relation) => [relation.MapDeviceId, relation])
  )
  const sourceDevices = Array.isArray(data?.Devices) ? data.Devices : []
  const mappedDevices = sourceDevices.map((device, index) => createDeviceFromRawBackendMapPackage(device, index, relationByDeviceId))
  const cuList = mappedDevices.filter((device) => device.type === 'cu')
  const gwList = mappedDevices.filter((device) => device.type === 'gw')

  const regionList = (Array.isArray(data?.Regions) ? data.Regions : [])
    .map((region, index) => {
      const points = (region.SvgPoints || [])
        .map(normalizeBackendPoint)
        .filter(Boolean)
      if (points.length < 3) return null

      return createRegion(region.Name || region.Code || region.Id, points, {
        id: region.Id,
        code: region.Code,
        color: region.Color || REGION_COLORS[index % REGION_COLORS.length],
        deviceSource: cuList,
        memberIds: Array.isArray(region.MemberIds) ? region.MemberIds : [],
        sourceBBox: getPointsBBox(points),
        sourceColor: 'raw-backend-map-package',
        cadPoints: region.Points || [],
        sourceRows: region.SourceRows || []
      })
    })
    .filter(Boolean)

  return {
    cuDevices: cuList,
    gwDevices: gwList,
    regions: regionList
  }
}

function isBackendGwForValidRegion(device, validRegionCodes) {
  if (!validRegionCodes.size) return true
  const label = `${device.shortName || ''} ${device.name || ''}`
  return Array.from(validRegionCodes).some((code) => label.includes(`${code}-GW`) || label.includes(`${code} Gateway`))
}

function createDeviceFromFloorData(sourceDevice, meta, index) {
  const type = normalizeDeviceType(sourceDevice.type || sourceDevice.deviceType)
  const point = cadToSvg({ x: sourceDevice.cadX, y: sourceDevice.cadY }, meta)
  const defaultPower = type === 'cu'

  return {
    id: sourceDevice.id || sourceDevice.uniqueNo || `${type}-${index + 1}`,
    name: sourceDevice.name || sourceDevice.sourceFields?.名称 || sourceDevice.shortName || sourceDevice.uniqueNo || `${type.toUpperCase()}-${index + 1}`,
    shortName: sourceDevice.shortName || sourceDevice.uniqueNo || `${type.toUpperCase()}-${index + 1}`,
    type,
    icon: sourceDevice.icon,
    iconUrl: getDeviceIconUrl({ type }),
    regionId: sourceDevice.sourceRegionId || sourceDevice.region || '',
    gatewayId: sourceDevice.sourceFields?.GWNO || sourceDevice.sourceRegionId || sourceDevice.region || '',
    zigbeeId: sourceDevice.sourceFields?.ZIGBEENO || '',
    sourceRow: sourceDevice.sourceRow,
    sourceFields: sourceDevice.sourceFields || {},
    cadX: Number(sourceDevice.cadX),
    cadY: Number(sourceDevice.cadY),
    x: point.x,
    y: point.y,
    online: true,
    power: defaultPower,
    mode: 'auto',
    brightness: defaultPower ? 100 : 0,
    bgBrightness: defaultPower ? 40 : 0,
    bgTime: 900,
    offTime: 1200,
    manualTime: 1250,
    firmware: '未接入',
    updatedAt: '未接入实时状态'
  }
}

function createDeviceFromBackendMapPackage(sourceDevice, index, relationByDeviceId) {
  const rawType = normalizeDeviceType(sourceDevice.Type || sourceDevice.DeviceType)
  const type = rawType === 'gw' ? 'gw' : 'cu'
  const point = cadToSvg({ x: sourceDevice.CadX, y: sourceDevice.CadY })
  const id = sourceDevice.Id || sourceDevice.UniqueNo || `${type}-${index + 1}`
  const relation = relationByDeviceId.get(id)
  const defaultPower = type === 'cu'

  return {
    id,
    name: sourceDevice.Name || sourceDevice.UniqueNo || `${type.toUpperCase()}-${index + 1}`,
    shortName: sourceDevice.UniqueNo || sourceDevice.Name || `${type.toUpperCase()}-${index + 1}`,
    type,
    rawType: sourceDevice.Type || '',
    icon: type === 'gw' ? 'src/assets/images/devices/GW.png' : 'src/assets/images/devices/CU.png',
    iconUrl: getDeviceIconUrl({ type }),
    regionId: relation?.RegionId || '',
    gatewayId: sourceDevice.GatewayId || sourceDevice.GWNO || relation?.GatewayId || relation?.RegionId || '',
    zigbeeId: sourceDevice.ZigbeeId || sourceDevice.ZigbeeNo || '',
    sourceRow: sourceDevice.SourceRow,
    sourceFields: sourceFieldsArrayToObject(sourceDevice.SourceFields),
    cadX: Number(sourceDevice.CadX),
    cadY: Number(sourceDevice.CadY),
    x: point.x,
    y: point.y,
    online: true,
    power: defaultPower,
    mode: 'auto',
    brightness: defaultPower ? 100 : 0,
    bgBrightness: defaultPower ? 40 : 0,
    bgTime: 900,
    offTime: 1200,
    manualTime: 1250,
    firmware: '未接入',
    updatedAt: '后端地图包坐标'
  }
}

function createDeviceFromRawBackendMapPackage(sourceDevice, index, relationByDeviceId) {
  const rawType = normalizeDeviceType(sourceDevice.Type || sourceDevice.DeviceType)
  const type = rawType === 'gw' ? 'gw' : 'cu'
  const point = normalizeBackendPoint({ X: sourceDevice.X, Y: sourceDevice.Y }) || { x: 0, y: 0 }
  const id = sourceDevice.Id || sourceDevice.UniqueNo || `${type}-${index + 1}`
  const relation = relationByDeviceId.get(id)
  const defaultPower = type === 'cu'

  return {
    id,
    name: sourceDevice.Name || sourceDevice.UniqueNo || `${type.toUpperCase()}-${index + 1}`,
    shortName: sourceDevice.UniqueNo || sourceDevice.Name || `${type.toUpperCase()}-${index + 1}`,
    type,
    rawType: sourceDevice.Type || '',
    icon: type === 'gw' ? 'src/assets/images/devices/GW.png' : 'src/assets/images/devices/CU.png',
    iconUrl: getDeviceIconUrl({ type }),
    regionId: relation?.RegionId || '',
    gatewayId: sourceDevice.GatewayId || sourceDevice.GWNO || relation?.GatewayId || relation?.RegionId || '',
    zigbeeId: sourceDevice.ZigbeeId || sourceDevice.ZigbeeNo || '',
    sourceRow: sourceDevice.SourceRow,
    sourceFields: sourceFieldsArrayToObject(sourceDevice.SourceFields),
    cadX: Number(sourceDevice.CadX),
    cadY: Number(sourceDevice.CadY),
    x: point.x,
    y: point.y,
    online: true,
    power: defaultPower,
    mode: 'auto',
    brightness: defaultPower ? 100 : 0,
    bgBrightness: defaultPower ? 40 : 0,
    bgTime: 900,
    offTime: 1200,
    manualTime: 1250,
    firmware: '未接入',
    updatedAt: '后端原始地图包坐标'
  }
}

function normalizeBackendPoint(point) {
  if (!point) return null
  const x = Number(point.x ?? point.X)
  const y = Number(point.y ?? point.Y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

function sourceFieldsArrayToObject(sourceFields) {
  if (!Array.isArray(sourceFields)) return {}
  return sourceFields.reduce((result, item) => {
    if (item?.Key) result[item.Key] = item.Value ?? ''
    return result
  }, {})
}

function normalizeDeviceType(value) {
  return String(value || '').trim().toLowerCase()
}

function getDeviceIconUrl(device) {
  return device.type === 'gw' ? gwIconUrl : cuIconUrl
}

function getDeviceIconSize(device) {
  return device.type === 'gw' ? 16 : 12
}

function getDeviceHitSize(device) {
  return Math.max(getDeviceIconSize(device) + 6, device.type === 'gw' ? 22 : 14)
}

function isActiveDevice(type, device) {
  return activeDrawer.value?.type === type && activeDrawer.value.entity.id === device.id
}

function cadToSvg(point, meta = mapMeta.value) {
  const transform = meta?.coordinateTransform
  if (!transform) return { x: 0, y: 0 }

  if (transform.type === 'affine') {
    return {
      x: transform.a * Number(point.x) + transform.b * Number(point.y) + transform.c,
      y: transform.d * Number(point.x) + transform.e * Number(point.y) + transform.f
    }
  }

  const cadBounds = transform.cadBounds
  const svgBounds = transform.svgBounds
  const scaleX = transform.scaleX ?? (svgBounds.maxX - svgBounds.minX) / (cadBounds.maxX - cadBounds.minX)
  const scaleY = transform.scaleY ?? (svgBounds.maxY - svgBounds.minY) / (cadBounds.maxY - cadBounds.minY)
  const x = svgBounds.minX + (Number(point.x) - cadBounds.minX) * scaleX
  const y = transform.flipY
    ? svgBounds.maxY - (Number(point.y) - cadBounds.minY) * scaleY
    : svgBounds.minY + (Number(point.y) - cadBounds.minY) * scaleY

  return { x, y }
}

function svgToCad(point, meta = mapMeta.value) {
  const transform = meta?.coordinateTransform
  if (!transform) return { x: 0, y: 0 }

  if (transform.type === 'affine') {
    const determinant = transform.a * transform.e - transform.b * transform.d
    if (!determinant) return { x: 0, y: 0 }

    const x = Number(point.x) - transform.c
    const y = Number(point.y) - transform.f
    return {
      x: (transform.e * x - transform.b * y) / determinant,
      y: (-transform.d * x + transform.a * y) / determinant
    }
  }

  const cadBounds = transform.cadBounds
  const svgBounds = transform.svgBounds
  const scaleX = transform.scaleX ?? (svgBounds.maxX - svgBounds.minX) / (cadBounds.maxX - cadBounds.minX)
  const scaleY = transform.scaleY ?? (svgBounds.maxY - svgBounds.minY) / (cadBounds.maxY - cadBounds.minY)
  const x = cadBounds.minX + (Number(point.x) - svgBounds.minX) / scaleX
  const y = transform.flipY
    ? cadBounds.minY + (svgBounds.maxY - Number(point.y)) / scaleY
    : cadBounds.minY + (Number(point.y) - svgBounds.minY) / scaleY

  return { x, y }
}

function applyOverlayData(overlay) {
  activeDrawer.value = null
  focusedRegionId.value = ''
  const floorId = selectedMapId.value
  const localDraft = loadLocalDraft(floorId)
  const activeOverlay = normalizeSavedOverlay(localDraft?.overlay) || overlay

  cuDevices.value = activeOverlay.cuDevices
  gwDevices.value = activeOverlay.gwDevices
  regions.value = recalculateRegions(activeOverlay.regions)
  draftState.value = localDraft
    ? normalizeLoadedDraftState(localDraft, floorId)
    : createDraftFromOverlay(floorId, regions.value, [...cuDevices.value, ...gwDevices.value])
  validationMessages.value = validateDraftState(draftState.value, cuDevices.value)
}

function normalizeSavedOverlay(overlay) {
  if (!overlay || !Array.isArray(overlay.regions)) return null

  const devices = Array.isArray(overlay.devices) ? overlay.devices : []
  const cuList = Array.isArray(overlay.cuDevices)
    ? overlay.cuDevices
    : devices.filter((device) => device.type === 'cu')
  const gwList = Array.isArray(overlay.gwDevices)
    ? overlay.gwDevices
    : devices.filter((device) => device.type === 'gw')

  return {
    cuDevices: cuList,
    gwDevices: gwList,
    regions: overlay.regions
  }
}

function normalizeLoadedDraftState(localDraft, floorId) {
  const { overlay, ...draft } = localDraft
  return {
    ...createInitialDraftState(floorId),
    ...draft,
    floorId
  }
}

function createRegion(name, points, options = {}) {
  const {
    id = '',
    code = '',
    color = REGION_COLORS[0],
    custom = false,
    deviceSource = cuDevices.value,
    sourceBBox = getPointsBBox(points),
    sourceColor = custom ? 'custom' : 'overlay',
    cadPoints = [],
    cadGeometry = null,
    shapeType = 'POLYGON',
    geometry = null,
    sourceRows = [],
    memberIds: fixedMemberIds = null
  } = options

  const deviceIds = new Set(deviceSource.map((device) => device.id))
  const memberIds = Array.isArray(fixedMemberIds)
    ? fixedMemberIds.filter((id) => deviceIds.has(id))
    : collectDevicesInPolygon(points, deviceSource)
  return {
    id: id || `${custom ? 'custom' : 'region'}-${Math.random().toString(36).slice(2, 8)}`,
    code,
    name,
    online: true,
    custom,
    color,
    shapeType,
    geometry: geometry || { points },
    points,
    cadPoints,
    cadGeometry,
    sourceRows,
    memberIds,
    sourceBBox,
    sourceColor,
    sceneMode: 'meeting',
    sceneConfigs: createSceneConfigs(memberIds, deviceSource)
  }
}

function createSceneConfigs(memberIds, deviceSource = cuDevices.value) {
  const sourceDevices = deviceSource.filter((device) => memberIds.includes(device.id))
  const formatRows = (mode) =>
    sourceDevices.map((device, index) => {
      const meetingBrightness = index === 0 ? '0%' : '100%'
      return {
        deviceId: device.id,
        brightness:
          mode === 'on'
            ? '100%'
            : mode === 'off'
              ? '0%'
              : mode === 'meeting'
                ? meetingBrightness
                : index === 0
                  ? '60%'
                  : '80%',
        colorTemp: mode === 'off' ? '--' : mode === 'discussion' ? '3500K' : '4000K'
      }
    })

  return {
    on: formatRows('on'),
    off: formatRows('off'),
    meeting: formatRows('meeting'),
    discussion: formatRows('discussion')
  }
}

function collectDevicesInPolygon(points, deviceSource = cuDevices.value) {
  return deviceSource
    .filter((device) => pointInPolygon({ x: device.x, y: device.y }, points))
    .map((device) => device.id)
}

function pointInPolygon(point, polygon) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const xi = polygon[index].x
    const yi = polygon[index].y
    const xj = polygon[previous].x
    const yj = polygon[previous].y
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-6) + xi

    if (intersect) inside = !inside
  }
  return inside
}

async function handleRegionClick(region) {
  if (drawMode.value) return

  if (isConfigMode.value) {
    handleConfigRegionClick(region)
    return
  }

  clearActiveDevice()

  if (focusedRegionId.value === region.id) {
    clearFocusRegion()
    return
  }

  const focused = await focusRegion(region)
  if (!focused) return

  focusedRegionId.value = region.id
  openDrawer('area', region)
  commitDrawerMessage(`已聚焦到 ${region.name}`)
}

function handleConfigRegionClick(region) {
  if (activeEditTool.value === 'delete-region') {
    deleteRegion(region)
    return
  }

  if (['area-group', 'scene', 'cu-param', 'validate', 'edit-region', 'select'].includes(activeEditTool.value)) {
    activeDrawer.value = null
    focusedRegionId.value = ''
    openConfigDrawer(region, 'area', getConfigTabByTool(activeEditTool.value))
  }
}

function handleWheel(event) {
  stopViewBoxAnimation()

  const currentScale = zoomLevel.value
  const nextScale = clamp(currentScale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), 1, MAX_ZOOM)
  if (nextScale === currentScale) return

  const pointer = clientToMapPoint(event)
  if (!pointer) return

  const nextWidth = originalViewBox.value.width / nextScale
  const nextHeight = originalViewBox.value.height / nextScale
  const ratioX = (pointer.x - currentViewBox.value.x) / currentViewBox.value.width
  const ratioY = (pointer.y - currentViewBox.value.y) / currentViewBox.value.height

  currentViewBox.value = clampViewBox({
    x: pointer.x - nextWidth * ratioX,
    y: pointer.y - nextHeight * ratioY,
    width: nextWidth,
    height: nextHeight
  })
}

function zoomIn() {
  setZoomLevel(zoomLevel.value + 0.4)
}

function zoomOut() {
  setZoomLevel(zoomLevel.value - 0.4)
}

function setZoomLevel(nextScale) {
  stopViewBoxAnimation()
  const scale = clamp(nextScale, 1, MAX_ZOOM)
  const nextWidth = originalViewBox.value.width / scale
  const nextHeight = originalViewBox.value.height / scale
  const centerX = currentViewBox.value.x + currentViewBox.value.width / 2
  const centerY = currentViewBox.value.y + currentViewBox.value.height / 2

  currentViewBox.value = clampViewBox({
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight
  })
}

function handleMapBlankClick(event) {
  const target = event.target
  if (
    target === mapSvgRef.value ||
    target.classList?.contains('map-base-bg') ||
    target.classList?.contains('focus-dim') ||
    target.closest?.('.map-floor-layer')
  ) {
    closeConfigToolbarPanel()

    if (isConfigMode.value && activeEditTool.value === 'add-device') {
      addDeviceAtEvent(event)
      return
    }

    clearActiveDevice()
    if (focusedRegionId.value) resetView()
  }
}

function handleMapMouseDownCapture(event) {
  if (event.button !== 1) return
  startMiddlePan(event)
}

function handleMapMouseDown(event) {
  if (event.button === 1) return

  if (isConfigMode.value && event.button === 0 && ['draw-rect', 'draw-circle'].includes(activeEditTool.value)) {
    startShapeDrawing(event)
  }
}

function startMiddlePan(event) {
  event.preventDefault()
  event.stopPropagation()

  stopViewBoxAnimation()
  const svgRect = mapSvgRef.value?.getBoundingClientRect()
  if (!svgRect?.width || !svgRect?.height) return

  middlePanState = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    startViewBox: { ...currentViewBox.value }
  }
  isMiddlePanning.value = true
  window.addEventListener('mousemove', handleMiddlePanMove)
  window.addEventListener('mouseup', handleMiddlePanEnd)
}

function startShapeDrawing(event) {
  const point = clientToMapPoint(event)
  if (!point) return
  event.preventDefault()
  event.stopPropagation()

  drawingShape.value = activeEditTool.value === 'draw-rect'
    ? {
        shapeType: 'RECT',
        start: point,
        geometry: { x: point.x, y: point.y, width: 0, height: 0 }
      }
    : {
        shapeType: 'CIRCLE',
        start: point,
        geometry: { cx: point.x, cy: point.y, radius: 0 }
      }

  window.addEventListener('mousemove', handleShapeDrawingMove)
  window.addEventListener('mouseup', finishShapeDrawing)
}

function handleShapeDrawingMove(event) {
  if (!drawingShape.value || isMiddlePanning.value) return
  const point = clientToMapPoint(event)
  if (!point) return

  const start = drawingShape.value.start
  if (drawingShape.value.shapeType === 'RECT') {
    drawingShape.value = {
      ...drawingShape.value,
      geometry: {
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(point.x - start.x),
        height: Math.abs(point.y - start.y)
      }
    }
  } else {
    drawingShape.value = {
      ...drawingShape.value,
      geometry: {
        cx: start.x,
        cy: start.y,
        radius: Math.hypot(point.x - start.x, point.y - start.y)
      }
    }
  }
}

function finishShapeDrawing(event) {
  if (event && event.button !== 0) return
  if (!drawingShape.value) return
  window.removeEventListener('mousemove', handleShapeDrawingMove)
  window.removeEventListener('mouseup', finishShapeDrawing)

  const shape = drawingShape.value
  drawingShape.value = null
  const points = shapeToPoints(shape.shapeType, shape.geometry)
  const bbox = getPointsBBox(points)
  if (bbox.width < 3 || bbox.height < 3) {
    commitDrawerMessage('区域尺寸过小，已取消创建')
    return
  }

  createEditableRegion(shape.shapeType, shape.geometry)
}

function handleMiddlePanMove(event) {
  if (!middlePanState) return
  event.preventDefault()

  const deltaX = event.clientX - middlePanState.startClientX
  const deltaY = event.clientY - middlePanState.startClientY
  const delta = clientDeltaToSvgDelta(deltaX, deltaY, mapSvgRef.value)
  if (!delta) return

  const start = middlePanState.startViewBox

  currentViewBox.value = clampViewBox({
    x: start.x - delta.x,
    y: start.y - delta.y,
    width: start.width,
    height: start.height
  })
}

function handleMiddlePanEnd(event) {
  if (event.button !== 1 && event.type === 'mouseup') return
  stopMiddlePan()
}

function stopMiddlePan() {
  if (!middlePanState && !isMiddlePanning.value) return
  middlePanState = null
  isMiddlePanning.value = false
  window.removeEventListener('mousemove', handleMiddlePanMove)
  window.removeEventListener('mouseup', handleMiddlePanEnd)
}

function stopEditDragListeners() {
  window.removeEventListener('mousemove', handleEditDragMove)
  window.removeEventListener('mouseup', finishEditDrag)
}

function stopShapeDrawingListeners() {
  window.removeEventListener('mousemove', handleShapeDrawingMove)
  window.removeEventListener('mouseup', finishShapeDrawing)
}

function handleMapKeydown(event) {
  if (isTextEditingTarget(event.target)) return

  if (isConfigMode.value) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault()
      undoConfigOperation()
      return
    }

    if (event.key === 'Escape' && configToolbarExpanded.value && !operationStatusVisible.value) {
      event.preventDefault()
      closeConfigToolbarPanel()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelConfigOperation()
      return
    }

    if (event.key === 'Enter' && drawMode.value && drawingPoints.value.length >= 3) {
      event.preventDefault()
      finishDrawing()
      return
    }
  }

  if (event.key !== 'Escape' || !focusedRegionId.value) return
  event.preventDefault()
  closeDrawer()
  resetView()
}

function isTextEditingTarget(target) {
  if (!target) return false
  const tagName = target.tagName?.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  )
}

function undoConfigOperation() {
  if (editDragState.value) {
    cancelActiveEditDrag('已撤销当前拖拽')
    return
  }

  if (drawMode.value) {
    if (drawingPoints.value.length) {
      drawingPoints.value = drawingPoints.value.slice(0, -1)
      hoverPoint.value = null
      commitDrawerMessage('已撤销上一个绘制点')
    } else {
      cancelConfigOperation()
    }
    return
  }

  if (drawingShape.value) {
    stopShapeDrawingListeners()
    drawingShape.value = null
    activeEditTool.value = 'select'
    commitDrawerMessage('已撤销当前绘制')
    return
  }

  restoreLastHistorySnapshot()
}

function cancelConfigOperation() {
  if (editDragState.value) {
    cancelActiveEditDrag('已取消编辑')
    activeEditTool.value = 'select'
    return
  }

  if (drawingShape.value || drawMode.value || drawingPoints.value.length) {
    stopShapeDrawingListeners()
    clearDraft()
    drawingShape.value = null
    drawMode.value = false
    activeEditTool.value = 'select'
    commitDrawerMessage('已取消当前绘制')
    return
  }

  if (activeEditTool.value !== 'select') {
    activeEditTool.value = 'select'
    closeConfigDrawer()
    commitDrawerMessage('已退出当前工具')
  }
}

function handleOperationUndo() {
  undoConfigOperation()
}

function handleOperationCancel() {
  cancelConfigOperation()
}

function handleOperationPrimary() {
  if (!operationPrimaryEnabled.value) return

  if (activeEditTool.value === 'draw-polygon') {
    finishDrawing()
    return
  }

  if (activeEditTool.value === 'draw-rect' || activeEditTool.value === 'draw-circle') {
    if (drawingShape.value) {
      finishShapeDrawing({ button: 0 })
    }
    return
  }

  if (activeEditTool.value === 'edit-region') {
    if (editDragState.value) {
      finishEditDrag({ button: 0 })
    }
    activeEditTool.value = 'select'
    closeConfigDrawer()
    commitDrawerMessage('已保存区域编辑')
  }
}

function createMapSnapshot() {
  return structuredClone({
    regions: regions.value,
    cuDevices: cuDevices.value,
    gwDevices: gwDevices.value,
    draftState: draftState.value
  })
}

function pushHistorySnapshot(snapshot) {
  if (!snapshot) return
  editHistory.value = [...editHistory.value, snapshot].slice(-EDIT_HISTORY_LIMIT)
}

function recordMapHistory() {
  pushHistorySnapshot(createMapSnapshot())
}

function restoreMapSnapshot(snapshot) {
  if (!snapshot) return
  regions.value = snapshot.regions || []
  cuDevices.value = snapshot.cuDevices || []
  gwDevices.value = snapshot.gwDevices || []
  draftState.value = snapshot.draftState || {
    ...draftState.value,
    dirty: true
  }
  validationMessages.value = validateDraftState(draftState.value, cuDevices.value)
}

function restoreLastHistorySnapshot() {
  const snapshot = editHistory.value.at(-1)
  if (!snapshot) {
    commitDrawerMessage('没有可撤销的操作')
    return
  }

  editHistory.value = editHistory.value.slice(0, -1)
  restoreMapSnapshot(snapshot)
  closeConfigDrawer()
  activeDrawer.value = null
  focusedRegionId.value = ''
  commitDrawerMessage('已撤销上一步')
}

function cancelActiveEditDrag(message = '已取消编辑') {
  const state = editDragState.value
  if (!state) return

  editDragState.value = null
  window.removeEventListener('mousemove', handleEditDragMove)
  window.removeEventListener('mouseup', finishEditDrag)
  restoreMapSnapshot(state.beforeSnapshot)
  focusedRegionId.value = ''
  closeConfigDrawer()
  commitDrawerMessage(message)
}

function handleMiniMapClick(event) {
  const point = clientToSvgPoint(event, miniMapSvgRef.value)
  if (!point) return

  const { width, height } = currentViewBox.value
  currentViewBox.value = clampViewBox({
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height
  })
}

function toggleDrawMode() {
  if (drawMode.value) {
    clearDraft()
    drawMode.value = false
    return
  }

  activeDrawer.value = null
  focusedRegionId.value = ''
  drawerMessage.value = ''
  drawMode.value = true
}

function clearDraft() {
  drawingPoints.value = []
  hoverPoint.value = null
}

function handleDrawClick(event) {
  if (isMiddlePanning.value || event.button !== 0) return
  const point = clientToMapPoint(event)
  if (!point) return
  drawingPoints.value = [...drawingPoints.value, point]
}

function handleDrawMove(event) {
  if (isMiddlePanning.value) return
  hoverPoint.value = clientToMapPoint(event)
}

function finishDrawing() {
  if (drawingPoints.value.length < 3) {
    commitDrawerMessage('区域绘制至少需要 3 个点')
    clearDraft()
    drawMode.value = false
    return
  }

  const region = createEditableRegion('POLYGON', {
    points: drawingPoints.value.map((point) => ({ ...point }))
  })
  drawMode.value = false
  clearDraft()
  openConfigDrawer(region, 'area', 'base')
  commitDrawerMessage(`已生成 ${region.name}`)
}

function createEditableRegion(shapeType, geometry) {
  recordMapHistory()
  const points = shapeToPoints(shapeType, geometry)
  const region = createRegion(
    `新区域-${regions.value.length + 1}`,
    points,
    {
      custom: true,
      shapeType,
      geometry,
      cadGeometry: geometryToCadGeometry(shapeType, geometry, svgToCad)
    }
  )

  regions.value = recalculateRegions([...regions.value, region])
  syncAreaGroupsWithRegions(regions.value)
  draftState.value = {
    ...draftState.value,
    dirty: true
  }
  openConfigDrawer(region, 'area', 'base')
  return region
}

function clientToMapPoint(event) {
  const point = clientToSvgPoint(event, mapSvgRef.value)
  if (!point || !isPointInViewBox(point, currentViewBox.value, 0.5)) return null
  return point
}

function clientToSvgPoint(event, svgElement) {
  if (!svgElement) return null
  const point = svgElement.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY

  const matrix = svgElement.getScreenCTM()
  if (!matrix) return null
  return point.matrixTransform(matrix.inverse())
}

function clientDeltaToSvgDelta(deltaX, deltaY, svgElement) {
  if (!svgElement) return null
  const matrix = svgElement.getScreenCTM()
  if (!matrix) return null

  const inverse = matrix.inverse()
  const origin = svgElement.createSVGPoint()
  origin.x = 0
  origin.y = 0

  const delta = svgElement.createSVGPoint()
  delta.x = deltaX
  delta.y = deltaY

  const originPoint = origin.matrixTransform(inverse)
  const deltaPoint = delta.matrixTransform(inverse)
  return {
    x: deltaPoint.x - originPoint.x,
    y: deltaPoint.y - originPoint.y
  }
}

function isPointInViewBox(point, viewBox, tolerance = 0) {
  return (
    point.x >= viewBox.x - tolerance &&
    point.x <= viewBox.x + viewBox.width + tolerance &&
    point.y >= viewBox.y - tolerance &&
    point.y <= viewBox.y + viewBox.height + tolerance
  )
}

function resetView() {
  stopViewBoxAnimation()
  focusedRegionId.value = ''
  currentViewBox.value = { ...originalViewBox.value }
}

function fitFullMap() {
  resetView()
}

function clearFocusRegion() {
  focusedRegionId.value = ''
  resetView()
}

function getRegionShapeType(region) {
  return normalizeRegionShape(region).shapeType
}

function getRegionGeometry(region) {
  return normalizeRegionShape(region).geometry
}

function getRegionHandles(region) {
  const shapeType = getRegionShapeType(region)
  const geometry = getRegionGeometry(region)
  if (shapeType === 'RECT') {
    const x1 = geometry.x
    const y1 = geometry.y
    const x2 = geometry.x + geometry.width
    const y2 = geometry.y + geometry.height
    return [
      { key: 'nw', x: x1, y: y1 },
      { key: 'ne', x: x2, y: y1 },
      { key: 'se', x: x2, y: y2 },
      { key: 'sw', x: x1, y: y2 }
    ]
  }
  if (shapeType === 'CIRCLE') {
    return [
      { key: 'center', x: geometry.cx, y: geometry.cy },
      { key: 'radius', x: geometry.cx + geometry.radius, y: geometry.cy }
    ]
  }
  return (geometry.points || []).map((point, index) => ({ key: `vertex-${index}`, index, x: point.x, y: point.y }))
}

function handleRegionMouseDown(event, region) {
  if (!isConfigMode.value || activeEditTool.value !== 'edit-region' || event.button !== 0) return
  const point = clientToMapPoint(event)
  if (!point) return
  event.preventDefault()

  editDragState.value = {
    type: 'region',
    regionId: region.id,
    start: point,
    originalGeometry: structuredClone(getRegionGeometry(region)),
    shapeType: getRegionShapeType(region),
    beforeSnapshot: createMapSnapshot()
  }
  window.addEventListener('mousemove', handleEditDragMove)
  window.addEventListener('mouseup', finishEditDrag)
}

function handleRegionHandleMouseDown(event, region, handle) {
  if (!isConfigMode.value || activeEditTool.value !== 'edit-region') return
  const point = clientToMapPoint(event)
  if (!point) return
  event.preventDefault()

  editDragState.value = {
    type: 'region-handle',
    regionId: region.id,
    start: point,
    handle,
    originalGeometry: structuredClone(getRegionGeometry(region)),
    shapeType: getRegionShapeType(region),
    beforeSnapshot: createMapSnapshot()
  }
  window.addEventListener('mousemove', handleEditDragMove)
  window.addEventListener('mouseup', finishEditDrag)
}

function handleDeviceMouseDown(event, device) {
  if (!isConfigMode.value || activeEditTool.value !== 'move-device' || event.button !== 0) return
  const point = clientToMapPoint(event)
  if (!point) return
  event.preventDefault()

  editDragState.value = {
    type: 'device',
    deviceId: device.id,
    start: point,
    original: { x: device.x, y: device.y },
    beforeSnapshot: createMapSnapshot()
  }
  window.addEventListener('mousemove', handleEditDragMove)
  window.addEventListener('mouseup', finishEditDrag)
}

function handleEditDragMove(event) {
  if (!editDragState.value || isMiddlePanning.value) return
  const point = clientToMapPoint(event)
  if (!point) return
  const delta = {
    x: point.x - editDragState.value.start.x,
    y: point.y - editDragState.value.start.y
  }

  if (editDragState.value.type === 'device') {
    updateDevicePosition(editDragState.value.deviceId, {
      x: editDragState.value.original.x + delta.x,
      y: editDragState.value.original.y + delta.y
    })
    return
  }

  const region = regions.value.find((item) => item.id === editDragState.value.regionId)
  if (!region) return
  let geometry = editDragState.value.originalGeometry
  if (editDragState.value.type === 'region') {
    geometry = moveGeometry(editDragState.value.shapeType, geometry, delta)
  } else {
    geometry = getResizedRegionGeometry(editDragState.value, point)
  }
  updateRegionGeometry(region.id, editDragState.value.shapeType, geometry)
}

function getResizedRegionGeometry(state, point) {
  if (state.shapeType === 'RECT') {
    return resizeRectFromHandle(state.originalGeometry, state.handle.key, point)
  }
  if (state.shapeType === 'CIRCLE') {
    if (state.handle.key === 'center') {
      return {
        ...state.originalGeometry,
        cx: point.x,
        cy: point.y
      }
    }
    return {
      ...state.originalGeometry,
      radius: Math.hypot(point.x - state.originalGeometry.cx, point.y - state.originalGeometry.cy)
    }
  }
  const points = [...(state.originalGeometry.points || [])]
  if (typeof state.handle.index === 'number') {
    points[state.handle.index] = point
  }
  return { points }
}

function finishEditDrag(event) {
  if (event && event.button !== 0) return
  if (!editDragState.value) return
  const state = editDragState.value
  const wasDeviceDrag = state.type === 'device'
  editDragState.value = null
  window.removeEventListener('mousemove', handleEditDragMove)
  window.removeEventListener('mouseup', finishEditDrag)
  if (wasDeviceDrag) {
    regions.value = recalculateRegions(regions.value)
    syncAreaGroupsWithRegions(regions.value)
  }
  pushHistorySnapshot(state.beforeSnapshot)
  draftState.value = {
    ...draftState.value,
    dirty: true
  }
}

function updateRegionGeometry(regionId, shapeType, geometry) {
  regions.value = recalculateRegions(regions.value.map((region) => {
    if (region.id !== regionId) return region
    const points = shapeToPoints(shapeType, geometry)
    return {
      ...region,
      shapeType,
      geometry,
      points,
      cadGeometry: geometryToCadGeometry(shapeType, geometry, svgToCad)
    }
  }))
  syncAreaGroupsWithRegions(regions.value)
}

function updateDevicePosition(deviceId, point) {
  const cadPoint = svgToCad(point)
  const updateDevice = (device) => (device.id === deviceId
    ? {
        ...device,
        x: point.x,
        y: point.y,
        cadX: cadPoint.x,
        cadY: cadPoint.y
      }
    : device)
  cuDevices.value = cuDevices.value.map(updateDevice)
  gwDevices.value = gwDevices.value.map(updateDevice)
}

function recalculateRegions(regionList) {
  return regionList.map((region) => {
    const memberIds = collectDevicesInShape(region, cuDevices.value)
    return {
      ...region,
      memberIds,
      sceneConfigs: createSceneConfigs(memberIds, cuDevices.value)
    }
  })
}

function deleteRegion(region) {
  const confirmed = window.confirm(`确认删除区域 ${region.name || region.id}？`)
  if (!confirmed) return
  recordMapHistory()
  regions.value = regions.value.filter((item) => item.id !== region.id)
  if (focusedRegionId.value === region.id) focusedRegionId.value = ''
  if (configDrawerTarget.value?.id === region.id) closeConfigDrawer()
  draftState.value = {
    ...draftState.value,
    dirty: true,
    areaGroups: draftState.value.areaGroups.filter((group) => group.regionId !== region.id)
  }
  commitDrawerMessage(`已删除区域 ${region.name || region.id}`)
}

function addDeviceAtEvent(event) {
  const point = clientToMapPoint(event)
  if (!point) return
  const type = normalizeDeviceType(deviceDraft.value.type)
  const gatewayId = deviceDraft.value.gatewayId
  const deviceNo = deviceDraft.value.deviceNo?.trim()
  if (!type || !gatewayId || !deviceNo) {
    commitDrawerMessage('请先选择设备类型、所属网关并填写设备编号')
    return
  }

  recordMapHistory()
  const cadPoint = svgToCad(point)
  const id = `${gatewayId}-${type.toUpperCase()}-${deviceNo}`
  const device = {
    id,
    name: id,
    shortName: deviceNo,
    type,
    gatewayId,
    zigbeeId: type === 'cu' ? deviceNo : '',
    iconUrl: getDeviceIconUrl({ type }),
    regionId: '',
    sourceFields: {
      GWNO: gatewayId,
      ZIGBEENO: type === 'cu' ? deviceNo : '',
      DEVICETYPE: type.toUpperCase()
    },
    cadX: cadPoint.x,
    cadY: cadPoint.y,
    x: point.x,
    y: point.y,
    online: true,
    power: type === 'cu',
    mode: 'auto',
    brightness: type === 'cu' ? 100 : 0,
    bgBrightness: type === 'cu' ? 40 : 0,
    bgTime: 900,
    offTime: 1200,
    manualTime: 1250,
    firmware: '前端新增',
    updatedAt: '本地草稿'
  }

  if (type === 'gw') {
    gwDevices.value = [...gwDevices.value, device]
  } else {
    cuDevices.value = [...cuDevices.value, device]
  }
  regions.value = recalculateRegions(regions.value)
  syncAreaGroupsWithRegions(regions.value)
  draftState.value = {
    ...draftState.value,
    dirty: true
  }
  deviceDraft.value = {
    ...deviceDraft.value,
    deviceNo: ''
  }
  commitDrawerMessage(`已新增 ${device.shortName}`)
}

function deleteDevice(device) {
  const confirmed = window.confirm(`确认删除设备 ${device.shortName || device.id}？`)
  if (!confirmed) return
  recordMapHistory()
  cuDevices.value = cuDevices.value.filter((item) => item.id !== device.id)
  gwDevices.value = gwDevices.value.filter((item) => item.id !== device.id)
  regions.value = recalculateRegions(regions.value)
  syncAreaGroupsWithRegions(regions.value)
  draftState.value = removeDeviceFromDraft(draftState.value, device.id)
  clearActiveDevice()
  commitDrawerMessage(`已删除设备 ${device.shortName || device.id}`)
}

function syncAreaGroupsWithRegions(regionList) {
  const membersByRegionId = new Map(regionList.map((region) => [region.id, region.memberIds || []]))
  draftState.value = {
    ...draftState.value,
    dirty: true,
    areaGroups: draftState.value.areaGroups.map((group) => (
      membersByRegionId.has(group.regionId)
        ? { ...group, memberIds: membersByRegionId.get(group.regionId) }
        : group
    ))
  }
}

function openConfigDrawer(target, targetType = 'area', tab = 'base') {
  configDrawerTarget.value = target
  configDrawerTargetType.value = targetType
  configDrawerTab.value = tab || 'base'
}

function closeConfigDrawer() {
  configDrawerTarget.value = null
  configDrawerTargetType.value = ''
  configDrawerTab.value = 'base'
}

function handleCreateAreaGroup(region) {
  const memberIds = collectDevicesInShape(region, cuDevices.value)
  const group = {
    id: `ag-${region.id}`,
    name: `${region.name || region.id}区域组`,
    regionId: region.id,
    gatewayId: '',
    memberIds,
    mode: 'local-draft'
  }
  const validation = validateAreaGroupGateway(group, cuDevices.value)
  if (!validation.ok) {
    validationMessages.value = [validation.message]
    commitDrawerMessage(validation.message)
    configDrawerTab.value = 'validate'
    return
  }

  draftState.value = upsertAreaGroup(draftState.value, {
    ...group,
    gatewayId: validation.gatewayId
  })
  validationMessages.value = []
  commitDrawerMessage('已创建区域组本地草稿')
}

function handleBindAreaGroup(region) {
  handleCreateAreaGroup(region)
  commitDrawerMessage('已绑定已有区域组到本地草稿')
}

function handleCreateDefaultScenes(region) {
  draftState.value = {
    ...draftState.value,
    dirty: true,
    scenes: [
      ...draftState.value.scenes,
      { id: `scene-${region.id}-on`, regionId: region.id, name: '全开', brightness: 100 },
      { id: `scene-${region.id}-off`, regionId: region.id, name: '全关', brightness: 0 },
      { id: `scene-${region.id}-saving`, regionId: region.id, name: '50% 节能', brightness: 50 }
    ]
  }
  commitDrawerMessage('已创建默认场景本地草稿')
}

function handleCreateCustomScene(region) {
  draftState.value = {
    ...draftState.value,
    dirty: true,
    scenes: [
      ...draftState.value.scenes,
      { id: `scene-${region.id}-${Date.now()}`, regionId: region.id, name: '自定义场景', brightness: 80 }
    ]
  }
  commitDrawerMessage('已创建自定义场景本地草稿')
}

function handleUseParamTemplate(region) {
  upsertCuParamDraft(region, 'template')
}

function handleCustomParam(region) {
  upsertCuParamDraft(region, 'custom')
}

function upsertCuParamDraft(region, mode) {
  const memberIds = collectDevicesInShape(region, cuDevices.value)
  draftState.value = {
    ...draftState.value,
    dirty: true,
    cuParams: [
      ...draftState.value.cuParams.filter((item) => item.regionId !== region.id || item.mode !== mode),
      {
        id: `param-${region.id}-${mode}`,
        regionId: region.id,
        mode,
        memberIds,
        brightness: 100,
        bgBrightness: 40
      }
    ]
  }
  commitDrawerMessage(mode === 'template' ? '已使用参数模板生成本地草稿' : '已创建自定义参数本地草稿')
}

function markDraftAction(message) {
  draftState.value = {
    ...draftState.value,
    dirty: true
  }
  commitDrawerMessage(message)
}

function handleValidateDraft() {
  validationMessages.value = validateDraftState(draftState.value, cuDevices.value)
  configDrawerTab.value = 'validate'
  commitDrawerMessage(validationMessages.value.length ? '校验发现问题' : '完整性校验通过')
}

function handleSaveLocalDraft() {
  const ok = saveLocalDraft(selectedMapId.value, draftState.value, createCurrentOverlayDraft())
  if (ok) {
    draftState.value = {
      ...draftState.value,
      dirty: false
    }
    commitDrawerMessage('已保存前端本地草稿')
  } else {
    commitDrawerMessage('本地草稿保存失败')
  }
}

function createCurrentOverlayDraft() {
  return {
    regions: regions.value,
    cuDevices: cuDevices.value,
    gwDevices: gwDevices.value,
    devices: [...cuDevices.value, ...gwDevices.value]
  }
}

function openDrawer(type, entity) {
  if (drawMode.value) return
  if (isConfigMode.value && (type === 'cu' || type === 'gw')) {
    if (activeEditTool.value === 'delete-device') {
      deleteDevice(entity)
      return
    }
    if (activeEditTool.value === 'select') {
      activeDrawer.value = { type, entity }
    }
    return
  }
  if (type === 'cu' || type === 'gw') {
    if (isActiveDevice(type, entity)) {
      closeDrawer()
      return
    }
    activeDrawer.value = { type, entity }
    return
  }
  activeDrawer.value = { type, entity }
}

function closeDrawer() {
  activeDrawer.value = null
}

function clearActiveDevice() {
  if (activeDrawer.value?.type === 'cu' || activeDrawer.value?.type === 'gw') {
    activeDrawer.value = null
  }
}

function commitDrawerMessage(message) {
  drawerMessage.value = message
  if (drawerMessageTimer) window.clearTimeout(drawerMessageTimer)
  drawerMessageTimer = window.setTimeout(() => {
    drawerMessage.value = ''
  }, 2400)
}

function focusRegion(region, options = {}) {
  const bbox = getRegionBBox(region.points)
  const targetViewBox = clampViewBox(fitViewBoxToBBox(bbox, options))

  return animateViewBoxTo(targetViewBox, options.durationMs ?? REGION_FOCUS_ANIMATION_MS)
}

function getRegionBBox(points) {
  const bbox = getPointsBBox(points)
  return {
    minX: bbox.minX,
    minY: bbox.minY,
    width: bbox.width,
    height: bbox.height
  }
}

function fitViewBoxToBBox(bbox, options = {}) {
  const paddingRatio = options.paddingRatio ?? REGION_FOCUS_PADDING_RATIO
  const svgRect = mapSvgRef.value?.getBoundingClientRect()
  const aspectRatio = svgRect?.width && svgRect?.height
    ? svgRect.width / svgRect.height
    : originalViewBox.value.width / originalViewBox.value.height || 1
  const padX = Math.max(12, bbox.width * paddingRatio)
  const padY = Math.max(12, bbox.height * 0.12)

  let targetWidth = bbox.width + padX * 2
  let targetHeight = bbox.height + padY * 2

  if (targetWidth / targetHeight > aspectRatio) {
    targetHeight = targetWidth / aspectRatio
  } else {
    targetWidth = targetHeight * aspectRatio
  }

  const centerX = bbox.minX + bbox.width / 2
  const centerY = bbox.minY + bbox.height / 2

  return {
    x: centerX - targetWidth / 2,
    y: centerY - targetHeight / 2,
    width: targetWidth,
    height: targetHeight
  }
}

function animateViewBoxTo(targetViewBox, durationMs = REGION_FOCUS_ANIMATION_MS) {
  stopViewBoxAnimation()

  if (isSameViewBox(currentViewBox.value, targetViewBox)) {
    currentViewBox.value = { ...targetViewBox }
    return Promise.resolve(true)
  }

  const startViewBox = { ...currentViewBox.value }
  const animationToken = viewBoxAnimationToken

  return new Promise((resolve) => {
    let startTime = 0

    const step = (timestamp) => {
      if (animationToken !== viewBoxAnimationToken) {
        resolve(false)
        return
      }

      if (!startTime) startTime = timestamp
      const progress = clamp((timestamp - startTime) / durationMs, 0, 1)
      const eased = easeOutCubic(progress)

      currentViewBox.value = {
        x: interpolate(startViewBox.x, targetViewBox.x, eased),
        y: interpolate(startViewBox.y, targetViewBox.y, eased),
        width: interpolate(startViewBox.width, targetViewBox.width, eased),
        height: interpolate(startViewBox.height, targetViewBox.height, eased)
      }

      if (progress >= 1) {
        viewBoxAnimationFrame = null
        currentViewBox.value = { ...targetViewBox }
        resolve(true)
        return
      }

      viewBoxAnimationFrame = window.requestAnimationFrame(step)
    }

    viewBoxAnimationFrame = window.requestAnimationFrame(step)
  })
}

function stopViewBoxAnimation() {
  viewBoxAnimationToken += 1
  if (viewBoxAnimationFrame) {
    window.cancelAnimationFrame(viewBoxAnimationFrame)
    viewBoxAnimationFrame = null
  }
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3)
}

function interpolate(start, end, progress) {
  return start + (end - start) * progress
}

function isSameViewBox(left, right) {
  const epsilon = 0.1
  return (
    Math.abs(left.x - right.x) < epsilon &&
    Math.abs(left.y - right.y) < epsilon &&
    Math.abs(left.width - right.width) < epsilon &&
    Math.abs(left.height - right.height) < epsilon
  )
}

function clampViewBox(viewBox) {
  const width = clamp(viewBox.width, 1, originalViewBox.value.width)
  const height = clamp(viewBox.height, 1, originalViewBox.value.height)
  const minX = originalViewBox.value.x
  const minY = originalViewBox.value.y
  const maxX = originalViewBox.value.x + originalViewBox.value.width - width
  const maxY = originalViewBox.value.y + originalViewBox.value.height - height

  return {
    x: clamp(viewBox.x, minX, maxX),
    y: clamp(viewBox.y, minY, maxY),
    width,
    height
  }
}

function getRegionLabel(region) {
  if (!region.points.length) return { x: 0, y: 0 }
  const bbox = getPointsBBox(region.points)
  const padX = Math.max(10, bbox.width * 0.08)
  const padY = Math.max(8, bbox.height * 0.14)
  const candidates = [
    { x: bbox.minX + bbox.width / 2, y: bbox.minY + padY },
    { x: bbox.minX + padX, y: bbox.minY + padY },
    { x: bbox.maxX - padX, y: bbox.minY + padY },
    { x: bbox.minX + padX, y: bbox.minY + bbox.height / 2 },
    { x: bbox.maxX - padX, y: bbox.minY + bbox.height / 2 },
    { x: bbox.minX + bbox.width / 2, y: bbox.maxY - padY }
  ].filter((point) => pointInPolygon(point, region.points))

  const devices = [...cuDevices.value, ...gwDevices.value].filter((device) => isDeviceInRegion(region, device))
  if (!candidates.length) return { x: bbox.minX + bbox.width / 2, y: bbox.minY + bbox.height / 2 }

  return candidates
    .map((point) => ({
      point,
      score: devices.reduce((minDistance, device) => Math.min(minDistance, getDistance(point, device)), Infinity)
    }))
    .sort((left, right) => right.score - left.score)[0].point
}

function getRegionDisplayCode(region) {
  return String(region.name || region.id).replace('GWA06#', '')
}

function getRegionStyle(region) {
  const color = region.color || REGION_COLORS[0]
  return {
    '--region-fill': color,
    '--region-stroke': color
  }
}

function isDeviceInFocusedRegion(device) {
  if (!focusedRegion.value) return true
  return isDeviceInRegion(focusedRegion.value, device)
}

function isDeviceInRegion(region, device) {
  if (!region || !device) return false
  if (device.regionId && device.regionId === region.id) return true
  if (region.memberIds.includes(device.id)) return true
  return pointInPolygon({ x: device.x, y: device.y }, region.points)
}

function shouldShowDeviceCode(device) {
  return deviceCodeLabelMap.value.has(device.id)
}

function getDeviceCodeLabel(device) {
  return deviceCodeLabelMap.value.get(device.id) || {
    x: device.x,
    y: device.y,
    text: '',
    fontSize: getDeviceCodeFontSize(),
    strokeWidth: getTextStrokeWidth()
  }
}

function buildDeviceCodeLabelMap() {
  const labelMap = new Map()
  if (!focusedRegion.value) return labelMap

  const fontSize = getDeviceCodeFontSize()
  const strokeWidth = getTextStrokeWidth()
  const placedBoxes = []
  const maxGeneralLabels = getMaxDeviceCodeLabels()
  let generalLabelCount = 0
  const devices = [...focusedCodeDevices.value].sort((left, right) => {
    const leftPriority = getDeviceLabelPriority(left)
    const rightPriority = getDeviceLabelPriority(right)
    return rightPriority - leftPriority || left.y - right.y || left.x - right.x
  })

  devices.forEach((device) => {
    const text = getDeviceCode(device)
    if (!text) return

    const priority = getDeviceLabelPriority(device)
    if (!priority && generalLabelCount >= maxGeneralLabels) return

    const iconSize = getDeviceIconSize(device)
    const x = device.x
    const y = device.y + iconSize / 2 + fontSize * 0.55
    const textWidth = estimateDeviceCodeWidth(text, fontSize)
    const paddingX = fontSize * 1.8
    const paddingY = fontSize * 0.9
    const box = {
      minX: x - textWidth / 2 - paddingX,
      maxX: x + textWidth / 2 + paddingX,
      minY: y - fontSize - paddingY,
      maxY: y + paddingY * 0.8
    }

    if (!priority && placedBoxes.some((placedBox) => areBoxesOverlapping(box, placedBox))) return

    placedBoxes.push(box)
    if (!priority) generalLabelCount += 1
    labelMap.set(device.id, {
      x,
      y,
      text,
      fontSize,
      strokeWidth
    })
  })

  return labelMap
}

function getMaxDeviceCodeLabels() {
  const deviceCount = focusedCodeDevices.value.length
  if (deviceCount <= 18) return deviceCount
  if (zoomLevel.value >= 4.2) return 32
  if (zoomLevel.value >= 3) return 24
  return 16
}

function getDeviceLabelPriority(device) {
  if (hoveredDeviceId.value === device.id) return 2
  if (isActiveDevice(device.type, device)) return 1
  return 0
}

function estimateDeviceCodeWidth(text, fontSize) {
  const wideCount = Array.from(text).filter((char) => char.charCodeAt(0) > 255).length
  return text.length * fontSize * 0.56 + wideCount * fontSize * 0.28
}

function areBoxesOverlapping(left, right) {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  )
}

function getDeviceCodeFontSize() {
  return getStableSvgFontSize(12.5, 2.1, 4.8)
}

function getRegionCodeFontSize() {
  return getStableSvgFontSize(15, 3.2, 9)
}

function getRegionBadgeFontSize() {
  return getStableSvgFontSize(12, 2.8, 8)
}

function getRegionTextStrokeWidth() {
  return getTextStrokeWidth(1.3)
}

function getTextStrokeWidth(baseScreenPx = 1) {
  const pxPerSvgUnit = getSvgPxPerUnit()
  return clamp(baseScreenPx / pxPerSvgUnit, 0.22, 0.9)
}

function getStableSvgFontSize(screenPx, minSize, maxSize) {
  const pxPerSvgUnit = getSvgPxPerUnit()
  return clamp(screenPx / pxPerSvgUnit, minSize, maxSize)
}

function getSvgPxPerUnit() {
  const width = mapViewportSize.value.width || 1200
  return width / Math.max(currentViewBox.value.width, 1)
}

function getDeviceCode(device) {
  const fields = device.sourceFields || {}
  const gwNo = getSourceField(fields, ['GWNO', 'GwNo', 'gwNo'])
  const zigbeeNo = getSourceField(fields, ['ZIGBEENO', 'ZigbeeNo', 'zigbeeNo', 'ZIGBEE_NO'])
  return [gwNo, zigbeeNo].filter(Boolean).join('  ')
}

function getSourceField(fields, keys) {
  return keys.map((key) => fields[key]).find((value) => value !== undefined && value !== null && value !== '') || ''
}

function getDistance(point, target) {
  return Math.hypot(point.x - target.x, point.y - target.y)
}

function pointsToString(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function getDeviceCandidateAnchor(candidate) {
  return { x: candidate.x, y: candidate.y }
}

function getRegionCandidateAnchor(candidate) {
  return {
    x: candidate.sourceBBox.minX + candidate.sourceBBox.width / 2,
    y: candidate.sourceBBox.minY + candidate.sourceBBox.height / 2
  }
}

function getPointsBBox(points) {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  points.forEach((point) => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  })

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
</script>

<style scoped>
.device-visualization-page {
  width: 100%;
  height: 100%;
  padding: 20px;
}

.page-content {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  height: 100%;
}

.nav-card,
.map-card {
  min-height: 0;
}

.tree-nav {
  flex: 1;
  overflow: auto;
  padding-right: 4px;
}

.tree-item {
  margin: 4px 0;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
}

.tree-node:hover {
  border-color: var(--line-main);
  background: rgba(89, 227, 255, 0.08);
  color: var(--text-1);
}

.tree-item.active > .tree-node {
  border-color: rgba(53, 246, 212, 0.46);
  background: linear-gradient(90deg, rgba(89, 227, 255, 0.12), rgba(53, 246, 212, 0.1));
  color: var(--accent-teal);
  box-shadow: inset 0 0 0 1px rgba(89, 227, 255, 0.08);
}

.tree-item.disabled > .tree-node {
  opacity: 0.48;
  cursor: not-allowed;
}

.tree-item.disabled > .tree-node:hover {
  border-color: transparent;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-2);
}

.tree-children {
  padding-left: 16px;
}

.arrow {
  width: 12px;
  font-size: 10px;
  color: var(--text-3);
  transition: transform 180ms var(--ease-out), color 180ms var(--ease-out);
}

.tree-item.collapsed > .tree-node .arrow {
  color: rgba(120, 232, 255, 0.62);
}

.node-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(89, 227, 255, 0.24);
  color: var(--accent-cyan);
  font-size: 11px;
}

.node-text {
  font-size: 14px;
}

.nav-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.summary-chip {
  padding: 12px 10px;
  border-radius: 10px;
  border: 1px solid var(--line-main);
  background: linear-gradient(180deg, rgba(8, 22, 36, 0.88), rgba(8, 22, 36, 0.55));
  text-align: center;
}

.summary-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-3);
  font-size: 12px;
  letter-spacing: 1px;
}

.summary-chip strong {
  color: var(--accent-teal);
  font-size: 18px;
  font-family: var(--font-num);
}

.map-card :deep(.card-body) {
  position: relative;
  padding: 16px;
}

.map-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-left: auto;
}

.layer-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.layer-btn {
  min-width: 52px;
}

.zoom-chip,
.toolbar-btn,
.section-tag,
.online-badge,
.scene-tab {
  border: 1px solid var(--line-main);
  border-radius: 999px;
}

.zoom-chip {
  padding: 6px 12px;
  background: rgba(89, 227, 255, 0.08);
  color: var(--accent-cyan);
  font-size: 12px;
  font-family: var(--font-num);
}

.toolbar-btn {
  padding: 7px 14px;
  background: rgba(8, 24, 40, 0.82);
  color: var(--text-2);
  font-size: 12px;
}

.toolbar-btn:hover,
.toolbar-btn.active {
  color: var(--accent-teal);
  border-color: rgba(53, 246, 212, 0.5);
  box-shadow: 0 0 16px rgba(53, 246, 212, 0.12);
}

.toolbar-btn.ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.map-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(210, 215, 220, 0.88);
  background:
    radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.92), transparent 34%),
    radial-gradient(circle at 78% 20%, rgba(224, 231, 239, 0.62), transparent 36%),
    linear-gradient(180deg, #f8f7f2 0%, #f1eee7 52%, #e8e5de 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 0 0 1px rgba(255, 255, 255, 0.42),
    0 14px 30px rgba(5, 13, 24, 0.18);
}

.map-backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.5), transparent 46%),
    radial-gradient(circle at 50% 100%, rgba(180, 186, 194, 0.2), transparent 66%);
  pointer-events: none;
}

.map-svg {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  shape-rendering: geometricPrecision;
  text-rendering: geometricPrecision;
}

.map-svg.is-middle-panning {
  cursor: grabbing;
}

.map-svg.is-zoomed {
  shape-rendering: geometricPrecision;
}

.map-base-bg {
  fill: transparent;
}

.map-floor-layer {
  opacity: 0.84;
  filter: none;
}

.map-floor-layer.crisp {
  opacity: 0.9;
}

.map-floor-layer.detail {
  opacity: 0.94;
}

:deep(.map-floor-layer path),
:deep(.map-floor-layer line),
:deep(.map-floor-layer polyline),
:deep(.map-floor-layer polygon),
:deep(.map-floor-layer rect),
:deep(.map-floor-layer circle),
:deep(.map-floor-layer ellipse) {
  shape-rendering: geometricPrecision;
  text-rendering: geometricPrecision;
  vector-effect: non-scaling-stroke;
}

.interactive-node {
  cursor: pointer;
}

.region-shape {
  fill: var(--region-fill);
  fill-opacity: 0.32;
  stroke: var(--region-stroke);
  stroke-width: 1.9;
  vector-effect: non-scaling-stroke;
  transition: fill-opacity 0.18s ease, stroke-width 0.18s ease, opacity 0.18s ease;
}

.region-shape:hover {
  fill-opacity: 0.4;
  stroke-width: 2.5;
}

.region-shape.active {
  fill-opacity: 0.46;
  stroke-width: 3;
  filter: drop-shadow(0 0 5px rgba(80, 112, 148, 0.18));
}

.region-shape.dimmed {
  opacity: 0.24;
}

.region-label-group {
  pointer-events: none;
}

.region-label {
  fill: #ffffff;
  text-anchor: middle;
  font-weight: 700;
  paint-order: stroke;
  stroke: rgba(44, 54, 66, 0.48);
  stroke-linejoin: round;
}

.region-badge {
  fill: rgba(255, 255, 255, 0.92);
  text-anchor: middle;
  font-weight: 600;
  paint-order: stroke;
  stroke: rgba(44, 54, 66, 0.42);
  pointer-events: none;
}

.region-edit-handles {
  pointer-events: all;
}

.region-edit-handle {
  fill: #ffcb72;
  stroke: rgba(7, 17, 30, 0.85);
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;
  cursor: grab;
}

.region-edit-handle:hover {
  fill: #58efdb;
}

.device-hit-area {
  fill: transparent;
  pointer-events: all;
}

.device-icon {
  pointer-events: none;
  filter: drop-shadow(0 2px 3px rgba(4, 12, 20, 0.34));
}

.device-icon.offline {
  opacity: 0.45;
  filter: grayscale(1) drop-shadow(0 2px 3px rgba(4, 12, 20, 0.3));
}

.device-icon.active {
  filter:
    drop-shadow(0 2px 3px rgba(4, 12, 20, 0.34))
    drop-shadow(0 0 7px rgba(255, 204, 88, 0.68));
}

.device-icon-outline {
  fill: none;
  stroke: rgba(255, 204, 88, 0.92);
  stroke-width: 1.4;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.device-code {
  fill: rgba(255, 255, 255, 0.95);
  text-anchor: middle;
  font-family: var(--font-num);
  paint-order: stroke;
  stroke: rgba(21, 29, 40, 0.78);
  stroke-linejoin: round;
  pointer-events: none;
}

.device-layer .interactive-node.dimmed {
  opacity: 0.16;
}

.focus-mask-layer {
  pointer-events: none;
}

.focus-dim {
  fill: #17212d;
  opacity: 0.3;
}

.drawing-preview {
  fill: rgba(255, 204, 88, 0.18);
  stroke: none;
  pointer-events: none;
}

.drawing-line {
  fill: none;
  stroke: rgba(255, 204, 88, 0.92);
  stroke-width: 2.2;
  stroke-dasharray: 6 6;
  pointer-events: none;
}

.drawing-point {
  fill: #ffcc58;
  stroke: rgba(255, 255, 255, 0.8);
  stroke-width: 1.2;
  pointer-events: none;
}

.drawing-start {
  fill: rgba(255, 204, 88, 0.08);
  stroke: #ffcc58;
  stroke-width: 1.4;
  pointer-events: none;
}

.draw-capture {
  fill: transparent;
  cursor: crosshair;
}

.map-tools-panel {
  position: absolute;
  top: 16px;
  left: 18px;
  z-index: 14;
  width: 184px;
  display: grid;
  gap: 8px;
  overflow: visible;
}

.map-legend {
  position: absolute;
  left: 18px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(89, 227, 255, 0.18);
  background: rgba(6, 17, 31, 0.74);
  backdrop-filter: blur(10px);
}

.map-legend {
  position: static;
  flex-wrap: wrap;
  gap: 7px 10px;
  padding: 8px 10px;
  border-radius: 12px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-2);
  font-size: 11px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.cu {
  background: #35f6d4;
  box-shadow: 0 0 10px rgba(53, 246, 212, 0.5);
}

.legend-dot.gw {
  background: #7aa2ff;
  box-shadow: 0 0 10px rgba(122, 162, 255, 0.5);
}

.legend-dot.area {
  background: #ffcc58;
  box-shadow: 0 0 10px rgba(255, 204, 88, 0.5);
}

.map-minimap {
  width: 184px;
  height: 132px;
  padding: 5px;
  border-radius: 12px;
  border: 1px solid rgba(89, 227, 255, 0.2);
  background: rgba(6, 17, 31, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.minimap-svg {
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}

.minimap-bg {
  fill: rgba(225, 229, 232, 0.2);
}

.minimap-floor-layer {
  opacity: 0.46;
  pointer-events: none;
}

:deep(.minimap-floor-layer path),
:deep(.minimap-floor-layer line),
:deep(.minimap-floor-layer polyline),
:deep(.minimap-floor-layer polygon),
:deep(.minimap-floor-layer rect),
:deep(.minimap-floor-layer circle),
:deep(.minimap-floor-layer ellipse) {
  vector-effect: non-scaling-stroke;
}

.minimap-region {
  fill: var(--region-fill);
  fill-opacity: 0.22;
  stroke: var(--region-stroke);
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.minimap-region.active {
  fill-opacity: 0.44;
  stroke-width: 2;
}

.minimap-device {
  fill: rgba(255, 255, 255, 0.78);
  stroke: rgba(20, 32, 44, 0.55);
  stroke-width: 0.5;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.minimap-viewbox {
  fill: rgba(89, 227, 255, 0.08);
  stroke: rgba(53, 246, 212, 0.95);
  stroke-width: 1.6;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.map-operation-bar {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 15;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 520px);
  min-height: 36px;
  padding: 5px 8px 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(89, 227, 255, 0.26);
  background: rgba(6, 17, 31, 0.84);
  box-shadow: 0 12px 28px rgba(3, 10, 20, 0.24);
  backdrop-filter: blur(12px);
  transform: translateX(-50%);
}

.operation-title {
  color: rgba(234, 243, 252, 0.86);
  font-size: 12px;
  white-space: nowrap;
}

.operation-title::after {
  content: '';
  display: inline-block;
  width: 1px;
  height: 14px;
  margin-left: 8px;
  vertical-align: middle;
  background: rgba(89, 227, 255, 0.22);
}

.operation-btn {
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid rgba(89, 227, 255, 0.2);
  border-radius: 999px;
  background: rgba(8, 24, 40, 0.88);
  color: rgba(234, 243, 252, 0.78);
  font-size: 12px;
}

.operation-btn:hover {
  color: #58efdb;
  border-color: rgba(53, 246, 212, 0.54);
}

.operation-btn.primary {
  color: #58efdb;
}

.operation-btn.danger {
  color: #ffcb72;
}

.operation-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  box-shadow: none;
}

.map-control-dock {
  position: absolute;
  left: 50%;
  bottom: 16px;
  z-index: 8;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100% - 48px);
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px solid rgba(89, 227, 255, 0.26);
  background: rgba(6, 17, 31, 0.82);
  box-shadow:
    0 12px 28px rgba(3, 10, 20, 0.26),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  transform: translateX(-50%);
}

.dock-zoom {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 156px;
  padding: 0 6px 0 2px;
}

.dock-label {
  min-width: 82px;
  color: var(--accent-cyan);
  font-size: 12px;
  font-family: var(--font-num);
  text-align: center;
}

.dock-icon-btn,
.dock-action-btn {
  border: 1px solid rgba(89, 227, 255, 0.28);
  background: rgba(8, 24, 40, 0.9);
  color: var(--text-2);
}

.dock-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
}

.dock-action-btn {
  min-height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
}

.dock-icon-btn:hover,
.dock-action-btn:hover {
  color: var(--accent-teal);
  border-color: rgba(53, 246, 212, 0.56);
  box-shadow: 0 0 16px rgba(53, 246, 212, 0.12);
}

.status-text {
  color: var(--text-2);
  font-size: 12px;
}

.status-feedback {
  color: var(--accent-teal);
  font-size: 12px;
  font-family: var(--font-num);
}

.map-shortcut-hint {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 10;
  max-width: calc(50% - 160px);
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid rgba(184, 215, 235, 0.14);
  border-radius: 999px;
  background: rgba(17, 30, 47, 0.72);
  color: rgba(234, 243, 252, 0.72);
  font-size: 12px;
  box-shadow: 0 8px 20px rgba(3, 10, 20, 0.18);
  backdrop-filter: blur(10px);
  pointer-events: none;
  white-space: nowrap;
}

.map-error {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 107, 122, 0.4);
  background: rgba(54, 12, 18, 0.9);
  color: #ffdce1;
  font-size: 12px;
}

.debug-panel {
  position: absolute;
  top: 78px;
  right: 18px;
  z-index: 3;
  width: 240px;
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 204, 88, 0.32);
  background: rgba(16, 21, 31, 0.9);
  color: var(--text-2);
  font-size: 12px;
}

.debug-title {
  color: #ffcc58;
  font-family: var(--font-num);
  letter-spacing: 0.4px;
}

.debug-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
}

.debug-copy {
  color: var(--text-3);
  line-height: 1.5;
}

.debug-region-box,
.debug-device-point,
.debug-device-label {
  pointer-events: none;
}

.debug-region-box {
  fill: rgba(255, 204, 88, 0.05);
  stroke: rgba(255, 204, 88, 0.78);
  stroke-width: 1.2;
  stroke-dasharray: 4 4;
}

.debug-device-point {
  fill: rgba(255, 107, 122, 0.92);
  stroke: rgba(255, 255, 255, 0.88);
  stroke-width: 1.2;
}

.debug-device-label {
  fill: #ffcc58;
  font-size: 9px;
  font-family: var(--font-num);
}

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
  z-index: 4;
  transform-origin: right center;
  will-change: transform, opacity;
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
  color: var(--accent-cyan);
  font-size: 13px;
  font-family: var(--font-num);
  font-weight: 700;
  flex-shrink: 0;
}

.drawer-title-box {
  min-width: 0;
}

.drawer-title {
  font-size: 16px;
  color: var(--text-1);
  margin-bottom: 4px;
}

.drawer-subtitle {
  color: var(--text-3);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.online-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: #65f6b0;
  font-size: 12px;
  background: rgba(53, 246, 212, 0.08);
}

.online-badge i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
}

.online-badge.offline {
  color: #ff8d9b;
  background: rgba(255, 107, 122, 0.08);
}

.drawer-close {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(89, 227, 255, 0.34);
  background: rgba(8, 24, 40, 0.86);
  color: var(--text-1);
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
  box-shadow: inset 0 0 0 1px rgba(89, 227, 255, 0.05);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: var(--text-1);
  font-size: 15px;
}

.section-tag {
  padding: 5px 12px;
  font-size: 11px;
  color: var(--text-1);
  background: rgba(89, 227, 255, 0.08);
}

.button-grid {
  display: grid;
  gap: 12px;
}

.button-grid.two,
.button-grid.by-two {
  grid-template-columns: repeat(2, 1fr);
}

.action-btn {
  min-height: 42px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 225, 255, 0.35);
  background: rgba(6, 17, 31, 0.76);
  color: var(--text-2);
  font-size: 14px;
}

.action-btn:hover,
.action-btn.active,
.scene-tab.active {
  color: var(--accent-teal);
  border-color: rgba(53, 246, 212, 0.58);
  background: linear-gradient(90deg, rgba(89, 227, 255, 0.12), rgba(53, 246, 212, 0.12));
  box-shadow: 0 0 18px rgba(53, 246, 212, 0.12);
}

.section-desc {
  margin-top: 10px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.55;
}

.section-desc.dim {
  padding-top: 4px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(89, 227, 255, 0.26);
  background: rgba(6, 17, 31, 0.7);
}

.metric-label {
  display: block;
  margin-bottom: 10px;
  color: var(--text-2);
  font-size: 12px;
}

.metric-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(89, 227, 255, 0.22);
  background: rgba(4, 14, 28, 0.74);
  color: var(--accent-teal);
  font-family: var(--font-num);
}

.metric-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--accent-teal);
  font-size: 22px;
  font-family: var(--font-num);
  text-align: right;
}

.metric-input::-webkit-outer-spin-button,
.metric-input::-webkit-inner-spin-button {
  margin: 0;
}

.time-stack {
  display: grid;
  gap: 12px;
}

.time-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(89, 227, 255, 0.18);
  background: rgba(6, 17, 31, 0.72);
}

.time-title {
  color: var(--text-1);
  font-size: 14px;
}

.time-copy {
  color: var(--text-3);
  font-size: 12px;
}

.time-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--accent-teal);
  font-family: var(--font-num);
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
  color: var(--text-2);
  font-size: 13px;
}

.status-row strong {
  color: var(--text-1);
  font-family: var(--font-num);
  font-weight: 600;
}

.scene-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.scene-tab {
  padding: 9px 14px;
  background: rgba(6, 17, 31, 0.66);
  color: var(--text-2);
  font-size: 13px;
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
  grid-template-columns: 1.6fr 0.8fr 0.8fr;
  gap: 12px;
  padding: 12px 14px;
  font-size: 12px;
}

.table-head {
  color: var(--text-1);
  border-bottom: 1px solid rgba(89, 227, 255, 0.2);
}

.table-body {
  max-height: 246px;
  overflow: auto;
}

.table-row {
  color: var(--text-2);
}

.table-row + .table-row {
  border-top: 1px solid rgba(89, 227, 255, 0.08);
}

.table-empty {
  padding: 24px 14px;
  color: var(--text-3);
  text-align: center;
  font-size: 12px;
}

.footer-btn {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(53, 246, 212, 0.45);
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(89, 227, 255, 0.14), rgba(53, 246, 212, 0.2));
  color: var(--text-1);
  font-size: 15px;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition:
    transform 280ms cubic-bezier(0.2, 0.9, 0.2, 1),
    opacity 220ms ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateX(34px) scale(0.985);
}

@media (max-width: 1360px) {
  .page-content {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .control-drawer {
    width: 360px;
  }

  .map-control-dock {
    max-width: calc(100% - 420px);
  }

  .map-operation-bar {
    top: 64px;
    max-width: calc(100% - 460px);
  }

  .map-shortcut-hint {
    max-width: 280px;
  }
}

@media (max-width: 1080px) {
  .device-visualization-page {
    padding: 14px;
  }

  .page-content {
    grid-template-columns: 1fr;
    grid-template-rows: 220px minmax(0, 1fr);
  }

  .map-toolbar {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .control-drawer {
    left: 12px;
    width: auto;
  }

  .map-control-dock {
    max-width: calc(100% - 36px);
  }

  .map-operation-bar {
    top: 14px;
    right: 16px;
    left: auto;
    max-width: calc(100% - 240px);
    transform: none;
  }

  .map-shortcut-hint {
    display: none;
  }
}

@media (max-width: 768px) {
  .map-toolbar {
    margin-left: 0;
    justify-content: flex-start;
  }

  .map-legend {
    left: 10px;
    right: 10px;
    width: auto;
    border-radius: 14px;
  }

  .map-legend {
    top: 10px;
    flex-wrap: wrap;
  }

  .map-control-dock {
    bottom: 10px;
    width: calc(100% - 20px);
    justify-content: center;
    flex-wrap: wrap;
    border-radius: 16px;
  }

  .map-operation-bar {
    left: 10px;
    right: 10px;
    justify-content: center;
    max-width: none;
    transform: none;
  }

  .control-drawer {
    top: auto;
    bottom: 10px;
    max-height: calc(100% - 90px);
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>


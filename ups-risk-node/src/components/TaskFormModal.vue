<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑任务' : '创建任务'"
    width="1100px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="resetForm"
  >
    <!-- Steps -->
    <div class="steps-bar">
      <div v-for="(s, i) in steps" :key="i" class="step-item" :class="{ active: step === i }" @click="step = i">
        <span class="step-num">{{ i + 1 }}</span>
        <span class="step-label">{{ s }}</span>
      </div>
    </div>

    <!-- Step 1: 基础信息 -->
    <div v-show="step === 0" class="step-content">
      <div class="form-section">
        <div class="form-section-title">基本信息</div>
        <div class="form-row">
          <el-form-item label="任务名称" class="form-g">
            <el-input v-model="form.taskName" placeholder="请输入任务名称" maxlength="50" :disabled="isStepReadonly(0)" />
          </el-form-item>
          <el-form-item label="风控节点" class="form-g">
            <el-select v-model="form.nodeCode" placeholder="请选择风控节点" style="width:100%" :disabled="isStepReadonly(0)">
              <el-option
                v-for="n in nodeList"
                :key="n.code"
                :label="getNodeLabel(n)"
                :value="n.code"
                :disabled="isNodeDisabled(n.code)"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="备注" class="form-g" style="flex:1">
            <el-input v-model="form.remark" type="textarea" placeholder="请输入备注信息（选填）" maxlength="200" show-word-limit :rows="3" :disabled="isStepReadonly(0)" />
            <span class="form-hint">最多200个字符</span>
          </el-form-item>
        </div>
      </div>
    </div>

    <!-- Step 2: SQL配置 -->
    <div v-show="step === 1" class="step-content">
      <div class="form-section">
        <div class="form-section-title">SQL编辑器</div>
        <div class="sql-info-bar">
          <div class="sql-info-item">
            <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#faad14"/></svg>
            <span>输出字段：<b>req_channel</b>, <b>uid</b>, <b>cust_id</b>, <b>device_id</b>, <b>os</b>；（<b>cust_type</b> 可选）</span>
          </div>
          <div class="sql-info-item">
            <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#1890ff"/></svg>
            <span>权限不足时，请将Schema、Table对 <code>p4_200501648399786664</code> 授权后即可</span>
          </div>
        </div>
        <div class="sql-editor-wrap">
          <div class="sql-toolbar">
            <span class="sql-lang">SQL</span>
            <div class="sql-toolbar-right">
              <el-button link size="small" class="sql-format-btn" @click="formatSql" :disabled="isStepReadonly(1)">格式化</el-button>
              <span class="sql-shortcut">Ctrl+Enter 测试执行</span>
            </div>
          </div>
          <div class="sql-highlight-wrap">
            <pre class="sql-backdrop" ref="sqlBackdropRef"><code v-html="highlightedSql"></code></pre>
            <textarea
              v-model="form.sqlContent"
              class="sql-editor"
              placeholder="SELECT req_channel, uid, cust_id, device_id, os&#10;FROM t_risk_customer&#10;WHERE status = 1"
              spellcheck="false"
              @scroll="syncScroll"
              @input="onSqlInput"
              @keydown="onSqlKeydown"
              :disabled="isStepReadonly(1)"
              ref="sqlEditorRef"
            ></textarea>
          </div>
        </div>
        <div class="mt-12">
          <el-button @click="testSql" :loading="testLoading" :disabled="isStepReadonly(1)">
            <el-icon><CaretRight /></el-icon> 测试执行 (LIMIT 5)
          </el-button>
        </div>
        <div v-if="sqlError" class="sql-error-msg">
          <el-icon><WarningFilled /></el-icon> {{ sqlError }}
        </div>
        <div v-if="testResult" class="sql-test-result">
          <div class="result-header">
            <span>测试结果</span>
            <span class="badge badge-success">执行成功</span>
            <span class="text-muted">（已自动添加 LIMIT 5）</span>
          </div>
          <div class="total-count-box">
            <svg viewBox="0 0 1024 1024" width="16" height="16" style="vertical-align:middle;margin-right:6px;"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#1890ff"/></svg>
            <b>完整SQL总行数：{{ formatNumber(testResult.totalCount) }} 条</b>（不含LIMIT），以下为前 5 条预览，预计跑批完成需要 {{ estimatedMinutes(testResult.totalCount) }} 分钟
          </div>
          <el-table v-if="testResult.rows && testResult.rows.length > 0" :data="testResult.rows" border stripe size="small" max-height="260">
            <el-table-column v-for="f in testResult.fields" :key="f" :prop="f" :label="f" min-width="130" show-overflow-tooltip />
          </el-table>
          <div v-else-if="testResult.rows" class="text-muted" style="margin-top:8px;">查询结果为空</div>
        </div>
      </div>
    </div>

    <!-- Step 3: Cron配置 -->
    <div v-show="step === 2" class="step-content">
      <div class="form-section">
        <div class="form-section-title">Cron表达式配置 <span class="text-muted" style="font-weight:400;">（时区：UTC+0）</span></div>
        <div class="cron-row">
          <div class="form-g cron-input">
            <label class="cron-label"><span class="required">*</span> Cron表达式</label>
            <el-input v-model="form.cronExpression" placeholder="0 0 2 * * ?" readonly @click="cronPop = !cronPop" style="cursor:pointer" :disabled="isStepReadonly(2)">
              <template #append>
                <span @click="cronPop = !cronPop">点击配置</span>
              </template>
            </el-input>
            <span class="form-hint">所有时间均为 UTC+0 时区，请按0时区配置</span>
          </div>
        </div>

        <!-- Visual Cron Builder -->
        <div v-if="cronPop" class="cron-popover">
          <div class="cron-popover-tabs">
            <span v-for="t in cronTabs" :key="t.key" class="cp-tab" :class="{ active: cronTab === t.key }" @click="cronTab = t.key">{{ t.label }}</span>
          </div>
          <div class="cron-popover-body">
            <!-- 秒 -->
            <div v-show="cronTab === 'sec'" class="cp-pane">
              <div class="cp-row"><label><input type="radio" value="*" v-model="cronState.sec" @change="buildCronResult"> 每一秒钟</label></div>
              <div class="cp-row"><label><input type="radio" value="every" v-model="cronMode.sec" @change="onCronModeChange('sec')"> 每隔 <input type="number" v-model="cronInterval.sec" min="1" max="60" @change="onCronIntervalChange('sec')"> 秒执行 从 <input type="number" v-model="cronFrom.sec" min="0" max="59" @change="onCronIntervalChange('sec')"> 秒开始</label></div>
              <div class="cp-row"><label><input type="radio" value="range" v-model="cronMode.sec" @change="onCronModeChange('sec')"> 周期从 <input type="number" v-model="cronRange1.sec" min="0" max="59" @change="onCronRangeChange('sec')"> 到 <input type="number" v-model="cronRange2.sec" min="0" max="59" @change="onCronRangeChange('sec')"> 秒</label></div>
            </div>
            <!-- 分 -->
            <div v-show="cronTab === 'min'" class="cp-pane">
              <div class="cp-row"><label><input type="radio" value="*" v-model="cronState.min" @change="buildCronResult"> 每一分钟</label></div>
              <div class="cp-row"><label><input type="radio" value="every" v-model="cronMode.min" @change="onCronModeChange('min')"> 每隔 <input type="number" v-model="cronInterval.min" min="1" max="60" @change="onCronIntervalChange('min')"> 分执行 从 <input type="number" v-model="cronFrom.min" min="0" max="59" @change="onCronIntervalChange('min')"> 分开始</label></div>
              <div class="cp-row"><label><input type="radio" value="range" v-model="cronMode.min" @change="onCronModeChange('min')"> 周期从 <input type="number" v-model="cronRange1.min" min="0" max="59" @change="onCronRangeChange('min')"> 到 <input type="number" v-model="cronRange2.min" min="0" max="59" @change="onCronRangeChange('min')"> 分</label></div>
            </div>
            <!-- 时 -->
            <div v-show="cronTab === 'hour'" class="cp-pane">
              <div class="cp-row"><label><input type="radio" value="*" v-model="cronState.hour" @change="buildCronResult"> 每一小时</label></div>
              <div class="cp-row"><label><input type="radio" value="every" v-model="cronMode.hour" @change="onCronModeChange('hour')"> 每隔 <input type="number" v-model="cronInterval.hour" min="1" max="23" @change="onCronIntervalChange('hour')"> 小时执行 从 <input type="number" v-model="cronFrom.hour" min="0" max="23" @change="onCronIntervalChange('hour')"> 小时开始</label></div>
              <div class="cp-row"><label><input type="radio" value="range" v-model="cronMode.hour" @change="onCronModeChange('hour')"> 周期从 <input type="number" v-model="cronRange1.hour" min="0" max="23" @change="onCronRangeChange('hour')"> 到 <input type="number" v-model="cronRange2.hour" min="0" max="23" @change="onCronRangeChange('hour')"> 小时</label></div>
            </div>
            <!-- 天 -->
            <div v-show="cronTab === 'day'" class="cp-pane">
              <div class="cp-row"><label><input type="radio" value="*" v-model="cronMode.day" @change="onDayModeChange('*')"> 每一天</label></div>
              <div class="cp-row"><label><input type="radio" value="every" v-model="cronMode.day" @change="onDayModeChange('every')"> 每隔 <input type="number" v-model="cronDayInterval" min="1" max="31" @change="onDayIntervalChange"> 天执行 从 <input type="number" v-model="cronDayFrom" min="1" max="31" @change="onDayIntervalChange"> 天开始</label></div>
              <div class="cp-row"><label><input type="radio" value="week" v-model="cronMode.day" @change="onDayModeChange('week')"> 每周
                <select v-model="cronDayOfWeek" @change="onDayWeekChange" style="height:28px;padding:0 6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px;">
                  <option value="1">周一</option><option value="2">周二</option><option value="3">周三</option><option value="4">周四</option><option value="5">周五</option><option value="6">周六</option><option value="7">周日</option>
                </select> 执行</label></div>
              <div class="cp-row"><label><input type="radio" value="last" v-model="cronMode.day" @change="onDayModeChange('last')"> 在这个月的最后一天</label></div>
              <div class="cp-row"><label><input type="radio" value="range" v-model="cronMode.day" @change="onDayModeChange('range')"> 周期从 <input type="number" v-model="cronRange1.day" min="1" max="31" @change="onDayRangeChange"> 到 <input type="number" v-model="cronRange2.day" min="1" max="31" @change="onDayRangeChange"> 天</label></div>
            </div>
            <!-- 月 -->
            <div v-show="cronTab === 'month'" class="cp-pane">
              <div class="cp-row"><label><input type="radio" value="*" v-model="cronState.month" @change="buildCronResult"> 每一月</label></div>
              <div class="cp-row"><label><input type="radio" value="every" v-model="cronMode.month" @change="onCronModeChange('month')"> 每隔 <input type="number" v-model="cronInterval.month" min="1" max="12" @change="onCronIntervalChange('month')"> 月执行 从 <input type="number" v-model="cronFrom.month" min="1" max="12" @change="onCronIntervalChange('month')"> 月开始</label></div>
              <div class="cp-row"><label><input type="radio" value="range" v-model="cronMode.month" @change="onCronModeChange('month')"> 从 <input type="number" v-model="cronRange1.month" min="1" max="12" @change="onCronRangeChange('month')"> 到 <input type="number" v-model="cronRange2.month" min="1" max="12" @change="onCronRangeChange('month')"> 月</label></div>
            </div>
            <!-- 年 -->
            <div v-show="cronTab === 'year'" class="cp-pane">
              <div class="cp-row"><label><input type="radio" value="*" @change="buildCronResult"> 每一年</label></div>
            </div>
          </div>
          <div class="cron-popover-footer">
            <span class="cp-result">{{ buildCronExpr() }}</span>
            <div style="display:flex;gap:8px;">
              <el-button type="primary" size="small" @click="applyCron">保存</el-button>
              <el-button size="small" @click="cronPop = false">关闭</el-button>
          </div>
        </div>
      </div>

        <div class="schedule-preview">
          <h4>后续5次执行计划</h4>
          <ul>
            <li v-if="cronPlans.length === 0 && !form.cronExpression" class="text-muted">请输入Cron表达式后自动计算</li>
            <li v-else-if="cronPlans.length === 0" class="text-muted">无法解析Cron表达式，请检查格式</li>
            <li v-for="(p, i) in cronPlans" :key="i">第{{ i + 1 }}次：{{ p.time }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Step 4: 结果应用配置 -->
    <div v-show="step === 3" class="step-content">
      <div class="form-section">
        <div class="form-section-title">结果应用配置</div>

        <!-- 结果自动应用 -->
        <div class="strategy-card">
          <div class="strategy-card-header">
            <span class="strategy-label">结果自动应用</span>
            <el-switch v-model="form.autoApply" size="small" :disabled="isStepReadonly(3)" />
          </div>
          <div class="strategy-card-body" v-if="form.autoApply">
            <!-- 全量应用 -->
            <div class="strategy-sub-row">
              <span class="strategy-label" style="font-weight:400">全量应用</span>
              <el-switch v-model="form.fullApply" size="small" :disabled="isStepReadonly(3)" />
            </div>
            <div class="strategy-hint">
              {{ form.fullApply ? '执行后自动将全部回调数据提交应用' : '执行后按以下SQL筛选结果自动提交应用' }}
            </div>
            <div v-if="!form.fullApply" class="strategy-sql-section" style="margin-top:12px">
              <div class="sql-info-bar">
                <div class="sql-info-item">
                  <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#faad14"/></svg>
                  <span>必须输出字段：<b>req_channel</b>, <b>uid</b>, <b>cust_id</b>, <b>device_id</b>, <b>os</b></span>
                </div>
                <div class="sql-info-item">
                  <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#1890ff"/></svg>
                  <span>权限不足时，请将Schema、Table对 <code>p4_200501648399786664</code> 授权后即可</span>
                </div>
              </div>
              <div class="sql-editor-wrap" style="height:140px">
                <div class="sql-toolbar">
                  <span class="sql-lang">SQL</span>
                  <div class="sql-toolbar-right">
                    <el-button link size="small" class="sql-format-btn" @click="formatApplySql">格式化</el-button>
                    <span class="sql-shortcut">Ctrl+Enter 测试执行</span>
                  </div>
                </div>
                <div class="sql-highlight-wrap" style="height:100px">
                  <pre class="sql-backdrop" ref="applySqlBackdropRef" style="height:100px"><code v-html="highlightedApplySql"></code></pre>
                  <textarea
                    v-model="form.applySqlContent"
                    class="sql-editor"
                    style="height:100px"
                    placeholder="SELECT req_channel, uid, cust_id, device_id, os&#10;FROM t_risk_execution_detail d&#10;WHERE d.execution_id = :execution_id&#10;AND d.callback_status = 1"
                    spellcheck="false"
                    @scroll="syncApplySqlScroll"
                    @keydown="onApplySqlKeydown"
                    :disabled="isStepReadonly(3)"
                    ref="applySqlEditorRef"
                  ></textarea>
                </div>
              </div>
              <div class="mt-12">
                <el-button @click="testApplySql" :loading="applySqlTesting" :disabled="isStepReadonly(3)">
                  <el-icon><CaretRight /></el-icon> 测试执行 (LIMIT 5)
                </el-button>
              </div>
              <div v-if="applySqlError" class="sql-error-msg">
                <el-icon><WarningFilled /></el-icon> {{ applySqlError }}
              </div>
              <div v-if="applySqlResult" class="sql-test-result">
                <div class="result-header">
                  <span>测试结果</span>
                  <span class="badge badge-success">执行成功</span>
                  <span class="text-muted">（已自动添加 LIMIT 5）</span>
                </div>
                <div class="total-count-box">
                  <svg viewBox="0 0 1024 1024" width="16" height="16" style="vertical-align:middle;margin-right:6px;"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#1890ff"/></svg>
                  <b>匹配记录总数：{{ formatNumber(applySqlResult.totalCount) }} 条</b>
                </div>
                <el-table v-if="applySqlResult.rows && applySqlResult.rows.length > 0" :data="applySqlResult.rows" border stripe size="small" max-height="200">
                  <el-table-column v-for="f in applySqlResult.fields" :key="f" :prop="f" :label="f" min-width="130" show-overflow-tooltip />
                </el-table>
        </div>

        <!-- 分组配置 -->
        <div class="strategy-card" style="margin-top:12px">
          <div class="strategy-card-header">
            <span class="strategy-label">分组配置</span>
          </div>
          <div class="strategy-card-body">
            <!-- 空跑模式 -->
            <div class="strategy-sub-row">
              <span class="strategy-label" style="font-weight:400">空跑模式</span>
              <el-switch v-model="form.taskDryRun" size="small" :disabled="isStepReadonly(3)" @change="onTaskDryRunChange" />
            </div>
            <div v-if="form.taskDryRun" class="strategy-hint" style="margin-bottom:8px">所有分组均不推送业务系统，直接落表空跑</div>

            <!-- 分组列表 -->
            <div class="group-list" style="margin-top:8px">
              <div v-for="(g, i) in form.taskGroups" :key="i" class="group-item">
                <div class="group-badge">[{{ g.name }}]</div>
                <el-input v-model="g.alias" placeholder="别名（选填）" size="small" style="width:120px" :disabled="isStepReadonly(3)" />
                <div class="group-ratio">
                  <el-input-number v-model="g.ratio" :min="0" :max="100" :precision="1" :step="0.1" size="small" style="width:90px" :disabled="isStepReadonly(3)" @change="onTaskGroupRatioChange" />
                  <span class="group-ratio-label">%</span>
                </div>
                <div class="group-push">
                  <el-switch v-model="g.pushEnabled" size="small" :disabled="isStepReadonly(3) || form.taskDryRun" />
                  <span class="group-push-label">{{ g.pushEnabled ? '推送' : '不推送' }}</span>
                </div>
                <el-button v-if="form.taskGroups.length > 1" type="danger" link size="small" @click="removeTaskGroup(i)" :disabled="isStepReadonly(3)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            <el-button link type="primary" size="small" @click="addTaskGroup" :disabled="form.taskGroups.length >= 5 || isStepReadonly(3)" style="margin-top:4px">
              + 添加分组（{{ form.taskGroups.length }}/5）
            </el-button>
          </div>
        </div>

        <!-- 盐值配置 -->
        <div class="strategy-card" style="margin-top:12px">
          <div class="strategy-card-header">
            <span class="strategy-label">盐值配置</span>
          </div>
          <div class="strategy-card-body">
            <div class="strategy-hint" style="margin-bottom:8px">多选来源，按添加顺序 ":" 拼接后取 MD5，只读不可修改</div>
            <el-checkbox-group v-model="form.taskSaltKeys" :disabled="isStepReadonly(3)">
              <el-checkbox v-for="s in taskSaltSources" :key="s.key" :label="s.key">
                {{ s.label }}
              </el-checkbox>
            </el-checkbox-group>
            <el-input v-model="form.taskCustomSalt" placeholder="自定义盐值（选填）" size="small" :disabled="isStepReadonly(3)" style="margin-top:8px;width:240px" clearable />
            <div class="salt-result" style="margin-top:8px">
              <span class="salt-raw">md5("{{ taskSaltRaw }}")</span>
              <el-input :model-value="taskComputedSalt" readonly size="small" style="font-family:monospace;color:#1890ff;width:320px">
                <template #prepend>当前盐值</template>
              </el-input>
            </div>
          </div>
        </div>
      </div>
    </div>
          <div class="strategy-card-body" v-else>
            <div class="strategy-hint">执行后不自动应用，需手动在已执行任务页操作</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5: 运营策略配置（仅运营可编辑） -->
    <div v-show="step === 4" class="step-content">
      <div class="form-section">
        <div class="form-section-title">运营策略配置<span v-if="isOpsView" class="text-muted">（运营编辑）</span></div>

        <!-- 运营策略选择 -->
        <div class="strategy-card">
          <div class="strategy-card-header">
            <span class="strategy-label">运营策略选择</span>
            <el-button v-if="opsPairCount < opsProductList.length" link type="primary" size="small" @click="addOpsPair" :disabled="isStepReadonly(4)">
              + 添加
            </el-button>
          </div>
          <div class="strategy-card-body">
            <div v-for="(pair, i) in form.opsPairs" :key="i" class="ops-pair-row">
              <div class="form-g" style="flex:1">
                <label class="strategy-sub-label" style="margin-bottom:4px;font-size:12px">产品</label>
                <el-select v-model="pair.product" placeholder="请选择产品" size="small" style="width:100%" :disabled="isStepReadonly(4)" @change="onOpsPairProductChange(i)">
                  <el-option
                    v-for="p in availableOpsProducts(i)"
                    :key="p.code"
                    :label="`${p.name}（${p.code}）`"
                    :value="p.code"
                  />
                </el-select>
              </div>
              <div class="form-g" style="flex:1">
                <label class="strategy-sub-label" style="margin-bottom:4px;font-size:12px">策略</label>
                <el-select v-model="pair.strategy" placeholder="请选择策略" size="small" style="width:100%" :disabled="isStepReadonly(4) || !pair.product" filterable>
                  <el-option
                    v-for="s in getOpsStrategiesForProduct(pair.product)"
                    :key="s.code"
                    :label="`${s.name}（${s.code}）`"
                    :value="s.code"
                  />
                </el-select>
              </div>
              <el-button v-if="form.opsPairs.length > 1" type="danger" link size="small" @click="removeOpsPair(i)" :disabled="isStepReadonly(4)" style="margin-top:18px">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 营销策略推送时间窗口 -->
        <div class="strategy-card" style="margin-top:12px">
          <div class="strategy-card-header">
            <span class="strategy-label">营销策略推送时间窗口</span>
            <el-switch v-model="form.t0Enabled" size="small" :disabled="isStepReadonly(4)" />
          </div>
          <div class="strategy-card-body" v-if="form.t0Enabled">
            <div class="form-row">
              <div class="form-g">
                <label class="strategy-sub-label">推送起始时间</label>
                <el-time-picker v-model="form.t0TimeStart" placeholder="选择起始时间" value-format="HH:mm:ss" style="width:100%" :disabled="isStepReadonly(4)" />
              </div>
              <div class="form-g">
                <label class="strategy-sub-label">推送结束时间</label>
                <el-time-picker v-model="form.t0TimeEnd" placeholder="选择结束时间" value-format="HH:mm:ss" style="width:100%" :disabled="isStepReadonly(4)" />
              </div>
            </div>
            <div class="strategy-hint">配置时间为 UTC+0 时区。超出时间窗口的客群逐条标记为丢弃</div>
          </div>
          <div class="strategy-card-body" v-else>
            <div class="strategy-hint">不限制推送时间窗口</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <el-button v-if="step > 0" @click="step--">上一步</el-button>
        <el-button v-if="step < 4" type="primary" @click="nextStep">下一步</el-button>
        <el-button v-if="step === 4" type="primary" @click="submit" :loading="submitting">
          {{ isEdit ? '确认修改' : '确认创建' }}
        </el-button>
        <el-button @click="visible = false">取消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createTask, updateTask, testSql as testSqlApi, testConfirmSql, getSaltSources, getStrategyList, getProductList } from '../api'
import { validateSqlFields, calcNextExecutions } from '../utils/sql-validator'
import { md5 } from '../utils/crypto'

const props = defineProps({
  nodeList: { type: Array, default: () => [] },
  readonlySteps: { type: Boolean, default: false },
  editableStep: { type: Number, default: -1 },
  step5Readonly: { type: Boolean, default: false },
  startStep: { type: Number, default: 0 },
})
const emit = defineEmits(['saved'])

const steps = ['基础信息', 'SQL配置', '执行时间', '结果应用配置', '运营策略配置']
const isOpsView = computed(() => props.readonlySteps && props.editableStep >= 0)

function isStepReadonly(stepIndex) {
  if (props.step5Readonly && stepIndex === 4) return true
  if (!props.readonlySteps) return false
  return stepIndex !== props.editableStep
}
const visible = ref(false)
const step = ref(0)
const submitting = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const testLoading = ref(false)
const testResult = ref(null)
const sqlError = ref('')
const cronPlans = ref([])
const cronPop = ref(false)
const cronTab = ref('sec')
const sqlEditorRef = ref(null)
const sqlBackdropRef = ref(null)

const cronTabs = [
  { key: 'sec', label: '秒' },
  { key: 'min', label: '分' },
  { key: 'hour', label: '时' },
  { key: 'day', label: '天' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]

const form = reactive({
  taskName: '', nodeCode: '', sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_customer\nWHERE status = 1', cronExpression: '0 0 2 * * ?', remark: '',
  autoApply: false, fullApply: true, applySqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1',
  t0Enabled: false, t0TimeStart: '09:00:00', t0TimeEnd: '20:00:00',
  taskDryRun: false,
  taskGroups: [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }],
  taskSaltKeys: ['executionId'],
  taskCustomSalt: '',
  opsStrategy: '',
  opsProduct: '',
  opsPairs: [{ product: '', strategy: '' }],
})

const applySqlTesting = ref(false)
const applySqlResult = ref(null)
const applySqlError = ref('')
const applySqlEditorRef = ref(null)
const applySqlBackdropRef = ref(null)

const taskSaltSources = ref([])
const taskGroupNames = ['A', 'B', 'C', 'D', 'E']

const taskSaltRaw = computed(() => {
  const parts = form.taskSaltKeys.map(k => {
    if (k === 'executionId') return ':execution_id'
    if (k === 'taskId') return ':task_id'
    if (k === 'nodeCode') return ':node_code'
    if (k === 'batch') return ':batch'
    if (k === 'createTime') return ':create_time'
    return ''
  }).filter(Boolean)
  if (form.taskCustomSalt.trim()) parts.push(form.taskCustomSalt.trim())
  return parts.join(':')
})

const taskComputedSalt = computed(() => {
  if (!taskSaltRaw.value) return ''
  return md5(taskSaltRaw.value)
})

function onTaskDryRunChange(val) {
  if (val) form.taskGroups.forEach(g => { g.pushEnabled = false })
}

function addTaskGroup() {
  if (form.taskGroups.length >= 5) return
  const nextName = taskGroupNames[form.taskGroups.length]
  const ratio = parseFloat((100 / (form.taskGroups.length + 1)).toFixed(1))
  let remainder = parseFloat((100 - ratio * (form.taskGroups.length + 1)).toFixed(1))
  form.taskGroups.forEach(g => { g.ratio = ratio })
  if (remainder !== 0) {
    const last = form.taskGroups[form.taskGroups.length - 1]
    if (last) last.ratio = parseFloat((last.ratio + remainder).toFixed(1))
  }
  form.taskGroups.push({ name: nextName, alias: '', pushEnabled: !form.taskDryRun, ratio })
  redistributeTaskRatios()
}

function removeTaskGroup(index) {
  if (form.taskGroups.length <= 1) return
  form.taskGroups.splice(index, 1)
  form.taskGroups.forEach((g, i) => { g.name = taskGroupNames[i] })
  redistributeTaskRatios()
}

function redistributeTaskRatios() {
  const n = form.taskGroups.length
  if (n === 0) return
  const base = parseFloat((100 / n).toFixed(1))
  let sum = parseFloat((base * n).toFixed(1))
  const remainder = parseFloat((100 - sum).toFixed(1))
  form.taskGroups.forEach(g => { g.ratio = base })
  if (remainder !== 0) {
    const last = form.taskGroups[form.taskGroups.length - 1]
    if (last) last.ratio = parseFloat((last.ratio + remainder).toFixed(1))
  }
}

function onTaskGroupRatioChange() {}

async function fetchTaskSaltSources() {
  try {
    const { data: res } = await getSaltSources()
    if (res.code === 200) taskSaltSources.value = res.data
  } catch { /* mock */ }
}

const opsStrategyList = ref([])
const opsProductList = ref([])

const filteredOpsStrategies = computed(() => {
  if (!form.opsProduct) return []
  return opsStrategyList.value.filter(s => s.productCode === form.opsProduct)
})

const selectedOpsStrategy = computed(() => {
  return opsStrategyList.value.find(s => s.code === form.opsStrategy)
})

const opsPairCount = computed(() => form.opsPairs.length)

function availableOpsProducts(currentIndex) {
  const usedCodes = form.opsPairs
    .filter((_, i) => i !== currentIndex)
    .map(p => p.product)
    .filter(Boolean)
  return opsProductList.value.filter(p => !usedCodes.includes(p.code))
}

function getOpsStrategiesForProduct(productCode) {
  if (!productCode) return []
  return opsStrategyList.value.filter(s => s.productCode === productCode)
}

function addOpsPair() {
  if (form.opsPairs.length >= opsProductList.value.length) return
  form.opsPairs.push({ product: '', strategy: '' })
}

function removeOpsPair(index) {
  if (form.opsPairs.length <= 1) return
  form.opsPairs.splice(index, 1)
}

function onOpsPairProductChange(index) {
  form.opsPairs[index].strategy = ''
}

async function fetchOpsStrategies() {
  try {
    const { data: res } = await getStrategyList()
    if (res.code === 200) opsStrategyList.value = res.data
  } catch { /* mock */ }
}

async function fetchOpsProducts() {
  try {
    const { data: res } = await getProductList()
    if (res.code === 200) opsProductList.value = res.data
  } catch { /* mock */ }
}

// Cron state matching prototype
const cronState = reactive({ sec: '0', min: '0', hour: '2', day: '*', month: '*', week: '?' })
const cronMode = reactive({ sec: '', min: '', hour: '', day: '', month: '' })
const cronInterval = reactive({ sec: 5, min: 5, hour: 2, month: 1 })
const cronFrom = reactive({ sec: 0, min: 0, hour: 0, month: 1 })
const cronRange1 = reactive({ sec: 1, min: 0, hour: 9, day: 1, month: 1 })
const cronRange2 = reactive({ sec: 5, min: 30, hour: 18, day: 15, month: 6 })
const cronDayInterval = ref(1)
const cronDayFrom = ref(1)
const cronDayOfWeek = ref('1')

function getNodeLabel(n) {
  if (isEdit.value && n.code === form.nodeCode) return n.name + ' (当前)'
  return n.name
}

function isNodeDisabled() {
  return false
}

// Apply SQL highlighting
const APPLY_SQL_KEYWORDS = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MAX|MIN|EXISTS)\b/gi

const highlightedApplySql = computed(() => {
  const sql = form.applySqlContent || ''
  let html = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/(--.*)/g, '<span style="color:#6e7781;font-style:italic">$1</span>')
  html = html.replace(/('[^']*')/g, '<span style="color:#0a3069">$1</span>')
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#0550ae">$1</span>')
  html = html.replace(APPLY_SQL_KEYWORDS, '<span style="color:#0550ae;font-weight:600">$1</span>')
  return html + '\n'
})

function syncApplySqlScroll() {
  if (applySqlBackdropRef.value) {
    applySqlBackdropRef.value.scrollTop = applySqlEditorRef.value.scrollTop
  }
}

function formatApplySql() {
  let sql = form.applySqlContent.trim()
  if (!sql) return
  sql = sql.replace(/\s+/g, ' ')
  sql = sql.replace(APPLY_SQL_KEYWORDS, m => m.toUpperCase())
  sql = sql.replace(/\s*\b(SELECT)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(FROM)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(WHERE)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(AND)\b/gi, '\n  $1')
  sql = sql.replace(/\bSELECT\s+/gi, 'SELECT\n  ')
  sql = sql.replace(/,\s*/g, ',\n  ')
  form.applySqlContent = sql.replace(/^\n+/, '')
}

function onApplySqlKeydown(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    testApplySql()
  }
}

async function testApplySql() {
  if (!form.applySqlContent.trim()) { ElMessage.warning('请先输入筛选SQL'); return }
  applySqlTesting.value = true
  applySqlError.value = ''
  applySqlResult.value = null
  try {
    const { data: res } = await testConfirmSql({ sqlContent: form.applySqlContent })
    if (res.code === 200) {
      applySqlResult.value = res.data
    } else {
      applySqlError.value = res.msg
      ElMessage.error(res.msg)
    }
  } catch {
    applySqlError.value = '测试执行异常'
  } finally {
    applySqlTesting.value = false
  }
}

// SQL highlighting
const SQL_KEYWORDS = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|TABLE|DROP|INDEX|COUNT|SUM|AVG|MAX|MIN|EXISTS)\b/gi

const highlightedSql = computed(() => {
  const sql = form.sqlContent || ''
  let html = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/(--.*)/g, '<span style="color:#6e7781;font-style:italic">$1</span>')
  html = html.replace(/('[^']*')/g, '<span style="color:#0a3069">$1</span>')
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#0550ae">$1</span>')
  html = html.replace(SQL_KEYWORDS, '<span style="color:#0550ae;font-weight:600">$1</span>')
  return html + '\n'
})

function syncScroll() {
  if (sqlBackdropRef.value) {
    sqlBackdropRef.value.scrollTop = sqlEditorRef.value.scrollTop
  }
}

function onSqlInput() {
  sqlError.value = ''
  testResult.value = null
}

function onSqlKeydown(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    testSql()
  }
}

function formatSql() {
  let sql = form.sqlContent.trim()
  if (!sql) return
  sql = sql.replace(/\s+/g, ' ')
  const MAIN_CLAUSES = /\b(SELECT|FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|UNION|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|JOIN|ON)\b/gi
  sql = sql.replace(MAIN_CLAUSES, m => m.toUpperCase())
  const SUB = /\b(AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|AS|ASC|DESC|DISTINCT|ALL|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MAX|MIN|EXISTS|SET)\b/gi
  sql = sql.replace(SUB, m => m.toUpperCase())
  sql = sql.replace(/\s*\b(SELECT)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(FROM)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(WHERE)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(AND)\b/gi, '\n  $1')
  sql = sql.replace(/\s*\b(OR)\b/gi, '\n   $1')
  sql = sql.replace(/\s*\b(ORDER\s+BY)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(GROUP\s+BY)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(HAVING)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(LIMIT)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(OFFSET)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|JOIN)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(ON)\b/gi, '\n  $1')
  sql = sql.replace(/\s*\b(UNION)\b/gi, '\n$1\n')
  sql = sql.replace(/\bSELECT\s+/gi, 'SELECT\n  ')
  sql = sql.replace(/,\s*/g, ',\n  ')
  sql = sql.replace(/(SELECT\n  )\n  /g, '$1')
  sql = sql.replace(/^\n+/, '')
  sql = sql.replace(/\n{3,}/g, '\n\n')
  form.sqlContent = sql
}

function formatNumber(num) {
  if (num == null || num === '-') return '-'
  return Number(num).toLocaleString()
}

function estimatedMinutes(totalCount) {
  if (!totalCount || totalCount === '-') return '-'
  return Math.max(1, Math.ceil(Number(totalCount) / 8000))
}

// Cron builder
function buildCronExpr() {
  return `${cronState.sec} ${cronState.min} ${cronState.hour} ${cronState.day} ${cronState.month} ${cronState.week}`
}

function buildCronResult() {
  // called on radio changes for sec/min/hour/month
}

function onCronModeChange(field) {
  const mode = cronMode[field]
  if (mode === '*') {
    cronState[field] = '*'
  } else if (mode === 'every') {
    cronState[field] = `*/${cronInterval[field]}`
  } else if (mode === 'range') {
    cronState[field] = `${cronRange1[field]}-${cronRange2[field]}`
  }
}

function onCronIntervalChange(field) {
  if (cronMode[field] === 'every') {
    cronState[field] = `*/${cronInterval[field]}`
  }
}

function onCronRangeChange(field) {
  if (cronMode[field] === 'range') {
    cronState[field] = `${cronRange1[field]}-${cronRange2[field]}`
  }
}

function onDayModeChange(mode) {
  if (mode === '*') {
    cronState.day = '*'
    cronState.week = '?'
  } else if (mode === 'every') {
    cronState.day = `*/${cronDayInterval.value}`
    cronState.week = '?'
  } else if (mode === 'week') {
    cronState.day = '?'
    cronState.week = cronDayOfWeek.value
  } else if (mode === 'last') {
    cronState.day = 'L'
    cronState.week = '?'
  } else if (mode === 'range') {
    cronState.day = `${cronRange1.day}-${cronRange2.day}`
    cronState.week = '?'
  }
}

function onDayIntervalChange() {
  if (cronMode.day === 'every') {
    cronState.day = `*/${cronDayInterval.value}`
    cronState.week = '?'
  }
}

function onDayWeekChange() {
  if (cronMode.day === 'week') {
    cronState.day = '?'
    cronState.week = cronDayOfWeek.value
  }
}

function onDayRangeChange() {
  if (cronMode.day === 'range') {
    cronState.day = `${cronRange1.day}-${cronRange2.day}`
    cronState.week = '?'
  }
}

function applyCron() {
  form.cronExpression = buildCronExpr()
  cronPop.value = false
  schedulePreview()
}

function parseCronToState(expr) {
  const parts = expr.split(/\s+/)
  if (parts.length !== 6) return
  cronState.sec = parts[0]; cronState.min = parts[1]; cronState.hour = parts[2]
  cronState.day = parts[3]; cronState.month = parts[4]; cronState.week = parts[5]
}

function schedulePreview() {
  cronPlans.value = calcNextExecutions(form.cronExpression, 5)
}

function open(row) {
  resetForm()
  parseCronToState('0 0 2 * * ?')
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.taskName = row.taskName
    form.nodeCode = row.nodeCode
    form.sqlContent = row.sqlContent
    form.cronExpression = row.cronExpression
    form.remark = row.remark || ''
    form.autoApply = row.autoApply || false
    form.fullApply = row.fullApply !== undefined ? row.fullApply : true
    form.applySqlContent = row.applySqlContent || 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1'
    form.t0Enabled = row.t0Enabled || false
    form.t0TimeStart = row.t0TimeStart || '09:00:00'
    form.t0TimeEnd = row.t0TimeEnd || '20:00:00'
    form.taskDryRun = row.taskDryRun || false
    form.taskGroups = row.taskGroups && row.taskGroups.length ? [...row.taskGroups] : [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }]
    form.taskSaltKeys = row.taskSaltKeys || ['executionId']
    form.taskCustomSalt = row.taskCustomSalt || ''
    form.opsStrategy = row.opsStrategy || ''
    form.opsProduct = row.opsProduct || ''
    form.opsPairs = row.opsPairs && row.opsPairs.length ? [...row.opsPairs] : [{ product: '', strategy: '' }]
    form.opsStrategy = row.opsStrategy || ''
    parseCronToState(row.cronExpression || '0 0 2 * * ?')
    schedulePreview()
  } else {
    isEdit.value = false
    editId.value = null
    form.taskName = ''
    form.nodeCode = ''
    form.sqlContent = 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_customer\nWHERE status = 1'
    form.cronExpression = '0 0 2 * * ?'
    form.remark = ''
    form.autoApply = false
    form.fullApply = true
    form.applySqlContent = 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1'
    form.t0Enabled = false
    form.t0TimeStart = '09:00:00'
    form.t0TimeEnd = '20:00:00'
    form.taskDryRun = false
    form.taskGroups = [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }]
  form.taskSaltKeys = ['executionId']
  form.taskCustomSalt = ''
    form.taskCustomSalt = ''
    form.opsStrategy = ''
    form.opsProduct = ''
    form.opsPairs = [{ product: '', strategy: '' }]
  }
  visible.value = true
  step.value = row ? props.startStep : 0
  cronPop.value = false
  fetchTaskSaltSources()
  fetchOpsProducts()
  fetchOpsStrategies()
}

function resetForm() {
  form.taskName = ''
  form.nodeCode = ''
  form.sqlContent = 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_customer\nWHERE status = 1'
  form.cronExpression = '0 0 2 * * ?'
  form.remark = ''
  form.autoApply = false
  form.fullApply = true
  form.applySqlContent = 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1'
  form.t0Enabled = false
  form.t0TimeStart = '09:00:00'
  form.t0TimeEnd = '20:00:00'
  form.taskDryRun = false
  form.taskGroups = [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }]
  form.taskSaltKeys = ['executionId']
  form.opsStrategy = ''
  form.opsProduct = ''
  form.opsPairs = [{ product: '', strategy: '' }]
  step.value = 0
  testResult.value = null
  sqlError.value = ''
  applySqlResult.value = null
  applySqlError.value = ''
  cronPlans.value = []
  submitting.value = false
  cronPop.value = false
}

async function nextStep() {
  if (step.value === 0) {
    if (!form.taskName.trim()) { ElMessage.warning('请输入任务名称'); return }
    if (!form.nodeCode) { ElMessage.warning('请选择风控节点'); return }
  }
  if (step.value === 1) {
    if (!form.sqlContent.trim()) { ElMessage.warning('请输入SQL语句'); return }
    const validation = validateSqlFields(form.sqlContent)
    if (!validation.valid) {
      sqlError.value = validation.msg
      ElMessage.error(validation.msg)
      return
    }
    sqlError.value = ''
  }
  if (step.value === 2) {
    if (!form.cronExpression.trim()) { ElMessage.warning('请输入Cron表达式'); return }
    if (form.cronExpression.split(/\s+/).length < 6) { ElMessage.warning('Cron表达式格式不正确'); return }
  }
  step.value++
  if (step.value === 2) {
    schedulePreview()
  }
}

async function testSql() {
  if (!form.sqlContent.trim()) { ElMessage.warning('请先输入SQL语句'); return }
  const validation = validateSqlFields(form.sqlContent)
  if (!validation.valid) {
    sqlError.value = validation.msg
    ElMessage.error(validation.msg)
    return
  }
  sqlError.value = ''
  testLoading.value = true
  try {
    const { data: res } = await testSqlApi({ sqlContent: form.sqlContent })
    if (res.code === 200) {
      testResult.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  } catch {
    ElMessage.error('测试执行异常')
  } finally {
    testLoading.value = false
  }
}

async function submit() {
  if (!form.cronExpression.trim()) { ElMessage.warning('请输入Cron表达式'); return }
  if (form.cronExpression.split(/\s+/).length < 6) { ElMessage.warning('Cron表达式格式不正确'); return }
  submitting.value = true
  const data = {
    id: editId.value,
    taskName: form.taskName,
    nodeCode: form.nodeCode,
    sqlContent: form.sqlContent,
    cronExpression: form.cronExpression,
    remark: form.remark,
    autoApply: form.autoApply,
    fullApply: form.fullApply,
    applySqlContent: form.autoApply && !form.fullApply ? form.applySqlContent : '',
    t0Enabled: form.t0Enabled,
    t0TimeStart: form.t0Enabled ? form.t0TimeStart : null,
    t0TimeEnd: form.t0Enabled ? form.t0TimeEnd : null,
    taskDryRun: form.taskDryRun,
    taskGroups: form.taskGroups,
    taskSaltKeys: form.taskSaltKeys,
    taskCustomSalt: form.taskCustomSalt,
    opsStrategy: form.opsStrategy,
    opsProduct: form.opsProduct,
    opsPairs: form.opsPairs,
  }
  try {
    const apiFn = isEdit.value ? updateTask : createTask
    const { data: res } = await apiFn(data)
    if (res.code === 200) {
      ElMessage.success(res.msg)
      visible.value = false
      emit('saved')
    } else {
      ElMessage.error(res.msg)
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
/* Steps */
.steps-bar { display: flex; margin-bottom: 24px; }
.step-item { flex: 1; display: flex; align-items: center; gap: 8px; padding: 12px 16px;
  background: #fafafa; border: 1px solid #f0f0f0; cursor: pointer; transition: all .2s; }
.step-item:first-child { border-radius: 6px 0 0 6px; }
.step-item:last-child { border-radius: 0 6px 6px 0; }
.step-item.active { background: #e6f7ff; border-color: #1890ff; color: #1890ff; }
.step-item.active .step-num { background: #1890ff; color: #fff; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: #d9d9d9;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; flex-shrink: 0; }
.step-label { font-size: 13px; font-weight: 500; }
.step-content { min-height: 380px; }

/* Form */
.form-section { margin-bottom: 24px; }
.form-section-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 16px;
  padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 8px; }
.form-section-title::before { content: ''; width: 3px; height: 16px; background: #1890ff; border-radius: 2px; }
.form-row { display: flex; gap: 16px; margin-bottom: 16px; }
.form-g { flex: 1; min-width: 0; }
.form-g :deep(.el-form-item) { margin-bottom: 0; }
.form-hint { font-size: 12px; color: #999; margin-top: 4px; display: block; }
.mt-12 { margin-top: 12px; }
.text-muted { color: #999; font-size: 12px; }

/* SQL Editor */
.sql-editor-wrap { border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden; }
.sql-editor-wrap:focus-within { border-color: #1890ff; box-shadow: 0 0 0 2px rgba(24,144,255,.1); }
.sql-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;
  background: #fafafa; border-bottom: 1px solid #f0f0f0; }
.sql-lang { font-size: 12px; color: #999; }
.sql-toolbar-right { display: flex; gap: 8px; align-items: center; }
.sql-format-btn { color: #1890ff; }
.sql-shortcut { font-size: 12px; color: #999; }
.sql-highlight-wrap { position: relative; height: 280px; }
.sql-backdrop {
  margin: 0; padding: 12px; height: 280px; overflow: auto;
  font-family: "SF Mono","Fira Code","Consolas",monospace; font-size: 13px;
  line-height: 1.6; tab-size: 2; white-space: pre; background: #fff; color: #333;
  position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;
}
.sql-editor {
  display: block; width: 100%; height: 280px; padding: 12px; border: none;
  resize: none; outline: none;
  font-family: "SF Mono","Fira Code","Consolas",monospace; font-size: 13px;
  line-height: 1.6; tab-size: 2; color: transparent; caret-color: #333;
  background: transparent; position: relative; z-index: 2;
  overflow: auto; white-space: pre;
}
.sql-info-bar {
  display: flex; gap: 12px; margin-bottom: 12px;
}
.sql-info-item {
  flex: 1; padding: 8px 12px; border-radius: 6px;
  font-size: 12px; display: flex; align-items: center; gap: 6px;
}
.sql-info-item:first-child { background: #fffbe6; color: #ad8b00; border: 1px solid #ffe58f; }
.sql-info-item:last-child { background: #e6f7ff; color: #0050b3; border: 1px solid #91d5ff; }
.sql-info-item code {
  font-family: monospace; font-size: 12px; color: #409eff; background: #d6ebff; padding: 1px 6px; border-radius: 3px;
}
.sql-info-item b { font-weight: 600; }
.sql-error-msg { display: flex; align-items: center; gap: 6px; margin-top: 8px;
  padding: 8px 12px; background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7;
  border-radius: 6px; font-size: 13px; }

.sql-test-result { margin-top: 16px; }
.result-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  font-size: 13px; font-weight: 600; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.badge-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.total-count-box {
  margin-bottom: 12px; padding: 10px 14px; background: #e6f7ff;
  border: 1px solid #91d5ff; border-radius: 6px; font-size: 13px;
}

/* Cron */
.cron-row { display: flex; gap: 12px; align-items: flex-start; }
.cron-input { flex: 1; }
.cron-label { font-size: 13px; color: #5F6B7A; margin-bottom: 6px; display: block; }
.required { color: #f56c6c; margin-right: 4px; }
.cron-popover {
  border: 1px solid #d9d9d9; border-radius: 8px; background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,.1); margin-top: 8px; }
.cron-popover-tabs { display: flex; border-bottom: 2px solid #e8e8e8; padding: 0 12px; background: #fafafa; border-radius: 8px 8px 0 0; }
.cp-tab { padding: 8px 16px; font-size: 13px; color: #666; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s; }
.cp-tab:hover { color: #1890ff; }
.cp-tab.active { color: #1890ff; border-bottom-color: #1890ff; font-weight: 600; }
.cron-popover-body { padding: 12px; max-height: 280px; overflow-y: auto; }
.cp-row { margin-bottom: 8px; }
.cp-row label { font-size: 13px; color: #333; display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 0; }
.cp-row label input[type="radio"] { margin: 0; }
.cp-row label input[type="number"] { width: 60px; height: 28px; padding: 0 6px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 12px; text-align: center; }
.cp-row label select { height: 28px; padding: 0 6px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 12px; }
.cron-popover-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-top: 1px solid #e8e8e8; background: #fafafa; border-radius: 0 0 8px 8px; }
.cp-result { font-family: 'SF Mono','Consolas',monospace; font-size: 16px; font-weight: 700; color: #1890ff; background: #e6f7ff; padding: 4px 14px; border-radius: 4px; }

.schedule-preview {
  margin-top: 16px; padding: 12px 16px; background: #f6ffed;
  border-radius: 6px; border: 1px solid #b7eb8f;
}
.schedule-preview h4 { font-size: 13px; color: #52c41a; margin: 0 0 8px; }
.schedule-preview ul { padding-left: 16px; margin: 0; }
.schedule-preview li { font-size: 13px; color: #333; line-height: 1.8; }

.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }

/* Strategy Step */
.strategy-card {
  background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; margin-bottom: 16px;
  overflow: hidden;
}
.strategy-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #fafafa; border-bottom: 1px solid #f0f0f0;
}
.strategy-label { font-size: 13px; font-weight: 600; color: #333; }
.strategy-card-body { padding: 12px 16px; }
.strategy-hint {
  font-size: 12px; color: #909399; line-height: 1.6; margin-top: 4px;
}
.strategy-sub-label {
  font-size: 13px; color: #5F6B7A; margin-bottom: 6px; display: block;
}
.strategy-sub-row {
  display: flex; align-items: center; justify-content: space-between; padding: 8px 0;
}

/* Group config */
.group-list { display: flex; flex-direction: column; gap: 8px; }
.group-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fafafa; border-radius: 6px; border: 1px solid #f0f0f0; }
.group-badge { font-family: 'SF Mono','Consolas',monospace; font-size: 13px; font-weight: 700; color: #1890ff; background: #e6f7ff; padding: 2px 10px; border-radius: 4px; flex-shrink: 0; }
.group-ratio { display: flex; align-items: center; gap: 2px; }
.group-ratio-label { font-size: 12px; color: #666; }
.group-push { display: flex; align-items: center; gap: 6px; }
.group-push-label { font-size: 12px; color: #666; white-space: nowrap; }

.salt-result { display: flex; flex-direction: column; gap: 6px; }
.salt-raw { font-family: 'SF Mono',monospace; font-size: 12px; color: #999; }

.ops-pair-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }

</style>

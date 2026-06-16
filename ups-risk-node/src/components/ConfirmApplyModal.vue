<template>
  <el-dialog
    v-model="visible"
    title="结果确认与应用"
    width="900px"
    destroy-on-close
    @closed="resetForm"
  >
    <template v-if="execution">
      <el-descriptions :column="3" border size="small" style="margin-bottom:20px">
        <el-descriptions-item label="任务名称">{{ execution.taskName }}</el-descriptions-item>
        <el-descriptions-item label="批次号">{{ execution.batch }}</el-descriptions-item>
        <el-descriptions-item label="风控节点">{{ execution.nodeName }}</el-descriptions-item>
        <el-descriptions-item label="执行时间">{{ execution.execTime }}</el-descriptions-item>
        <el-descriptions-item label="总客群数">{{ execution.totalCount }}</el-descriptions-item>
        <el-descriptions-item label="回调完成数">
          <span style="color:#67c23a">{{ callbackDone }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <!-- Step 1: Filter SQL -->
      <el-divider content-position="left">步骤1：筛选待应用客群</el-divider>
      <div class="sql-section">
        <div class="sql-header">
          <span>筛选SQL</span>
          <span class="sql-hint">
            可从回调数据字段中筛选，例如：<code>WHERE new_limit > old_limit</code>
          </span>
        </div>
        <el-input
          v-model="filterSql"
          type="textarea"
          :rows="4"
          placeholder="SELECT d.id, d.unique_id&#10;FROM t_risk_execution_detail d&#10;LEFT JOIN t_risk_execution_log e ON d.execution_id = e.id&#10;WHERE d.execution_id = ? AND d.callback_status = 1 AND ..."
        />
        <div class="sql-toolbar">
          <el-button size="small" type="primary" @click="testFilterSql" :loading="testing">
            <el-icon><CaretRight /></el-icon> 测试执行
          </el-button>
          <span v-if="testCount !== null" class="test-count">
            匹配记录数：<b style="color:#409eff">{{ testCount }}</b>
          </span>
        </div>
      </div>

      <!-- Step 2: Confirm and apply -->
      <el-divider content-position="left">步骤2：推送应用请求</el-divider>
      <div class="apply-section">
        <p class="apply-desc">
          将筛选出的客群 <code>unique_id</code> 批量推送到 Kafka <code>upstream.risk.node.apply.request</code> 主题，
          业务系统收到后应用结果并通过 <code>upstream.risk.node.apply.response</code> 回传应用状态。
        </p>
        <div class="apply-stats">
          <el-statistic title="待应用客群数" :value="testCount || 0" />
          <el-statistic title="预计批次数" :value="Math.ceil((testCount || 0) / 200)" />
        </div>
      </div>
    </template>

    <!-- 分组配置与盐值 -->
    <div style="margin-bottom:16px">
      <el-divider content-position="left">分组配置与盐值</el-divider>

      <!-- 空跑模式 -->
      <div class="group-row" style="align-items:center;margin-bottom:8px">
        <span style="font-weight:600;font-size:13px;color:#333">空跑模式</span>
        <el-switch v-model="dryRun" size="small" @change="onDryRunChange" />
      </div>
      <div v-if="dryRun" class="strategy-hint" style="margin-bottom:12px">所有分组均不推送到业务系统，直接落表空跑</div>

      <!-- 分组列表 -->
      <div class="group-list">
        <div v-for="(g, i) in groups" :key="i" class="group-row">
          <span class="group-name">[{{ g.name }}]</span>
          <el-input v-model="g.alias" placeholder="别名（选填）" size="small" style="width:120px" />
          <div class="group-ratio">
            <el-input-number v-model="g.ratio" :min="0" :max="100" :precision="1" :step="0.1" size="small" style="width:90px" @change="onRatioChange" />
            <span style="font-size:12px;color:#666">%</span>
          </div>
          <div class="group-push">
            <el-switch v-model="g.pushEnabled" size="small" :disabled="dryRun" />
            <span style="font-size:12px;color:#666">{{ g.pushEnabled ? '推送' : '不推送' }}</span>
          </div>
          <el-button v-if="groups.length > 1" type="danger" link size="small" @click="removeGroup(i)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <el-button link type="primary" size="small" @click="addGroup" :disabled="groups.length >= 5 || dryRun" style="margin-top:4px">
        + 添加分组（{{ groups.length }}/5）
      </el-button>

      <!-- 分组预览 -->
      <div v-if="testCount !== null && testCount > 0" class="group-preview" style="margin-top:12px">
        <div class="strategy-hint" style="margin-bottom:8px">预计分配（总数 {{ testCount }} 条）</div>
        <div v-for="(g, i) in groups" :key="'p'+i" class="preview-row">
          <span class="group-name" style="font-size:11px;padding:1px 6px">[{{ g.name }}]</span>
          <span style="font-size:12px;color:#666">{{ g.alias || '-' }}</span>
          <span style="font-size:12px;color:#1890ff;font-weight:600">{{ g.ratio }}%</span>
          <span style="font-size:12px;color:#333">→ ~{{ groupEstimate(g.ratio) }} 条</span>
        </div>
      </div>

      <!-- 盐值 -->
      <div style="margin-top:16px">
        <div style="font-size:13px;color:#5F6B7A;margin-bottom:8px">盐值来源（多选，按添加顺序拼接）</div>
        <el-checkbox-group v-model="saltKeys">
          <el-checkbox v-for="s in saltSources" :key="s.key" :label="s.key">
            {{ s.label }}
          </el-checkbox>
        </el-checkbox-group>
        <el-input v-model="customSalt" placeholder="自定义盐值（选填）" size="small" style="margin-top:8px;width:240px" clearable />
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
          <span style="font-family:monospace;font-size:12px;color:#999">md5("{{ saltRaw }}")</span>
          <el-input :model-value="computedSalt" readonly size="small">
            <template #prepend>当前盐值</template>
          </el-input>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submitApply" :loading="submitting" :disabled="testCount === null || testCount === 0">
        确认推送
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { testConfirmSql, submitApply as submitApplyApi, getSaltSources } from '../api'
import { md5 } from '../utils/crypto'

const visible = ref(false)
const execution = ref(null)
const filterSql = ref('')
const testing = ref(false)
const testCount = ref(null)
const submitting = ref(false)
const callbackDone = ref(0)

const dryRun = ref(false)
const groups = ref([{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }])
const saltKeys = ref(['executionId'])
const customSalt = ref('')
const saltSources = ref([{ key: 'executionId', label: '执行ID', available: true }])

const groupNames = ['A', 'B', 'C', 'D', 'E']

const saltRaw = computed(() => {
  const parts = saltKeys.value.map(k => {
    if (k === 'executionId') return String(execution.value?.id || '')
    if (k === 'taskId') return String(execution.value?.taskId || '')
    if (k === 'nodeCode') return String(execution.value?.nodeCode || '')
    if (k === 'batch') return String(execution.value?.batch || '')
    if (k === 'createTime') return String(execution.value?.execTime || '')
    return ''
  }).filter(Boolean)
  if (customSalt.value.trim()) parts.push(customSalt.value.trim())
  return parts.join(':')
})

const computedSalt = computed(() => {
  if (!saltRaw.value) return ''
  return md5(saltRaw.value)
})

function onDryRunChange(val) {
  if (val) groups.value.forEach(g => { g.pushEnabled = false })
}

function addGroup() {
  if (groups.value.length >= 5) return
  const nextName = groupNames[groups.value.length]
  groups.value.push({ name: nextName, alias: '', pushEnabled: !dryRun.value, ratio: 0 })
  redistributeRatios()
}

function removeGroup(index) {
  if (groups.value.length <= 1) return
  groups.value.splice(index, 1)
  groups.value.forEach((g, i) => { g.name = groupNames[i] })
  redistributeRatios()
}

function redistributeRatios() {
  const n = groups.value.length
  if (n === 0) return
  const base = parseFloat((100 / n).toFixed(1))
  let sum = parseFloat((base * n).toFixed(1))
  const remainder = parseFloat((100 - sum).toFixed(1))
  groups.value.forEach(g => { g.ratio = base })
  if (remainder !== 0) {
    const last = groups.value[groups.value.length - 1]
    if (last) last.ratio = parseFloat((last.ratio + remainder).toFixed(1))
  }
}

function onRatioChange() {}

function groupEstimate(ratio) {
  if (testCount.value === null || testCount.value <= 0) return 0
  return Math.round(testCount.value * ratio / 100)
}

defineExpose({ open })
</script>

<style scoped>
.sql-section { margin-bottom: 16px; }
.sql-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sql-hint { font-size: 12px; color: #909399; }
.sql-hint code { font-family: monospace; font-size: 12px; color: #409eff; background: #ecf5ff; padding: 1px 6px; border-radius: 3px; }
.sql-toolbar { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
.test-count { font-size: 14px; color: #303133; }
.apply-section { }
.apply-desc { font-size: 14px; color: #606266; line-height: 1.8; margin-bottom: 16px; }
.apply-desc code { font-family: monospace; font-size: 12px; color: #409eff; background: #ecf5ff; padding: 1px 6px; border-radius: 3px; }
.apply-stats { display: flex; gap: 40px; }

.group-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.group-name { font-family: monospace; font-size: 13px; font-weight: 700; color: #1890ff; background: #e6f7ff; padding: 2px 8px; border-radius: 4px; }
.group-push { display: flex; align-items: center; gap: 6px; }
.strategy-hint { font-size: 12px; color: #909399; }

.group-preview { padding: 8px 12px; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; }
.preview-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
</style>

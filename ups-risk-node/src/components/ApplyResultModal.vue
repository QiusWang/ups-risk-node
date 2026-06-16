<template>
  <el-dialog
    v-model="visible"
    :title="isReapply ? '重新应用' : '应用数据'"
    width="1000px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="resetForm"
  >
    <template v-if="execution">
      <!-- Summary -->
      <div class="form-section">
        <div class="form-section-title">执行信息</div>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="任务名称">{{ execution.taskName }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ execution.batch }}</el-descriptions-item>
          <el-descriptions-item label="风控节点">{{ execution.nodeName }}</el-descriptions-item>
          <el-descriptions-item label="执行时间">{{ execution.execTime }}</el-descriptions-item>
          <el-descriptions-item label="总客群数">{{ execution.totalCount }}</el-descriptions-item>
          <el-descriptions-item label="已应用数">{{ execution.appliedCount }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- SQL -->
      <div class="form-section">
        <div class="form-section-title">SQL编辑器</div>
        <div class="sql-info-bar">
          <div class="sql-info-item">
            <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#faad14"/></svg>
            <span>必须输出字段：<b>req_channel</b>, <b>uid</b>, <b>cust_id</b>, <b>device_id</b>, <b>os</b>；取数后与当前任务内数据进行匹配</span>
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
              <el-button link size="small" class="sql-format-btn" @click="formatSql" :disabled="isReapply">格式化</el-button>
            </div>
          </div>
          <div class="sql-highlight-wrap" style="height:180px">
            <pre class="sql-backdrop" ref="sqlBackdropRef"><code v-html="highlightedSql"></code></pre>
            <textarea
              v-model="filterSql"
              class="sql-editor"
              style="height:180px"
              placeholder="SELECT req_channel, uid, cust_id, device_id, os&#10;FROM t_risk_execution_detail d&#10;WHERE d.execution_id = ?&#10;AND d.callback_status = 1"
              spellcheck="false"
              @scroll="syncScroll"
              @input="onSqlInput"
                :disabled="isReapply" ref="sqlEditorRef"
            ></textarea>
          </div>
        </div>
        <div class="sql-error-msg" v-if="sqlError">
          <el-icon><WarningFilled /></el-icon> {{ sqlError }}
        </div>
        <div class="mt-12">
          <el-button @click="testSql" :loading="testing" :disabled="isReapply">
            <el-icon><CaretRight /></el-icon> 测试执行 (LIMIT 5)
          </el-button>
        </div>
        <div v-if="testResult" class="sql-test-result">
          <div class="result-header">
            <span>测试结果</span>
            <span class="badge badge-success">执行成功</span>
            <span class="text-muted">（已自动添加 LIMIT 5）</span>
          </div>
          <div class="total-count-box">
            <svg viewBox="0 0 1024 1024" width="16" height="16" style="vertical-align:middle;margin-right:6px;"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="#1890ff"/></svg>
            <b>匹配记录总数：{{ formatNumber(testResult.totalCount) }} 条</b>（与当前任务数据匹配），以下为前 5 条预览
          </div>
          <el-table v-if="testResult.rows && testResult.rows.length > 0" :data="testResult.rows" border stripe size="small" max-height="260">
            <el-table-column v-for="f in testResult.fields" :key="f" :prop="f" :label="f" min-width="130" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
    </template>

    <!-- 分组配置与盐值 -->
    <div class="form-section" v-if="execution">
      <div class="form-section-title">分组配置与盐值</div>

      <!-- 空跑模式 -->
      <div class="strategy-card" style="margin-bottom:12px">
        <div class="strategy-card-header">
          <span class="strategy-label">空跑模式</span>
              <el-switch v-model="dryRun" size="small" :disabled="isReapply" @change="onDryRunChange" />
        </div>
        <div class="strategy-card-body" v-if="dryRun">
          <div class="strategy-hint">所有分组均不推送到业务系统，直接落表空跑。AB组不执行业务应用。</div>
        </div>
      </div>

      <!-- 分组列表 -->
      <div class="group-list">
        <div v-for="(g, i) in groups" :key="i" class="group-item">
          <div class="group-badge">[{{ g.name }}]</div>
          <el-input v-model="g.alias" placeholder="别名（选填）" size="small" style="width:150px" :disabled="isReapply" />
            <div class="group-ratio">
              <el-input-number v-model="g.ratio" :min="0" :max="100" :precision="1" :step="0.1" size="small" style="width:100px" :disabled="isReapply" @change="onRatioChange" />
            <span class="group-ratio-label">%</span>
          </div>
          <div class="group-push">
            <el-switch v-model="g.pushEnabled" size="small" :disabled="dryRun || isReapply" />
            <span class="group-push-label">{{ g.pushEnabled ? '推送' : '不推送' }}</span>
          </div>
          <el-button v-if="groups.length > 1" type="danger" link size="small" @click="removeGroup(i)" :disabled="isReapply">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <el-button link type="primary" size="small" @click="addGroup" :disabled="groups.length >= 5 || isReapply" style="margin-top:4px">
        + 添加分组（{{ groups.length }}/5）
      </el-button>

      <!-- 分组预览 -->
      <div v-if="testCount !== null && testCount > 0" class="group-preview" style="margin-top:12px">
        <div class="strategy-hint" style="margin-bottom:8px">预计分配（总数 {{ testCount }} 条）</div>
        <div v-for="(g, i) in groups" :key="'p'+i" class="preview-row">
          <span class="group-badge" style="font-size:11px">[{{ g.name }}]</span>
          <span style="font-size:12px;color:#666">{{ g.alias || '-' }}</span>
          <span style="font-size:12px;color:#1890ff;font-weight:600">{{ g.ratio }}%</span>
          <span style="font-size:12px;color:#333">→ ~{{ groupEstimate(g.ratio) }} 条</span>
        </div>
      </div>

      <!-- 盐值配置 -->
      <div class="salt-section" style="margin-top:16px">
        <div class="salt-header">
          <span class="strategy-sub-label">盐值来源（多选，按添加顺序拼接）</span>
        </div>
        <el-checkbox-group v-model="saltKeys" :disabled="isReapply">
          <el-checkbox v-for="s in saltSources" :key="s.key" :label="s.key" :disabled="isReapply">
            {{ s.label }}
          </el-checkbox>
        </el-checkbox-group>
        <el-input v-model="customSalt" placeholder="自定义盐值（选填）" size="small" :disabled="isReapply" style="margin-top:8px;width:240px" clearable />
        <div class="salt-result">
          <span class="salt-raw">md5("{{ saltRaw }}")</span>
          <el-input v-model="computedSalt" readonly size="small" style="font-family:monospace;color:#1890ff;">
            <template #prepend>当前盐值</template>
          </el-input>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="isReapply ? submitReapply() : submitApply()" :loading="submitting" :disabled="!isReapply && (testCount === null || testCount === 0)">
        {{ isReapply ? '重新应用' : '确认推送' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { testConfirmSql, submitApply as submitApplyApi, getSaltSources } from '../api'
import { validateSqlFields } from '../utils/sql-validator'
import { md5 } from '../utils/crypto'

const emit = defineEmits(['applied'])
const visible = ref(false)
const isReapply = ref(false)
const execution = ref(null)
const filterSql = ref('')
const testing = ref(false)
const testCount = ref(null)
const testResult = ref(null)
const sqlError = ref('')
const submitting = ref(false)
const sqlEditorRef = ref(null)
const sqlBackdropRef = ref(null)

const dryRun = ref(false)
const groups = ref([{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }])
const saltKeys = ref(['executionId'])
const customSalt = ref('')
const saltSources = ref([
  { key: 'executionId', label: '执行ID', available: true },
])

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
  if (val) {
    groups.value.forEach(g => { g.pushEnabled = false })
  }
}

function addGroup() {
  if (groups.value.length >= 5) return
  const nextName = groupNames[groups.value.length]
  const ratio = parseFloat((100 / (groups.value.length + 1)).toFixed(1))
  let remainder = parseFloat((100 - ratio * (groups.value.length + 1)).toFixed(1))
  groups.value.forEach(g => { g.ratio = ratio })
  if (remainder !== 0) {
    const last = groups.value[groups.value.length - 1]
    if (last) last.ratio = parseFloat((last.ratio + remainder).toFixed(1))
  }
  groups.value.push({ name: nextName, alias: '', pushEnabled: !dryRun.value, ratio })
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

function onRatioChange() {
  // Allow manual ratio editing
}

function groupEstimate(ratio) {
  if (testCount.value === null || testCount.value <= 0) return 0
  return Math.round(testCount.value * ratio / 100)
}

async function fetchSaltSources() {
  try {
    const { data: res } = await getSaltSources()
    if (res.code === 200) saltSources.value = res.data
  } catch { /* mock */ }
}

const SQL_KEYWORDS = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MAX|MIN|EXISTS)\b/gi

const highlightedSql = computed(() => {
  const sql = filterSql.value || ''
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

function formatNumber(num) {
  if (num == null || num === '-') return '-'
  return Number(num).toLocaleString()
}

function formatSql() {
  let sql = filterSql.value.trim()
  if (!sql) return
  sql = sql.replace(/\s+/g, ' ')
  const MAIN_CLAUSES = /\b(SELECT|FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|UNION|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|JOIN|ON)\b/gi
  sql = sql.replace(MAIN_CLAUSES, m => m.toUpperCase())
  sql = sql.replace(/\s*\b(SELECT)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(FROM)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(WHERE)\b/gi, '\n$1')
  sql = sql.replace(/\s*\b(AND)\b/gi, '\n  $1')
  sql = sql.replace(/\s*\b(OR)\b/gi, '\n   $1')
  sql = sql.replace(/\bSELECT\s+/gi, 'SELECT\n  ')
  sql = sql.replace(/,\s*/g, ',\n  ')
  sql = sql.replace(/^\n+/, '')
  sql = sql.replace(/\n{3,}/g, '\n\n')
  filterSql.value = sql
}

function resetForm() {
  filterSql.value = ''
  testCount.value = null
  testResult.value = null
  sqlError.value = ''
  dryRun.value = false
  groups.value = [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }]
  saltKeys.value = ['executionId']
  customSalt.value = ''
  isReapply.value = false
}

function open(row, reapply = false) {
  execution.value = row
  isReapply.value = reapply
  filterSql.value = `SELECT req_channel, uid, cust_id, device_id, os
FROM t_risk_execution_detail d
WHERE d.execution_id = ${row.id}`
  testCount.value = null
  testResult.value = null
  sqlError.value = ''
  dryRun.value = false
  groups.value = [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }]
  saltKeys.value = ['executionId']
  customSalt.value = ''
  if (!reapply) {
    fetchSaltSources()
  }
  testCount.value = reapply ? (row.applyFailedCount || 0) : null
  visible.value = true
}

async function testSql() {
  if (!filterSql.value.trim()) {
    ElMessage.warning('请输入SQL语句')
    return
  }
  const allowedFields = ['req_channel', 'uid', 'cust_id', 'device_id', 'os']
  const validation = validateApplySqlFields(filterSql.value, allowedFields)
  if (!validation.valid) {
    sqlError.value = validation.msg
    ElMessage.error(validation.msg)
    return
  }
  sqlError.value = ''
  testing.value = true
  try {
    const { data: res } = await testConfirmSql({ sqlContent: filterSql.value, executionId: execution.value.id })
    if (res.code === 200) {
      testCount.value = res.data.count
      testResult.value = res.data
      ElMessage.success(`测试完成，匹配 ${res.data.count || res.data.totalCount || 0} 条`)
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    testing.value = false
  }
}

async function submitApply() {
  submitting.value = true
  try {
    const { data: res } = await submitApplyApi({
      executionId: execution.value.id,
      sqlContent: filterSql.value,
      saltValue: computedSalt.value,
      dryRun: dryRun.value,
      groups: dryRun.value ? [] : groups.value.map(g => ({
        name: g.name,
        alias: g.alias,
        pushEnabled: dryRun.value ? false : g.pushEnabled,
      })),
    })
    if (res.code === 200) {
      if (dryRun.value) {
        ElMessage.success('空跑完成，数据已落表。所有分组均不推送业务系统')
      } else {
        ElMessage.success(`已提交应用请求，批次号：${res.data.batch}`)
      }
      visible.value = false
      emit('applied')
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    submitting.value = false
  }
}

async function submitReapply() {
  const failCount = execution.value?.applyFailedCount || 0
  try {
    await ElMessageBox.confirm(
      `确认重新应用失败的 ${failCount} 条记录？将重新推送到业务系统应用（不包含已拦截状态数据）。`,
      '重新应用确认',
      { confirmButtonText: '确认重新应用', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    const { data: res } = await submitApplyApi({
      executionId: execution.value.id,
      reapply: true,
      reapplyCount: failCount,
    })
    if (res.code === 200) {
      ElMessage.success(`已提交重新应用，批次号：${res.data.batch}`)
      visible.value = false
      emit('applied')
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    submitting.value = false
  }
}

function validateApplySqlFields(sql, allowedFields) {
  if (!sql || !sql.trim()) return { valid: false, msg: 'SQL内容不能为空' }
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed.startsWith('SELECT')) return { valid: false, msg: '仅支持SELECT查询语句' }
  if (/\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|EXEC|EXECUTE)\b/i.test(sql)) {
    return { valid: false, msg: 'SQL包含不允许的操作语句，仅支持SELECT查询' }
  }
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+/is)
  if (!selectMatch) return { valid: false, msg: '无法解析SQL语句，请检查格式' }
  if (selectMatch[1].trim() === '*') return { valid: false, msg: '不允许使用 SELECT *' }

  const fields = selectMatch[1].split(',').map(f => {
    const parts = f.trim().split(/\s+/)
    return parts[parts.length - 1].trim().replace(/`/g, '').toLowerCase()
  }).filter(f => f)

  for (const f of fields) {
    if (!allowedFields.includes(f)) {
      return { valid: false, msg: `SQL输出字段不符合要求，仅允许输出：${allowedFields.join(', ')}。当前包含: ${f}` }
    }
  }
  for (const r of allowedFields) {
    if (!fields.includes(r)) {
      return { valid: false, msg: `SQL缺少必要字段：${r}。必须包含：${allowedFields.join(', ')}` }
    }
  }
  return { valid: true, fields }
}

defineExpose({ open })
</script>

<style scoped>
.form-section { margin-bottom: 24px; }
.form-section-title {
  font-size: 14px; font-weight: 600; color: #333; margin-bottom: 16px;
  padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;
  display: flex; align-items: center; gap: 8px;
}
.form-section-title::before { content: ''; width: 3px; height: 16px; background: #1890ff; border-radius: 2px; }

.sql-info-bar { display: flex; gap: 12px; margin-bottom: 12px; }
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

.sql-editor-wrap { border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden; }
.sql-editor-wrap:focus-within { border-color: #1890ff; box-shadow: 0 0 0 2px rgba(24,144,255,.1); }
.sql-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;
  background: #fafafa; border-bottom: 1px solid #f0f0f0; }
.sql-lang { font-size: 12px; color: #999; }
.sql-toolbar-right { display: flex; gap: 8px; align-items: center; }
.sql-format-btn { color: #1890ff; }
.sql-highlight-wrap { position: relative; }
.sql-backdrop {
  margin: 0; padding: 12px; overflow: auto;
  font-family: "SF Mono","Fira Code","Consolas",monospace; font-size: 13px;
  line-height: 1.6; tab-size: 2; white-space: pre; background: #fff; color: #333;
  position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;
}
.sql-editor {
  display: block; width: 100%; padding: 12px; border: none; resize: none; outline: none;
  font-family: "SF Mono","Fira Code","Consolas",monospace; font-size: 13px;
  line-height: 1.6; tab-size: 2; color: transparent; caret-color: #333;
  background: transparent; position: relative; z-index: 2;
  overflow: auto; white-space: pre;
}
.sql-error-msg { display: flex; align-items: center; gap: 6px; margin-top: 8px;
  padding: 8px 12px; background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7;
  border-radius: 6px; font-size: 13px; }
.mt-12 { margin-top: 12px; }
.text-muted { color: #999; font-size: 12px; }

.sql-test-result { margin-top: 16px; }
.result-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  font-size: 13px; font-weight: 600; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.badge-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.total-count-box {
  margin-bottom: 12px; padding: 10px 14px; background: #e6f7ff;
  border: 1px solid #91d5ff; border-radius: 6px; font-size: 13px;
}

/* Strategy */
.strategy-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden; }
.strategy-card-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
.strategy-label { font-size: 13px; font-weight: 600; color: #333; }
.strategy-card-body { padding: 10px 14px; }
.strategy-hint { font-size: 12px; color: #909399; line-height: 1.6; }
.strategy-sub-label { font-size: 13px; color: #5F6B7A; margin-bottom: 8px; display: block; }

.group-list { display: flex; flex-direction: column; gap: 8px; }
.group-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #fafafa; border-radius: 6px; border: 1px solid #f0f0f0; }
.group-badge { font-family: 'SF Mono','Consolas',monospace; font-size: 13px; font-weight: 700; color: #1890ff; background: #e6f7ff; padding: 2px 10px; border-radius: 4px; flex-shrink: 0; }
.group-push { display: flex; align-items: center; gap: 6px; }
.group-push-label { font-size: 12px; color: #666; white-space: nowrap; }
.group-ratio { display: flex; align-items: center; gap: 2px; }
.group-ratio-label { font-size: 12px; color: #666; }

.salt-section { }
.salt-header { margin-bottom: 8px; }
.salt-result { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.salt-raw { font-family: 'SF Mono',monospace; font-size: 12px; color: #999; }

.group-preview { padding: 8px 12px; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; }
.preview-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }

</style>

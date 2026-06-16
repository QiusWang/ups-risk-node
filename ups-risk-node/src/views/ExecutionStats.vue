<template>
  <div class="stats-page">
    <!-- Tab Navigation -->
    <div class="page-tabs">
      <router-link v-if="isAdmin" to="/general" class="page-tab" active-class="active">通用配置</router-link>
      <router-link v-if="!isOps" to="/tasks" class="page-tab" active-class="active">任务配置（风控）</router-link>
      <router-link v-if="!isRisk" to="/ops" class="page-tab" active-class="active">任务配置（运营）</router-link>
      <router-link to="/stats" class="page-tab" active-class="active">已执行任务</router-link>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-item">
        <label>任务名称</label>
        <el-input v-model="filterTaskName" placeholder="请输入任务名称" clearable size="default" />
      </div>
      <div class="filter-item">
        <label>风控节点</label>
        <el-select v-model="filterNodeCode" placeholder="全部" clearable size="default">
          <el-option v-for="n in nodeList" :key="n.code" :label="n.name" :value="n.code" />
        </el-select>
      </div>
      <div class="filter-item">
        <label>执行状态</label>
        <el-select v-model="filterExecStatus" placeholder="全部" clearable size="default">
          <el-option label="推送中" value="pushing" />
          <el-option label="成功" value="push_completed" />
          <el-option label="失败" value="push_failed" />
          <el-option label="部分成功" value="push_completed_partially" />
          <el-option label="回调完成" value="callback_completed" />
          <el-option label="应用中" value="applying" />
          <el-option label="已应用" value="applied" />
        </el-select>
      </div>
      <div class="filter-item">
        <label>执行时间</label>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          :disabled-date="disabledDate"
          @change="handleDateChange"
        />
      </div>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-cards">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-value">{{ stats.totalExec }}</div>
        <div class="stat-label">总执行次数</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-success">
        <div class="stat-value">{{ stats.successCount }}</div>
        <div class="stat-label">成功次数</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-fail">
        <div class="stat-value">{{ stats.failCount }}</div>
        <div class="stat-label">失败次数</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-partial">
        <div class="stat-value">{{ stats.partialCount }}</div>
        <div class="stat-label">部分成功</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-callback">
        <div class="stat-value">{{ stats.callbackCount }}</div>
        <div class="stat-label">回调完成</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-applied">
        <div class="stat-value">{{ stats.appliedCount }}</div>
        <div class="stat-label">已应用</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-applying">
        <div class="stat-value">{{ stats.applyingCount }}</div>
        <div class="stat-label">应用中</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-value">{{ stats.runningCount }}</div>
        <div class="stat-label">推送中</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-info">
        <div class="stat-value">{{ formatNumber(stats.totalCust) }}</div>
        <div class="stat-label">总处理客群数</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-warn">
        <div class="stat-value">{{ formatNumber(stats.totalApplied) }}</div>
        <div class="stat-label">总已应用数</div>
      </el-card>
      <el-card shadow="hover" class="stat-card stat-rate">
        <div class="stat-value">{{ stats.rate }}%</div>
        <div class="stat-label">成功率</div>
      </el-card>
    </div>

    <!-- Table -->
    <div class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="执行ID" width="90" />
        <el-table-column label="任务名称" min-width="140" show-overflow-tooltip>
          <template #default="{ row }"><b>{{ row.taskName }}</b></template>
        </el-table-column>
        <el-table-column prop="nodeName" label="风控节点" width="100" />
        <el-table-column label="批次号" width="180">
          <template #default="{ row }"><code class="cron-code">{{ row.batch }}</code></template>
        </el-table-column>
        <el-table-column label="执行状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.execStatus)" size="small">
              {{ statusLabel(row.execStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalCount" label="总客群数" width="100" align="right" />
        <el-table-column label="回调数" width="165" align="right">
          <template #default="{ row }">
            <div v-if="row.execStatus !== 'pushing'">
              <div>{{ formatNumber(row.callbackCount) }}</div>
              <div style="font-size:11px;color:#909399">
                成功：<span style="color:#67c23a">{{ formatNumber(row.callbackSuccessCount || 0) }}</span> / 失败：<span style="color:#f56c6c">{{ formatNumber(row.callbackFailCount || 0) }}</span>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="已应用数" width="90" align="right">
          <template #default="{ row }">
            <span v-if="row.execStatus !== 'pushing'">{{ row.appliedCount }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="应用失败数" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.execStatus !== 'pushing'">{{ row.applyFailedCount || 0 }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="策略执行数" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.execStatus !== 'pushing'">{{ row.strategyExecCount || 0 }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="execTime" label="执行时间" width="180" />
        <el-table-column label="有效期" width="200" align="center">
          <template #default="{ row }">
            <span v-if="row.expireTime">
              {{ row.expireTime.substring(0, 10) }}
              <el-tag v-if="isExpired(row)" type="info" size="small" style="margin-left:4px">已过期</el-tag>
              <el-tag v-else type="success" size="small" style="margin-left:4px">剩余{{ remainingDays(row) }}天</el-tag>
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <span style="white-space:nowrap">
            <el-button size="small" @click="viewDetail(row)" style="width:74px">
              <el-icon :size="14"><View /></el-icon>查看详情
            </el-button>
          <el-button v-if="!isOps && !isExpired(row) && !hasApplied(row) && canShowApply(row)" size="small" type="primary"
              :disabled="row.execStatus !== 'callback_completed'" @click="openApply(row)" style="width:74px">
            <el-icon :size="14"><CircleCheck /></el-icon>应用数据
          </el-button>
          <el-button v-if="!isOps && !isExpired(row) && hasApplied(row) && (row.applyFailedCount || 0) > 0" size="small" type="warning"
              @click="openReapply(row)" style="width:80px">
            <el-icon :size="14"><CircleCheck /></el-icon>重新应用
          </el-button>
          <el-button v-if="!isOps && !isExpired(row) && canShowRetry(row)" size="small" type="warning"
              @click="openRetry(row)" style="width:74px">
            <el-icon :size="14"><Refresh /></el-icon>重推失败
          </el-button>
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <span class="page-info">共 <b>{{ total }}</b> 条</span>
        <div style="flex:1" />
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="sizes, prev, pager, next"
          @current-change="fetchData"
          @size-change="fetchData"
          background small
        />
      </div>
    </div>

    <!-- Detail Drawer -->
    <ExecutionDetailDrawer ref="detailDrawerRef" />

    <!-- Apply Modal -->
    <ApplyResultModal ref="applyModalRef" @applied="fetchData" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNodeList, getExecutionPage, getExecutionStats, submitApply } from '../api'
import { useRole } from '../stores/role'
import ExecutionDetailDrawer from '../components/ExecutionDetailDrawer.vue'
import ApplyResultModal from '../components/ApplyResultModal.vue'

const { isRisk, isOps, isAdmin } = useRole()

const nodeList = ref([])
const tableData = ref([])
const total = ref(0)
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(20)
const filterTaskName = ref('')
const filterNodeCode = ref('')
const filterExecStatus = ref('')
const dateRange = ref([])

const detailDrawerRef = ref(null)
const applyModalRef = ref(null)

const stats = reactive({
  totalExec: '-', successCount: '-', failCount: '-', partialCount: '-', callbackCount: '-', appliedCount: '-', applyingCount: '-', runningCount: '-',
  totalCust: '-', totalApplied: '-', rate: '-',
})

function statusType(status) {
  const map = { pushing: 'warning', push_completed: 'success', push_failed: 'danger', push_completed_partially: 'warning', callback_completed: '', applied: 'success', applying: 'warning' }
  return map[status] || 'info'
}
function statusLabel(status) {
  const map = { pushing: '推送中', push_completed: '成功', push_failed: '失败', push_completed_partially: '部分成功', callback_completed: '回调完成', applied: '已应用', applying: '应用中' }
  return map[status] || '未知'
}

function formatNumber(num) {
  if (num === '-' || num == null) return '-'
  return Number(num).toLocaleString()
}

function isExpired(row) {
  if (!row.expireTime) return false
  return new Date(row.expireTime.replace(/-/g, '/')) < new Date()
}

function remainingDays(row) {
  if (!row.expireTime) return 0
  const diff = new Date(row.expireTime.replace(/-/g, '/')) - new Date()
  return Math.max(0, Math.ceil(diff / (24 * 3600 * 1000)))
}

function hasApplied(row) {
  return row.hasApplied === true
}

function canShowApply(row) {
  return ['push_completed', 'push_completed_partially', 'callback_completed', 'applying'].includes(row.execStatus)
}

function canShowRetry(row) {
  return ['push_failed', 'push_completed_partially'].includes(row.execStatus)
}

async function fetchNodes() {
  try {
    const { data: res } = await getNodeList()
    if (res.code === 200) nodeList.value = res.data
  } catch { /* mock */ }
}

async function fetchData() {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value, pageSize: pageSize.value,
      taskName: filterTaskName.value,
      nodeCode: filterNodeCode.value,
      execStatus: filterExecStatus.value,
      dateFrom: dateRange.value?.[0] || '',
      dateTo: dateRange.value?.[1] || '',
    }
    const [execRes, statsRes] = await Promise.all([
      getExecutionPage(params),
      getExecutionStats(params),
    ])
    if (execRes.data.code === 200) {
      tableData.value = execRes.data.data.list
      total.value = execRes.data.data.total
    }
    if (statsRes.data.code === 200) {
      const d = statsRes.data.data
      stats.totalExec = d.totalExec
      stats.successCount = d.successCount
      stats.failCount = d.failCount
      stats.partialCount = d.partialCount
      stats.callbackCount = d.callbackCount || 0
      stats.appliedCount = d.appliedCount || 0
      stats.applyingCount = d.applyingCount || 0
      stats.runningCount = d.runningCount
      stats.totalCust = d.totalCust
      stats.totalApplied = d.totalApplied
      stats.rate = d.rate
    }
  } finally {
    loading.value = false
  }
}

function search() {
  pageNum.value = 1
  fetchData()
}

function reset() {
  filterTaskName.value = ''
  filterNodeCode.value = ''
  filterExecStatus.value = ''
  dateRange.value = []
  pageNum.value = 1
  fetchData()
}

function disabledDate(time) {
  const now = Date.now()
  return time.getTime() > now || time.getTime() < now - 90 * 24 * 3600 * 1000
}

function handleDateChange() {
  if (dateRange.value && dateRange.value.length === 2) {
    const diff = new Date(dateRange.value[1]) - new Date(dateRange.value[0])
    if (diff > 15 * 24 * 3600 * 1000) {
      ElMessage.warning('时间范围跨度最大15天')
      dateRange.value = []
    }
  }
}

function openReapply(row) {
  applyModalRef.value?.open(row, true)
}

function viewDetail(row) {
  detailDrawerRef.value?.open(row)
}

function openApply(row) {
  applyModalRef.value?.open(row)
}

function openRetry(row) {
  ElMessageBox.confirm(
    `确认重推失败数据？共 ${row.totalCount - row.appliedCount} 条推送失败的客群将重新推送。`,
    '重推失败确认',
    { confirmButtonText: '确认重推', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const { data: res } = await submitApply({
        executionId: row.id,
        retry: true,
      })
      if (res.code === 200) ElMessage.success(`已提交重推，批次号：${res.data.batch}`)
      fetchData()
    } catch { ElMessage.error('重推失败') }
  }).catch(() => {})
}

onMounted(() => {
  fetchNodes()
  fetchData()
})
</script>

<style scoped>
.stats-page { }
.page-tabs { display: flex; gap: 0; border-bottom: 2px solid #e8e8e8; margin-bottom: 16px; }
.page-tab {
  padding: 10px 24px; font-size: 14px; font-weight: 500; color: #666;
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all .2s; text-decoration: none;
}
.page-tab:hover { color: #409eff; }
.page-tab.active { color: #409eff; border-bottom-color: #409eff; }

.filter-bar { display: flex; align-items: center; gap: 16px; padding: 16px 20px;
  background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); margin-bottom: 16px; flex-wrap: wrap; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label { white-space: nowrap; color: #666; font-size: 13px; }
.filter-item :deep(.el-input), .filter-item :deep(.el-select) { width: 160px; }
.filter-item :deep(.el-date-editor) { width: 280px; }

.stats-cards { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 150px; text-align: center; }
.stat-card :deep(.el-card__body) { padding: 20px 16px; }
.stat-value { font-size: 28px; font-weight: 700; color: #303133; margin-bottom: 4px; }
.stat-label { font-size: 13px; color: #909399; }
.stat-success .stat-value { color: #67c23a; }
.stat-fail .stat-value { color: #f56c6c; }
.stat-partial .stat-value { color: #e6a23c; }
.stat-callback .stat-value { color: #1890ff; }
.stat-applied .stat-value { color: #409eff; }
.stat-applying .stat-value { color: #e6a23c; }
.stat-info .stat-value { color: #409eff; }
.stat-warn .stat-value { color: #e6a23c; }
.stat-rate .stat-value { color: #722ed1; }

.table-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
.pagination-wrap { display: flex; align-items: center; padding: 16px 20px; }
.page-info { font-size: 13px; color: #666; }
.cron-code {
  font-family: "SF Mono","Consolas",monospace; font-size: 12px;
  background: #f5f5f5; padding: 2px 6px; border-radius: 4px;
}
</style>

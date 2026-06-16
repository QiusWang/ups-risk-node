<template>
  <el-drawer
    v-model="visible"
    title="执行详情"
    size="75%"
    destroy-on-close
    direction="rtl"
  >
    <template v-if="execution">
      <!-- Summary -->
      <div class="detail-section">
        <div class="section-title">汇总信息</div>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="任务名称">{{ execution.taskName }}</el-descriptions-item>
          <el-descriptions-item label="风控节点">{{ execution.nodeName }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ execution.batch }}</el-descriptions-item>
          <el-descriptions-item label="执行时间">{{ execution.execTime }}</el-descriptions-item>
          <el-descriptions-item label="总客群数">{{ execution.totalCount }}</el-descriptions-item>
          <el-descriptions-item label="已应用数">{{ execution.appliedCount }}</el-descriptions-item>
          <el-descriptions-item label="结果时效">
            <el-tag v-if="isExecExpired" type="info" size="small">已过期</el-tag>
            <span v-else>{{ execution.expireDays || 30 }}天（{{ execution.expireTime || '-' }}）</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- Detail with filter -->
      <div class="detail-section">
        <div class="section-title filter-toggle" @click="filterVisible = !filterVisible">
          明细记录 <span class="text-muted">（筛选后 {{ filteredTotal }} 条，每页 {{ detailPageSize }} 条）</span>
          <span class="toggle-label">{{ filterVisible ? '收起筛选 ▴' : '展开筛选 ▾' }}</span>
        </div>

        <div v-show="filterVisible" class="filter-panel">
          <div class="filter-row">
            <el-input v-model="filter.req_channel" placeholder="渠道" size="small" clearable @clear="applyFilter" @keydown.enter="applyFilter" />
            <el-input v-model="filter.uid" placeholder="用户ID" size="small" clearable @clear="applyFilter" @keydown.enter="applyFilter" />
            <el-input v-model="filter.cust_id" placeholder="客户ID" size="small" clearable @clear="applyFilter" @keydown.enter="applyFilter" />
          </div>
          <div class="filter-row">
            <el-input v-model="filter.device_id" placeholder="设备ID" size="small" clearable @clear="applyFilter" @keydown.enter="applyFilter" />
            <el-select v-model="filter.callback" placeholder="回调数据" size="small" clearable @change="applyFilter">
              <el-option label="有回调" value="1" />
              <el-option label="未回调" value="0" />
            </el-select>
            <el-select v-model="filter.applyStatus" placeholder="应用状态" size="small" clearable @change="applyFilter">
              <el-option label="待确认" value="pending" />
              <el-option label="已应用" value="applied" />
              <el-option label="应用失败" value="failed" />
              <el-option label="已拦截" value="blocked" />
              <el-option label="空跑" value="dry_run" />
            </el-select>
          </div>
          <div class="filter-row">
            <el-select v-model="filter.strategyStatus" placeholder="策略状态" size="small" clearable @change="applyFilter">
              <el-option label="已执行" value="executed" />
              <el-option label="超限丢弃" value="discarded" />
              <el-option label="执行中" value="executing" />
            </el-select>
            <el-select v-model="filter.abGroup" placeholder="AB组" size="small" clearable @change="applyFilter">
              <el-option label="A组" value="A" />
              <el-option label="B组" value="B" />
              <el-option label="C组" value="C" />
              <el-option label="D组" value="D" />
              <el-option label="E组" value="E" />
            </el-select>
            <span />
          </div>
          <div class="filter-row">
            <span /><span />
            <span class="filter-actions">
              <el-button type="primary" size="small" @click="applyFilter">筛选</el-button>
              <el-button size="small" @click="resetFilter">重置</el-button>
            </span>
          </div>
        </div>

        <!-- Detail Table -->
        <div v-loading="loading" style="min-height:200px">
          <el-table
            :data="displayItems"
            border stripe
            max-height="500"
            size="small"
          >
          <el-table-column type="index" label="序号" width="55" />
          <el-table-column prop="req_channel" label="req_channel" width="130">
            <template #default="{ row }"><code>{{ row.req_channel }}</code></template>
          </el-table-column>
          <el-table-column prop="uid" label="uid" width="100" />
          <el-table-column prop="cust_id" label="cust_id" width="100" />
          <el-table-column prop="device_id" label="device_id" width="120" />
          <el-table-column prop="os" label="os" width="80">
            <template #default="{ row }">
              <el-tag :type="row.os === 'ios' ? 'success' : ''" size="small">{{ row.os }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="cust_type" label="cust_type" width="90">
            <template #default="{ row }">
              <span v-if="row.cust_type">{{ row.cust_type }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="推送状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="pushTagType(row.pushStatus)" size="small">
                {{ pushLabel(row.pushStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="回调数据" width="100" align="center">
            <template #default="{ row }">
              <el-button v-if="row.callbackData" type="primary" link size="small" @click="viewCallback(row)">
                查看
              </el-button>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="回调状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.callbackData" type="success" size="small">成功</el-tag>
              <el-tag v-else-if="row.pushStatus !== 'pending'" type="danger" size="small">失败</el-tag>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="应用状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="applyTagType(row.applyStatus)" size="small">
                {{ applyLabel(row.applyStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="策略状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.strategyStatus === 'executed'" type="success" size="small">已执行</el-tag>
              <el-tag v-else-if="row.strategyStatus === 'discarded'" type="danger" size="small">超限丢弃</el-tag>
              <el-tag v-else-if="row.strategyStatus === 'executing'" type="warning" size="small">执行中</el-tag>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="A/B测试组别" width="110" align="center">
            <template #default="{ row }">
              <span v-if="row.abGroup" class="ab-badge">{{ row.abGroup }}{{ row.abGroupAlias ? `（${row.abGroupAlias}）` : '' }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrap">
          <span class="page-info">第 {{ filteredPageNum }}/{{ filteredTotalPages }} 页，共 {{ filteredTotal }} 条</span>
          <div style="flex:1" />
          <el-pagination
            v-model:current-page="filteredPageNum"
            v-model:page-size="detailPageSize"
            :page-sizes="[10, 20, 50]"
            :total="filteredTotal"
            layout="sizes, prev, pager, next"
            @current-change="updateDisplayedPage"
            @size-change="updateDisplayedPage"
            background small
          />
        </div>
      </div>
    </template>

    <!-- Callback JSON Dialog -->
    <el-dialog v-model="callbackVisible" title="回调数据 (JSON)" width="600px">
      <pre class="json-view">{{ callbackJson }}</pre>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { getExecutionDetail } from '../api'

const visible = ref(false)
const execution = ref(null)
const allItems = ref([])
const loading = ref(false)
const detailTotal = ref(0)
const detailPageSize = ref(20)
const filteredPageNum = ref(1)
const filterVisible = ref(false)
const callbackVisible = ref(false)
const callbackJson = ref('')

const filter = reactive({
  req_channel: '', uid: '', cust_id: '', device_id: '',
  callback: '', applyStatus: '', strategyStatus: '', abGroup: '',
})

const filteredItems = computed(() => {
  let items = allItems.value
  if (filter.req_channel) {
    items = items.filter(d => d.req_channel && d.req_channel.toLowerCase().includes(filter.req_channel.toLowerCase()))
  }
  if (filter.uid) {
    items = items.filter(d => d.uid && d.uid.toLowerCase().includes(filter.uid.toLowerCase()))
  }
  if (filter.cust_id) {
    items = items.filter(d => d.cust_id && d.cust_id.toLowerCase().includes(filter.cust_id.toLowerCase()))
  }
  if (filter.device_id) {
    items = items.filter(d => d.device_id && d.device_id.toLowerCase().includes(filter.device_id.toLowerCase()))
  }
  if (filter.callback === '1') {
    items = items.filter(d => d.callbackData)
  } else if (filter.callback === '0') {
    items = items.filter(d => !d.callbackData)
  }
  if (filter.applyStatus) {
    items = items.filter(d => d.applyStatus === filter.applyStatus)
  }
  if (filter.strategyStatus) {
    items = items.filter(d => d.strategyStatus === filter.strategyStatus)
  }
  if (filter.abGroup) {
    items = items.filter(d => d.abGroup === filter.abGroup)
  }
  return items
})

const filteredTotal = computed(() => filteredItems.value.length)
const filteredTotalPages = computed(() => Math.ceil(filteredTotal.value / detailPageSize.value) || 1)
const displayItems = computed(() => {
  const start = (filteredPageNum.value - 1) * detailPageSize.value
  return filteredItems.value.slice(start, start + detailPageSize.value)
})

const isExecExpired = computed(() => {
  if (!execution.value || !execution.value.expireTime) return false
  return new Date(execution.value.expireTime.replace(/-/g, '/')) < new Date()
})

function pushTagType(status) {
  const map = { sent: 'success', failed: 'danger', pending: 'info' }
  return map[status] || 'info'
}
function pushLabel(status) {
  const map = { sent: '已推送', failed: '推送失败', pending: '待推送' }
  return map[status] || '-'
}
function applyTagType(status) {
  const map = { applied: 'success', failed: 'danger', pending: 'warning', blocked: 'danger', dry_run: 'info' }
  return map[status] || 'info'
}
function applyLabel(status) {
  const map = { applied: '已应用', failed: '应用失败', pending: '待确认', blocked: '已拦截', dry_run: '空跑' }
  return map[status] || '-'
}

function applyFilter() {
  filteredPageNum.value = 1
}
function resetFilter() {
  filter.req_channel = ''
  filter.uid = ''
  filter.cust_id = ''
  filter.device_id = ''
  filter.callback = ''
  filter.applyStatus = ''
  filter.strategyStatus = ''
  filter.abGroup = ''
  filteredPageNum.value = 1
}

function updateDisplayedPage() {}

async function open(row) {
  execution.value = row
  allItems.value = []
  filteredPageNum.value = 1
  filterVisible.value = false
  resetFilter()
  visible.value = true
  loading.value = true
  try {
    const { data: res } = await getExecutionDetail({
      id: row.id,
      pageNum: 1,
      pageSize: 999,
    })
    if (res.code === 200) {
      allItems.value = res.data.items || []
      detailTotal.value = res.data.total
    }
  } catch (e) {
    console.error('Failed to fetch execution details:', e)
  } finally {
    loading.value = false
  }
}

function viewCallback(row) {
  if (row.callbackData) {
    callbackJson.value = JSON.stringify(row.callbackData, null, 2)
  }
  callbackVisible.value = true
}

defineExpose({ open })
</script>

<style scoped>
.detail-section { margin-bottom: 24px; }
.section-title {
  font-size: 14px; font-weight: 600; color: #333; margin-bottom: 16px;
  padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;
  display: flex; align-items: center; gap: 8px;
}
.section-title::before { content: ''; width: 3px; height: 16px; background: #1890ff; border-radius: 2px; }
.filter-toggle { cursor: pointer; }
.toggle-label { font-size: 12px; color: #1890ff; margin-left: 8px; }
.text-muted { color: #c0c4cc; font-size: 12px; }

.filter-panel {
  background: #fafafa; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px;
}
.filter-row { display: flex; gap: 12px; margin-bottom: 8px; }
.filter-row > * { flex: 1; }
.filter-row :deep(.el-input), .filter-row :deep(.el-select) { min-width: 100px; }
.filter-actions { display: flex; gap: 8px; justify-content: flex-end; }

.batch-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 14px; margin-bottom: 8px;
  background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px;
  font-size: 13px; color: #0050b3;
}
.batch-info { line-height: 1.6; }
.apply-status-cell { display: flex; align-items: center; justify-content: center; gap: 4px; }

.pagination-wrap { display: flex; align-items: center; padding: 16px 0; }
.page-info { font-size: 13px; color: #666; }

.json-view {
  background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 6px;
  font-family: "SF Mono","Consolas",monospace; font-size: 13px; line-height: 1.6;
  max-height: 400px; overflow: auto; white-space: pre; margin: 0;
}

.ab-badge {
  font-family: monospace; font-size: 12px; font-weight: 700; color: #1890ff;
  background: #e6f7ff; border: 1px solid #91d5ff; padding: 1px 6px; border-radius: 4px;
}
</style>

<template>
  <div class="task-list-page">
    <!-- Tab Navigation -->
    <div class="page-tabs">
      <router-link v-if="isAdmin" to="/general" class="page-tab" active-class="active">通用配置</router-link>
      <router-link v-if="!isOps" to="/tasks" class="page-tab" active-class="active">任务配置（风控）</router-link>
      <router-link to="/ops" class="page-tab" active-class="active">任务配置（运营）</router-link>
      <router-link to="/stats" class="page-tab" active-class="active">已执行任务</router-link>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-item">
        <label>节点名称</label>
        <el-select v-model="filterNodeCode" placeholder="全部" clearable size="default">
          <el-option v-for="n in nodeList" :key="n.code" :label="n.name" :value="n.code" />
        </el-select>
      </div>
      <div class="filter-item">
        <label>任务名称</label>
        <el-input v-model="filterTaskName" placeholder="请输入任务名称" clearable size="default" />
      </div>
      <div class="filter-item">
        <label>状态</label>
        <el-select v-model="filterStatus" placeholder="全部" clearable size="default">
          <el-option label="启动" :value="1" />
          <el-option label="停止" :value="2" />
        </el-select>
      </div>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <!-- Table -->
    <div class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="id" label="任务ID" width="90" />
        <el-table-column label="任务名称" min-width="200">
          <template #default="{ row }">
            <b>{{ row.taskName }}</b>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="风控节点" width="120" />
        <el-table-column label="Cron表达式" width="150">
          <template #default="{ row }">
            <code class="cron-code">{{ row.cronExpression }}</code>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '启动' : '停止' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近执行时间" width="180">
          <template #default="{ row }">
            <span v-if="row.lastExecTime">{{ row.lastExecTime }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="100" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="taskFormModalRef?.open(row)">
              编辑
            </el-button>
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
          @current-change="fetchTasks"
          @size-change="fetchTasks"
          background
          small
        />
      </div>
    </div>

    <!-- Modals -->
    <TaskFormModal
      ref="taskFormModalRef"
      :node-list="nodeList"
      :readonly-steps="true"
      :editable-step="4"
      :start-step="4"
      @saved="fetchTasks"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getNodeList, getTaskPage } from '../api'
import { useRole } from '../stores/role'
import TaskFormModal from '../components/TaskFormModal.vue'

const { isOps, isAdmin } = useRole()

const nodeList = ref([])
const tableData = ref([])
const total = ref(0)
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(20)
const filterNodeCode = ref('')
const filterTaskName = ref('')
const filterStatus = ref('')

const taskFormModalRef = ref(null)

async function fetchNodes() {
  try {
    const { data: res } = await getNodeList()
    if (res.code === 200) nodeList.value = res.data
  } catch { /* mock handles */ }
}

async function fetchTasks() {
  loading.value = true
  try {
    const { data: res } = await getTaskPage({
      pageNum: pageNum.value, pageSize: pageSize.value,
      nodeCode: filterNodeCode.value,
      taskName: filterTaskName.value,
      status: filterStatus.value,
    })
    if (res.code === 200) {
      tableData.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

function search() {
  pageNum.value = 1
  fetchTasks()
}

function reset() {
  filterNodeCode.value = ''
  filterTaskName.value = ''
  filterStatus.value = ''
  pageNum.value = 1
  fetchTasks()
}

onMounted(() => {
  fetchNodes()
  fetchTasks()
})
</script>

<style scoped>
.task-list-page { }
.page-tabs { display: flex; gap: 0; border-bottom: 2px solid #e8e8e8; margin-bottom: 16px; }
.page-tab {
  padding: 10px 24px; font-size: 14px; font-weight: 500; color: #666;
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all .2s; text-decoration: none;
}
.page-tab:hover { color: #409eff; }
.page-tab.active { color: #409eff; border-bottom-color: #409eff; }

.filter-bar { display: flex; align-items: center; gap: 16px; padding: 16px 20px;
  background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); margin-bottom: 16px; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label { white-space: nowrap; color: #666; font-size: 13px; }
.filter-item :deep(.el-input), .filter-item :deep(.el-select) { width: 160px; }

.table-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
.pagination-wrap { display: flex; align-items: center; padding: 16px 20px; }
.page-info { font-size: 13px; color: #666; }
.text-muted { color: #c0c4cc; }
.cron-code {
  font-family: "SF Mono","Consolas",monospace; font-size: 12px;
  background: #f5f5f5; padding: 2px 6px; border-radius: 4px;
}
</style>

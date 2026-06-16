<template>
  <el-dialog v-model="visible" title="执行计划" width="480px" destroy-on-close>
    <div class="plan-body">
      <p class="plan-label">任务：<b>{{ task?.taskName }}</b></p>
      <p class="plan-label">Cron：<code>{{ task?.cronExpression }}</code></p>
      <div v-if="plans.length > 0" style="margin-top:16px">
        <h4 class="plan-subtitle">后续5次执行计划（UTC+0 时区）</h4>
        <div class="plan-timeline">
          <div v-for="(p, i) in plans" :key="i" class="plan-item">
            <span class="plan-dot" :class="{ 'plan-dot-first': i === 0 }"></span>
            <span class="plan-text">第{{ i + 1 }}次：{{ p.time }}</span>
          </div>
        </div>
      </div>
      <div v-else style="text-align:center;padding:24px;color:#999;">无法解析Cron表达式，请检查格式</div>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { getTaskPlan } from '../api'

const visible = ref(false)
const task = ref(null)
const plans = ref([])

async function open(row) {
  task.value = row
  visible.value = true
  plans.value = []
  try {
    const { data: res } = await getTaskPlan(row.id)
    if (res.code === 200) {
      plans.value = res.data
    }
  } catch { /* mock */ }
}

defineExpose({ open })
</script>

<style scoped>
.plan-body { }
.plan-label { font-size: 14px; color: #333; margin-bottom: 8px; }
.plan-label code {
  font-family: "SF Mono","Consolas",monospace; font-size: 13px; color: #409eff;
  background: #ecf5ff; padding: 2px 8px; border-radius: 4px;
}
.plan-subtitle { font-size: 13px; color: #52c41a; margin: 0 0 12px; }
.plan-timeline { padding-left: 0; }
.plan-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.plan-dot {
  width: 10px; height: 10px; border-radius: 50%; background: #c0c4cc; flex-shrink: 0;
}
.plan-dot-first { background: #409eff; box-shadow: 0 0 0 3px rgba(64,158,255,.2); }
.plan-text { font-size: 13px; color: #333; font-family: "SF Mono","Consolas",monospace; }
</style>

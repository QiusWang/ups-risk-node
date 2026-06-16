<template>
  <div class="gc-page">
    <div class="page-tabs">
      <router-link v-if="isAdmin" to="/general" class="page-tab" active-class="active">通用配置</router-link>
      <router-link v-if="!isOps" to="/tasks" class="page-tab" active-class="active">任务配置（风控）</router-link>
      <router-link v-if="!isRisk" to="/ops" class="page-tab" active-class="active">任务配置（运营）</router-link>
      <router-link to="/stats" class="page-tab" active-class="active">已执行任务</router-link>
    </div>

    <div class="config-panel">
      <!-- 客群去重 -->
      <div class="config-card">
        <div class="card-bar">
          <span class="card-title">客群去重</span>
          <el-button type="primary" size="small" @click="confirmSave('dedup')" :loading="savingDedup">保存</el-button>
        </div>
        <div class="card-body">
          <el-checkbox-group v-model="config.dedupKeys" :min="1">
            <el-checkbox label="req_channel" :disabled="true">req_channel</el-checkbox>
            <el-checkbox label="uid" :disabled="true">uid</el-checkbox>
            <el-checkbox label="cust_id">cust_id</el-checkbox>
            <el-checkbox label="device_id">device_id</el-checkbox>
            <el-checkbox label="os">os</el-checkbox>
            <el-checkbox label="cust_type">cust_type</el-checkbox>
          </el-checkbox-group>
          <div class="card-hint">SQL 提取后按选中字段组合去重，保留首条记录。req_channel + uid 为必选去重键</div>
        </div>
      </div>

      <!-- 自然日应用限制 -->
      <div class="config-card">
        <div class="card-bar">
          <span class="card-title">自然日应用限制</span>
          <el-button type="primary" size="small" @click="confirmSave('limit')" :loading="savingLimit">保存</el-button>
        </div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:12px">
            <el-switch v-model="config.applyDailyLimit" size="small" />
            <span>匹配规则按 <b>{{ dedupKeysLabel }}</b>，每自然日仅允许一次有效应用</span>
          </div>
        </div>
      </div>

      <!-- 结果时效限制 -->
      <div class="config-card">
        <div class="card-bar">
          <span class="card-title">结果时效限制</span>
          <el-button type="primary" size="small" @click="confirmSave('expire')" :loading="savingExpire">保存</el-button>
        </div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:12px">
            <span>执行后</span>
            <el-input-number v-model="config.expireDays" :min="1" :max="365" size="small" style="width:100px" />
            <span>天内可提交结果应用，超时不可操作</span>
          </div>
          <div class="card-hint" style="margin-top:6px">变更后不影响已执行的任务，仅对新执行生效</div>
        </div>
      </div>

      <!-- 可应用回调比例阈值 -->
      <div class="config-card">
        <div class="card-bar">
          <span class="card-title">可应用回调比例阈值</span>
          <el-button type="primary" size="small" @click="confirmSave('ratio')" :loading="savingRatio">保存</el-button>
        </div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:12px">
            <span>已回调比例需达到</span>
            <el-input-number v-model="config.callbackRatio" :min="0" :max="100" :precision="0" :step="1" size="small" style="width:120px" />
            <span>% 方可提交结果应用</span>
          </div>
          <div class="card-hint" style="margin-top:6px">回调数 / 总客群数 ≥ 该比例时，执行状态才可从推送完成流转为回调完成，进而可提交应用。</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getGeneralConfig, saveGeneralConfig } from '../api'
import { useRole } from '../stores/role'

const { isRisk, isOps, isAdmin } = useRole()

const config = reactive({
  dedupKeys: ['req_channel', 'uid'],
  applyDailyLimit: true,
  expireDays: 30,
  callbackRatio: 99,
})

const savingDedup = ref(false)
const savingLimit = ref(false)
const savingExpire = ref(false)
const savingRatio = ref(false)

const dedupKeysLabel = computed(() => config.dedupKeys.join(' + '))

async function fetchConfig() {
  try {
    const { data: res } = await getGeneralConfig()
    if (res.code === 200) {
      config.dedupKeys = res.data.dedupKeys || ['req_channel', 'uid']
      config.applyDailyLimit = res.data.applyDailyLimit !== undefined ? res.data.applyDailyLimit : true
      config.expireDays = res.data.expireDays || 30
      config.callbackRatio = res.data.callbackRatio !== undefined ? res.data.callbackRatio : 99
    }
  } catch { /* mock */ }
}

const confirmLabels = {
  dedup: '确认保存客群去重配置？',
  limit: '确认保存自然日应用限制配置？',
  expire: '确认保存结果时效限制配置？',
  ratio: '确认保存回调比例阈值配置？',
}

async function confirmSave(type) {
  try {
    await ElMessageBox.confirm(confirmLabels[type], '保存确认', {
      confirmButtonText: '确认保存',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  if (type === 'dedup') saveDedup()
  else if (type === 'limit') saveLimit()
  else if (type === 'expire') saveExpire()
  else if (type === 'ratio') saveRatio()
}

async function saveDedup() {
  savingDedup.value = true
  try {
    const { data: res } = await saveGeneralConfig({ type: 'dedupKeys', value: config.dedupKeys })
    if (res.code === 200) ElMessage.success('去重配置已保存')
    else ElMessage.error(res.msg)
  } finally { savingDedup.value = false }
}

async function saveLimit() {
  savingLimit.value = true
  try {
    const { data: res } = await saveGeneralConfig({ type: 'applyDailyLimit', value: config.applyDailyLimit })
    if (res.code === 200) ElMessage.success('应用限制配置已保存')
    else ElMessage.error(res.msg)
  } finally { savingLimit.value = false }
}

async function saveExpire() {
  savingExpire.value = true
  try {
    const { data: res } = await saveGeneralConfig({ type: 'expireDays', value: config.expireDays })
    if (res.code === 200) ElMessage.success('结果时效已保存')
    else ElMessage.error(res.msg)
  } finally { savingExpire.value = false }
}

async function saveRatio() {
  savingRatio.value = true
  try {
    const { data: res } = await saveGeneralConfig({ type: 'callbackRatio', value: config.callbackRatio })
    if (res.code === 200) ElMessage.success('回调比例阈值已保存')
    else ElMessage.error(res.msg)
  } finally { savingRatio.value = false }
}

onMounted(fetchConfig)
</script>

<style scoped>
.gc-page { }
.page-tabs { display: flex; gap: 0; border-bottom: 2px solid #e8e8e8; margin-bottom: 24px; }
.page-tab {
  padding: 10px 24px; font-size: 14px; font-weight: 500; color: #666;
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all .2s; text-decoration: none;
}
.page-tab:hover { color: #409eff; }
.page-tab.active { color: #409eff; border-bottom-color: #409eff; }

.config-panel { display: flex; flex-direction: column; gap: 16px; }
.config-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
.card-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
.card-title { font-size: 14px; font-weight: 600; color: #333; }
.card-body { padding: 12px 16px; }
.card-hint { font-size: 12px; color: #909399; margin-top: 8px; line-height: 1.6; }
.card-body b { color: #333; }
</style>

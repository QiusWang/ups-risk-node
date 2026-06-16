// Mock data definitions

// 运营策略列表（营销系统接口Mock）
export const opsProducts = [
  { code: 'P001', name: '信用卡产品' },
  { code: 'P002', name: '消费贷产品' },
  { code: 'P003', name: '小微贷产品' },
]

export const opsStrategies = [
  { code: 'A0001', name: '提额营销策略', productCode: 'P001' },
  { code: 'A0002', name: '降额营销策略', productCode: 'P001' },
  { code: 'A0003', name: '分期营销策略', productCode: 'P001' },
  { code: 'B0001', name: '新客促活策略', productCode: 'P002' },
  { code: 'B0002', name: '沉默客群唤醒策略', productCode: 'P002' },
  { code: 'C0001', name: '高危客群处置策略', productCode: 'P003' },
  { code: 'C0002', name: '逾期催收策略', productCode: 'P003' },
  { code: 'D0001', name: '个性化定价策略', productCode: 'P002' },
  { code: 'D0002', name: '差异化额度策略', productCode: 'P002' },
]

// 风控节点列表
export const nodeList = [
  { code: '900', name: '900节点', fields: [
    { key: 'new_limit', label: '新额度', type: 'number' },
    { key: 'old_limit', label: '旧额度', type: 'number' },
    { key: 'new_level', label: '新等级', type: 'string' },
    { key: 'old_level', label: '旧等级', type: 'string' },
  ]},
  { code: '910', name: '910节点', fields: [
    { key: 'approve_status', label: '审批状态', type: 'string' },
    { key: 'approve_amount', label: '审批金额', type: 'number' },
    { key: 'approve_time', label: '审批时间', type: 'string' },
  ]},
  { code: '920', name: '920节点', fields: [
    { key: 'risk_score', label: '风险评分', type: 'number' },
    { key: 'risk_grade', label: '风险等级', type: 'string' },
    { key: 'block_flag', label: '拦截标识', type: 'string' },
  ]},
  { code: '930', name: '930节点', fields: [
    { key: 'credit_line', label: '授信额度', type: 'number' },
    { key: 'used_line', label: '已用额度', type: 'number' },
    { key: 'avail_line', label: '可用额度', type: 'number' },
  ]},
  { code: '940', name: '940节点', fields: [
    { key: 'repay_status', label: '还款状态', type: 'string' },
    { key: 'overdue_days', label: '逾期天数', type: 'number' },
    { key: 'overdue_amount', label: '逾期金额', type: 'number' },
  ]},
]

// 盐值来源选项
export const saltSources = [
  { key: 'executionId', label: '执行ID', available: true },
  { key: 'taskId', label: '任务ID', available: false },
  { key: 'nodeCode', label: '风控节点', available: false },
  { key: 'batch', label: '批次号', available: false },
  { key: 'createTime', label: '创建时间', available: false },
]

export const operators = [
  { value: '=', label: '=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '!=', label: '!=' },
  { value: 'IN', label: 'IN' },
  { value: 'NOT IN', label: 'NOT IN' },
  { value: 'IS NULL', label: 'IS NULL' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL' },
  { value: 'LIKE', label: 'LIKE' },
  { value: 'NOT LIKE', label: 'NOT LIKE' },
]

// 生成任务列表数据
let taskIdCounter = 1000
const mockTasks = [
  { id: 1001, taskName: '900节点客群额度调整任务', nodeCode: '900', nodeName: '900节点',
    sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM risk_customer_900\nWHERE status = 1 AND create_time > DATE_SUB(NOW(), INTERVAL 7 DAY)',
    cronExpression: '0 0 2 * * ?', status: 1, remark: '每周凌晨2点执行额度调整客群', creator: '张管理',
    createTime: '2026-05-10 10:30:00', lastExecTime: '2026-05-21 02:00:00',
    dedupKeys: ['req_channel', 'uid'], applyDailyLimit: true, t0Enabled: false, t0TimeStart: null, t0TimeEnd: null,
    autoApply: false, fullApply: true, applySqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1',
    taskDryRun: false, taskGroups: [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }], taskSaltKeys: ['executionId'] },
  { id: 1002, taskName: '910节点新客审批查询', nodeCode: '910', nodeName: '910节点',
    sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM risk_customer_910\nWHERE approve_status = "PENDING"',
    cronExpression: '0 30 8 * * ?', status: 2, remark: '每天8:30扫描待审批客群', creator: '李运营',
    createTime: '2026-05-12 14:20:00', lastExecTime: '2026-05-20 08:30:00',
    dedupKeys: ['req_channel', 'uid'], applyDailyLimit: true, t0Enabled: false, t0TimeStart: null, t0TimeEnd: null,
    autoApply: true, fullApply: true, applySqlContent: '' },
  { id: 1003, taskName: '920节点高风险客户筛查', nodeCode: '920', nodeName: '920节点',
    sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM risk_customer_920\nWHERE risk_score > 80',
    cronExpression: '0 0 1 * * ?', status: 1, remark: '每天凌晨1点筛查高风险客户', creator: '王风控',
    createTime: '2026-05-15 09:00:00', lastExecTime: '2026-05-22 01:00:00',
    dedupKeys: ['req_channel', 'uid'], applyDailyLimit: false, t0Enabled: true, t0TimeStart: '08:00:00', t0TimeEnd: '22:00:00',
    autoApply: false, fullApply: true, applySqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1' },
  { id: 1004, taskName: '900节点等级变更监控', nodeCode: '900', nodeName: '900节点',
    sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM risk_customer_level\nWHERE old_level != new_level',
    cronExpression: '0 0 3 * * ?', status: 2, remark: '等级变更客群扫描', creator: '张管理',
    createTime: '2026-05-18 11:00:00', lastExecTime: null,
    dedupKeys: ['req_channel', 'uid'], applyDailyLimit: true, t0Enabled: false, t0TimeStart: null, t0TimeEnd: null,
    autoApply: false, fullApply: true, applySqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1' },
  { id: 1005, taskName: '930节点额度到期提醒', nodeCode: '930', nodeName: '930节点',
    sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM risk_credit_line_expire\nWHERE expire_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)',
    cronExpression: '0 0 9 * * ?', status: 1, remark: '额度到期前30天提醒', creator: '赵运营',
    createTime: '2026-05-19 15:45:00', lastExecTime: '2026-05-22 09:00:00',
    dedupKeys: ['req_channel', 'uid'], applyDailyLimit: true, t0Enabled: false, t0TimeStart: null, t0TimeEnd: null,
    autoApply: true, fullApply: true, applySqlContent: '' },
  { id: 1006, taskName: '940节点逾期监控', nodeCode: '940', nodeName: '940节点',
    sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM risk_overdue\nWHERE overdue_days > 0',
    cronExpression: '0 0 7 * * ?', status: 1, remark: '每天7点扫描逾期客户', creator: '王风控',
    createTime: '2026-05-20 08:30:00', lastExecTime: '2026-05-22 07:00:00',
    dedupKeys: ['req_channel', 'uid'], applyDailyLimit: true, t0Enabled: false, t0TimeStart: null, t0TimeEnd: null,
    autoApply: false, fullApply: true, applySqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1' },
  { id: 1007, taskName: '900节点大额降额检测', nodeCode: '900', nodeName: '900节点',
    sqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM risk_customer_900\nWHERE new_limit < old_limit * 0.8',
    cronExpression: '0 30 6 * * ?', status: 2, remark: '', creator: '李运营',
    createTime: '2026-05-21 16:00:00', lastExecTime: null,
    dedupKeys: ['req_channel', 'uid'], applyDailyLimit: true, t0Enabled: false, t0TimeStart: null, t0TimeEnd: null,
    autoApply: false, fullApply: true, applySqlContent: 'SELECT req_channel, uid, cust_id, device_id, os\nFROM t_risk_execution_detail d\nWHERE d.execution_id = :execution_id\nAND d.callback_status = 1' },
]

// 执行记录
const mockExecutions = [
  { id: 1, taskId: 1001, taskName: '900节点客群额度调整任务', nodeCode: '900', nodeName: '900节点',
    batch: 'BATCH20260521001', execStatus: 'applied', totalCount: 1520, callbackCount: 1368, callbackSuccessCount: 1200, callbackFailCount: 168, appliedCount: 320,
    execTime: '2026-05-21 02:00:00', duration: 45, remark: '', expireDays: 30, expireTime: '2026-06-20 23:59:59', strategyExecCount: 320, hasApplied: true, applyFailedCount: 45 },
  { id: 2, taskId: 1001, taskName: '900节点客群额度调整任务', nodeCode: '900', nodeName: '900节点',
    batch: 'BATCH20260520001', execStatus: 'applied', totalCount: 1480, callbackCount: 1332, callbackSuccessCount: 1150, callbackFailCount: 182, appliedCount: 305,
    execTime: '2026-05-20 02:00:00', duration: 42, remark: '', expireDays: 30, expireTime: '2026-06-19 23:59:59', strategyExecCount: 305, hasApplied: true, applyFailedCount: 22 },
  { id: 3, taskId: 1003, taskName: '920节点高风险客户筛查', nodeCode: '920', nodeName: '920节点',
    batch: 'BATCH20260522001', execStatus: 'applied', totalCount: 850, callbackCount: 765, callbackSuccessCount: 700, callbackFailCount: 65, appliedCount: 195,
    execTime: '2026-05-22 01:00:00', duration: 28, remark: '', expireDays: 30, expireTime: '2026-06-21 23:59:59', strategyExecCount: 195, hasApplied: true, applyFailedCount: 12 },
  { id: 4, taskId: 1002, taskName: '910节点新客审批查询', nodeCode: '910', nodeName: '910节点',
    batch: 'BATCH20260520002', execStatus: 'push_failed', totalCount: 620, callbackCount: 0, callbackSuccessCount: 0, callbackFailCount: 0, appliedCount: 0,
    execTime: '2026-05-20 08:30:00', duration: 0, remark: 'Kafka推送超时，连接异常', expireDays: 5, expireTime: '2026-05-25 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
  { id: 5, taskId: 1005, taskName: '930节点额度到期提醒', nodeCode: '930', nodeName: '930节点',
    batch: 'BATCH20260522002', execStatus: 'callback_completed', totalCount: 2300, callbackCount: 2070, callbackSuccessCount: 1850, callbackFailCount: 220, appliedCount: 0,
    execTime: '2026-05-22 09:00:00', duration: 65, remark: '', expireDays: 30, expireTime: '2026-06-21 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
  { id: 6, taskId: 1006, taskName: '940节点逾期监控', nodeCode: '940', nodeName: '940节点',
    batch: 'BATCH20260522003', execStatus: 'push_completed_partially', totalCount: 410, callbackCount: 287, callbackSuccessCount: 220, callbackFailCount: 67, appliedCount: 0,
    execTime: '2026-05-22 07:00:00', duration: 35, remark: '部分子批次推送失败', expireDays: 30, expireTime: '2026-06-21 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
  { id: 7, taskId: 1001, taskName: '900节点客群额度调整任务', nodeCode: '900', nodeName: '900节点',
    batch: 'BATCH20260519001', execStatus: 'pushing', totalCount: 1560, callbackCount: 0, callbackSuccessCount: 0, callbackFailCount: 0, appliedCount: 0,
    execTime: '2026-05-22 10:00:00', duration: 0, remark: '', expireDays: 30, expireTime: '2026-06-21 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
  { id: 8, taskId: 1003, taskName: '920节点高风险客户筛查', nodeCode: '920', nodeName: '920节点',
    batch: 'BATCH20260521002', execStatus: 'applied', totalCount: 910, callbackCount: 819, callbackSuccessCount: 750, callbackFailCount: 69, appliedCount: 210,
    execTime: '2026-05-21 01:00:00', duration: 30, remark: '', expireDays: 30, expireTime: '2026-06-20 23:59:59', strategyExecCount: 210, hasApplied: true, applyFailedCount: 0 },
  { id: 9, taskId: 1006, taskName: '940节点逾期监控', nodeCode: '940', nodeName: '940节点',
    batch: 'BATCH20260521003', execStatus: 'push_failed', totalCount: 380, callbackCount: 0, callbackSuccessCount: 0, callbackFailCount: 0, appliedCount: 0,
    execTime: '2026-05-21 07:00:00', duration: 0, remark: 'SQL执行异常：表不存在', expireDays: 30, expireTime: '2026-06-20 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
  { id: 10, taskId: 1005, taskName: '930节点额度到期提醒', nodeCode: '930', nodeName: '930节点',
    batch: 'BATCH20260521004', execStatus: 'push_completed', totalCount: 2150, callbackCount: 1935, callbackSuccessCount: 1700, callbackFailCount: 235, appliedCount: 0,
    execTime: '2026-05-21 09:00:00', duration: 62, remark: '', expireDays: 30, expireTime: '2026-06-20 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
  { id: 11, taskId: 1001, taskName: '900节点客群额度调整任务', nodeCode: '900', nodeName: '900节点',
    batch: 'BATCH20260518001', execStatus: 'applied', totalCount: 1400, callbackCount: 1260, callbackSuccessCount: 1100, callbackFailCount: 160, appliedCount: 290,
    execTime: '2026-05-18 02:00:00', duration: 40, remark: '', expireDays: 30, expireTime: '2026-06-17 23:59:59', strategyExecCount: 290, hasApplied: true, applyFailedCount: 0 },
  { id: 12, taskId: 1002, taskName: '910节点新客审批查询', nodeCode: '910', nodeName: '910节点',
    batch: 'BATCH20260519002', execStatus: 'push_completed', totalCount: 780, callbackCount: 702, callbackSuccessCount: 650, callbackFailCount: 52, appliedCount: 0,
    execTime: '2026-05-19 08:30:00', duration: 25, remark: '', expireDays: 30, expireTime: '2026-06-18 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
  { id: 13, taskId: 1006, taskName: '940节点逾期监控', nodeCode: '940', nodeName: '940节点',
    batch: 'BATCH20260523001', execStatus: 'applying', totalCount: 320, callbackCount: 256, callbackSuccessCount: 200, callbackFailCount: 56, appliedCount: 0,
    execTime: '2026-05-23 07:00:00', duration: 22, remark: '应用中，等待业务系统响应', expireDays: 30, expireTime: '2026-06-22 23:59:59', strategyExecCount: 0, applyFailedCount: 0 },
]

// 生成执行明细
function generateDetails(execution) {
  const details = []
  const total = Math.min(execution.totalCount, 30)
  const node = nodeList.find(n => n.code === execution.nodeCode)

  for (let i = 0; i < total; i++) {
    const subBatch = String(Math.floor(i / 200) + 1).padStart(6, '0')
    const batchNo = `${execution.batch}-${subBatch}`
    const uniqueId = `${batchNo}-${String(i + 1).padStart(3, '0')}`

    // 推送状态由执行状态决定
    let pushStatus
    if (execution.execStatus === 'push_completed' || execution.execStatus === 'applied' || execution.execStatus === 'applying' || execution.execStatus === 'callback_completed') {
      pushStatus = 'sent'
    } else if (execution.execStatus === 'push_failed') {
      pushStatus = 'failed'
    } else if (execution.execStatus === 'push_completed_partially') {
      pushStatus = (i % 3 === 0) ? 'failed' : 'sent'
    } else {
      pushStatus = ['pending', 'sent', 'sent', 'failed'][i % 4]
    }

    const reqChannel = ['CHANNEL_001', 'CHANNEL_002', 'CHANNEL_003'][i % 3]
    const uid = `U${String(10000 + i).padStart(5, '0')}`
    const custId = `C${String(20000 + i).padStart(5, '0')}`
    const deviceId = `DEV_${String.fromCharCode(65 + (i % 26))}${String(i).padStart(3, '0')}`
    const os = ['android', 'ios'][i % 2]
    const custType = i % 3 === 0 ? null : ['个人', '企业'][i % 2]

    // 仅推送成功时有回调数据（完整响应消息格式）
    let callbackData = null
    let callbackTime = null
    let applyStatus = 'pending'
    if (pushStatus === 'sent') {
      const dataObj = {
        req_channel: reqChannel,
        uid: uid,
        cust_id: custId,
        device_id: deviceId,
        unique_id: uniqueId,
      }
      if (node) {
        node.fields.forEach(f => {
          if (f.type === 'number') dataObj[f.key] = Math.floor(Math.random() * 10000) + 1000
          else dataObj[f.key] = ['A', 'B', 'C', 'D'][i % 4]
        })
      }
      callbackData = {
        taskId: String(execution.taskId),
        riskNode: execution.nodeCode,
        batch: execution.batch,
        batchNo: batchNo,
        data: dataObj,
        execTime: randomTime(execution.execTime),
      }
      callbackTime = callbackData.execTime
      applyStatus = ['pending', 'applied', 'applied', 'failed', 'blocked', 'dry_run'][i % 6]
    }

    const strategyStatus = applyStatus === 'applied'
      ? (i % 7 === 0 ? 'discarded' : 'executed')
      : null

    const abGroups = ['A', 'B', 'C']
    const abAliases = ['', '实验组', '对照组']
    const abIdx = i % 3

    details.push({
      id: execution.id * 10000 + i + 1,
      executionId: execution.id,
      taskId: execution.taskId,
      batch: execution.batch,
      batchNo,
      req_channel: reqChannel,
      uid,
      cust_id: custId,
      device_id: deviceId,
      os,
      cust_type: custType,
      dedupKey: `${reqChannel}:${uid}`,
      pushStatus,
      callbackData,
      callbackTime,
      applyStatus,
      strategyStatus,
      applyBlockReason: null,
      abGroup: applyStatus !== 'pending' ? abGroups[abIdx] : null,
      abGroupAlias: applyStatus !== 'pending' ? abAliases[abIdx] : '',
    })
  }
  return details
}

function randomTime(baseTime) {
  const d = new Date(baseTime.replace(/-/g, '/'))
  d.setSeconds(d.getSeconds() + Math.floor(Math.random() * 300) + 30)
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

// 导出数据访问
export { mockTasks, mockExecutions, generateDetails }
export const counters = { taskId: 1000, applyId: 100 }

// 应用明细记录
export const applyDetails = []

export function addApplyDetail(detail) {
  const item = {
    id: ++counters.applyId,
    executionId: detail.executionId,
    taskId: detail.taskId || detail.taskIdValue,
    detailId: detail.detailId,
    batch: 'APPLY' + Date.now(),
    uniqueId: detail.uniqueId || detail.unique_id,
    abGroup: detail.abGroup || null,
    abGroupAlias: detail.abGroupAlias || '',
    pushEnabled: detail.pushEnabled !== undefined ? detail.pushEnabled : true,
    runMode: detail.runMode || 'normal',
    saltValue: detail.saltValue || '',
    applyStatus: detail.runMode === 'dry_run' ? 'dry_run' : 'pending',
    applyTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    responseTime: null,
    operator: '当前用户',
    remark: detail.runMode === 'dry_run' ? '空跑模式：不推送业务系统' : '',
    createTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
  }
  applyDetails.push(item)
  return item
}

export function getApplyDetailById(id) {
  return applyDetails.find(a => a.id === id)
}

export function getApplyDetailsByExecutionId(executionId) {
  return applyDetails.filter(a => a.executionId === executionId)
}

export function getTaskById(id) {
  return mockTasks.find(t => t.id === id)
}

export function getExecutionById(id) {
  return mockExecutions.find(e => e.id === id)
}

// 应用批次表
export const applyBatchList = []
let applyBatchIdCounter = 100

export function addApplyBatch(batch) {
  const item = {
    id: ++applyBatchIdCounter,
    executionId: batch.executionId,
    taskId: batch.taskId,
    batch: 'APPLY_BATCH_' + Date.now(),
    groups: batch.groups || [],
    saltValue: batch.saltValue || '',
    dryRun: batch.dryRun || false,
    totalCount: batch.totalCount || 0,
    appliedCount: batch.appliedCount || 0,
    failedCount: batch.failedCount || 0,
    blockedCount: batch.blockedCount || 0,
    applyTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    operator: '当前用户',
  }
  applyBatchList.push(item)
  return item
}

export function getApplyBatchByExecutionId(executionId) {
  return applyBatchList.filter(b => b.executionId === executionId)
}

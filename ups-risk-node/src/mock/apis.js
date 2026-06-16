import Mock from 'mockjs'
import { nodeList, mockTasks, mockExecutions, generateDetails, counters, getTaskById, getExecutionById, saltSources, applyDetails, addApplyDetail, getApplyDetailsByExecutionId, opsStrategies, opsProducts, applyBatchList, addApplyBatch, getApplyBatchByExecutionId } from './data'
import { validateSqlFields, calcNextExecutions } from '../utils/sql-validator'

// Enable mock
Mock.setup({ timeout: '50-150' })

// ============ 风控节点列表 ============
Mock.mock(/\/api\/risk\/node\/list/, 'get', () => {
  return {
    code: 200,
    data: nodeList,
    msg: 'success',
  }
})

// ============ 运营策略列表 ============
Mock.mock(/\/api\/risk\/strategy\/list/, 'get', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const productCode = url.searchParams.get('productCode')
  const list = productCode
    ? opsStrategies.filter(s => s.productCode === productCode)
    : opsStrategies
  return { code: 200, data: list, msg: 'success' }
})

// ============ 产品列表 ============
Mock.mock(/\/api\/risk\/product\/list/, 'get', () => {
  return { code: 200, data: opsProducts, msg: 'success' }
})

// ============ 任务列表（分页） ============
Mock.mock(/\/api\/risk\/task\/page/, 'post', (options) => {
  const body = JSON.parse(options.body)
  const { pageNum = 1, pageSize = 20, nodeCode, taskName, status } = body

  let list = [...mockTasks]

  if (nodeCode) list = list.filter(t => t.nodeCode === nodeCode)
  if (taskName) list = list.filter(t => t.taskName.includes(taskName))
  if (status !== undefined && status !== '' && status !== null) {
    list = list.filter(t => t.status === Number(status))
  }

  // sort by id desc
  list.sort((a, b) => b.id - a.id)

  const total = list.length
  const start = (pageNum - 1) * pageSize
  const paged = list.slice(start, start + pageSize)

  return {
    code: 200,
    data: { total, list: paged, pageNum, pageSize },
    msg: 'success',
  }
})

// ============ 获取任务详情 ============
Mock.mock(/\/api\/risk\/task\/detail/, 'get', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const id = Number(url.searchParams.get('id'))
  const task = getTaskById(id)
  return {
    code: 200,
    data: task || null,
    msg: task ? 'success' : '任务不存在',
  }
})

// ============ 创建任务 ============
Mock.mock(/\/api\/risk\/task\/create/, 'post', (options) => {
  const body = JSON.parse(options.body)
  const { taskName, nodeCode, sqlContent, cronExpression, remark } = body

  if (!taskName || !nodeCode || !sqlContent || !cronExpression) {
    return { code: 400, data: null, msg: '缺少必要参数' }
  }

  const node = nodeList.find(n => n.code === nodeCode)
  const id = ++counters.taskId
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  mockTasks.unshift({
    id, taskName, nodeCode, nodeName: node ? node.name : nodeCode,
    sqlContent, cronExpression, status: 2, // 默认停止
    remark: remark || '', creator: '当前用户',
    createTime: now, lastExecTime: null,
    dedupKeys: body.dedupKeys || ['req_channel', 'uid'],
    applyDailyLimit: body.applyDailyLimit !== undefined ? body.applyDailyLimit : true,
    t0Enabled: body.t0Enabled || false,
    t0TimeStart: body.t0TimeStart || null,
    t0TimeEnd: body.t0TimeEnd || null,
    autoApply: body.autoApply || false,
    fullApply: body.fullApply !== undefined ? body.fullApply : true,
    applySqlContent: body.applySqlContent || '',
    taskDryRun: body.taskDryRun || false,
    taskGroups: body.taskGroups || [{ name: 'A', alias: '', pushEnabled: true, ratio: 100 }],
    taskSaltKeys: body.taskSaltKeys || ['executionId'],
    opsStrategy: body.opsStrategy || '',
    opsProduct: body.opsProduct || '',
    opsPairs: body.opsPairs || [{ product: '', strategy: '' }],
  })

  return {
    code: 200,
    data: { id },
    msg: '创建成功',
  }
})

// ============ 编辑任务 ============
Mock.mock(/\/api\/risk\/task\/update/, 'put', (options) => {
  const body = JSON.parse(options.body)
  const { id, taskName, nodeCode, sqlContent, cronExpression, remark } = body

  const task = getTaskById(id)
  if (!task) return { code: 400, data: null, msg: '任务不存在' }
  if (task.status !== 2) return { code: 400, data: null, msg: '仅停止状态的任务可编辑' }

  if (taskName) task.taskName = taskName
  if (nodeCode) {
    task.nodeCode = nodeCode
    const node = nodeList.find(n => n.code === nodeCode)
    task.nodeName = node ? node.name : nodeCode
  }
  if (sqlContent !== undefined) task.sqlContent = sqlContent
  if (cronExpression !== undefined) task.cronExpression = cronExpression
  if (remark !== undefined) task.remark = remark
  if (body.dedupKeys !== undefined) task.dedupKeys = body.dedupKeys
  if (body.applyDailyLimit !== undefined) task.applyDailyLimit = body.applyDailyLimit
  if (body.t0Enabled !== undefined) task.t0Enabled = body.t0Enabled
  if (body.t0TimeStart !== undefined) task.t0TimeStart = body.t0TimeStart
  if (body.t0TimeEnd !== undefined) task.t0TimeEnd = body.t0TimeEnd
  if (body.autoApply !== undefined) task.autoApply = body.autoApply
  if (body.fullApply !== undefined) task.fullApply = body.fullApply
  if (body.applySqlContent !== undefined) task.applySqlContent = body.applySqlContent
  if (body.taskDryRun !== undefined) task.taskDryRun = body.taskDryRun
  if (body.taskGroups !== undefined) task.taskGroups = body.taskGroups
  if (body.taskSaltKeys !== undefined) task.taskSaltKeys = body.taskSaltKeys
  if (body.opsStrategy !== undefined) task.opsStrategy = body.opsStrategy
  if (body.opsProduct !== undefined) task.opsProduct = body.opsProduct
  if (body.opsPairs !== undefined) task.opsPairs = body.opsPairs
  task.updateTime = new Date().toISOString().replace('T', ' ').substring(0, 19)

  return { code: 200, data: null, msg: '修改成功' }
})

// ============ 删除任务 ============
Mock.mock(/\/api\/risk\/task\/delete/, 'delete', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const id = Number(url.searchParams.get('id'))
  const idx = mockTasks.findIndex(t => t.id === id)
  if (idx === -1) return { code: 400, data: null, msg: '任务不存在' }
  const task = mockTasks[idx]
  if (task.status !== 2) return { code: 400, data: null, msg: '仅停止状态的任务可删除' }
  mockTasks.splice(idx, 1)
  return { code: 200, data: null, msg: '删除成功' }
})

// ============ 手动执行一次 ============
Mock.mock(/\/api\/risk\/task\/execute/, 'post', (options) => {
  const body = JSON.parse(options.body)
  const task = getTaskById(body.id)
  const batch = 'BATCH' + Date.now()
  const expireDays = generalConfig.expireDays || 30
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const execId = mockExecutions.length > 0 ? Math.max(...mockExecutions.map(e => e.id)) + 1 : 1
  const execTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const expireTime = new Date(Date.now() + expireDays * 24 * 3600 * 1000)
  expireTime.setHours(23, 59, 59, 0)
  const expireTimeStr = expireTime.toISOString().replace('T', ' ').substring(0, 19)
  mockExecutions.unshift({
    id: execId,
    taskId: task ? task.id : 0,
    taskName: task ? task.taskName : '',
    nodeCode: task ? task.nodeCode : '',
    nodeName: task ? task.nodeName : '',
    batch,
    execStatus: 'pushing',
    totalCount: Math.floor(Math.random() * 2000) + 200,
    callbackCount: 0,
    appliedCount: 0,
    execTime,
    duration: 0,
    remark: '',
    expireDays,
    expireTime: expireTimeStr,
  })
  return { code: 200, data: { batch, expireDays, expireTime: expireTimeStr }, msg: '已提交执行' }
})

// ============ 停止/启动任务 ============
Mock.mock(/\/api\/risk\/task\/(stop|start)/, 'post', (options) => {
  const body = JSON.parse(options.body)
  const { id } = body
  const isStart = options.url.includes('start')
  const task = getTaskById(id)
  if (!task) return { code: 400, data: null, msg: '任务不存在' }
  task.status = isStart ? 1 : 2
  return { code: 200, data: null, msg: isStart ? '已启动' : '已停止' }
})

// ============ 执行计划 ============
Mock.mock(/\/api\/risk\/task\/plan/, 'get', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const id = Number(url.searchParams.get('id'))
  const task = getTaskById(id)
  if (!task) return { code: 400, data: null, msg: '任务不存在' }
  const plans = calcNextExecutions(task.cronExpression, 5)
  return { code: 200, data: plans, msg: 'success' }
})

// ============ SQL测试执行 ============
Mock.mock(/\/api\/risk\/sql\/test/, 'post', (options) => {
  const body = JSON.parse(options.body)
  const { sqlContent } = body

  const validation = validateSqlFields(sqlContent)
  if (!validation.valid) {
    return { code: 400, data: null, msg: validation.msg }
  }

  // 生成mock测试结果（最多10行）
  const rowCount = 5
  const rows = []
  for (let i = 0; i < rowCount; i++) {
    const row = {
      req_channel: ['CHANNEL_001', 'CHANNEL_002', 'CHANNEL_003'][Math.floor(Math.random() * 3)],
      uid: `U${String(10000 + i).padStart(5, '0')}`,
      cust_id: `C${String(20000 + i).padStart(5, '0')}`,
      device_id: `DEV_${String.fromCharCode(65 + (i % 26))}${String(i).padStart(3, '0')}`,
      os: ['android', 'ios'][Math.floor(Math.random() * 2)],
    }
    if (validation.fields && validation.fields.includes('cust_type')) {
      row.cust_type = ['个人', '企业'][Math.floor(Math.random() * 2)]
    }
    rows.push(row)
  }

  const totalCount = Math.floor(Math.random() * 5000) + 100

  return {
    code: 200,
    data: { rows, totalCount, fields: validation.fields || [] },
    msg: 'success',
  }
})

// ============ 执行记录分页 ============
Mock.mock(/\/api\/risk\/execution\/page/, 'post', (options) => {
  const body = JSON.parse(options.body)
  const { pageNum = 1, pageSize = 20, taskName, nodeCode, execStatus, dateFrom, dateTo } = body

  let list = [...mockExecutions]

  if (taskName) list = list.filter(e => e.taskName.includes(taskName))
  if (nodeCode) list = list.filter(e => e.nodeCode === nodeCode)
  if (execStatus !== undefined && execStatus !== '' && execStatus !== null) {
    list = list.filter(e => e.execStatus === execStatus)
  }
  if (dateFrom) list = list.filter(e => e.execTime >= dateFrom)
  if (dateTo) list = list.filter(e => e.execTime <= dateTo + ' 23:59:59')

  list.sort((a, b) => b.id - a.id)

  const total = list.length
  const start = (pageNum - 1) * pageSize
  const paged = list.slice(start, start + pageSize)

  return {
    code: 200,
    data: { total, list: paged, pageNum, pageSize },
    msg: 'success',
  }
})

// ============ 执行统计汇总 ============
Mock.mock(/\/api\/risk\/execution\/statistics/, 'get', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const params = Object.fromEntries(url.searchParams)

  let list = [...mockExecutions]
  if (params.taskName) list = list.filter(e => e.taskName.includes(params.taskName))
  if (params.nodeCode) list = list.filter(e => e.nodeCode === params.nodeCode)
  if (params.execStatus) list = list.filter(e => e.execStatus === params.execStatus)
  if (params.dateFrom) list = list.filter(e => e.execTime >= params.dateFrom)
  if (params.dateTo) list = list.filter(e => e.execTime <= params.dateTo + ' 23:59:59')

  const totalExec = list.length
  const successCount = list.filter(e => e.execStatus === 'push_completed').length
  const failCount = list.filter(e => e.execStatus === 'push_failed').length
  const partialCount = list.filter(e => e.execStatus === 'push_completed_partially').length
  const callbackCount = list.filter(e => e.execStatus === 'callback_completed').length
  const appliedCount = list.filter(e => e.execStatus === 'applied').length
  const applyingCount = list.filter(e => e.execStatus === 'applying').length
  const runningCount = list.filter(e => e.execStatus === 'pushing').length
  const totalCust = list.reduce((s, e) => s + e.totalCount, 0)
  const totalApplied = list.filter(e => e.execStatus === 'applied').reduce((s, e) => s + e.appliedCount, 0)
  const rate = (successCount + partialCount + failCount) > 0
    ? (((successCount + partialCount) / (successCount + partialCount + failCount)) * 100).toFixed(1)
    : '0.0'

  const t0Discarded = Math.floor(Math.random() * 50)
  const blockedCount = Math.floor(Math.random() * 20)

  return {
    code: 200,
    data: { totalExec, successCount, failCount, partialCount, callbackCount, appliedCount, applyingCount, runningCount, totalCust, totalApplied, rate, t0Discarded, blockedCount },
    msg: 'success',
  }
})

// ============ 回调数据详情（放在detail前面避免被匹配） ============
Mock.mock(/\/api\/risk\/execution\/detailItem/, 'get', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const id = Number(url.searchParams.get('id'))
  return {
    code: 200,
    data: { callbackData: { new_limit: 8000, old_limit: 5000, new_level: 'B', old_level: 'A', callback_time: '2026-05-20 02:05:30' } },
    msg: 'success',
  }
})

// ============ 执行详情 ============
Mock.mock(/\/api\/risk\/execution\/detail/, 'get', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const id = Number(url.searchParams.get('id'))
  const pageNum = Number(url.searchParams.get('pageNum')) || 1
  const pageSize = Number(url.searchParams.get('pageSize')) || 20

  const execution = getExecutionById(id)
  if (!execution) return { code: 400, data: null, msg: '执行记录不存在' }

  const allDetails = generateDetails(execution)
  const total = allDetails.length
  const start = (pageNum - 1) * pageSize
  const items = allDetails.slice(start, start + pageSize)

  return {
    code: 200,
    data: { execution, items, total, pageNum, pageSize },
    msg: 'success',
  }
})

// ============ 结果确认：筛选SQL测试 ============
Mock.mock(/\/api\/risk\/confirm\/sql\/test/, 'post', () => {
  const rowCount = 5
  const rows = []
  for (let i = 0; i < rowCount; i++) {
    rows.push({
      req_channel: ['CHANNEL_001', 'CHANNEL_002', 'CHANNEL_003'][i % 3],
      uid: `U${String(10000 + i).padStart(5, '0')}`,
      cust_id: `C${String(20000 + i).padStart(5, '0')}`,
      device_id: `DEV_${String.fromCharCode(65 + (i % 26))}${String(i).padStart(3, '0')}`,
      os: ['android', 'ios'][i % 2],
    })
  }
  const totalCount = Math.floor(Math.random() * 500) + 10
  return {
    code: 200,
    data: { rows, totalCount, count: totalCount, fields: ['req_channel', 'uid', 'cust_id', 'device_id', 'os'] },
    msg: 'success',
  }
})

// ============ 结果确认：提交应用 ============
Mock.mock(/\/api\/risk\/confirm\/apply/, 'post', (options) => {
  const body = JSON.parse(options.body)
  const { executionId, saltValue, dryRun, groups, detailIds } = body

  const execution = getExecutionById(executionId)
  const task = execution ? getTaskById(execution.taskId) : null

  // 重新应用
  if (body.reapply) {
    const applyBatch = 'REAPPLY' + Date.now()
    addApplyBatch({
      executionId, taskId: execution ? execution.taskId : 0,
      groups: [], saltValue: '', dryRun: false,
      totalCount: body.reapplyCount || 0,
      appliedCount: body.reapplyCount || 0, failedCount: 0, blockedCount: 0,
    })
    if (execution) {
      execution.execStatus = 'applying'
      execution.hasApplied = false
    }
    return { code: 200, data: { batch: applyBatch }, msg: '已提交重新应用' }
  }

  // 重推失败
  if (body.retry) {
    if (execution) {
      execution.execStatus = 'pushing'
    }
    return { code: 200, data: { batch: 'RETRY' + Date.now() }, msg: '已提交重推失败' }
  }
  const applyBatch = 'APPLY' + Date.now()
  let appliedCount = 0
  let blockedCount = 0
  const blockDetails = []
  const groupStats = {}

  // Process each group
  const effectiveGroups = dryRun ? [] : (groups || [{ name: 'A', alias: '', pushEnabled: true }])

  // Apply tracking (simulation)
  if (detailIds && detailIds.length) {
    const details = generateDetails(execution || { totalCount: detailIds.length })

    for (const detailId of detailIds) {
      // Simulate daily limit check
      if (task && task.applyDailyLimit) {
        // Check if this combination was already applied today
        const today = new Date().toISOString().substring(0, 10)
        const alreadyApplied = applyDetails.some(a =>
          a.uniqueId && a.applyStatus === 'applied' &&
          a.createTime && a.createTime.startsWith(today)
        )
        if (alreadyApplied && detailIds.indexOf(detailId) % 3 === 0) {
          blockedCount++
          addApplyDetail({
            executionId, detailId, uniqueId: 'BLOCKED',
            runMode: 'normal', saltValue: saltValue || '',
            abGroup: (effectiveGroups[0] || {}).name || 'A',
            abGroupAlias: (effectiveGroups[0] || {}).alias || '',
            pushEnabled: false,
            applyStatus: 'blocked',
            remark: '自然日应用限制：同一 req_channel+uid 当天已应用',
          })
          continue
        }
      }

      appliedCount++
      const groupIdx = (appliedCount - 1) % Math.max(effectiveGroups.length || 1, 1)
      const group = effectiveGroups[effectiveGroups.length > 0 ? groupIdx : 0]
      const groupName = effectiveGroups.length ? (group || effectiveGroups[0]).name : 'A'

      if (!groupStats[groupName]) groupStats[groupName] = { applied: 0, skipped: 0 }
      groupStats[groupName].applied++

      addApplyDetail({
        executionId, detailId, uniqueId: `DETAIL_${detailId}`,
        runMode: dryRun ? 'dry_run' : 'normal',
        saltValue: saltValue || '',
        abGroup: groupName,
        abGroupAlias: (group || {}).alias || '',
        pushEnabled: group ? group.pushEnabled : false,
        applyStatus: dryRun ? 'dry_run' : (group && group.pushEnabled ? 'applied' : 'skipped'),
      })

      if (group && !group.pushEnabled) {
        groupStats[groupName].skipped++
      }
    }
  }

  // 创建应用批次记录
  addApplyBatch({
    executionId,
    taskId: execution ? execution.taskId : 0,
    groups: groups || [],
    saltValue: saltValue || '',
    dryRun: dryRun || false,
    totalCount: detailIds ? detailIds.length : 0,
    appliedCount,
    failedCount: blockedCount,
    blockedCount,
  })

  // 更新执行记录的应用状态
  if (execution) {
    execution.execStatus = 'applying'
    execution.applyFailedCount = blockedCount
  }

  return {
    code: 200,
    data: {
      batch: applyBatch,
      appliedCount,
      blockedCount,
      blockDetails,
      groupStats,
      dryRun: dryRun || false,
    },
    msg: dryRun ? '空跑完成，数据已落表' : '已提交应用请求',
  }
})

// ============ 盐值来源列表 ============
Mock.mock(/\/api\/risk\/salt\/sources/, 'get', () => {
  return { code: 200, data: saltSources, msg: 'success' }
})

// ============ 应用批次列表 ============
Mock.mock(/\/api\/risk\/apply\/batch\/list/, 'get', (options) => {
  const url = new URL(options.url, 'http://localhost')
  const executionId = Number(url.searchParams.get('executionId'))
  const list = executionId ? getApplyBatchByExecutionId(executionId) : applyBatchList
  return { code: 200, data: list, msg: 'success' }
})

// ============ 通用配置 ============
let generalConfig = { dedupKeys: ['req_channel', 'uid'], applyDailyLimit: true, expireDays: 30, callbackRatio: 99 }

Mock.mock(/\/api\/risk\/config\/general/, 'get', () => {
  return { code: 200, data: generalConfig, msg: 'success' }
})

Mock.mock(/\/api\/risk\/config\/save/, 'post', (options) => {
  const body = JSON.parse(options.body)
  if (body.type && body.value !== undefined) {
    generalConfig[body.type] = body.value
  }
  return { code: 200, data: null, msg: '保存成功' }
})

export default {}

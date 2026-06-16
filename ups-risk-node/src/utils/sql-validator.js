import Mock from 'mockjs'

// 只做简单的字段校验 — 检查SQL的SELECT子句是否包含必要字段
export function validateSqlFields(sql) {
  if (!sql || !sql.trim()) return { valid: false, msg: 'SQL内容不能为空' }

  // 检查是否为SELECT语句（只支持SELECT）
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed.startsWith('SELECT')) {
    return { valid: false, msg: '仅支持SELECT查询语句' }
  }
  if (/\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|EXEC|EXECUTE)\b/i.test(sql)) {
    return { valid: false, msg: 'SQL包含不允许的操作语句，仅支持SELECT查询' }
  }

  // 提取SELECT和FROM之间的字段
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+/is)
  if (!selectMatch) {
    return { valid: false, msg: '无法解析SQL语句，请检查格式' }
  }

  const fieldsStr = selectMatch[1]
  if (fieldsStr.trim() === '*') {
    return { valid: false, msg: '不允许使用 SELECT *，请明确指定字段：req_channel, uid, cust_id, device_id, os' }
  }

  const fields = fieldsStr.split(',').map(f => {
    const parts = f.trim().split(/\s+/)
    const last = parts[parts.length - 1].trim()
    return last.replace(/`/g, '').toLowerCase()
  })

  const required = ['req_channel', 'uid', 'cust_id', 'device_id', 'os']
  const allowed = [...required, 'cust_type']

  const extracted = fields.filter(f => f !== '')

  for (const f of extracted) {
    if (!allowed.includes(f)) {
      return { valid: false, msg: `SQL输出字段不符合要求，仅允许输出：${allowed.join(', ')}。当前包含: ${f}` }
    }
  }

  for (const r of required) {
    if (!extracted.includes(r)) {
      return { valid: false, msg: `SQL缺少必要字段：${r}，必须包含：${required.join(', ')}` }
    }
  }

  return { valid: true, fields: extracted }
}

// 计算后续N次Cron执行时间（简化模拟）
export function calcNextExecutions(cronExpression, count = 5) {
  if (!cronExpression) return []

  // 简单解析标准5段或6段cron
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length < 5) return []

  const results = []
  const now = new Date()
  // 归零毫秒和秒
  now.setMilliseconds(0)
  if (parts.length === 6) {
    // 6段：秒 分 时 日 月 周
  }
  now.setSeconds(0)

  // 简化模拟：按分钟/小时/天递增
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.length === 6 ? parts.slice(1) : parts

  let intervalMs = 60 * 60 * 1000 // 默认1小时
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (hour === '*') {
      intervalMs = 60 * 1000 // 每分钟
      if (minute.startsWith('*/')) intervalMs = parseInt(minute.slice(2)) * 60 * 1000
    } else if (hour.startsWith('*/')) {
      intervalMs = parseInt(hour.slice(2)) * 60 * 60 * 1000
    } else {
      intervalMs = 24 * 60 * 60 * 1000
    }
  }

  // 找到下一个执行时间
  let cursor = new Date(Math.floor(now.getTime() / 60000) * 60000 + 60000) // 下一分钟开始
  // 如果是整点触发，对齐到整点
  if (minute !== '*' && !minute.includes('/')) {
    const m = parseInt(minute)
    cursor.setMinutes(m, 0, 0)
    if (cursor <= now) cursor.setTime(cursor.getTime() + intervalMs)
  }

  for (let i = 0; i < count; i++) {
    results.push({
      time: cursor.toISOString().replace('T', ' ').substring(0, 19) + ' (UTC+0)',
      timestamp: cursor.getTime(),
    })
    cursor = new Date(cursor.getTime() + intervalMs)
  }

  return results
}

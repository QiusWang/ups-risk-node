import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

// ====== 节点 ======
export const getNodeList = () => api.get('/risk/node/list')

// ====== 运营策略 ======
export const getProductList = () => api.get('/risk/product/list')
export const getStrategyList = (params) => api.get('/risk/strategy/list', { params })

// ====== 盐值来源 ======
export const getSaltSources = () => api.get('/risk/salt/sources')

// ====== 通用配置 ======
export const getGeneralConfig = () => api.get('/risk/config/general')
export const saveGeneralConfig = (data) => api.post('/risk/config/save', data)

// ====== 任务管理 ======
export const getTaskPage = (params) => api.post('/risk/task/page', params)
export const getTaskDetail = (id) => api.get('/risk/task/detail', { params: { id } })
export const createTask = (data) => api.post('/risk/task/create', data)
export const updateTask = (data) => api.put('/risk/task/update', data)
export const deleteTask = (id) => api.delete('/risk/task/delete', { params: { id } })
export const executeTask = (id) => api.post('/risk/task/execute', { id })
export const stopTask = (id) => api.post('/risk/task/stop', { id })
export const startTask = (id) => api.post('/risk/task/start', { id })
export const getTaskPlan = (id) => api.get('/risk/task/plan', { params: { id } })

// ====== SQL测试 ======
export const testSql = (data) => api.post('/risk/sql/test', data)

// ====== 执行统计 ======
export const getExecutionPage = (params) => api.post('/risk/execution/page', params)
export const getExecutionStats = (params) => api.get('/risk/execution/statistics', { params })
export const getExecutionDetail = (params) => api.get('/risk/execution/detail', { params })
export const getDetailItem = (id) => api.get('/risk/execution/detailItem', { params: { id } })

// ====== 结果确认 ======
export const testConfirmSql = (data) => api.post('/risk/confirm/sql/test', data)
export const submitApply = (data) => api.post('/risk/confirm/apply', data)
export const getApplyBatchList = (params) => api.get('/risk/apply/batch/list', { params })

export default api

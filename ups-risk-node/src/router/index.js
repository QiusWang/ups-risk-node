import { createRouter, createWebHashHistory } from 'vue-router'
import GeneralConfig from '../views/GeneralConfig.vue'
import TaskList from '../views/TaskList.vue'
import OpsTaskList from '../views/OpsTaskList.vue'
import ExecutionStats from '../views/ExecutionStats.vue'

const routes = [
  { path: '/', redirect: '/tasks' },
  { path: '/general', name: 'GeneralConfig', component: GeneralConfig },
  { path: '/tasks', name: 'TaskList', component: TaskList },
  { path: '/ops', name: 'OpsTaskList', component: OpsTaskList },
  { path: '/stats', name: 'ExecutionStats', component: ExecutionStats },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})

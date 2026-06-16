import { reactive, computed } from 'vue'

const roles = [
  { key: 'admin', label: '管理员', icon: '管' },
  { key: 'ops', label: '运营', icon: '运' },
  { key: 'risk', label: '风控', icon: '风' },
]

const state = reactive({
  current: 'admin',
})

export function useRole() {
  function setRole(role) {
    state.current = role
  }

  const isAdmin = computed(() => state.current === 'admin')
  const isOps = computed(() => state.current === 'ops')
  const isRisk = computed(() => state.current === 'risk')

  function canAccess(path) {
    if (isAdmin.value) return true
    if (isRisk.value) return path !== '/ops'
    if (isOps.value) return path !== '/tasks'
    return false
  }

  return { roles, state, setRole, isAdmin, isOps, isRisk, canAccess }
}

export { roles }

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="logo">UPS <span>风控节点任务功能</span></div>
      <div class="user-info">
        <el-select v-model="currentRole" size="small" style="width:110px" @change="onRoleChange">
          <el-option v-for="r in roles" :key="r.key" :label="r.label" :value="r.key" />
        </el-select>
        <el-avatar :size="32" style="background: #1890ff">{{ roleIcon }}</el-avatar>
      </div>
    </el-header>
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRole } from './stores/role'

const { roles, state, setRole } = useRole()
const currentRole = ref(state.current)

const roleIcon = computed(() => {
  const r = roles.find(r => r.key === currentRole.value)
  return r ? r.icon : '管'
})

function onRoleChange(val) {
  setRole(val)
}
</script>

<style>
.app-container { height: 100vh; display: flex; flex-direction: column; }
.app-header {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.08);
  padding: 0 24px; height: 56px;
}
.logo { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.logo span { color: #1890ff; font-size: 15px; font-weight: 500; }
.user-info { display: flex; align-items: center; gap: 12px; color: #666; font-size: 14px; }
.main-content { flex: 1; overflow: auto; background: #f0f2f5; padding: 24px; }
</style>

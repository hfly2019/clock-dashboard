<script setup lang="ts">
import { Cpu, Database, HardDrive, Cpu as Gpu } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

const BASE_URL = 'http://127.0.0.1:9119'

const systemStats = ref<any>(null)
const modelInfo = ref<any>(null)

let timer: number

async function fetchStats() {
  try {
    const statsRes = await fetch(`${BASE_URL}/api/system/stats`)
    if (statsRes.ok) {
      systemStats.value = await statsRes.json()
    }
    
    const modelRes = await fetch(`${BASE_URL}/api/model/info`)
    if (modelRes.ok) {
      modelInfo.value = await modelRes.json()
    }
  } catch (error) {
    console.error('Failed to fetch system stats:', error)
  }
}

onMounted(() => {
  fetchStats()
  timer = window.setInterval(fetchStats, 5000)
})

onUnmounted(() => {
  clearInterval(timer)
})

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<template>
  <div class="flex flex-wrap gap-4 mb-6">
    <!-- Model Info -->
    <div v-if="modelInfo" class="flex-1 min-w-[200px] bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div class="p-2 bg-purple-500/20 rounded-lg">
        <Gpu class="w-6 h-6 text-purple-300" />
      </div>
      <div>
        <p class="text-xs text-white/50 mb-1">Current Model</p>
        <p class="text-sm font-semibold text-white/90 truncate max-w-[150px]" :title="modelInfo.model">
          {{ modelInfo.model || 'Unknown Model' }}
        </p>
      </div>
    </div>

    <!-- CPU Usage -->
    <div v-if="systemStats?.cpu" class="flex-1 min-w-[150px] bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div class="p-2 bg-blue-500/20 rounded-lg">
        <Cpu class="w-6 h-6 text-blue-300" />
      </div>
      <div>
        <p class="text-xs text-white/50 mb-1">CPU Usage</p>
        <p class="text-sm font-semibold text-white/90">{{ systemStats.cpu.percent }}%</p>
      </div>
    </div>

    <!-- Memory Usage -->
    <div v-if="systemStats?.memory" class="flex-1 min-w-[150px] bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div class="p-2 bg-green-500/20 rounded-lg">
        <Database class="w-6 h-6 text-green-300" />
      </div>
      <div>
        <p class="text-xs text-white/50 mb-1">Memory (RAM)</p>
        <p class="text-sm font-semibold text-white/90">
          {{ formatBytes(systemStats.memory.used) }} / {{ formatBytes(systemStats.memory.total) }}
        </p>
      </div>
    </div>

    <!-- Disk Usage -->
    <div v-if="systemStats?.disk" class="flex-1 min-w-[150px] bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div class="p-2 bg-orange-500/20 rounded-lg">
        <HardDrive class="w-6 h-6 text-orange-300" />
      </div>
      <div>
        <p class="text-xs text-white/50 mb-1">Disk</p>
        <p class="text-sm font-semibold text-white/90">
          {{ systemStats.disk.percent }}% Used
        </p>
      </div>
    </div>
  </div>
</template>

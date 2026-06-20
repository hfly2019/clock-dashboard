<script setup lang="ts">
import { 
  Activity, 
  Box, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Database, 
  MessageSquare, 
  MicOff,
  Settings,
  Link2,
  Zap,
  Wrench,
  CalendarClock,
  TerminalSquare,
  Package
} from 'lucide-vue-next'
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useConfigStore } from '../stores/config'
import { storeToRefs } from 'pinia'

const configStore = useConfigStore()
const { showDrawer, activeTab, agentConfig } = storeToRefs(configStore)

// ------------------------------------
// Base Stats (from user's terminal string)
// ------------------------------------
const hermesState = ref({
  status: 'ready',
  model: 'minimax m2.7 xhigh',
  contextUsed: '53.3k',
  contextTotal: '128k',
  resourcePercent: 42,
  uptime: '6h 16m',
  lastPing: '8m 56s',
  voice: 'off',
  sessions: 2
})

// Simulated terminal blink
const cursorVisible = ref(true)
let blinkTimer: number

// ------------------------------------
// Real Data: Gateway Platforms & Model Info
// ------------------------------------
const liveStatus = ref<any>(null)
const livePlugins = ref<any[]>([])
const liveSystemStats = ref<any>(null)
const liveCronJobs = ref<any[]>([])
const liveMcpServers = ref<any[]>([])
const liveSkills = ref<any[]>([])
let sessionToken = ''
let statusTimer: number

async function fetchStatus() {
  if (!agentConfig.value.url) return
  try {
    // 1. Fetch token from HTML if we don't have one and user didn't provide one
    if (!agentConfig.value.token && !sessionToken) {
      const htmlRes = await fetch(`${agentConfig.value.url}/`, { signal: AbortSignal.timeout(3000) }).catch(() => null)
      if (htmlRes && htmlRes.ok) {
        const text = await htmlRes.text()
        const match = text.match(/__HERMES_SESSION_TOKEN__="([^"]+)"/)
        if (match) sessionToken = match[1]
      }
    }

    const activeToken = agentConfig.value.token || sessionToken
    const headers: Record<string, string> = activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}

    const [statusRes, modelRes, pluginsRes, statsRes, cronRes, mcpRes, skillsRes] = await Promise.all([
      fetch(`${agentConfig.value.url}/api/status`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
      fetch(`${agentConfig.value.url}/api/model/info`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
      fetch(`${agentConfig.value.url}/api/dashboard/plugins`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
      fetch(`${agentConfig.value.url}/api/system/stats`, { headers, signal: AbortSignal.timeout(3000) }).catch(() => null),
      fetch(`${agentConfig.value.url}/api/cron/jobs`, { headers, signal: AbortSignal.timeout(3000) }).catch(() => null),
      fetch(`${agentConfig.value.url}/api/mcp/servers`, { headers, signal: AbortSignal.timeout(3000) }).catch(() => null),
      fetch(`${agentConfig.value.url}/api/skills`, { headers, signal: AbortSignal.timeout(3000) }).catch(() => null)
    ])
    
    if (statusRes && statusRes.ok) {
      liveStatus.value = await statusRes.json()
      hermesState.value.status = liveStatus.value.gateway_state || 'ready'
      hermesState.value.sessions = liveStatus.value.active_sessions || 0
      
      // Calculate uptime based on gateway_updated_at
      if (liveStatus.value.gateway_updated_at) {
        const upSince = new Date(liveStatus.value.gateway_updated_at).getTime()
        const now = new Date().getTime()
        const diffMs = now - upSince
        const hrs = Math.floor(diffMs / (1000 * 60 * 60))
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        hermesState.value.uptime = `${hrs}h ${mins}m`
      }
    }
    
    if (modelRes && modelRes.ok) {
      const modelInfo = await modelRes.json()
      hermesState.value.model = modelInfo.model || hermesState.value.model
      if (modelInfo.config_context_length) {
        hermesState.value.contextTotal = formatBytes(modelInfo.config_context_length)
      }
    }
    
    if (pluginsRes && pluginsRes.ok) {
      livePlugins.value = await pluginsRes.json()
    }
    
    if (statsRes && statsRes.ok) {
      liveSystemStats.value = await statsRes.json()
      if (liveSystemStats.value.cpu_percent !== undefined) {
        hermesState.value.resourcePercent = Math.round(liveSystemStats.value.cpu_percent)
      }
    }

    if (cronRes && cronRes.ok) {
      const crons = await cronRes.json()
      liveCronJobs.value = crons.map((c: any) => ({
        name: c.name || c.id,
        time: c.schedule
      }))
    }

    if (mcpRes && mcpRes.ok) {
      const mcps = await mcpRes.json()
      // Hermes MCP endpoint usually returns a dict mapping server_name -> config
      liveMcpServers.value = Object.entries(mcps).map(([name, conf]: any) => ({
        name: name,
        status: conf.enabled !== false ? 'active' : 'disabled'
      }))
    }

    if (skillsRes && skillsRes.ok) {
      liveSkills.value = await skillsRes.json()
    }

  } catch (e) {
    // Silent fail for monitoring
  }
}

const gatewayPlatforms = computed(() => {
  if (!liveStatus.value?.gateway_platforms) return []
  return Object.entries(liveStatus.value.gateway_platforms).map(([key, value]: any) => ({
    name: key,
    state: value.state
  }))
})

// ------------------------------------
// Mock Data: New Modules
// ------------------------------------
const mockTokens = ref({
  prompt: 45200,
  completion: 8100,
  total: 53300,
  cost: '$0.05'
})

const mockMCPs = ref([
  { name: 'File System', status: 'active' },
  { name: 'Obsidian', status: 'active' },
  { name: 'Browser', status: 'error' },
  { name: 'Calendar', status: 'active' },
])

const mockCrons = ref([
  { name: 'Daily Briefing', time: '08:00' },
  { name: 'Memory Consolidation', time: '02:00' },
  { name: 'News Scraper', time: '12:00' },
])


// ------------------------------------
// Live Terminal Logs (Geek Mode)
// ------------------------------------
interface LogEntry {
  id: number
  text: string
}

let logIdCounter = 0
const liveLogs = ref<LogEntry[]>([
  { id: ++logIdCounter, text: '[14:32:01] System boot complete.' },
  { id: ++logIdCounter, text: '[14:32:05] Connected to gateway routing.' },
  { id: ++logIdCounter, text: '[14:35:12] Heartbeat synchronized.' },
])
const logsContainer = ref<HTMLElement | null>(null)
let logTimer: number | undefined

const dummyLogLines = [
  'Allocating memory for incoming request...',
  'Model inference started: minimax m2.7',
  'Received payload from [feishu_adapter]',
  'Executing tool: [File System]',
  'Response generated successfully. latency=1.2s',
  'Garbage collection triggered. freed=12MB'
]

function pushLog() {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  const randomLog = dummyLogLines[Math.floor(Math.random() * dummyLogLines.length)]
  liveLogs.value.push({
    id: ++logIdCounter,
    text: `[${timeStr}] ${randomLog}`
  })
  if (liveLogs.value.length > 50) {
    liveLogs.value.shift()
  }
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTo({
        top: logsContainer.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

function startLiveTerminal() {
  if (!logTimer) logTimer = window.setInterval(pushLog, 4000)
}

function stopLiveTerminal() {
  if (logTimer) {
    clearInterval(logTimer)
    logTimer = undefined
  }
}

watch(() => agentConfig.value.showLiveTerminal, (show) => {
  if (show) startLiveTerminal()
  else stopLiveTerminal()
}, { immediate: true })

// ------------------------------------
// Lifecycle
// ------------------------------------
onMounted(() => {
  fetchStatus()
  statusTimer = window.setInterval(fetchStatus, 5000)
  
  blinkTimer = window.setInterval(() => {
    cursorVisible.value = !cursorVisible.value
  }, 500)
})

onUnmounted(() => {
  clearInterval(statusTimer)
  clearInterval(blinkTimer)
  stopLiveTerminal()
})

function openSettings() {
  activeTab.value = 'agent'
  showDrawer.value = true
}

function formatBytes(num: number) {
  return (num / 1000).toFixed(1) + 'k'
}
</script>

<template>
  <div class="h-full w-full flex flex-col relative text-white">
    
    <!-- Main Scrollable Area -->
    <div 
      class="flex-1 overflow-y-auto px-[5vh] py-[6vh] custom-scrollbar z-10"
      :class="agentConfig.showLiveTerminal ? 'pb-[14vh]' : 'pb-[6vh]'"
    >
      <div class="max-w-[1200px] mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between w-full mb-[2vh]">
          <div class="flex items-baseline space-x-6">
            <h2 class="text-[4vh] font-bold tracking-widest text-nowrap leading-[5vh] uppercase">
              Hermes Core
            </h2>
          </div>
          <div class="flex space-x-4 items-center">
            <button 
              class="p-[1.5vh] bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all" 
              @click="openSettings"
            >
              <Settings class="w-[3vh] h-[3vh]" />
            </button>
          </div>
        </div>



        <!-- Base Metrics Grid -->
        <div class="grid grid-cols-4 gap-[2vh] mb-[2vh]">
          <!-- Status -->
          <div class="agent-card group">
            <Activity class="w-[4vh] h-[4vh] text-green-400 mb-[1.5vh] group-hover:scale-110 transition-transform" />
            <span class="text-[2vh] font-bold text-white tracking-wider uppercase">{{ hermesState.status }}</span>
            <span class="text-[1.5vh] text-white/40 uppercase tracking-widest mt-[0.5vh]">Status</span>
          </div>

          <!-- Model -->
          <div class="agent-card group">
            <Box class="w-[4vh] h-[4vh] text-purple-400 mb-[1.5vh] group-hover:scale-110 transition-transform" />
            <span class="text-[2vh] font-bold text-white w-full text-center px-[1vh] break-all leading-[2.2vh] line-clamp-2">{{ hermesState.model }}</span>
            <span class="text-[1.5vh] text-white/40 uppercase tracking-widest mt-[0.5vh]">Engine</span>
          </div>

          <!-- Context -->
          <div class="agent-card group relative overflow-hidden">
            <div class="absolute bottom-0 left-0 h-[0.5vh] bg-yellow-400/50" :style="{ width: `${(parseFloat(hermesState.contextUsed) / parseFloat(hermesState.contextTotal)) * 100}%` }"></div>
            <Database class="w-[4vh] h-[4vh] text-yellow-400 mb-[1.5vh] group-hover:scale-110 transition-transform" />
            <span class="text-[2vh] font-bold text-white">{{ hermesState.contextUsed }}<span class="text-[2vh] text-white/50">/{{ hermesState.contextTotal }}</span></span>
            <span class="text-[1.5vh] text-white/40 uppercase tracking-widest mt-[0.5vh]">Context Window</span>
          </div>

          <!-- CPU/Resource -->
          <div class="agent-card group relative overflow-hidden">
            <div class="absolute bottom-0 left-0 h-[0.5vh] bg-blue-500/50" :style="{ width: `${hermesState.resourcePercent}%` }"></div>
            <Cpu class="w-[4vh] h-[4vh] text-blue-400 mb-[1.5vh] group-hover:scale-110 transition-transform" />
            <span class="text-[2vh] font-bold text-white">{{ hermesState.resourcePercent }}%</span>
            <span class="text-[1.5vh] text-white/40 uppercase tracking-widest mt-[0.5vh]">System Load</span>
          </div>
        </div>

        <!-- Expanded Modules Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-[2vh]">
          
          <!-- Channels -->
          <div v-if="agentConfig.visibleModules?.channels !== false" class="agent-card !items-start !justify-start !text-left relative">
            <div class="flex items-center gap-[1vh] mb-[2vh] w-full">
              <Link2 class="w-[2.5vh] h-[2.5vh] text-blue-300" />
              <span class="text-[2vh] font-bold uppercase tracking-widest text-white/80">Channels</span>
            </div>
            <div class="w-full flex flex-col gap-[1.5vh]">
              <!-- Show live data if available, else show empty state -->
              <template v-if="gatewayPlatforms.length > 0">
                <div v-for="plat in gatewayPlatforms" :key="plat.name" class="flex justify-between items-center w-full">
                  <span class="text-[1.6vh] capitalize text-white/90">{{ plat.name }}</span>
                  <div class="flex items-center gap-[1vh] justify-end">
                    <span class="w-[1vh] h-[1vh] rounded-full flex-shrink-0" :class="plat.state === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'"></span>
                    <span class="text-[1.5vh] text-white/40 uppercase text-right min-w-[80px]">{{ plat.state }}</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="text-white/40 text-[1.6vh] text-center w-full py-[2vh]">Offline</div>
              </template>
            </div>
          </div>

          <!-- Token Analytics -->
          <div v-if="agentConfig.visibleModules?.analytics !== false" class="agent-card !items-start !justify-start !text-left relative">
            <div class="flex items-center gap-[1vh] mb-[2vh] w-full">
              <Zap class="w-[2.5vh] h-[2.5vh] text-yellow-300" />
              <span class="text-[2vh] font-bold uppercase tracking-widest text-white/80">Analytics</span>
            </div>
            <div class="w-full flex flex-col gap-[1.5vh]">
              <div class="flex justify-between items-center w-full">
                <span class="text-[1.6vh] text-white/60">Total</span>
                <span class="text-[1.6vh] font-bold text-yellow-400">{{ formatBytes(mockTokens.total) }}</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-[0.8vh] flex overflow-hidden">
                <div class="bg-blue-400 h-full" :style="{ width: `${(mockTokens.prompt/mockTokens.total)*100}%` }"></div>
                <div class="bg-purple-400 h-full" :style="{ width: `${(mockTokens.completion/mockTokens.total)*100}%` }"></div>
              </div>
              <div class="flex justify-between items-center w-full mt-[1vh]">
                <span class="text-[1.6vh] text-white/60">Skills Active</span>
                <span class="text-[1.6vh] font-bold text-green-400">{{ liveSkills.length || mockTokens.cost }}</span>
              </div>
            </div>
          </div>

          <!-- MCP Skills -->
          <div v-if="agentConfig.visibleModules?.skills !== false" class="agent-card !items-start !justify-start !text-left relative">
            <div class="flex items-center gap-[1vh] mb-[2vh] w-full">
              <Wrench class="w-[2.5vh] h-[2.5vh] text-purple-300" />
              <span class="text-[2vh] font-bold uppercase tracking-widest text-white/80">Skills / MCP</span>
            </div>
            <div class="w-full flex flex-wrap gap-[1vh]">
              <template v-if="liveMcpServers.length > 0">
                <div v-for="skill in liveMcpServers" :key="skill.name" 
                  class="px-[1.5vh] py-[0.5vh] rounded-[1vh] text-[1.6vh] flex items-center gap-[0.8vh] bg-white/5 border border-white/10">
                  <span class="w-[0.8vh] h-[0.8vh] rounded-full" :class="skill.status === 'active' ? 'bg-green-400' : 'bg-red-400'"></span>
                  {{ skill.name }}
                </div>
              </template>
              <template v-else>
                <div v-for="skill in mockMCPs" :key="skill.name" 
                  class="px-[1.5vh] py-[0.5vh] rounded-[1vh] text-[1.6vh] flex items-center gap-[0.8vh] bg-white/5 border border-white/10 opacity-50">
                  <span class="w-[0.8vh] h-[0.8vh] rounded-full" :class="skill.status === 'active' ? 'bg-green-400' : 'bg-red-400'"></span>
                  {{ skill.name }} (Mock)
                </div>
              </template>
            </div>
          </div>

          <!-- Cron Jobs -->
          <div v-if="agentConfig.visibleModules?.tasks !== false" class="agent-card !items-start !justify-start !text-left relative">
            <div class="flex items-center gap-[1vh] mb-[2vh] w-full">
              <CalendarClock class="w-[2.5vh] h-[2.5vh] text-orange-300" />
              <span class="text-[2vh] font-bold uppercase tracking-widest text-white/80">Tasks</span>
            </div>
            <div class="w-full flex flex-col gap-[1vh]">
              <template v-if="liveCronJobs.length > 0">
                <div v-for="job in liveCronJobs" :key="job.name" class="flex justify-between items-center w-full bg-white/5 p-[1vh] rounded-[1vh]">
                  <span class="text-[1.6vh] text-white/90 mr-2 break-all line-clamp-2 leading-tight">{{ job.name }}</span>
                  <span class="text-[1.5vh] text-orange-300 whitespace-nowrap">{{ job.time }}</span>
                </div>
              </template>
              <template v-else>
                <div v-for="job in mockCrons" :key="job.name" class="flex justify-between items-center w-full bg-white/5 p-[1vh] rounded-[1vh] opacity-50">
                  <span class="text-[1.6vh] text-white/90 mr-2 break-all line-clamp-2 leading-tight">{{ job.name }} (Mock)</span>
                  <span class="text-[1.5vh] text-orange-300 whitespace-nowrap">{{ job.time }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Installed Plugins (Real Data) -->
          <div v-if="agentConfig.visibleModules?.plugins !== false" class="agent-card !items-start !justify-start !text-left relative">
            <div class="flex items-center gap-[1vh] mb-[2vh] w-full">
              <Package class="w-[2.5vh] h-[2.5vh] text-teal-300" />
              <span class="text-[2vh] font-bold uppercase tracking-widest text-white/80">Plugins</span>
            </div>
            <div class="w-full flex flex-col gap-[1vh]">
              <template v-if="livePlugins.length > 0">
                <div v-for="plugin in livePlugins" :key="plugin.name" class="flex justify-between items-center w-full bg-white/5 p-[1vh] rounded-[1vh]">
                  <span class="text-[1.6vh] text-white/90 mr-2 break-all line-clamp-2 leading-tight">{{ plugin.label }}</span>
                  <span class="text-[1.5vh] text-teal-300 whitespace-nowrap">v{{ plugin.version }}</span>
                </div>
              </template>
              <template v-else>
                <div class="text-white/40 text-[1.6vh] text-center w-full py-[2vh]">No Plugins</div>
              </template>
            </div>
          </div>

        </div>
        <!-- Terminal Bar (Classic View) -->
        <div class="w-full bg-black/40 border border-white/10 rounded-[1.5vh] py-[1.5vh] px-[3vh] mt-[4vh] mb-[2vh] font-mono text-[1.6vh] flex items-center justify-between shadow-2xl backdrop-blur-xl whitespace-nowrap overflow-hidden">
          <span class="text-green-400 font-bold">ready</span>
          <span class="text-white/30">│</span>
          <span class="text-purple-300">{{ hermesState.model }}</span>
          <span class="text-white/30">│</span>
          <span class="text-yellow-300">{{ hermesState.contextUsed }}/{{ hermesState.contextTotal }}</span>
          <span class="text-white/30">│</span>
          <span class="text-blue-300 flex items-center gap-[0.5vh]">
            <div class="flex gap-[0.2vh]">
              <div v-for="i in 10" :key="i" class="w-[0.6vh] h-[1.4vh]" :class="i <= Math.round(hermesState.resourcePercent / 10) ? 'bg-blue-400' : 'bg-white/20'"></div>
            </div>
            {{ hermesState.resourcePercent }}%
          </span>
          <span class="text-white/30">│</span>
          <span class="text-orange-300">{{ hermesState.uptime }}</span>
          <span class="text-white/30">│</span>
          <span class="text-emerald-300 flex items-center gap-[0.3vh]"><CheckCircle2 class="w-[1.4vh] h-[1.4vh]"/> {{ hermesState.lastPing }}</span>
          <span class="text-white/30">│</span>
          <span class="text-red-300">voice {{ hermesState.voice }}</span>
          <span class="text-white/30">│</span>
          <span class="text-cyan-300">{{ hermesState.sessions }} sessions</span>
          <span class="w-[0.8vh] h-[1.8vh] bg-white/80 ml-1" :class="{ 'opacity-0': !cursorVisible }"></span>
        </div>
      </div>
    </div>

    <!-- Live Terminal Footer -->
    <transition name="terminal-slide">
      <div v-if="agentConfig.showLiveTerminal" class="absolute bottom-0 left-0 w-full h-[12vh] bg-black/80 border-t border-white/10 backdrop-blur-xl z-20 flex flex-col p-[2vh] px-[5vh] font-mono shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div class="flex items-center gap-[1vh] mb-[1vh] flex-shrink-0">
          <TerminalSquare class="w-[2vh] h-[2vh] text-green-500" />
          <span class="text-[1.5vh] font-bold text-white/40 uppercase tracking-widest">Live Stream</span>
        </div>
        <div ref="logsContainer" class="w-full flex-1 overflow-y-auto custom-scrollbar scroll-smooth" style="transform: translateZ(0); will-change: transform;">
          <transition-group name="log-list" tag="div" class="flex flex-col justify-end min-h-full">
            <div v-for="log in liveLogs" :key="log.id" class="text-[1.6vh] text-green-400/90 leading-relaxed font-mono w-full break-words">
              {{ log.text }}
            </div>
          </transition-group>
        </div>
      </div>
    </transition>
    
  </div>
</template>

<style scoped>
.agent-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3vh;
  padding: 3vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
}

.agent-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 0.5vh;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1vh;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}

/* Log animations */
.log-list-enter-active,
.log-list-leave-active {
  transition: all 0.3s ease;
}
.log-list-enter-from {
  opacity: 0;
  transform: translateY(1vh);
}
.log-list-leave-to {
  opacity: 0;
  transform: translateY(-1vh);
}

/* Terminal Toggle Animation */
.terminal-slide-enter-active,
.terminal-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.terminal-slide-enter-from,
.terminal-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>

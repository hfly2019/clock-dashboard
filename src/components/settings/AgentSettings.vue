<script setup lang="ts">
import { Bot, Link } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useConfigStore } from '../../stores/config'

const configStore = useConfigStore()
const { agentConfig } = storeToRefs(configStore)

// Local state for editing before save
const formData = ref({
  url: agentConfig.value.url,
  token: agentConfig.value.token || '',
  showLiveTerminal: agentConfig.value.showLiveTerminal ?? false,
  visibleModules: { ...(agentConfig.value.visibleModules || {
    channels: true,
    analytics: true,
    skills: true,
    tasks: true,
    plugins: true
  }) }
})

const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const testMessage = ref('')

async function testConnection() {
  if (!formData.value.url) return
  
  testStatus.value = 'testing'
  testMessage.value = 'Testing connection...'
  
  try {
    const res = await fetch(`${formData.value.url}/api/status`, {
      // Small timeout for test
      signal: AbortSignal.timeout(5000)
    })
    
    if (res.ok) {
      testStatus.value = 'success'
      testMessage.value = 'Connection successful!'
    } else {
      testStatus.value = 'error'
      testMessage.value = `Failed: HTTP ${res.status}`
    }
  } catch (err: any) {
    testStatus.value = 'error'
    testMessage.value = `Error: ${err.message || 'Network error'}`
  }
}

function save() {
  agentConfig.value.url = formData.value.url
  agentConfig.value.token = formData.value.token
  agentConfig.value.showLiveTerminal = formData.value.showLiveTerminal
  agentConfig.value.visibleModules = { ...formData.value.visibleModules }
}

function reset() {
  formData.value = {
    url: agentConfig.value.url,
    token: agentConfig.value.token || '',
    showLiveTerminal: agentConfig.value.showLiveTerminal ?? false,
    visibleModules: { ...(agentConfig.value.visibleModules || {
      channels: true,
      analytics: true,
      skills: true,
      tasks: true,
      plugins: true
    }) }
  }
  testStatus.value = 'idle'
  testMessage.value = ''
}

defineExpose({ save, reset })
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Server Settings -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <div class="p-1.5 bg-blue-500/20 rounded-lg">
          <Bot class="w-4 h-4 text-blue-300" />
        </div>
        <h4 class="text-sm font-medium text-white/90 tracking-wide uppercase">Hermes API Settings</h4>
      </div>
      
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="block text-xs text-white/50 px-1">API Base URL</label>
          <div class="relative">
            <input 
              v-model="formData.url"
              type="text" 
              class="settings-input w-full pl-10"
              placeholder="http://127.0.0.1:9119"
            />
            <Link class="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
          <p class="text-xs text-white/40 px-1">The base URL where your Hermes Agent is running locally or on the network.</p>
        </div>

        <div class="space-y-2">
          <label class="block text-xs text-white/50 px-1">Session Token (Optional)</label>
          <div class="relative">
            <input 
              v-model="formData.token"
              type="password" 
              class="settings-input w-full pl-10"
              placeholder="Leave blank to auto-detect"
            />
            <Key class="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
          <p class="text-xs text-white/40 px-1">Overrides auto-detection. Useful for remote hosts or CORS issues.</p>
        </div>

        <div>
          <button 
            @click="testConnection"
            :disabled="!formData.url || testStatus === 'testing'"
            class="settings-secondary-btn w-full justify-center mt-2 disabled:opacity-50"
          >
            <span v-if="testStatus === 'testing'">Testing...</span>
            <span v-else>Test Connection</span>
          </button>
          
          <p 
            v-if="testStatus !== 'idle'" 
            class="text-xs mt-2 text-center"
            :class="{
              'text-green-400': testStatus === 'success',
              'text-red-400': testStatus === 'error',
              'text-white/50': testStatus === 'testing'
            }"
          >
            {{ testMessage }}
          </p>
        </div>
      </div>
    </section>

    <!-- UI Preferences -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <div class="p-1.5 bg-purple-500/20 rounded-lg">
          <TerminalSquare class="w-4 h-4 text-purple-300" />
        </div>
        <h4 class="text-sm font-medium text-white/90 tracking-wide uppercase">UI Preferences</h4>
      </div>
      
      <div class="space-y-2">
        <div 
          class="settings-toggle-card"
          :class="{ active: formData.showLiveTerminal }"
          @click="formData.showLiveTerminal = !formData.showLiveTerminal"
        >
          <span class="font-medium text-sm">Geek Mode (Live Terminal)</span>
          <div class="toggle-switch">
            <div class="toggle-dot" />
          </div>
        </div>
        <p class="text-xs text-white/40 px-1">Displays a live-streaming terminal log at the bottom. Disable to save battery.</p>
      </div>
    </section>

    <!-- Dashboard Modules -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <div class="p-1.5 bg-orange-500/20 rounded-lg">
          <LayoutGrid class="w-4 h-4 text-orange-300" />
        </div>
        <h4 class="text-sm font-medium text-white/90 tracking-wide uppercase">Dashboard Modules</h4>
      </div>
      
      <div class="space-y-4">
        <div 
          class="settings-toggle-card"
          :class="{ active: formData.visibleModules.channels }"
          @click="formData.visibleModules.channels = !formData.visibleModules.channels"
        >
          <span class="font-medium text-sm">Channels Status</span>
          <div class="toggle-switch"><div class="toggle-dot" /></div>
        </div>

        <div 
          class="settings-toggle-card"
          :class="{ active: formData.visibleModules.analytics }"
          @click="formData.visibleModules.analytics = !formData.visibleModules.analytics"
        >
          <span class="font-medium text-sm">Token Analytics</span>
          <div class="toggle-switch"><div class="toggle-dot" /></div>
        </div>

        <div 
          class="settings-toggle-card"
          :class="{ active: formData.visibleModules.skills }"
          @click="formData.visibleModules.skills = !formData.visibleModules.skills"
        >
          <span class="font-medium text-sm">MCP Skills</span>
          <div class="toggle-switch"><div class="toggle-dot" /></div>
        </div>

        <div 
          class="settings-toggle-card"
          :class="{ active: formData.visibleModules.tasks }"
          @click="formData.visibleModules.tasks = !formData.visibleModules.tasks"
        >
          <span class="font-medium text-sm">Cron Jobs</span>
          <div class="toggle-switch"><div class="toggle-dot" /></div>
        </div>

        <div 
          class="settings-toggle-card"
          :class="{ active: formData.visibleModules.plugins }"
          @click="formData.visibleModules.plugins = !formData.visibleModules.plugins"
        >
          <span class="font-medium text-sm">Installed Plugins (Real Data)</span>
          <div class="toggle-switch"><div class="toggle-dot" /></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { TerminalSquare, LayoutGrid, Key } from 'lucide-vue-next'
</script>

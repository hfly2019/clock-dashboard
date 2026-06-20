<script setup lang="ts">
import { Clock, MessageSquare, X } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

const BASE_URL = 'http://127.0.0.1:9119'

const sessions = ref<any[]>([])
const loading = ref(true)

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', sessionId: string): void
}>()

async function fetchSessions() {
  loading.value = true
  try {
    const res = await fetch(`${BASE_URL}/api/sessions?limit=20`)
    if (res.ok) {
      sessions.value = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSessions()
})

function formatDate(isoString: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}
</script>

<template>
  <!-- Sidebar Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
    :class="isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    @click="emit('close')"
  ></div>

  <!-- Sidebar Panel -->
  <div 
    class="fixed top-0 right-0 h-full w-80 bg-slate-900/90 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform duration-300 flex flex-col"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <!-- Header -->
    <div class="p-6 flex items-center justify-between border-b border-white/10">
      <h3 class="text-xl font-bold text-white flex items-center gap-2">
        <Clock class="w-5 h-5 text-blue-400" />
        History
      </h3>
      <button @click="emit('close')" class="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-2">
      <div v-if="loading" class="text-center py-8 text-white/50">
        Loading...
      </div>
      <div v-else-if="sessions.length === 0" class="text-center py-8 text-white/50">
        No history found.
      </div>
      
      <button
        v-for="session in sessions"
        :key="session.id"
        @click="emit('select', session.id); emit('close')"
        class="w-full text-left p-4 rounded-xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group flex items-start gap-3"
      >
        <MessageSquare class="w-5 h-5 text-white/30 group-hover:text-blue-400 mt-0.5 flex-shrink-0" />
        <div class="overflow-hidden">
          <p class="text-white/90 text-sm font-medium truncate mb-1">
            {{ session.title || 'New Conversation' }}
          </p>
          <p class="text-white/40 text-xs">
            {{ formatDate(session.created_at) }}
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

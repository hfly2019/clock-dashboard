import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchChatCompletion } from '../api/agent'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const useAgentStore = defineStore('agent', () => {
  const messages = ref<Message[]>([
    {
      role: 'assistant',
      content: '你好，我是 Hermes AI。无论你有什么需求，我都在这里随时为你效劳。'
    }
  ])
  
  const isTyping = ref(false)

  async function sendMessage(content: string) {
    if (!content.trim()) return

    // Add user message
    messages.value.push({ role: 'user', content })
    isTyping.value = true

    try {
      // Fetch AI response
      const response = await fetchChatCompletion(messages.value)
      
      // Add AI message
      messages.value.push({ role: 'assistant', content: response })
    } catch (error) {
      console.error('Failed to fetch from Agent API:', error)
      messages.value.push({ role: 'assistant', content: '抱歉，我现在遇到了一些网络问题，请稍后再试。' })
    } finally {
      isTyping.value = false
    }
  }

  function clearHistory() {
    messages.value = [
      {
        role: 'assistant',
        content: '你好，我是 Hermes AI。无论你有什么需求，我都在这里随时为你效劳。'
      }
    ]
  }

  async function loadSession(sessionId: string) {
    try {
      const res = await fetch(`http://127.0.0.1:9119/api/sessions/${sessionId}/messages`)
      if (res.ok) {
        const data = await res.json()
        // Map Hermes messages to our Message type
        if (data && data.length > 0) {
          messages.value = data.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }))
        } else {
          clearHistory()
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  return {
    messages,
    isTyping,
    sendMessage,
    clearHistory,
    loadSession
  }
}, {
  persist: true
})

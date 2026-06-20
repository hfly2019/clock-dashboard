import type { LunarInfo } from '../types'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useDocumentVisibility } from '@vueuse/core'
import { getLunarDate } from '../utils/lunar'
import { useConfigStore } from '../stores/config'

export function useTime(options: { is24Hour?: boolean | { value: boolean } } = {}) {
  const now = ref(new Date())
  const h1 = ref(0)
  const h2 = ref(0)
  const m1 = ref(0)
  const m2 = ref(0)
  const s1 = ref(0)
  const s2 = ref(0)
  const lunar = ref<LunarInfo>(getLunarDate(new Date()))
  const lastUpdateDate = ref(new Date().toDateString())
  const visibility = useDocumentVisibility()
  const configStore = useConfigStore()

  let timer: number | undefined

  const update = () => {
    const d = new Date()
    now.value = d

    let hours = d.getHours()
    const is24 = typeof options.is24Hour === 'object' ? options.is24Hour.value : options.is24Hour
    if (is24 === false) {
      hours = hours % 12 || 12
    }

    const h = String(hours).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')

    h1.value = Number.parseInt(h[0])
    h2.value = Number.parseInt(h[1])
    m1.value = Number.parseInt(m[0])
    m2.value = Number.parseInt(m[1])
    s1.value = Number.parseInt(s[0])
    s2.value = Number.parseInt(s[1])

    // Update lunar if date has changed
    const currentDateStr = d.toDateString()
    if (currentDateStr !== lastUpdateDate.value) {
      lunar.value = getLunarDate(d)
      lastUpdateDate.value = currentDateStr
    }
  }

  const startTimer = () => {
    if (!timer) timer = window.setInterval(update, 1000)
  }

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
  }

  watch([visibility, () => configStore.currentPage], ([vis, page]) => {
    // Stop the timer if we are in power saving mode, or if the document is hidden.
    // Also, if we're not on the clock page (page 1) and not in clockOnlyMode, stop the timer.
    const isVisible = vis === 'visible'
    const isActive = page === 1 || configStore.layoutConfig.clockOnlyMode
    
    if (isVisible && isActive) {
      update() // refresh immediately upon becoming active
      startTimer()
    } else {
      stopTimer()
    }
  })

  onMounted(() => {
    update()
    if (visibility.value === 'visible' && (configStore.currentPage === 1 || configStore.layoutConfig.clockOnlyMode)) {
      startTimer()
    }
    lunar.value = getLunarDate(new Date())
  })

  onUnmounted(() => {
    stopTimer()
  })

  return {
    now,
    h1,
    h2,
    m1,
    m2,
    s1,
    s2,
    lunar,
  }
}

<script setup lang="ts">
import { useIdle, useMagicKeys, useDocumentVisibility } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, watch, watchEffect, ref, onMounted } from 'vue'
import NewYearEgg from './components/NewYearEgg.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import WeatherEffects from './components/WeatherEffects.vue'
import { i18n } from './i18n'
import { useConfigStore } from './stores/config'
import { useWeatherStore } from './stores/weather'
import { isIpadIOS15OrLower } from './utils/device'
import CalendarView from './views/CalendarView.vue'
import ClockWeatherView from './views/ClockWeatherView.vue'
import SmartHomeView from './views/SmartHomeView.vue'
import AgentView from './views/AgentView.vue'

const configStore = useConfigStore()
const { showDrawer, layoutConfig, currentPage, haConfig } = storeToRefs(configStore)

onMounted(() => {
  // 临时辅助：为用户自动写入提取出的真实设备 ID
  if (!haConfig.value.entities || haConfig.value.entities.length === 0 || haConfig.value.entities.some(e => !e.id || !e.id.includes('.'))) {
    haConfig.value.entities = [
      { id: 'switch.cuco_cn_675453796_v3_on_p_2_1', name: '楼顶电源' },
      { id: 'switch.cuco_cn_571390427_v3_on_p_2_1', name: '燃气热水器' },
      { id: 'switch.qmi_cn_1082536934_psv3_on_p_2_1', name: '音箱插座' },
      { id: 'switch.qmi_cn_1003563076_psv3_on_p_2_1', name: '书桌右插座' },
      { id: 'switch.qmi_cn_1003563538_psv3_on_p_2_1', name: '书桌左插座' },
      { id: 'switch.qmi_cn_1133751403_psv3_on_p_2_1', name: '3D打印机' },
      { id: 'switch.qmi_cn_1048453338_psv3_on_p_2_1', name: '小米插线板' }
    ]
  }
})

const visibility = useDocumentVisibility()
const calendarRef = ref<any>(null)

const weatherStore = useWeatherStore()
const { weatherData, showRainEffect, showThunderEffect, showSnowEffect } = storeToRefs(weatherStore)

const isSwiping = ref(false)

// 判断是否需要渲染天气特效组件
const shouldShowWeatherEffects = computed(() => {
  if (layoutConfig.value.powerSavingMode || visibility.value !== 'visible') return false
  if (!layoutConfig.value.enableAnimations) return false
  if (!weatherData.value || layoutConfig.value.clockOnlyMode) return false

  const code = weatherData.value.current?.weather_code ?? -1

  if (showRainEffect.value) {
    const isRaining = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)
    if (isRaining) return true
  }

  if (showSnowEffect.value) {
    const isSnowing = (code >= 71 && code <= 77) || (code === 85 || code === 86)
    if (isSnowing) return true
  }

  if (showThunderEffect.value) {
    const isThundering = code === 95 || code === 96 || code === 99
    if (isThundering) return true
  }

  return false
})

let startX = 0

function goToPage(page: number) {
  currentPage.value = page

  // 切换到日历看板 (page 2) 时更新当前日期
  if (page === 2 && calendarRef.value) {
    calendarRef.value.refreshToday()
  }
}

function handleTouchStart(e: TouchEvent) {
  startX = e.touches[0].clientX
}

function handleTouchEnd(e: TouchEvent) {
  const endX = e.changedTouches[0].clientX
  const diff = startX - endX
  if (Math.abs(diff) > 50) {
    isSwiping.value = true
    setTimeout(() => {
      isSwiping.value = false
    }, 50)

    if (diff > 0 && currentPage.value < 3)
      goToPage(currentPage.value + 1)
    else if (diff < 0 && currentPage.value > 0)
      goToPage(currentPage.value - 1)
  }
}

function handleMouseDown(e: MouseEvent) {
  startX = e.clientX
}

function handleMouseUp(e: MouseEvent) {
  const diff = startX - e.clientX
  if (Math.abs(diff) > 50) {
    isSwiping.value = true
    setTimeout(() => {
      isSwiping.value = false
    }, 50)

    if (diff > 0 && currentPage.value < 3)
      goToPage(currentPage.value + 1)
    else if (diff < 0 && currentPage.value > 0)
      goToPage(currentPage.value - 1)
  }
}

function handleGlobalClick(e: MouseEvent) {
  if (isSwiping.value) {
    e.stopImmediatePropagation()
    e.preventDefault()
  }
}

/** 30 秒不操作自动返回首页 */
const { idle } = useIdle(30 * 1000)
watch(idle, (newIdle) => {
  if (newIdle) {
    goToPage(1)
  }
})

/** 键盘左右键切换页面 */
const { left, right } = useMagicKeys()
watchEffect(() => {
  if (showDrawer.value) return

  if (left.value && currentPage.value > 0) {
    goToPage(currentPage.value - 1)
  }
  if (right.value && currentPage.value < 3) {
    goToPage(currentPage.value + 1)
  }
})

const { language } = storeToRefs(configStore)
i18n.global.locale.value = language.value
watch(language, (nextLocale) => {
  i18n.global.locale.value = nextLocale
})
</script>

<template>
  <div
    class="viewport-container overflow-hidden relative w-screen h-screen bg-black"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @click.capture="handleGlobalClick"
  >
    <!-- Background Decoration -->
    <template v-if="!isIpadIOS15OrLower() && (!layoutConfig.powerSavingMode || visibility === 'visible')">
      <div 
        class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000"
        :class="{'animate-breathing': layoutConfig.enableAnimations && visibility === 'visible'}" 
      />
      <div 
        class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000"
        :class="{'animate-breathing-delayed': layoutConfig.enableAnimations && visibility === 'visible'}" 
      />
    </template>

    <div
      class="main-slider flex h-full transition-transform duration-700 cubic-bezier"
      :style="{ transform: `translateX(-${currentPage * 100}vw)`, width: '400vw' }"
    >
      <div class="slide-page w-screen h-screen flex items-center justify-center flex-shrink-0">
        <SmartHomeView v-if="currentPage === 0" />
      </div>
      <div class="slide-page w-screen h-screen flex items-center justify-center flex-shrink-0">
        <ClockWeatherView />
      </div>
      <div class="slide-page w-screen h-screen flex items-center justify-center flex-shrink-0">
        <CalendarView v-if="currentPage === 2" ref="calendarRef" />
      </div>
      <div class="slide-page w-screen h-screen flex items-center justify-center flex-shrink-0">
        <AgentView v-if="currentPage === 3" />
      </div>
    </div>

    <SettingsDrawer />

    <NewYearEgg />

    <WeatherEffects v-if="shouldShowWeatherEffects" />

    <!-- Pagination Indicators -->
    <div 
      v-if="layoutConfig.showPagination && !layoutConfig.clockOnlyMode"
      class="absolute bottom-[4vh] left-1/2 -translate-x-1/2 flex items-center space-x-[1.5vh] z-50 transition-opacity duration-500"
      :class="{'opacity-0 pointer-events-none': idle}"
    >
      <div 
        v-for="pageIndex in 4" 
        :key="pageIndex"
        class="h-[0.8vh] rounded-full transition-all duration-500 cursor-pointer backdrop-blur-md border border-white/20"
        :class="currentPage === pageIndex - 1 ? 'w-[4vh] bg-white/60' : 'w-[1.2vh] bg-white/20 hover:bg-white/40'"
        @click.stop="goToPage(pageIndex - 1)"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.cubic-bezier {
  transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes breathing {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.animate-breathing {
  animation: breathing 8s ease-in-out infinite;
}

.animate-breathing-delayed {
  animation: breathing 8s ease-in-out infinite;
  animation-delay: -4s;
}
</style>

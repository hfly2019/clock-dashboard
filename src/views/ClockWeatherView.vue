<script setup lang="ts">
import { useIdle } from '@vueuse/core'
import { Settings } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DateDisplay from '../components/DateDisplay.vue'
import Digit from '../components/Digit.vue'
import Weather from '../components/Weather.vue'
import { useTime } from '../hooks/useTime'
import { useConfigStore } from '../stores/config'

const configStore = useConfigStore()
const { clockConfig, layoutConfig, showDrawer, activeTab } = storeToRefs(configStore)
const { locale } = useI18n()

const { h1, h2, m1, m2, s1, s2, lunar, now } = useTime({
  is24Hour: computed(() => clockConfig.value.is24Hour),
})

function openSettings() {
  activeTab.value = 'general'
  showDrawer.value = true
}

function toggleSeconds() {
  clockConfig.value.showSeconds = !clockConfig.value.showSeconds
}


const baseDelay = computed(() => {
  return clockConfig.value.showSeconds ? 0 : -2
})

/** 闲置时隐藏设置按钮 */
const showSettingsButton = ref(true)
const { idle } = useIdle(5 * 1000)
watch(idle, (newIdle) => {
  showSettingsButton.value = !newIdle
})
</script>

<template>
  <div
    class="glass-panel relative h-full flex flex-col items-center justify-center text-white w-full overflow-y-auto overflow-x-hidden"
    :class="{ 'clock-only-mode': layoutConfig.clockOnlyMode }"
    @click.stop="showSettingsButton = !showSettingsButton"
  >
    <!-- 设置按钮 -->
    <button
      :class="{ 'opacity-0': !showSettingsButton }"
      class="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 hover:rotate-90" @click="openSettings"
    >
      <Settings class="w-6 h-6 text-white" />
    </button>

    <!-- 日期与农历 -->
    <div v-if="!layoutConfig.clockOnlyMode" class="flex flex-col sm:flex-row items-center md:items-start w-full justify-center">
      <DateDisplay :now="now" :lunar="lunar" />
    </div>

    <!-- 时钟显示 -->
    <div
      class="clock-display tabular-nums cursor-pointer transition-all duration-500"
      :class="{ 'with-seconds': clockConfig.showSeconds }"
      :style="{ color: clockConfig.color, fontWeight: clockConfig.fontWeight, opacity: clockConfig.opacity }"
      @click.stop.prevent="toggleSeconds"
    >
      <Digit
        v-if="clockConfig.is24Hour || h1 !== 0"
        :value="h1" :show-seconds="clockConfig.showSeconds" :enable-tilt="clockConfig.enableTilt"
        :trigger="clockConfig.showSeconds ? now.getTime() : Math.floor(now.getTime() / 60000)"
        :delay="(5 - baseDelay) * 100"
        class="opacity-95"
      />
      <Digit
        :value="h2" :show-seconds="clockConfig.showSeconds" :enable-tilt="clockConfig.enableTilt"
        :trigger="clockConfig.showSeconds ? now.getTime() : Math.floor(now.getTime() / 60000)"
        :delay="(4 - baseDelay) * 100"
        class="opacity-95"
        :class="[{
          brightness: clockConfig.is24Hour || (!clockConfig.is24Hour && h1 !== 0),
        }]"
      />

      <div class="clock-separator">
        :
      </div>

      <Digit
        :value="m1" :show-seconds="clockConfig.showSeconds" :enable-tilt="clockConfig.enableTilt"
        :trigger="clockConfig.showSeconds ? now.getTime() : Math.floor(now.getTime() / 60000)"
        :delay="(3 - baseDelay) * 100"
        class="opacity-95"
      />
      <Digit
        :value="m2" :show-seconds="clockConfig.showSeconds" :enable-tilt="clockConfig.enableTilt"
        :trigger="clockConfig.showSeconds ? now.getTime() : Math.floor(now.getTime() / 60000)"
        :delay="(2 - baseDelay) * 100"
        class="opacity-95 brightness"
      />

      <template v-if="clockConfig.showSeconds">
        <div
          class="clock-separator second-separator"
          :style="{ opacity: clockConfig.opacity * 0.7 }"
        >
          :
        </div>
        <Digit
          class="second-digit opacity-60" :value="s1" :show-seconds="clockConfig.showSeconds"
          :trigger="now.getTime()"
          :delay="100"
          :enable-tilt="clockConfig.enableTilt"
        />
        <Digit
          class="second-digit brightness opacity-60" :value="s2" :show-seconds="clockConfig.showSeconds"
          :trigger="now.getTime()"
          :delay="0"
          :enable-tilt="clockConfig.enableTilt"
        />
      </template>
    </div>

    <!-- 天气展示 -->
    <Weather v-if="!layoutConfig.clockOnlyMode" />
  </div>
</template>

<style scoped>
.glass-panel {
  max-width: 150vh;
  margin: 0 auto;
}

.glass-panel.clock-only-mode {
  max-width: 100vw;
}

.clock-display {
  display: flex;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center;
  justify-content: center;
  font-family: 'SFCompactRounded', 'Huninn', sans-serif;
  font-size: clamp(10rem, 54vh, 60rem);
  margin-top: 6vh;
  margin-bottom: 6vh;
}

.clock-display.with-seconds {
  font-size: clamp(6rem, 38vh, 40rem);
}

.clock-only-mode .clock-display {
  font-size: clamp(12rem, 44vw, 70rem);
  margin-top: 0;
  margin-bottom: 0;
}

.clock-only-mode .clock-display.with-seconds {
  font-size: clamp(8rem, 30vw, 50rem);
  margin-top: 0;
  margin-bottom: 0;
}

.clock-separator {
  font-size: 95%;
  opacity: 0.98;
  text-align: center;
  margin: 0 -0.08em;
  display: flex;
  justify-content: center;
  line-height: 0.8em;
  position: relative;
  top: -0.05em;
  z-index: 10;
  filter: brightness(1.8);
}

.brightness {
  filter: brightness(1.25);
}
</style>

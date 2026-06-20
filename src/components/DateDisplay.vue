<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LunarInfo } from '../types'

const props = defineProps<{
  now: Date
  lunar: LunarInfo
}>()

const { locale } = useI18n()

const weekdayLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'long' })
  return formatter.format(props.now)
})

const yearMonthLabel = computed(() => {
  const date = props.now
  if (locale.value === 'en-US') {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${month}-${date.getFullYear()}`
  }
  const formatter = new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'long' })
  return formatter.format(date)
})

const showLunar = computed(() => locale.value !== 'en-US')
</script>

<template>
  <div class="flex items-center">
    <div class="date-day-big">
      {{ now.getDate() }}
    </div>
    <div class="flex flex-col mr-[8vh]">
      <span class="weekday-label">
        {{ weekdayLabel }}
      </span>
      <span class="year-label">
        {{ yearMonthLabel }}
      </span>
    </div>
    <div v-if="showLunar" class="flex flex-col">
      <div class="lunar-date-label">
        {{ lunar.date }}<span v-if="lunar.festival">·{{ lunar.festival }}</span>
      </div>
      <span class="lunar-year-label">{{ lunar.year }}({{ lunar.yearShengxiao }})年{{ lunar.month }}月</span>
    </div>
  </div>
</template>

<style scoped>
.date-day-big {
  font-size: clamp(6rem, 16vh, 20rem);
  line-height: 1.1;
  font-weight: 800;
  background: linear-gradient(to bottom, #ffffff, rgba(255, 255, 255, 0.7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-right: 2vh;
}

.weekday-label {
  font-size: clamp(2rem, 6vh, 6rem);
  letter-spacing: 0.2em;
  line-height: 1.1;
  opacity: 0.9;
}

.year-label {
  font-size: clamp(1.5rem, 4.6vh, 4.6rem);
  letter-spacing: 0.2em;
  line-height: 1.1;
  opacity: 0.8;
  margin-top: 0.5vh;
}

.lunar-date-label {
  font-size: clamp(2rem, 6vh, 6rem);
  letter-spacing: 0.2em;
  line-height: 1.1;
  opacity: 0.9;
}

.lunar-year-label {
  font-size: clamp(1.5rem, 4.6vh, 4.6rem);
  letter-spacing: 0.2em;
  line-height: 1.1;
  opacity: 0.8;
  margin-top: 0.5vh;
}
</style>

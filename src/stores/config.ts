import type { HAConfig } from '../types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { normalizeLocale } from '../i18n'

const defaultLanguage = normalizeLocale(typeof navigator !== 'undefined' ? navigator.language : undefined)

export const useConfigStore = defineStore('config', () => {
  const showDrawer = ref(false)
  const activeTab = ref<'general' | 'clock' | 'weather' | 'calendar' | 'smart' | 'agent'>('general')
  const currentPage = ref(1)
  const language = ref(defaultLanguage)

  const haLayout = ref({
    /** 每行显示的设备数量：3、4 或 5 */
    columns: 3,
  })
  const haConfig = ref<HAConfig>({
    url: '',
    token: '',
    entities: [],
  })

  const clockConfig = ref({
    /** 时钟颜色 */
    color: '#ffffff',
    /** 字重 */
    fontWeight: 700,
    /** 数字随机倾斜 */
    enableTilt: true,
    /** 显示秒钟 */
    showSeconds: false,
    /** 透明度 */
    opacity: 0.9,
    /** 24小时制 */
    is24Hour: true,
  })

  const calendarConfig = ref({
    /** 一周的开始：0 为周日，1 为周一 */
    weekStartDay: 0,
    /** 显示法定节假日 */
    showHolidays: true,
  })

  const layoutConfig = ref({
    /** 仅显示时钟 */
    clockOnlyMode: false,
    /** 极致省电模式 */
    powerSavingMode: false,
    /** 开启全局动效 (呼吸灯背景等) */
    enableAnimations: true,
    /** 显示底部翻页指示器 */
    showPagination: true,
  })

  const agentConfig = ref({
    /** Hermes API 基础地址 */
    url: 'http://127.0.0.1:9119',
    /** Session Token (可选) */
    token: '',
    /** 是否显示极客实时终端底栏 */
    showLiveTerminal: false,
    /** 可见模块开关 */
    visibleModules: {
      channels: true,
      analytics: true,
      skills: true,
      tasks: true,
      plugins: true
    }
  })

  return {
    haLayout,
    haConfig,
    clockConfig,
    calendarConfig,
    layoutConfig,
    agentConfig,
    showDrawer,
    activeTab,
    currentPage,
    language,
  }
}, {
  persist: {
    omit: ['showDrawer', 'activeTab', 'currentPage'],
  },
})

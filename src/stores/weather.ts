import type { CitySearchResult } from '../api/types'
import type { WeatherInfo } from '../types'
import { defineStore, storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { searchCities as searchCitiesApi } from '../api/geocoding'
import { getCurrentPosition, reverseGeocode as reverseGeocodeApi } from '../api/location'
import { fetchAirQualityData, fetchWeatherData } from '../api/weather'
import { DEFAULT_CITY, DEFAULT_LAT, DEFAULT_LON } from '../constants'
import { i18n } from '../i18n'
import { cleanDisplayName, extractSimplifiedChinese } from '../utils/string'
import { mapWmoCode } from '../utils/weather'
import { useConfigStore } from './config'

export type LocationMode = 'auto' | 'coords' | 'city'

export const useWeatherStore = defineStore('weather', () => {
  const configStore = useConfigStore()
  const { language } = storeToRefs(configStore)

  // --- Persistent State ---
  const locationMode = ref<LocationMode>('auto')
  const customLat = ref(DEFAULT_LAT)
  const customLon = ref(DEFAULT_LON)
  const customCity = ref(DEFAULT_CITY)
  const refreshInterval = ref(20)
  const showRainEffect = ref(true)
  const showThunderEffect = ref(true)
  const showSnowEffect = ref(true)

  // --- Runtime State ---
  const weatherData = ref<any>(null)
  const airQualityData = ref<any>(null)
  const loading = ref(false)
  const locationText = ref(i18n.global.t('weather.status.locating'))
  const weatherInfo = ref<WeatherInfo>({ text: i18n.global.t('weather.status.loading'), icon: mapWmoCode(-1).icon })
  const cachedCoords = ref<{ lat: number, lon: number, city: string } | null>(null)

  async function fetchWeather(lat: number, lon: number) {
    try {
      const weatherPromise = fetchWeatherData(lat, lon)
        .then((wData) => {
          weatherData.value = wData
          weatherInfo.value = mapWmoCode(wData.current.weather_code, wData.current.is_day === 1)
        })
        .catch((error) => {
          console.error('Weather API error:', error)
          weatherInfo.value.text = i18n.global.t('weather.status.apiError')
          weatherInfo.value.icon = mapWmoCode(-1).icon
        })

      const aqiPromise = fetchAirQualityData(lat, lon)
        .then((aData) => {
          airQualityData.value = aData
        })
        .catch((error) => {
          console.error('Air Quality API error:', error)
        })

      await Promise.all([weatherPromise, aqiPromise])
    }
    catch (error) {
      console.error('Update weather failed:', error)
    }
    finally {
      loading.value = false
    }
  }


  async function searchCities(query: string): Promise<CitySearchResult[]> {
    try {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) {
        return []
      }

      const results = await searchCitiesApi(trimmedQuery, 3, language.value)
      if (results.length > 0) {
        return results.map((r) => {
          const rawName = r.address?.city || ''
          const rawDisplayName = r.display_name || ''
          const cityName = extractSimplifiedChinese(rawName.split(',')[0] || rawName)
          const displayName = cleanDisplayName(rawDisplayName)

          return {
            name: cityName || trimmedQuery,
            displayName: displayName || cityName || trimmedQuery,
            latitude: Number.parseFloat(r.lat),
            longitude: Number.parseFloat(r.lon),
          }
        })
      }
      return []
    }
    catch (e) {
      return []
    }
  }

  async function getCurrentCoords(): Promise<{ lat: number, lon: number }> {
    if (locationMode.value === 'coords') {
      return { lat: customLat.value, lon: customLon.value }
    }

    if (locationMode.value === 'city') {
      const results = await searchCities(customCity.value)
      if (results.length > 0) {
        return { lat: results[0].latitude, lon: results[0].longitude }
      }
      return { lat: DEFAULT_LAT, lon: DEFAULT_LON }
    }

    if (cachedCoords.value) {
      return { lat: cachedCoords.value.lat, lon: cachedCoords.value.lon }
    }

    return { lat: DEFAULT_LAT, lon: DEFAULT_LON }
  }

  async function reverseGeocode(lat: number, lon: number) {
    try {
      const data = await reverseGeocodeApi(lat, lon, language.value)
      const city = data.city || data.locality || data.principalSubdivision || i18n.global.t('weather.status.unknownCity')
      return city
    }
    catch (e) {
      return `${lon.toFixed(2)}, ${lat.toFixed(2)}`
    }
  }

  async function updateWeather() {
    loading.value = true
    weatherInfo.value.text = i18n.global.t('weather.status.loading')
    locationText.value = i18n.global.t('weather.status.locating')

    if (locationMode.value === 'coords') {
      cachedCoords.value = null
      const city = await reverseGeocode(customLat.value, customLon.value)
      locationText.value = city
      await fetchWeather(customLat.value, customLon.value)
      return
    }

    if (locationMode.value === 'city') {
      cachedCoords.value = null
      locationText.value = i18n.global.t('weather.status.locating')
      const trimmedCity = customCity.value.trim()
      if (!trimmedCity) {
        locationText.value = i18n.global.t('weather.status.cityEmpty')
        throw new Error(i18n.global.t('weather.status.cityEmpty'))
      }
      const results = await searchCities(customCity.value)
      if (results.length > 0) {
        const result = results[0]
        locationText.value = result.name
        await fetchWeather(result.latitude, result.longitude)
      }
      return
    }

    // Auto mode
    if (locationMode.value === 'auto' && cachedCoords.value) {
      const { lat, lon } = cachedCoords.value
      locationText.value = cachedCoords.value.city
      await fetchWeather(lat, lon)
      return
    }
    let lat = DEFAULT_LAT
    let lon = DEFAULT_LON
    let city = i18n.global.t('weather.status.defaultCity')

    try {
      const coords = await getCurrentPosition(5000, language.value)
      const locationData = await reverseGeocodeApi(coords.latitude, coords.longitude, language.value)
      lat = coords.latitude
      lon = coords.longitude
      city = locationData.locality || locationData.city || locationData.principalSubdivision || i18n.global.t('weather.status.unknownCity')
    }
    catch (error) {
      console.warn('Geolocation failed, using default coordinates.')
    }

    locationText.value = city
    cachedCoords.value = { lat, lon, city }
    
    await fetchWeather(lat, lon).catch(() => {
      weatherInfo.value.text = i18n.global.t('weather.status.updateTimeout')
    })
  }

  // 模式切换同步清理
  watch(locationMode, (newMode) => {
    if (newMode === 'auto') {
      cachedCoords.value = null
      locationText.value = i18n.global.t('weather.status.locating')
    }
  }, { flush: 'sync' })

  watch(() => i18n.global.locale.value, () => {
    if (weatherData.value?.current) {
      weatherInfo.value = mapWmoCode(weatherData.value.current.weather_code, weatherData.value.current.is_day === 1)
    }
    if (loading.value) {
      weatherInfo.value.text = i18n.global.t('weather.status.loading')
      locationText.value = i18n.global.t('weather.status.locating')
    }
  })

  return {
    // Persistent
    locationMode,
    customLat,
    customLon,
    customCity,
    refreshInterval,
    showRainEffect,
    showThunderEffect,
    showSnowEffect,
    // Runtime
    weatherData,
    loading,
    locationText,
    weatherInfo,
    airQualityData,
    // Actions
    updateWeather,
    searchCities,
    getCurrentCoords,
  }
}, {
  persist: {
    pick: [
      'locationMode',
      'customLat',
      'customLon',
      'customCity',
      'refreshInterval',
      'showRainEffect',
      'showThunderEffect',
      'showSnowEffect',
    ],
  },
})

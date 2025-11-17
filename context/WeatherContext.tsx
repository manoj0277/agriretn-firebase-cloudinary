import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type WeatherSummary = {
  rainToday: boolean
  rainNext3Days: boolean
  dryNext5Days: boolean
  temperatureNow?: number
}

interface WeatherContextType {
  coords?: { lat: number; lng: number }
  summary: WeatherSummary
  loading: boolean
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined)

const toSummary = (data: any): WeatherSummary => {
  const dailyRain = (data?.daily?.rain_sum || []) as number[]
  const hourlyTemp = (data?.hourly?.temperature_2m || []) as number[]
  const rainToday = (dailyRain[0] || 0) > 0.1
  const rainNext3Days = (dailyRain.slice(0, 3).reduce((a, b) => a + (b || 0), 0)) > 0.1
  const dryNext5Days = (dailyRain.slice(0, 5).reduce((a, b) => a + (b || 0), 0)) < 0.1
  const temperatureNow = hourlyTemp[0]
  return { rainToday, rainNext3Days, dryNext5Days, temperatureNow }
}

export const WeatherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>()
  const [summary, setSummary] = useState<WeatherSummary>({ rainToday: false, rainNext3Days: false, dryNext5Days: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const getCoords = (): Promise<{ lat: number; lng: number }> => new Promise((resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve({ lat: 17.385, lng: 78.4867 })
            )
          } else {
            resolve({ lat: 17.385, lng: 78.4867 })
          }
        })
        const c = await getCoords()
        setCoords(c)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&hourly=temperature_2m&daily=rain_sum&timezone=auto`
        const res = await fetch(url)
        const json = await res.json()
        setSummary(toSummary(json))
      } catch {
        setSummary({ rainToday: false, rainNext3Days: false, dryNext5Days: false })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const value = useMemo(() => ({ coords, summary, loading }), [coords, summary, loading])
  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>
}

export const useWeather = (): WeatherContextType => {
  const ctx = useContext(WeatherContext)
  if (!ctx) throw new Error('useWeather must be used within WeatherProvider')
  return ctx
}
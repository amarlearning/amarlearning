import fs from 'fs'
import got from 'got'
import { formatDistance } from 'date-fns'

// WMO Weather Codes -> Emojis
const emojis = {
  0: '☀️',  // Clear sky
  1: '🌤',  // Mainly clear
  2: '⛅',  // Partly cloudy
  3: '☁️',  // Overcast
  45: '🌫', // Fog
  48: '🌫', // Depositing rime fog
  51: '🌧', // Light drizzle
  53: '🌧', // Moderate drizzle
  55: '🌧', // Dense drizzle
  56: '🌧', // Light freezing drizzle
  57: '🌧', // Dense freezing drizzle
  61: '🌧', // Slight rain
  63: '🌧', // Moderate rain
  65: '🌧', // Heavy rain
  66: '🌧', // Light freezing rain
  67: '🌧', // Heavy freezing rain
  71: '🌨', // Slight snow
  73: '🌨', // Moderate snow
  75: '❄️', // Heavy snow
  77: '🌨', // Snow grains
  80: '🌦', // Slight rain showers
  81: '🌦', // Moderate rain showers
  82: '🌧', // Violent rain showers
  85: '🌨', // Slight snow showers
  86: '❄️', // Heavy snow showers
  95: '⛈',  // Thunderstorm
  96: '⛈',  // Thunderstorm with slight hail
  99: '⛈',  // Thunderstorm with heavy hail
}

// Columbus, Ohio
const LATITUDE = 18.516726
const LONGITUDE = 73.856255

// Cheap, janky way to have variable bubble width
const dayBubbleWidths = {
  Monday: 235,
  Tuesday: 235,
  Wednesday: 260,
  Thursday: 245,
  Friday: 220,
  Saturday: 245,
  Sunday: 230,
}

// Time working at PlanetScale
const today = new Date()
const todayDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
  today
)

const psTime = formatDistance(new Date(2020, 12, 14), today, {
  addSuffix: false,
})

// Today's weather from Open-Meteo (free, no API key required)
const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&daily=temperature_2m_max,weather_code&temperature_unit=fahrenheit&timezone=auto`

console.log(`Fetching weather for ${LATITUDE}, ${LONGITUDE}...`)

got(url)
  .then((response) => {
    let json
    try {
      json = JSON.parse(response.body)
    } catch (e) {
      console.error('Failed to parse API response:', response.body.slice(0, 500))
      process.exit(1)
    }

    if (!json.daily || !json.daily.temperature_2m_max || !json.daily.weather_code) {
      console.error('Unexpected API response structure:', JSON.stringify(json, null, 2))
      process.exit(1)
    }

    const degF = Math.round(json.daily.temperature_2m_max[0])
    const degC = Math.round((degF - 32) * 5 / 9)
    const weatherCode = json.daily.weather_code[0]
    const emoji = emojis[weatherCode] || '🌡'

    console.log(`Weather: ${degF}°F (${degC}°C), code ${weatherCode} ${emoji}`)

    fs.readFile('template.svg', 'utf-8', (error, data) => {
      if (error) {
        console.error('Failed to read template.svg:', error.message)
        process.exit(1)
      }

      data = data.replace('{degF}', degF)
      data = data.replace('{degC}', degC)
      data = data.replace('{weatherEmoji}', emoji)
      data = data.replace('{psTime}', psTime)
      data = data.replace('{todayDay}', todayDay)
      data = data.replace('{dayBubbleWidth}', dayBubbleWidths[todayDay])

      fs.writeFile('chat.svg', data, (err) => {
        if (err) {
          console.error('Failed to write chat.svg:', err.message)
          process.exit(1)
        }
        console.log('Successfully updated chat.svg')
      })
    })
  })
  .catch((err) => {
    console.error('Failed to fetch weather from Open-Meteo')
    console.error('URL:', url)
    console.error('Error:', err.message)
    if (err.response) {
      console.error('Status:', err.response.statusCode)
      console.error('Body:', err.response.body?.slice(0, 500))
    }
    process.exit(1)
  })
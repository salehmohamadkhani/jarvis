import { transcribeAudio } from './gptClient.js'

export const STT_LANGUAGE = import.meta.env.VITE_STT_LANGUAGE || 'fa-IR'

const WEB_SPEECH_ONLY = import.meta.env.VITE_STT_WEB_SPEECH_ONLY === 'true'

export function hasBrowserSpeechRecognition() {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export async function transcribeWithFallback(blob, options = {}) {
  const { browserFallbackText = '' } = options
  const fallbackTrim = (browserFallbackText || '').trim()

  const useServer = !WEB_SPEECH_ONLY
  if (!useServer) return fallbackTrim

  try {
    const text = await transcribeAudio(blob)
    return (text || '').trim() || fallbackTrim
  } catch (err) {
    if (fallbackTrim) return fallbackTrim
    throw err
  }
}

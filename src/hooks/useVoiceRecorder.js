import { useEffect, useRef, useState } from "react"

function getPreferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "audio/webm"
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported?.(t)) return t
  }
  return "audio/webm"
}

export default function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const stopResolveRef = useRef(null)
  const streamRef = useRef(null)
  const mimeTypeRef = useRef("audio/webm")
  const requestDataIntervalRef = useRef(null)
  const stopRequestedRef = useRef(false)
  const startInProgressRef = useRef(false)

  useEffect(() => {
    return () => {
      if (requestDataIntervalRef.current) {
        clearInterval(requestDataIntervalRef.current)
        requestDataIntervalRef.current = null
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop()
        }
      } catch {
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const waitForStartRecordingIdle = async (maxMs) => {
    const deadline = Date.now() + maxMs
    while (startInProgressRef.current && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 35))
    }
  }

  const waitUntilRecording = async (mr, maxMs) => {
    const deadline = Date.now() + maxMs
    while (mr === mediaRecorderRef.current && Date.now() < deadline) {
      if (mr.state === "recording") return true
      await new Promise((r) => setTimeout(r, 40))
    }
    return mr.state === "recording"
  }

  const startRecording = async () => {
    if (isRecording) return

    startInProgressRef.current = true
    try {
      stopRequestedRef.current = false

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser")
      }

      let stream = streamRef.current
      if (!stream || stream.getTracks().every((t) => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      }

      if (stopRequestedRef.current) {
        try {
          stream.getTracks().forEach((t) => t.stop())
        } catch {}
        streamRef.current = null
        return
      }

      const mimeType = getPreferredAudioMimeType()
      mimeTypeRef.current = mimeType
      let mediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      } catch {
        mediaRecorder = new MediaRecorder(stream)
      }
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const type = mediaRecorderRef.current?.mimeType || mimeTypeRef.current || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })

        const resolve = stopResolveRef.current
        stopResolveRef.current = null
        if (resolve) {
          resolve(blob)
        }
      }

      try {
        mediaRecorder.start(250)
      } catch {
        mediaRecorder.start()
      }
      setIsRecording(true)
      if (typeof mediaRecorder.requestData === "function") {
        requestDataIntervalRef.current = setInterval(() => {
          try {
            if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.requestData()
          } catch {}
        }, 250)
      }
    } finally {
      startInProgressRef.current = false
    }
  }

  const stopRecording = () => {
    stopRequestedRef.current = true

    if (requestDataIntervalRef.current) {
      clearInterval(requestDataIntervalRef.current)
      requestDataIntervalRef.current = null
    }

    return (async () => {
      await waitForStartRecordingIdle(6000)

      const mr = mediaRecorderRef.current

      if (!mr) {
        const s = streamRef.current
        if (s) {
          try {
            s.getTracks().forEach((t) => t.stop())
          } catch {}
          streamRef.current = null
        }
        setIsRecording(false)
        stopRequestedRef.current = false
        return null
      }

      const recordingReady = await waitUntilRecording(mr, 5000)

      if (!recordingReady || mr.state !== "recording") {
        setIsRecording(false)
        stopRequestedRef.current = false
        try {
          streamRef.current?.getTracks().forEach((t) => t.stop())
        } catch {}
        streamRef.current = null
        try {
          if (mr.state !== "inactive") mr.stop()
        } catch {}
        mediaRecorderRef.current = null
        chunksRef.current = []
        return null
      }

      const STOP_TIMEOUT_MS = 5000

      return new Promise((resolve) => {
        let settled = false
        const done = (blob) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          stopResolveRef.current = null
          stopRequestedRef.current = false
          resolve(blob)
        }
        stopResolveRef.current = done
        const timer = setTimeout(() => {
          const chunks = chunksRef.current
          const type = mediaRecorderRef.current?.mimeType || mimeTypeRef.current || "audio/webm"
          const blob = chunks.length ? new Blob(chunks, { type }) : null
          done(blob)
        }, STOP_TIMEOUT_MS)
        try {
          if (typeof mr.requestData === "function") {
            try {
              mr.requestData()
            } catch {
            }
          }
          mr.stop()
        } catch {
          done(null)
        }
        setIsRecording(false)
      })
    })()
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
    streamRef,
  }
}

import { useRef, useState, useEffect, useCallback } from "react"

export default function useAudioEngine() {

  const audioRef = useRef(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)

  useEffect(() => {

    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume

  }, [volume, isMuted])

  const handleTimeUpdate = useCallback((e) => {

    const a = e.currentTarget
    setCurrentTime(a.currentTime)

  }, [])

  const handleLoadedMetadata = useCallback((e) => {

    const a = e.currentTarget
    setDuration(a.duration || 0)

  }, [])

  const togglePlay = useCallback(async () => {

    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {

      try {
        setIsBuffering(true)
        await audio.play()
        setIsPlaying(true)
        setIsBuffering(false)
      } catch {
        setIsBuffering(false)
      }

    } else {

      audio.pause()
      setIsPlaying(false)
      setIsBuffering(false)

    }

  }, [])

  return {

    audioRef,

    currentTime,
    setCurrentTime,

    duration,
    setDuration,

    volume,
    setVolume,

    isMuted,
    setIsMuted,

    isPlaying,
    setIsPlaying,

    isBuffering,
    setIsBuffering,

    togglePlay,

    handleTimeUpdate,
    handleLoadedMetadata

  }

}
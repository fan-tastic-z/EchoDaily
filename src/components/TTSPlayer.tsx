import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { textToSpeech } from '../lib/api'
import { convertFileSrc } from '@tauri-apps/api/core'

interface TTSPlayerProps {
  text: string
  language?: string
  onPlayingChange?: (isPlaying: boolean) => void
}

// Audio system warmup flag - ensures audio decoder is initialized
let audioSystemWarmedUp = false

async function warmUpAudioSystem() {
  if (audioSystemWarmedUp) return

  try {
    console.log('TTS: Warming up audio system...')

    // Create a longer silent audio (200ms) to fully initialize the decoder
    const silentAudio = new Audio()
    silentAudio.volume = 0 // Mute so user doesn't hear anything

    // Create a 200ms silent MP3 (properly formatted MP3 silence)
    // This is a valid MP3 file with 200ms of silence
    const silentMp3 =
      'data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVAAAAAAAABQAAAL THCmG3XH//wAAAAA////////////////////////////////////////////////////////////wOAOR8AAAA0AAAASAAA21gABAAAAAEHTAEMAQAAACwAUAAYAAAA0AAAAADQAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    silentAudio.src = silentMp3

    // Wait for the audio to be ready
    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        silentAudio.removeEventListener('canplay', onCanPlay)
        silentAudio.removeEventListener('error', onError)
        console.log('TTS: Warmup timeout, resolving anyway')
        resolve()
      }, 1000)

      const onCanPlay = () => {
        clearTimeout(timeoutId)
        silentAudio.removeEventListener('canplay', onCanPlay)
        silentAudio.removeEventListener('error', onError)
        console.log('TTS: Warmup audio ready, playing...')

        // Actually play the silent audio to fully activate the decoder
        silentAudio
          .play()
          .then(() => {
            console.log('TTS: Warmup playback started')
          })
          .catch((e) => {
            console.warn('TTS: Warmup play failed (non-critical):', e)
            // Continue anyway
          })

        // Wait a bit for playback to start and decoder to initialize
        setTimeout(() => {
          silentAudio.pause()
          silentAudio.currentTime = 0
          resolve()
        }, 200)
      }

      const onError = (e: Event) => {
        clearTimeout(timeoutId)
        silentAudio.removeEventListener('canplay', onCanPlay)
        silentAudio.removeEventListener('error', onError)
        console.warn('TTS: Warmup audio error (non-critical):', e)
        resolve() // Don't fail, just continue
      }

      silentAudio.addEventListener('canplay', onCanPlay)
      silentAudio.addEventListener('error', onError)
    })

    audioSystemWarmedUp = true
    console.log('TTS: Audio system warmed up successfully')
  } catch (e) {
    console.warn('TTS: Failed to warm up audio system', e)
    audioSystemWarmedUp = true // Don't retry
  }
}

export function TTSPlayer({ text, language = 'auto', onPlayingChange }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  // Notify parent of playing state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying)
  }, [isPlaying, onPlayingChange])

  const handlePlay = async () => {
    // Check if there's text to play
    if (!text.trim()) {
      setError('No text to play')
      return
    }

    // Warm up audio system on first play (prevents first-time audio cutoff)
    await warmUpAudioSystem()

    console.log('TTS Request:', { text: text.substring(0, 50) + '...', language })

    // If audio exists and can be played, just play
    if (audioRef.current && audioRef.current.src) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
        return
      } catch {
        // eslint-disable-next-line no-console
        console.log('TTS: Could not resume audio, will reload')
        audioRef.current = null
      }
    }

    // Load and play new audio
    setIsLoading(true)
    setError(null)

    try {
      console.log('TTS: Calling API...')
      const response = await textToSpeech({
        text,
        language: language === 'auto' ? undefined : language,
      })
      console.log('TTS: Got response', {
        format: response.format,
        hasFile: !!response.audio_file,
        hasBase64: !!response.audio_base64,
      })

      // Determine audio source - prefer base64, fallback to file
      let audioSrc: string
      if (response.audio_base64) {
        audioSrc = `data:audio/${response.format};base64,${response.audio_base64}`
        console.log('TTS: Using base64 data')
      } else if (response.audio_file) {
        audioSrc = convertFileSrc(response.audio_file)
        console.log('TTS: Using file:', response.audio_file)
      } else {
        throw new Error('No audio data received')
      }

      // Create audio element with preload
      const audio = new Audio()
      audio.preload = 'auto' // Ensure audio is fully loaded
      audioRef.current = audio

      // Set up event listeners
      audio.addEventListener('canplay', () => {
        console.log('TTS: Audio ready to play')
        // Only start playing when audio is actually ready
        setIsLoading(false)
      })

      audio.addEventListener('play', () => {
        console.log('TTS: Playing')
        setIsPlaying(true)
      })

      audio.addEventListener('pause', () => {
        setIsPlaying(false)
      })

      audio.addEventListener('ended', () => {
        console.log('TTS: Playback ended')
        setIsPlaying(false)
        audioRef.current = null
      })

      audio.addEventListener('error', (e) => {
        console.error('TTS: Audio error:', e)
        setError('Failed to load audio')
        setIsLoading(false)
        setIsPlaying(false)
        audioRef.current = null
      })

      // Set source first
      audio.src = audioSrc

      // Wait for audio to be ready before playing
      console.log('TTS: Waiting for audio to load...')
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay)
          audio.removeEventListener('error', onError)
          console.log('TTS: Audio loaded, adding delay for decoder initialization')

          // Add delay to ensure audio decoder is fully initialized
          // This prevents the first word from being cut off
          // Longer delay for first play, shorter for subsequent plays
          const delay = audioSystemWarmedUp ? 100 : 300
          setTimeout(() => {
            resolve()
          }, delay)
        }

        const onError = (e: Event) => {
          audio.removeEventListener('canplay', onCanPlay)
          audio.removeEventListener('error', onError)
          reject(e)
        }

        audio.addEventListener('canplay', onCanPlay)
        audio.addEventListener('error', onError)

        // Also resolve if already ready (happens with cached/base64 audio)
        if (audio.readyState >= 2) {
          // HAVE_CURRENT_DATA
          console.log('TTS: Audio already ready, adding delay')
          audio.removeEventListener('canplay', onCanPlay)
          audio.removeEventListener('error', onError)
          // Still add delay for decoder initialization
          const delay = audioSystemWarmedUp ? 100 : 300
          setTimeout(() => {
            resolve()
          }, delay)
        }
      })

      // Now play the audio
      console.log('TTS: Starting playback...')
      await audio.play()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to synthesize speech'
      setError(errorMsg)
      setIsLoading(false)
      setIsPlaying(false)
      audioRef.current = null
      console.error('TTS Error:', err)
    }
  }

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleMuteToggle = useCallback(() => {
    if (audioRef.current) {
      const newMutedState = !isMuted
      audioRef.current.muted = newMutedState
      setIsMuted(newMutedState)
    }
  }, [isMuted])

  const isDisabled = !text.trim() || isLoading

  return (
    <div className="flex items-center gap-2">
      {/* Error message */}
      {error && (
        <div className="text-xs text-red-500 max-w-xs truncate" title={error}>
          {error}
        </div>
      )}

      {/* Mute button */}
      {isPlaying && (
        <button
          onClick={handleMuteToggle}
          className="p-2 rounded-lg hover:bg-white/60 text-stone-600 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}

      {/* Play/Pause button */}
      <button
        onClick={isPlaying ? handlePause : handlePlay}
        disabled={isDisabled}
        className={`p-2 rounded-lg transition-colors ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed text-stone-400'
            : isPlaying
              ? 'bg-accent-blue text-white hover:bg-blue-600'
              : 'hover:bg-white/60 text-stone-600'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}

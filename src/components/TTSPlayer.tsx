import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { textToSpeech } from '../lib/api';
import { convertFileSrc } from '@tauri-apps/api/core';

interface TTSPlayerProps {
  text: string;
  language?: string;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export function TTSPlayer({ text, language = 'auto', onPlayingChange }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Notify parent of playing state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  const handlePlay = async () => {
    // Check if there's text to play
    if (!text.trim()) {
      setError('No text to play');
      return;
    }

    console.log('TTS Request:', { text: text.substring(0, 50) + '...', language });

    // If audio exists and can be played, just play
    if (audioRef.current && audioRef.current.src) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (e) {
        console.log('TTS: Could not resume audio, will reload');
        audioRef.current = null;
      }
    }

    // Load and play new audio
    setIsLoading(true);
    setError(null);

    try {
      console.log('TTS: Calling API...');
      const response = await textToSpeech({
        text,
        language: language === 'auto' ? undefined : language,
      });
      console.log('TTS: Got response', {
        format: response.format,
        hasFile: !!response.audio_file,
        hasBase64: !!response.audio_base64
      });

      // Determine audio source - prefer base64, fallback to file
      let audioSrc: string;
      if (response.audio_base64) {
        audioSrc = `data:audio/${response.format};base64,${response.audio_base64}`;
        console.log('TTS: Using base64 data');
      } else if (response.audio_file) {
        audioSrc = convertFileSrc(response.audio_file);
        console.log('TTS: Using file:', response.audio_file);
      } else {
        throw new Error('No audio data received');
      }

      // Create audio element
      const audio = new Audio();
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('canplay', () => {
        console.log('TTS: Audio ready to play');
        setIsLoading(false);
      });

      audio.addEventListener('play', () => {
        console.log('TTS: Playing');
        setIsPlaying(true);
      });

      audio.addEventListener('pause', () => {
        setIsPlaying(false);
      });

      audio.addEventListener('ended', () => {
        console.log('TTS: Playback ended');
        setIsPlaying(false);
        audioRef.current = null;
      });

      audio.addEventListener('error', (e) => {
        console.error('TTS: Audio error:', e);
        setError('Failed to load audio');
        setIsLoading(false);
        setIsPlaying(false);
        audioRef.current = null;
      });

      // Set source and play
      audio.src = audioSrc;
      console.log('TTS: Starting playback...');
      await audio.play();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to synthesize speech';
      setError(errorMsg);
      setIsLoading(false);
      setIsPlaying(false);
      audioRef.current = null;
      console.error('TTS Error:', err);
    }
  };

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleMuteToggle = useCallback(() => {
    if (audioRef.current) {
      const newMutedState = !isMuted;
      audioRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  const isDisabled = !text.trim() || isLoading;

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
  );
}

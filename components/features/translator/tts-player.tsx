"use client"

import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import HoverPlugin from "wavesurfer.js/dist/plugins/hover.esm.js"
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js"
import { Button } from "@/components/ui/button"
import {
  Download,
  Loader2,
  Pause,
  Play,
  ScanLine,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { toast } from "sonner"

interface TTSPlayerProps {
  text: string
  language: string
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function base64ToWavBlob(base64Data: string) {
  const byteString = atob(base64Data)
  const byteArray = new Uint8Array(byteString.length)

  for (let i = 0; i < byteString.length; i += 1) {
    byteArray[i] = byteString.charCodeAt(i)
  }

  return new Blob([byteArray], { type: "audio/wav" })
}

export function TTSPlayer({ text, language }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(20)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [hasRegion, setHasRegion] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(
    null
  )
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#94a3b8",
      progressColor: "#0f172a",
      cursorColor: "#f97316",
      cursorWidth: 2,
      height: 88,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      normalize: true,
      minPxPerSec: zoomLevel,
      hideScrollbar: true,
      dragToSeek: true,
      plugins: [
        HoverPlugin.create({
          lineColor: "#fb923c",
          lineWidth: 2,
          labelBackground: "#0f172a",
          labelColor: "#ffffff",
          labelSize: "11px",
        }),
      ],
    })

    const regions = ws.registerPlugin(RegionsPlugin.create())
    regions.enableDragSelection({
      color: "rgba(249, 115, 22, 0.2)",
    })

    ws.on("ready", () => {
      setIsReady(true)
      setDuration(ws.getDuration())
      setError(null)
    })

    ws.on("timeupdate", (time) => {
      setCurrentTime(time)
    })

    ws.on("play", () => setIsPlaying(true))
    ws.on("pause", () => setIsPlaying(false))
    ws.on("finish", () => setIsPlaying(false))

    ws.on("error", () => {
      setIsReady(false)
      setIsPlaying(false)
      setError("Could not load generated speech audio.")
    })

    regions.on("region-created", (region) => {
      const activeRegions = regions.getRegions()
      activeRegions.forEach((r) => {
        if (r.id !== region.id) r.remove()
      })
      setHasRegion(true)
    })

    regions.on("region-removed", () => {
      setHasRegion(regions.getRegions().length > 0)
    })

    wavesurferRef.current = ws
    regionsRef.current = regions

    return () => {
      ws.destroy()
      wavesurferRef.current = null
      regionsRef.current = null

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setHasAudio(false)
    setIsReady(false)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setHasRegion(false)
    setError(null)

    const ws = wavesurferRef.current
    if (ws) {
      ws.empty()
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
  }, [text, language])

  const handlePlayPause = async () => {
    const ws = wavesurferRef.current
    if (!ws) return

    if (isPlaying) {
      ws.pause()
      return
    }

    if (hasAudio && isReady) {
      await ws.play()
      return
    }

    if (!text) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Failed to generate audio")
      }

      const data = await response.json()
      if (!data.audio) throw new Error("No audio data received")

      const audioBlob = base64ToWavBlob(data.audio)
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      audioUrlRef.current = audioUrl

      setIsReady(false)
      setCurrentTime(0)
      setDuration(0)

      await ws.load(audioUrl)
      setHasAudio(true)

      await ws.play()
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error ? error.message : "Could not read text aloud."
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = (seconds: number) => {
    const ws = wavesurferRef.current
    if (!ws || !duration) return

    const nextTime = Math.min(Math.max(currentTime + seconds, 0), duration)
    ws.setTime(nextTime)
  }

  const handleToggleRate = () => {
    const ws = wavesurferRef.current
    if (!ws) return

    const rateCycle = [1, 1.25, 1.5, 2]
    const currentIndex = rateCycle.indexOf(playbackRate)
    const nextRate = rateCycle[(currentIndex + 1) % rateCycle.length]
    ws.setPlaybackRate(nextRate)
    setPlaybackRate(nextRate)
  }

  const handleZoom = (direction: "in" | "out") => {
    const ws = wavesurferRef.current
    if (!ws) return

    const next =
      direction === "in"
        ? Math.min(zoomLevel + 15, 180)
        : Math.max(zoomLevel - 15, 5)

    ws.zoom(next)
    setZoomLevel(next)
  }

  const handleDownload = async () => {
    if (!audioUrlRef.current) return

    try {
      const response = await fetch(audioUrlRef.current)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = `translated-speech-${Date.now()}.wav`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast.error("Unable to download audio right now.")
    }
  }

  const clearRegion = () => {
    const regions = regionsRef.current
    if (!regions) return

    regions.getRegions().forEach((region) => region.remove())
  }

  const playRegion = async () => {
    const regions = regionsRef.current
    if (!regions) return

    const activeRegions = regions.getRegions()
    if (activeRegions.length === 0) return
    const [region] = activeRegions

    await region.play(true)
  }

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
          Voice Waveform
        </span>
        <span className="text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
          {formatTime(duration)}
        </span>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 dark:border-slate-800 dark:bg-slate-950/70">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/85 text-sm font-semibold text-slate-700 backdrop-blur-sm dark:bg-slate-950/75 dark:text-slate-200">
            <Loader2 className="size-4 animate-spin" />
            Generating speech...
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50/90 px-3 text-center text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </div>
        )}

        {!hasAudio && !isLoading && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tap "Read Aloud" to generate audio and waveform.
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full transition-opacity duration-300"
          style={{ opacity: isReady ? 1 : 0.35 }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950/70">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!hasAudio || isLoading}
            onClick={() => handleSkip(-5)}
            className="rounded-lg"
          >
            <SkipBack className="size-4" />
          </Button>

          <Button
            onClick={handlePlayPause}
            size="icon"
            disabled={isLoading || !text}
            className={`rounded-xl ${isPlaying ? "bg-orange-500 hover:bg-orange-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!hasAudio || isLoading}
            onClick={() => handleSkip(5)}
            className="rounded-lg"
          >
            <SkipForward className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950/70">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasAudio || isLoading}
            onClick={handleToggleRate}
            className="font-semibold"
          >
            {playbackRate}x
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!hasAudio || isLoading || zoomLevel <= 5}
            onClick={() => handleZoom("out")}
          >
            <ZoomOut className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!hasAudio || isLoading || zoomLevel >= 180}
            onClick={() => handleZoom("in")}
          >
            <ZoomIn className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!hasAudio || isLoading}
            onClick={handleDownload}
            title="Download speech audio"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Drag on waveform to select a segment.
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasRegion || isLoading}
            onClick={clearRegion}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasRegion || isLoading}
            onClick={playRegion}
          >
            <ScanLine className="size-4" />
            Play selection
          </Button>
        </div>
      </div>
    </div>
  )
}

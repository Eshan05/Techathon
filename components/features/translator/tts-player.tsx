"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TTSPlayerProps {
  text: string;
  language: string;
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TTSPlayer({ text, language }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const initAudio = (base64Data: string) => {
    const audioSrc = `data:audio/wav;base64,${base64Data}`;
    if (!audioRef.current) {
      const audio = new Audio(audioSrc);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast.error("Error playing audio");
      };
      
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      audio.onloadedmetadata = () => {
        if (audio.duration !== Infinity) {
          setDuration(audio.duration);
        }
      };
      // Fallback for some browsers determining duration late
      audio.ondurationchange = () => {
         if (audio.duration !== Infinity) {
          setDuration(audio.duration);
        }
      };

      audioRef.current = audio;
    } else {
      audioRef.current.src = audioSrc;
      audioRef.current.load();
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (hasAudio && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    if (!text) return;

    try {
      setIsLoading(true);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          language
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate audio");
      }

      const data = await response.json();
      if (!data.audio) throw new Error("No audio data received");

      initAudio(data.audio);
      setHasAudio(true);

      audioRef.current?.play();
      setIsPlaying(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Could not read text aloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = (vals: number[]) => {
    const newVal = vals[0];
    setCurrentTime(newVal);
    if (audioRef.current) {
      audioRef.current.currentTime = newVal;
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-semibold text-slate-500 tabular-nums">
           {formatTime(currentTime)}
        </span>
        <span className="text-xs font-semibold text-slate-400">Playback Timeline</span>
        <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {formatTime(duration)}
        </span>
      </div>

      <div className="px-1 -mt-2 mb-2">
        <Slider 
          value={[currentTime]} 
          max={duration || 100} 
          step={0.1}
          disabled={!hasAudio || isLoading}
          onValueChange={handleSliderChange}
          className="cursor-pointer"
        />
      </div>

      <Button 
        onClick={handlePlayPause} 
        size="lg" 
        disabled={isLoading || !text}
        className={`w-full text-lg h-14 rounded-2xl ${isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white font-bold tracking-wide transition-all duration-300`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            Loading Speech...
          </>
        ) : isPlaying ? (
          <>
            <Pause className="w-5 h-5 mr-3 fill-current" />
            Pause Reading
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-3 fill-current" />
            {hasAudio ? "Resume Reading" : "Read Aloud"}
          </>
        )}
      </Button>
    </div>
  );
}

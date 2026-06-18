"use client";

import React, { useRef, useState, useEffect, lazy, Suspense } from "react";
import { normalizeVideoUrl } from "@/lib/utils";

const PlayIcon = lazy(() => import("lucide-react").then(m => ({ default: m.Play })));
const PauseIcon = lazy(() => import("lucide-react").then(m => ({ default: m.Pause })));
const Volume2Icon = lazy(() => import("lucide-react").then(m => ({ default: m.Volume2 })));
const VolumeXIcon = lazy(() => import("lucide-react").then(m => ({ default: m.VolumeX })));
const MaximizeIcon = lazy(() => import("lucide-react").then(m => ({ default: m.Maximize })));

interface VideoPlayerProps {
  src: string;
  variant?: "default" | "banner";
  poster?: string;
  className?: string;
}

function IconLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export function VideoPlayer({
  src,
  variant = "default",
  poster,
  className = ""
}: VideoPlayerProps) {
  const normalizedSrc = normalizeVideoUrl(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(variant === "banner");
  const [isMuted, setIsMuted] = useState(variant === "banner");
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isInView, setIsInView] = useState(variant === "banner");

  // Lazy load video: only load when in viewport
  useEffect(() => {
    if (variant === "banner" || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [variant]);

  const isBanner = variant === "banner";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("timeupdate", updateProgress);
    return () => video.removeEventListener("timeupdate", updateProgress);
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isBanner) return;

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black rounded-xl overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
    >
      {isInView && (
        <video
          key={normalizedSrc}
          ref={videoRef}
          src={normalizedSrc}
          poster={poster}
          className="w-full h-full object-cover bg-black"
          playsInline
          muted={isMuted}
          loop={isBanner}
          onClick={togglePlay}
          preload="metadata"
          onError={(e) => console.error('Video error:', e.currentTarget.error)}
        >
          Tu navegador no soporta la reproducción de video.
        </video>
      )}

      {!isBanner && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-4 text-white hover:bg-white/30 transition">
            <IconLoader><PlayIcon className="w-12 h-12 ml-1" fill="currentColor" /></IconLoader>
          </div>
        </div>
      )}

      {!isBanner && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${
            isHovered || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="w-full h-1.5 bg-gray-500/50 rounded-full mb-4 cursor-pointer overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
                title={isPlaying ? "Pausar" : "Reproducir"}
                className="text-white hover:text-gray-300 transition"
              >
                <IconLoader>
                  {isPlaying ? <PauseIcon size={20} fill="currentColor" /> : <PlayIcon size={20} fill="currentColor" />}
                </IconLoader>
              </button>

              <button
                onClick={toggleMute}
                aria-label={isMuted ? "Activar sonido" : "Silenciar video"}
                title={isMuted ? "Activar sonido" : "Silenciar"}
                className="text-white hover:text-gray-300 transition"
              >
                <IconLoader>
                  {isMuted ? <VolumeXIcon size={20} /> : <Volume2Icon size={20} />}
                </IconLoader>
              </button>
            </div>

            <button
              onClick={toggleFullScreen}
              aria-label="Pantalla completa"
              title="Pantalla completa"
              className="text-white hover:text-gray-300 transition"
            >
              <IconLoader><MaximizeIcon size={20} /></IconLoader>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface VideoPlayerProps {
  /** 
   * URL del video, puede ser de Cloudinary 
   * (ej: https://res.cloudinary.com/demo/video/upload/v1234/sample.mp4) 
   */
  src: string;
  /** Si el video debe actuar como un banner de fondo (autoplay, mute, loop, sin controles) */
  variant?: "default" | "banner";
  /** Imagen de portada mostrada antes de darle play */
  poster?: string;
  className?: string;
}

export function VideoPlayer({ 
  src, 
  variant = "default", 
  poster,
  className = "" 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(variant === "banner");
  const [isMuted, setIsMuted] = useState(variant === "banner");
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  // Si es variante banner, forzamos autoplay silencioso y loop
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
    if (isBanner) return; // Banners no se pausan al clickear
    
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
      className={`relative group bg-black rounded-xl overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-cover bg-black"
        playsInline
        webkit-playsinline="true"
        autoPlay={isBanner}
        muted={isMuted}
        loop={isBanner}
        onClick={togglePlay}
      >
        {/* Aquí está el secreto pro: Forzar el type video/mp4 en el source child */}
        <source src={src} type="video/mp4" />
        Tu navegador no soporta la reproducción de video.
      </video>

      {/* Play/Pause Button Central para la variante Default */}
      {!isBanner && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-4 text-white hover:bg-white/30 transition">
            <Play className="w-12 h-12 ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Controles Inferiores (Solo para Default) */}
      {!isBanner && (
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${
            isHovered || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Barra de Progreso */}
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
                className="text-white hover:text-gray-300 transition"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              
              <button 
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            <button 
              onClick={toggleFullScreen}
              className="text-white hover:text-gray-300 transition"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
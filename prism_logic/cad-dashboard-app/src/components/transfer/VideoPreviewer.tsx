'use client';

import React, { useRef, useState } from 'react';

export default function VideoPreviewer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center max-w-full max-h-full group">
      <video 
        ref={videoRef}
        src={src} 
        controls 
        className="max-w-full max-h-full outline-none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Custom Big Play Button Overlay */}
      {!isPlaying && (
        <button 
          onClick={togglePlay}
          className="absolute z-30 m-auto flex items-center justify-center pointer-events-auto bg-black/50 hover:bg-black/70 hover:scale-110 transition-all duration-300 rounded-full w-24 h-24 backdrop-blur-md shadow-2xl group-hover:bg-[#ffea00] group-hover:text-black text-white"
        >
          <svg className="w-12 h-12 ml-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  );
}

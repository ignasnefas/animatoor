import { useRef, useEffect, useState } from 'react';

interface LoopPreviewProps {
  loopDuration: number;
  isPaused: boolean;
}

/**
 * Visual loop progress indicator
 */
export function LoopProgressIndicator({ loopDuration, isPaused }: LoopPreviewProps) {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (isPaused) return;

    const updateProgress = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const loopProgress = (elapsed % loopDuration) / loopDuration;
      setProgress(loopProgress);
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [loopDuration, isPaused]);

  useEffect(() => {
    if (isPaused) return;
    startTimeRef.current = Date.now();
  }, [isPaused]);

  return (
    <div className="absolute top-4 left-4 right-4 lg:left-auto lg:right-4 pointer-events-none">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-100"
            style={{
              width: `${progress * 100}%`,
              opacity: 0.8,
            }}
          />
        </div>
        <span className="text-[10px] text-white/40 font-mono min-w-[40px] text-right">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}

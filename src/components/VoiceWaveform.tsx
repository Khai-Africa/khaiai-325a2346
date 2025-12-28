import { useEffect, useRef, useState } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  type: 'recording' | 'playback' | 'idle';
  audioContext?: AudioContext | null;
  audioSource?: MediaStream | HTMLAudioElement | null;
}

export const VoiceWaveform = ({ isActive, type, audioContext, audioSource }: VoiceWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [bars, setBars] = useState<number[]>(Array(32).fill(0.1));

  useEffect(() => {
    if (!isActive || !audioContext || !audioSource) {
      // Idle animation
      const idleAnimation = () => {
        setBars(prev => prev.map((_, i) => {
          const wave = Math.sin(Date.now() / 1000 + i * 0.3) * 0.15 + 0.2;
          return wave;
        }));
        animationRef.current = requestAnimationFrame(idleAnimation);
      };
      
      if (type === 'idle') {
        idleAnimation();
      } else {
        // Simple pulsing animation when no audio context
        const pulseAnimation = () => {
          setBars(prev => prev.map((_, i) => {
            const time = Date.now() / 500;
            const wave = Math.sin(time + i * 0.2) * 0.3 + 0.4;
            return wave * (type === 'recording' ? 1.2 : 0.8);
          }));
          animationRef.current = requestAnimationFrame(pulseAnimation);
        };
        pulseAnimation();
      }
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    try {
      // Create analyzer for real audio visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      if (audioSource instanceof MediaStream) {
        const source = audioContext.createMediaStreamSource(audioSource);
        source.connect(analyser);
      } else if (audioSource instanceof HTMLAudioElement) {
        const source = audioContext.createMediaElementSource(audioSource);
        source.connect(analyser);
        source.connect(audioContext.destination);
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        analyser.getByteFrequencyData(dataArray);
        
        const newBars = Array(32).fill(0).map((_, i) => {
          const index = Math.floor(i * dataArray.length / 32);
          const value = dataArray[index] / 255;
          return Math.max(0.1, value);
        });
        
        setBars(newBars);
        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, type, audioContext, audioSource]);

  const getBarColor = () => {
    switch (type) {
      case 'recording':
        return 'bg-red-500';
      case 'playback':
        return 'bg-blue-500';
      default:
        return 'bg-primary/50';
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 h-16 w-full max-w-xs mx-auto">
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-1.5 rounded-full transition-all duration-75 ${getBarColor()}`}
          style={{
            height: `${Math.min(100, height * 100)}%`,
            opacity: 0.6 + height * 0.4,
            transform: `scaleY(${0.3 + height * 0.7})`,
          }}
        />
      ))}
    </div>
  );
};

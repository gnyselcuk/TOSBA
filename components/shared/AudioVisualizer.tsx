import React from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color?: string; // Expects typical Tailwind colors like "bg-blue-500"
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, color = "bg-indigo-400" }) => {
  // Using actual CSS animation for smoothness instead of random React renders

  // Extract the base color class (e.g., 'bg-red-500' -> 'red') for variants if needed, or just use as is.
  // We'll create a multi-colored playful effect if valid.

  return (
    <div className="flex items-center justify-center gap-1.5 h-8 px-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-2.5 rounded-full ${color} transform origin-bottom transition-all duration-500`}
          style={{
            height: '100%', // Fixed height container
            transform: isActive ? 'scaleY(1)' : 'scaleY(0.2)', // Base state
            animation: isActive
              ? `playfulWave 1.2s ease-in-out infinite alternate` // Slower (1.2s)
              : 'none',
            animationDelay: `${i * 0.15}s`
          }}
        />
      ))}
      <style>{`
        @keyframes playfulWave {
          0% { transform: scaleY(0.3); opacity: 0.7; }
          50% { transform: scaleY(0.6); opacity: 0.85; }
          100% { transform: scaleY(1.0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AudioVisualizer;

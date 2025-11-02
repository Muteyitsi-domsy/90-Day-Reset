import React, { useMemo } from 'react';

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => {
  return <div style={style} />;
};

const Confetti: React.FC<{ numberOfPieces: number; recycle?: boolean }> = ({ numberOfPieces, recycle = true }) => {
  const colors = [
    '#a3b18a', '#588157', '#3a5a40', '#dad7cd'
  ];

  const pieces = useMemo(() => {
    return Array.from({ length: numberOfPieces }).map((_, i) => {
      const left = Math.random() * 100;
      const animDelay = Math.random() * 1;
      const animDuration = Math.random() * 2 + 3; // Fall duration 3 to 5 seconds
      const size = Math.random() * 8 + 6;
      const color = colors[i % colors.length];

      const style: React.CSSProperties = {
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        top: '-20px',
        left: `${left}vw`,
        animation: `fall ${animDuration}s ${animDelay}s linear ${recycle ? 'infinite' : 'forwards'}`,
        opacity: 0,
        transform: `rotate(${Math.random() * 360}deg)`,
      };
      return { id: i, style };
    });
  }, [numberOfPieces, recycle]);
  
  return (
    <>
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div aria-hidden="true" className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-50">
        {pieces.map(p => <ConfettiPiece key={p.id} style={p.style} />)}
      </div>
    </>
  );
};

export default Confetti;


import React from 'react';

// Arc lengths for radius-based semicircles (π × r):
// Outer arc r=22 → ≈ 69.1
// Middle arc r=15 → ≈ 47.1
// Inner arc r=8  → ≈ 25.1

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-2 px-1">
      <svg
        width="60"
        height="38"
        viewBox="0 0 60 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Loading"
      >
        <style>{`
          @keyframes arcFillOuter {
            0%, 100% { stroke-dashoffset: 69.1; opacity: 0.2; }
            35%, 65% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes arcFillMiddle {
            0%, 100% { stroke-dashoffset: 47.1; opacity: 0.2; }
            35%, 65% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes arcFillInner {
            0%, 100% { stroke-dashoffset: 25.1; opacity: 0.2; }
            35%, 65% { stroke-dashoffset: 0; opacity: 1; }
          }
          .arc-outer {
            stroke-dasharray: 69.1;
            stroke-dashoffset: 69.1;
            animation: arcFillOuter 1.8s ease-in-out infinite;
            animation-delay: 0s;
          }
          .arc-middle {
            stroke-dasharray: 47.1;
            stroke-dashoffset: 47.1;
            animation: arcFillMiddle 1.8s ease-in-out infinite;
            animation-delay: 0.28s;
          }
          .arc-inner {
            stroke-dasharray: 25.1;
            stroke-dashoffset: 25.1;
            animation: arcFillInner 1.8s ease-in-out infinite;
            animation-delay: 0.56s;
          }
        `}</style>

        {/* Outer arc — dark teal, r=22, centre (30, 36) */}
        <path
          className="arc-outer"
          d="M 8 36 A 22 22 0 0 1 52 36"
          stroke="#1E7A8A"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Middle arc — green, r=15, centre (30, 36) */}
        <path
          className="arc-middle"
          d="M 15 36 A 15 15 0 0 1 45 36"
          stroke="#4E9B58"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Inner arc — orange, r=8, centre (30, 36) */}
        <path
          className="arc-inner"
          d="M 22 36 A 8 8 0 0 1 38 36"
          stroke="#E87520"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default LoadingSpinner;

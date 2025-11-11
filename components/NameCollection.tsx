import React, { useState } from 'react';

interface NameCollectionProps {
  onComplete: (name: string) => void;
}

const NameCollection: React.FC<NameCollectionProps> = ({ onComplete }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete(name.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] text-center animate-fade-in">
        <h1 className="text-3xl font-light text-[var(--text-secondary)] mb-4">What should I call you?</h1>
        <p className="text-lg text-[var(--text-primary)] mb-8 leading-relaxed">
          Personalizing this journey helps make it your own.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition text-lg text-center mb-6"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100"
          >
            Continue
          </button>
        </form>
      </div>
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NameCollection;
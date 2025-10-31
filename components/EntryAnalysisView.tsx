import React, { useState } from 'react';
import { EntryAnalysis } from '../types';

interface EntryAnalysisViewProps {
  analysis: EntryAnalysis;
}

const ChevronDownIcon: React.FC<{className: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const EntryAnalysisView: React.FC<EntryAnalysisViewProps> = ({ analysis }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-6 border-t border-[#dad7cd]/50 pt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full text-left text-md font-light text-[#3a5a40]"
      >
        <span>Show Reflection</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-6 space-y-6 animate-fade-in-slow">
          <div>
            <h3 className="font-medium text-[#588157] mb-2">Summary</h3>
            <p className="font-light text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>
          <div>
            <h3 className="font-medium text-[#588157] mb-2">Insights</h3>
            <ul className="list-disc list-inside space-y-1.5">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="font-light text-gray-700">{insight}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-[#588157] mb-2">Micro-Action</h3>
            <p className="font-light text-gray-700">{analysis.microAction}</p>
          </div>
          {analysis.tags && analysis.tags.length > 0 && (
             <div>
                <h3 className="font-medium text-[#588157] mb-2">Themes</h3>
                <div className="flex flex-wrap gap-2">
                    {analysis.tags.map((tag, index) => (
                        <span key={index} className="bg-[#e9ede7] text-[#3a5a40] text-xs font-medium px-2.5 py-1 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
          )}
        </div>
      )}
       <style>{`
        @keyframes fade-in-slow {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in-slow {
            animation: fade-in-slow 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EntryAnalysisView;
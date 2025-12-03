import React, { useState } from "react";
import { UserProfile, OnboardingAnalysis } from "../types";
import { analyzeOnboardingAnswers, OnboardingAnswers } from "../services/geminiService";
import LoadingSpinner from './LoadingSpinner';

interface OnboardingProps {
  onComplete: (profile: Omit<UserProfile, 'idealSelfManifesto' | 'name' | 'intentions'>) => void;
}

const questions = [
    { id: 'previousWork', label: 'Have you done inner emotional healing or reflection work before?', type: 'textarea', rows: 3 },
    { id: 'currentEmotions', label: 'What emotions or patterns feel most present right now?', type: 'textarea', rows: 4 },
    { id: 'futureFeeling', label: 'In one word, how do you feel about the future?', type: 'text' },
    { id: 'readinessScale', label: 'On a scale of 1–10, how ready do you feel to evolve into a new version of yourself?', type: 'range' },
    { id: 'idealSelf', label: 'Describe briefly what your Ideal Self might look or feel like.', type: 'textarea', rows: 4 },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    previousWork: "",
    currentEmotions: "",
    futureFeeling: "",
    readinessScale: 5,
    idealSelf: "",
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<OnboardingAnalysis | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAnswers(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnswers(prev => ({ ...prev, readinessScale: parseInt(e.target.value, 10) }));
  };
  
  const nextStep = () => setStep(prev => Math.min(prev + 1, questions.length - 1));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    try {
      const result = await analyzeOnboardingAnswers(answers);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing onboarding answers:", error);
      // Use readiness scale to determine fallback arc
      let fallbackArc: 'release' | 'reaffirm' | 'reignition' = 'reaffirm';
      if (answers.readinessScale <= 5) fallbackArc = 'release';
      else if (answers.readinessScale >= 8) fallbackArc = 'reignition';

      setAnalysisResult({
          phase: fallbackArc,
          summary: 'There was a small issue connecting, but that\'s okay. Based on your responses, we\'ll begin your journey from here.',
          encouragement: 'Every journey begins with a single step forward.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComplete = () => {
    if (!analysisResult) return;
    const profile: Omit<UserProfile, 'idealSelfManifesto' | 'name' | 'intentions'> = {
      arc: analysisResult.phase,
      startDate: new Date().toISOString(),
      week_count: 1,
      month_count: 1,
      lastMilestoneDayCompleted: 0,
      journeyCompleted: false,
      streak: 0,
      lastEntryDate: '',
    };
    onComplete(profile);
  };
  
  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;

  const renderForm = () => (
    <div className="animate-fade-in space-y-8 flex flex-col flex-grow">
      <div className="flex-grow">
        <label className="block text-xl font-light text-[var(--text-primary)] mb-6 text-center">{currentQuestion.label}</label>
        {currentQuestion.type === 'textarea' && (
          <textarea name={currentQuestion.id} value={answers[currentQuestion.id as keyof OnboardingAnswers] as string} onChange={handleInputChange} rows={currentQuestion.rows} required className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition text-lg" />
        )}
        {currentQuestion.type === 'text' && (
           <input type="text" name={currentQuestion.id} value={answers[currentQuestion.id as keyof OnboardingAnswers] as string} onChange={handleInputChange} required className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition text-lg text-center" />
        )}
        {currentQuestion.type === 'range' && (
          <div className="flex items-center gap-4 pt-4">
              <input type="range" name="readinessScale" min="1" max="10" value={answers.readinessScale} onChange={handleRangeChange} className="w-full accent-[var(--accent-secondary)]" />
              <span className="font-semibold text-[var(--accent-primary)] dark:text-[var(--accent-secondary)] w-6 text-center text-xl">{answers.readinessScale}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {isLastStep ? (
           <button onClick={handleSubmit} className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 mt-4">
            Analyze My Starting Point
          </button>
        ) : (
          <button onClick={nextStep} className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300">
            Next
          </button>
        )}
        {step > 0 && (
          <button onClick={prevStep} className="w-full py-2 rounded-lg text-[var(--text-secondary)] font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-300">
            Back
          </button>
        )}
      </div>
    </div>
  );
  
  const renderInterstitial = () => (
    <div className="text-center space-y-8 animate-fade-in">
        <h3 className="text-xl font-light text-[var(--text-secondary)]">Thank you for sharing.</h3>
        <p className="text-lg font-light leading-relaxed text-[var(--text-primary)]">
           I am preparing your personalized starting point...
        </p>
        <div className="flex justify-center pt-4">
            <LoadingSpinner />
        </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="text-center space-y-6 animate-fade-in">
        <h3 className="text-xl font-light text-[var(--text-secondary)]">Your journey begins from the</h3>
        <p className="text-4xl font-medium text-[var(--accent-primary)] dark:text-[var(--accent-secondary)] capitalize tracking-wide">{analysisResult?.phase} Arc</p>
        <p className="text-lg font-light leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{analysisResult?.summary}</p>
        <p className="text-lg italic text-[var(--text-secondary)]">"{analysisResult?.encouragement}"</p>
        <button onClick={handleComplete} className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 mt-8">
            Begin Your Reset 🌿
        </button>
    </div>
  );
  
  const renderContent = () => {
    if (analysisResult) return renderAnalysis();
    if (isAnalyzing) return renderInterstitial();
    return renderForm();
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="w-full max-w-lg bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] flex flex-col" style={{minHeight: '75vh'}}>
        <div className="mb-8">
            <h2 className="text-2xl font-light text-[var(--text-secondary)] mb-2 text-center">
            {analysisResult ? "Your Starting Point" : isAnalyzing ? "A Moment of Reflection" : "Welcome 🌿"}
            </h2>
            {!isAnalyzing && !analysisResult && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-4">
                    <div className="bg-[var(--accent-secondary)] h-1.5 rounded-full" style={{ width: `${((step + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }}></div>
                </div>
            )}
        </div>
        {renderContent()}
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

export default Onboarding;
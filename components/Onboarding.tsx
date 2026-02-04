import React, { useState } from "react";
import { UserProfile, OnboardingAnalysis } from "../types";
import { analyzeOnboardingAnswers, OnboardingAnswers, ReflectionReadiness } from "../services/geminiService";
import LoadingSpinner from './LoadingSpinner';

interface OnboardingProps {
  onComplete: (profile: Omit<UserProfile, 'idealSelfManifesto' | 'name' | 'intentions'>) => void;
}

const reflectionOptions = [
    {
        value: 'release_needed',
        label: 'Release Needed',
        description: 'There are past experiences I\'d like to spend some time reflecting on and letting go of.'
    },
    {
        value: 'aware_not_now',
        label: 'Aware but Not Now',
        description: 'I\'m aware of past experiences, but I\'d prefer not to focus on them right now.'
    },
    {
        value: 'already_reflected',
        label: 'Ready to Move On',
        description: 'I\'ve already reflected on the past and feel ready to focus on what\'s ahead.'
    },
];

const questions = [
    { id: 'reflectionReadiness', label: 'How do you feel about reflecting on past experiences now?', type: 'radio', helperText: 'There\'s no right or wrong answer — choose what feels most comfortable for you right now.' },
    { id: 'currentEmotions', label: 'What emotions or recurring themes feel most noticeable right now?', type: 'textarea', rows: 4 },
    { id: 'futureFeeling', label: 'In one word, how does the future feel to you right now?', type: 'text' },
    { id: 'readinessScale', label: 'On a scale of 1–10, how ready do you feel to make changes in your daily focus or habits?', type: 'range' },
    { id: 'idealSelf', label: 'Describe what you\'d like to focus more on in your life over the coming months.', type: 'textarea', rows: 4 },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    reflectionReadiness: '' as ReflectionReadiness,
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

  const handleRadioChange = (value: ReflectionReadiness) => {
    setAnswers(prev => ({ ...prev, reflectionReadiness: value }));
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
      // Use reflection readiness as primary determinant, with readiness scale as secondary
      let fallbackArc: 'release' | 'reaffirm' | 'reignition' = 'reaffirm';

      if (answers.reflectionReadiness === 'release_needed') {
        fallbackArc = 'release';
      } else if (answers.readinessScale >= 8) {
        fallbackArc = 'reignition';
      } else {
        fallbackArc = 'reaffirm';
      }

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

  // Check if current step has a valid answer
  const canProceed = () => {
    const currentId = currentQuestion.id;
    if (currentQuestion.type === 'radio') {
      return answers.reflectionReadiness !== '';
    }
    if (currentQuestion.type === 'range') {
      return true; // Range always has a value
    }
    const value = answers[currentId as keyof OnboardingAnswers];
    return typeof value === 'string' ? value.trim() !== '' : true;
  };

  const renderForm = () => (
    <div className="animate-fade-in space-y-8 flex flex-col flex-grow">
      <div className="flex-grow">
        <label className="block text-xl font-light text-[var(--text-primary)] mb-4 text-center">{currentQuestion.label}</label>
        {currentQuestion.helperText && (
          <p className="text-sm text-[var(--text-secondary)] text-center mb-6 italic">{currentQuestion.helperText}</p>
        )}
        {currentQuestion.type === 'radio' && (
          <div className="space-y-3">
            {reflectionOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRadioChange(option.value as ReflectionReadiness)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  answers.reflectionReadiness === option.value
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[var(--input-border)] bg-[var(--input-bg)] hover:border-[var(--accent-secondary)]'
                }`}
              >
                <div className="font-medium text-[var(--text-primary)] mb-1">{option.label}</div>
                <div className="text-sm text-[var(--text-secondary)]">{option.description}</div>
              </button>
            ))}
          </div>
        )}
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
           <button
             onClick={handleSubmit}
             disabled={!canProceed()}
             className={`w-full py-3 rounded-lg font-medium text-lg transition-colors duration-300 mt-4 ${
               canProceed()
                 ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]'
                 : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
             }`}
           >
            Analyze My Starting Point
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className={`w-full py-3 rounded-lg font-medium text-lg transition-colors duration-300 ${
              canProceed()
                ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
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
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { generateIdealSelfManifesto, IdealSelfAnswers } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface IdealSelfScriptingProps {
  userProfile: UserProfile;
  onComplete: (manifesto: string) => void;
}

const questions = [
    { id: 'coreValues', label: 'What are the core values and principles of your Ideal Self?', type: 'textarea', rows: 3 },
    { id: 'emotionalTone', label: 'What emotional tone do they live in most of the time?', type: 'text', placeholder: 'e.g., Calm, creative, joyful...' },
    { id: 'habits', label: 'What are 1-2 small habits or routines they maintain?', type: 'textarea', rows: 3 },
    { id: 'boundaries', label: 'What boundaries do they practice for their well-being?', type: 'textarea', rows: 3 },
    { id: 'treatmentOfSelf', label: 'How do they treat themselves and others?', type: 'textarea', rows: 3 },
];


const IdealSelfScripting: React.FC<IdealSelfScriptingProps> = ({ userProfile, onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<IdealSelfAnswers>({
    coreValues: '',
    emotionalTone: '',
    habits: '',
    boundaries: '',
    treatmentOfSelf: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [manifesto, setManifesto] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAnswers(prev => ({ ...prev, [name]: value }));
  };
  
  const nextStep = () => setStep(prev => Math.min(prev + 1, questions.length - 1));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const result = await generateIdealSelfManifesto(answers);
      setManifesto(result);
    } catch (error) {
      console.error("Error generating manifesto:", error);
      setManifesto("There was an issue crafting your manifesto, but know that the vision you hold for yourself is valid and powerful. We can revisit this together.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;

  const renderForm = () => (
    <div className="animate-fade-in space-y-8 flex flex-col flex-grow">
      <div className="flex-grow">
        <label className="block text-xl font-light text-[#344e41] mb-6 text-center">{currentQuestion.label}</label>
        {currentQuestion.type === 'textarea' && (
          <textarea name={currentQuestion.id} value={answers[currentQuestion.id as keyof IdealSelfAnswers]} onChange={handleInputChange} rows={currentQuestion.rows} required className="w-full bg-white/50 border border-white rounded-lg p-4 text-[#344e41] focus:outline-none focus:ring-2 focus:ring-[#a3b18a] transition text-lg" />
        )}
        {currentQuestion.type === 'text' && (
           <input type="text" name={currentQuestion.id} value={answers[currentQuestion.id as keyof IdealSelfAnswers]} onChange={handleInputChange} placeholder={currentQuestion.placeholder} required className="w-full bg-white/50 border border-white rounded-lg p-4 text-[#344e41] focus:outline-none focus:ring-2 focus:ring-[#a3b18a] transition text-lg text-center" />
        )}
      </div>

      <div className="space-y-3">
        {isLastStep ? (
           <button onClick={handleSubmit} className="w-full py-3 rounded-lg bg-[#588157] text-white font-medium text-lg hover:bg-[#3a5a40] transition-colors duration-300 mt-4">
            Create My Manifesto
          </button>
        ) : (
          <button onClick={nextStep} className="w-full py-3 rounded-lg bg-[#588157] text-white font-medium text-lg hover:bg-[#3a5a40] transition-colors duration-300">
            Next
          </button>
        )}
        {step > 0 && (
          <button onClick={prevStep} className="w-full py-2 rounded-lg text-[#3a5a40] font-medium hover:bg-black/5 transition-colors duration-300">
            Back
          </button>
        )}
      </div>
    </div>
  );

  const renderManifesto = () => (
    <div className="text-center space-y-8 animate-fade-in">
        <div className="p-6 bg-[#f4f1ea]/70 rounded-lg border border-[#dad7cd]">
            <p className="text-lg font-light leading-relaxed text-[#344e41] whitespace-pre-wrap">{manifesto}</p>
        </div>
        <p className="text-md italic text-[#3a5a40]">Would you like to save this as your daily anchor text?</p>
        <button onClick={() => onComplete(manifesto!)} className="w-full py-3 rounded-lg bg-[#588157] text-white font-medium text-lg hover:bg-[#3a5a40] transition-colors duration-300 mt-4">
            Save and Begin ☀️
        </button>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen p-4 sm:p-6">
       <div className="w-full max-w-lg bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-white flex flex-col" style={{minHeight: '75vh'}}>
        <div className="mb-8">
            <h2 className="text-2xl font-light text-[#3a5a40] mb-2 text-center">
                {manifesto ? "Your Ideal Self Manifesto" : "Scripting Your Ideal Self"}
            </h2>
            <p className="text-center text-md font-light text-gray-600">
                {manifesto ? "Read this aloud. Feel it in your body." : "Let's bring your future self into focus."}
            </p>
            {!isGenerating && !manifesto && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                    <div className="bg-[#a3b18a] h-1.5 rounded-full" style={{ width: `${((step + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }}></div>
                </div>
            )}
        </div>
         {isGenerating ? <div className="flex-grow flex justify-center items-center"><LoadingSpinner/></div> : (manifesto ? renderManifesto() : renderForm())}
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

export default IdealSelfScripting;
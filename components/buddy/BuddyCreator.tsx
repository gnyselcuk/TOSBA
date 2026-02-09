
import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage, Buddy } from '../../types';
import { generateBuddyImage, speakBuddyText } from '../../services/geminiService';

const BuddyCreator: React.FC = () => {
  const { profile, setBuddy, setStage, appendContext } = useUserStore();
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('cartoon 2D vector illustration'); // Default style
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [buddyName, setBuddyName] = useState('');
  const [personality, setPersonality] = useState<Buddy['personality']>('happy');
  const [loadingText, setLoadingText] = useState("Designing...");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      const welcomeMsg = `Great job! Now, let's create a special friend for ${profile.name}.`;
      speakBuddyText(welcomeMsg, 'Kore');
    }
  }, [profile]);

  const handleGenerate = async () => {
    if ((!description && !referenceImage) || !profile || loading) return;
    setLoading(true);
    setLoadingText("Creating Friend...");

    try {
      // Generate Buddy
      const buddyImg = await generateBuddyImage(description, style, referenceImage || undefined);
      setGeneratedImage(buddyImg);
    } catch (e) {
      console.error("Generation failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Shared file processing logic
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file!');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!generatedImage) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!generatedImage) {
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    }
  };

  const triggerUpload = () => {
    if (!generatedImage) {
      fileInputRef.current?.click();
    }
  };

  const determineVoice = (age: number): Buddy['voiceName'] => {
    if (age <= 8) return 'Puck';
    else if (age >= 13) return 'Fenrir';
    else return 'Kore';
  };

  const handleConfirm = async () => {
    if (isConfirming) return;

    const finalName = buddyName.trim();
    if (generatedImage && profile && finalName) {
      setIsConfirming(true);

      const age = profile.chronologicalAge || 10;
      const voice = determineVoice(age);

      const newBuddy: Buddy = {
        name: finalName,
        description: description,
        imageUrl: generatedImage,
        personality: personality,
        voiceName: voice
      };

      setBuddy(newBuddy);
      appendContext(`Buddy Created: Name=${finalName}`);

      // Small delay for UX
      setTimeout(() => {
        setStage(AppStage.BUDDY_ACTIVATION);
      }, 300);
    }
  };

  const personalities: { id: Buddy['personality'], emoji: string, label: string }[] = [
    { id: 'happy', emoji: '😊', label: 'Happy' },
    { id: 'cool', emoji: '😎', label: 'Cool' },
    { id: 'smart', emoji: '🤓', label: 'Smart' },
    { id: 'funny', emoji: '🤪', label: 'Funny' },
  ];

  const styleOptions = [
    { id: 'cartoon 2D vector illustration', label: '2D Cartoon', icon: '✏️' },
    { id: '3D cute claymation render', label: '3D Magic', icon: '🧊' },
    { id: 'pixel art 8-bit', label: 'Pixel Art', icon: '👾' },
  ];

  const getUploadAreaClass = () => {
    if (loading) {
      return 'bg-slate-100 border-indigo-100';
    }
    if (isDragging) {
      return 'bg-green-50 border-green-400 scale-105 shadow-lg cursor-pointer';
    }
    if (!generatedImage) {
      return 'bg-slate-100 border-indigo-100 cursor-pointer hover:bg-slate-50 hover:border-indigo-200';
    }
    return 'bg-slate-100 border-indigo-100';
  };

  const renderUploadPlaceholder = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-400 font-medium animate-pulse">{loadingText}</p>
        </div>
      );
    }

    if (generatedImage) {
      return <img src={generatedImage} alt="Generated Buddy" className="w-full h-full object-contain" />;
    }

    if (referenceImage) {
      return (
        <>
          <img src={referenceImage} alt="Reference" className="w-full h-full object-contain opacity-80 p-4" />
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-white/80 px-4 py-2 rounded-full text-sm font-bold text-slate-700">Change Photo</span>
          </div>
        </>
      );
    }

    return (
      <div className="flex flex-col items-center text-slate-400">
        {isDragging ? (
          <>
            <span className="text-6xl mb-4 animate-bounce">🎁</span>
            <span className="font-bold text-green-600 text-lg">Drop toy photo here!</span>
          </>
        ) : (
          <>
            <span className="text-6xl mb-4">📸</span>
            <span className="font-bold">Upload Toy Photo</span>
            <span className="text-xs mt-1 text-slate-300">Click or drag & drop</span>
            <span className="text-xs text-slate-300">(Or just describe it below)</span>
          </>
        )}
      </div>
    );
  };

  const renderCreationForm = () => {
    // Method Indicator
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-center gap-3 text-sm font-medium text-indigo-700">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${referenceImage
              ? 'bg-indigo-500 text-white shadow-md'
              : 'bg-white/50 text-indigo-400'
              }`}>
              <span>📸</span>
              <span className="font-bold">Photo</span>
            </div>
            <span className="text-indigo-300 font-bold">OR</span>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${description && !referenceImage
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-white/50 text-purple-400'
              }`}>
              <span>✍️</span>
              <span className="font-bold">Text</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {referenceImage ? 'Add Description (Optional)' : 'Describe Your Buddy'}
          </label>
          <textarea
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            rows={2}
            placeholder={referenceImage
              ? "e.g. Make it look friendly and colorful..."
              : "e.g. A friendly robot with big eyes, cute dinosaur with a smile..."}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {!referenceImage && !description && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <span>💡</span>
              <span>Upload a photo above OR describe your buddy here</span>
            </p>
          )}
        </div>

        {/* Style Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Art Style</label>
          <div className="flex space-x-2">
            {styleOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setStyle(opt.id)}
                className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex items-center justify-center ${style === opt.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'
                  }`}
              >
                <span className="mr-2 text-lg">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={(!description && !referenceImage) || loading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200"
        >
          {loading ? 'Generating... ✨' : 'Generate Magic ✨'}
        </button>
      </div>
    );
  };

  const renderGeneratedPreview = () => (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button
          onClick={() => setGeneratedImage(null)}
          className="flex-1 py-2 text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span>✏️</span>
          <span>Adjust</span>
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 py-2 text-indigo-600 font-bold text-sm bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Regenerate</span>
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2 text-center">What is my name?</label>
        <input
          type="text"
          value={buddyName}
          onChange={(e) => setBuddyName(e.target.value)}
          placeholder="Type a name..."
          className="w-full p-3 rounded-xl border border-slate-300 bg-white text-center text-xl font-bold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 focus:outline-none shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2 text-center">What am I like?</label>
        <div className="grid grid-cols-4 gap-2">
          {personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${personality === p.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-105'
                : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'
                }`}
            >
              <span className="text-2xl mb-1">{p.emoji}</span>
              <span className="text-xs font-bold">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={!buddyName.trim() || isConfirming}
        className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-green-200 animate-bounce disabled:animate-none"
      >
        {isConfirming ? 'Creating...' : "It's Perfect! Let's Meet!"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-indigo-800 mb-2 mt-8">Create a Friend</h1>
      <p className="text-indigo-600 mb-8">Let&apos;s make a buddy for {profile?.name}!</p>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6">

        <div
          onClick={triggerUpload}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`w-full aspect-square rounded-2xl mb-6 flex items-center justify-center overflow-hidden border-4 relative group transition-all duration-200 ${getUploadAreaClass()}`}
        >
          {renderUploadPlaceholder()}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        {!generatedImage ? renderCreationForm() : renderGeneratedPreview()}
      </div>
    </div>
  );
};

export default BuddyCreator;

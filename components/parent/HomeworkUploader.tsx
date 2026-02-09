import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { analyzeHomeworkMaterial } from '../../services/geminiService';
import { CurriculumModule, AppStage } from '../../types';
import { useContentWorker } from '../../store/contentWorkerStore';
import { db } from '../../services/db';

// Helper function to map visual style
const mapVisualStyle = (style: string): 'Cartoon' | 'Realistic' | 'Symbolic' => {
    const lower = style.toLowerCase();
    if (lower.includes('realistic') || lower.includes('photo')) return 'Realistic';
    if (lower.includes('symbolic') || lower.includes('icon') || lower.includes('simple')) return 'Symbolic';
    return 'Cartoon';
};

// Helper function to map game template to module type
const mapTemplateToModuleType = (template: string): CurriculumModule['type'] => {
    if (template === 'MATCHING') return 'MATCHING';
    if (template === 'DRAG_DROP') return 'DRAG_DROP';
    return 'COMPREHENSION';
};

export const HomeworkUploader: React.FC = () => {
    const {
        addCustomHomeworkModule,
        profile,
        setStageWithReturn,
        setActiveModule,
        moduleContents,
        homeworkPreview,
        setHomeworkPreview,
        clearHomeworkPreview
    } = useUserStore();
    const { addTask } = useContentWorker();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Use store state for preview
    const analysis = homeworkPreview.analysis;
    const previewModuleId = homeworkPreview.moduleId;
    const previewModule = homeworkPreview.module;
    const previewReady = homeworkPreview.isReady;

    // On mount, restore preview state if exists
    useEffect(() => {
        if (analysis && !selectedImage) {
            // Set a placeholder image indicator (we don't persist the actual base64 image)
            setSelectedImage('restored');
        }
    }, []);

    // Check if preview content is ready
    useEffect(() => {
        if (previewModuleId && moduleContents[previewModuleId]) {
            setHomeworkPreview({ isReady: true });
            setIsGenerating(false);
        }
    }, [previewModuleId, moduleContents, setHomeworkPreview, previewReady]);

    // Shared file processing logic
    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file!');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setSelectedImage(event.target.result as string);
                clearHomeworkPreview(); // Clear preview state
                setError(null);
                setSuccess(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    // Drag and Drop Handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
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

        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedImage) return;
        setIsAnalyzing(true);
        setError(null);

        try {
            // Remove data:image/... base64 prefix for Gemini
            const base64Data = selectedImage.split(',')[1];
            const result = await analyzeHomeworkMaterial(base64Data);

            if (result) {
                setHomeworkPreview({ analysis: result, isReady: false });
            } else {
                setError("Could not analyze the image. Please try a clearer photo.");
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            setError("Analysis failed due to a network error.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleTestGame = async () => {
        if (!analysis) return;

        setIsGenerating(true);
        const moduleId = `hw_test_${Date.now()}`;
        const moduleType = mapTemplateToModuleType(analysis.suggestedGameTemplate);

        // Create temporary module
        const testModule: CurriculumModule = {
            id: moduleId,
            title: `Preview: ${analysis.topic}`,
            description: analysis.summary,
            type: moduleType,
            durationMinutes: 10,
            icon: '🧪',
            visualStyle: mapVisualStyle(analysis.visualStyle || 'Cartoon'),
        };

        // Save to store
        setHomeworkPreview({
            moduleId,
            module: testModule,
            isReady: false
        });

        // Add worker task to generate content
        addTask('GENERATE_MODULE_CONTENT', {
            moduleId: moduleId,
            moduleType: moduleType,
            description: `${analysis.summary}. Items: ${analysis.gameItems.map(i => i.name).join(', ')}`,
            interest: analysis.topic
        }, 'CRITICAL');

        // Launch game with return path to PARENT_DASHBOARD
        setActiveModule(testModule);
        setStageWithReturn(AppStage.GAME_ARENA, AppStage.PARENT_DASHBOARD);
    };

    const handleReplayPreview = () => {
        if (previewModule && previewModuleId) {
            setActiveModule(previewModule);
            setStageWithReturn(AppStage.GAME_ARENA, AppStage.PARENT_DASHBOARD);
        }
    };

    const handleCancelPreview = () => {
        clearHomeworkPreview();
        setSelectedImage(null);
        setError(null);
        setSuccess(false);
        setIsGenerating(false);
    };

    const handleCreateGame = async () => {
        if (!analysis || !previewModuleId) return;

        const timestamp = Date.now();
        const moduleId = `hw_${timestamp}`;
        const moduleType = mapTemplateToModuleType(analysis.suggestedGameTemplate);

        // Create an engaging, child-friendly description
        const childName = profile?.name || 'you';
        const engagingDescription = `Time to practice ${analysis.topic}! ${childName} will have fun learning with this ${analysis.suggestedGameTemplate.toLowerCase().replace('_', ' ')} game. 🎯`;

        const newModule: CurriculumModule = {
            id: moduleId,
            title: `Homework: ${analysis.topic}`,
            description: engagingDescription,
            type: moduleType,
            durationMinutes: 10,
            icon: '📝',
            visualStyle: mapVisualStyle(analysis.visualStyle || 'Cartoon'),
        };

        // Copy preview content to new module
        const previewContent = moduleContents[previewModuleId];
        if (previewContent) {
            // Save to DB with new ID (cast via unknown for db compatibility)
            await db.cache.setGame(moduleId, previewContent);

            // Update UI Store
            addCustomHomeworkModule(newModule);

            setSuccess(true);

            // Clear everything after 2 seconds
            setTimeout(() => {
                clearHomeworkPreview();
                setSelectedImage(null);
                setSuccess(false);
                setIsGenerating(false);
            }, 2000);
        } else {
            setError('Preview content not ready. Please try testing the game first.');
        }
    };

    const renderSuccessMessage = () => {
        if (!success) return null;
        return (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-center border-2 border-green-300">
                <span className="text-2xl mr-3">✅</span>
                <div>
                    <strong className="text-lg">Success!</strong>
                    <p className="text-sm">The homework game has been added to the mission map. Check the dashboard!</p>
                </div>
            </div>
        );
    };

    const renderUploadBox = () => (
        <div
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragging
                    ? 'border-green-400 bg-green-50 scale-105 shadow-lg'
                    : 'border-slate-300 hover:bg-slate-50 hover:border-indigo-300'
                }
            `}
        >
            {isDragging ? (
                <>
                    <span className="text-4xl mb-2 block animate-bounce">📚</span>
                    <span className="font-bold text-green-600 text-lg">Drop homework here!</span>
                </>
            ) : (
                <>
                    <span className="text-4xl mb-2 block">📤</span>
                    <span className="font-bold text-slate-600">Click to Upload Homework</span>
                    <p className="text-xs text-slate-400 mt-1">Click to upload or drag & drop • Supports JPG, PNG</p>
                </>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    );

    const renderAnalysisPreview = () => {
        if (!analysis) return null;

        return (
            <div className="animate-fade-in-up">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border-2 border-indigo-200 mb-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider">✨ DETECTED CONTENT</span>
                        <div className="flex gap-2">
                            <span className="bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-bold">{analysis.subject}</span>
                            <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-bold">{analysis.ageGroup}</span>
                        </div>
                    </div>
                    <h4 className="font-bold text-xl text-indigo-900 mb-2">{analysis.topic}</h4>
                    <p className="text-sm text-indigo-700 mb-4 leading-relaxed">{analysis.summary}</p>

                    <div className="flex items-center text-xs font-bold text-indigo-600 space-x-4 bg-white/50 rounded-lg p-3">
                        <span className="flex items-center">
                            🎮 Game: <span className="ml-1 text-indigo-800">{analysis.suggestedGameTemplate.replace('_', ' ')}</span>
                        </span>
                        <span className="flex items-center">
                            📊 Level: <span className="ml-1 text-indigo-800">{analysis.difficulty}</span>
                        </span>
                        <span className="flex items-center">
                            🎨 Style: <span className="ml-1 text-indigo-800">{analysis.visualStyle}</span>
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 mb-4 max-h-32 overflow-y-auto">
                    <strong className="text-slate-700">🎯 Game Items (AI will generate images):</strong>
                    <div className="mt-2 space-y-1">
                        {analysis.gameItems?.map((item, idx) => (
                            <div key={idx} className={`p-2 rounded border ${item.isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                                <span className="font-semibold text-slate-700">{item.name}</span>
                                {item.isCorrect && <span className="ml-2 text-green-600">✓ Correct</span>}
                                {item.description && (
                                    <p className="text-[10px] text-slate-500 mt-1">→ {item.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    {!previewReady ? (
                        <>
                            <button
                                onClick={handleTestGame}
                                disabled={isGenerating}
                                className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center ${isGenerating
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-sky-500 hover:bg-sky-600 shadow-sky-200 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span> Generating...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xl mr-2">🎮</span> Test Game
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleCancelPreview}
                                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
                                title="Cancel and start over"
                            >
                                🗑️
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleReplayPreview}
                                className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                            >
                                <span className="text-xl mr-2">▶️</span> Replay Preview
                            </button>
                            <button
                                onClick={handleCreateGame}
                                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                            >
                                <span className="text-xl mr-2">✅</span> Add to Curriculum
                            </button>
                            <button
                                onClick={handleCancelPreview}
                                className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
                                title="Cancel and start over"
                            >
                                🗑️
                            </button>
                        </>
                    )}
                </div>

                {previewReady && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                        <span className="text-green-700 font-bold text-sm">
                            ✓ Preview ready! Test it again or add to curriculum.
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const renderActionButtons = () => {
        if (analysis || previewReady) return null;

        return (
            <div>
                <h3 className="font-bold text-slate-700 mb-2">Photo Ready</h3>
                <div className="flex gap-3">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={`flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all ${isAnalyzing ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}`}
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center justify-center">
                                <span className="animate-spin mr-2">⏳</span> Analyzing...
                            </span>
                        ) : (
                            "✨ Analyze & Convert"
                        )}
                    </button>
                    <button
                        onClick={handleCancelPreview}
                        className="px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        title="Cancel and start over"
                    >
                        🗑️
                    </button>
                </div>
                {error && (
                    <p className="text-red-500 text-sm mt-3">{error}</p>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 mt-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <span className="text-9xl">📚</span>
            </div>

            <h2 className="text-lg font-bold text-slate-700 mb-2 flex items-center">
                <span className="mr-2">✨</span> Magic Homework Converter
            </h2>
            <p className="text-sm text-slate-500 mb-6 max-w-lg">
                Upload a photo of your child&apos;s worksheet. Our AI will transform it into an engaging game!
            </p>

            {renderSuccessMessage()}

            {!selectedImage ? renderUploadBox() : (
                <div className="space-y-6">
                    <div className="flex items-start space-x-6">
                        {selectedImage !== 'restored' && (
                            <div className="relative group">
                                <img src={selectedImage} alt="Homework" className="w-48 h-48 object-cover rounded-lg shadow-md border border-slate-200" />
                                <button
                                    onClick={() => {
                                        setSelectedImage(null);
                                        clearHomeworkPreview();
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-xs hover:bg-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <div className="flex-1">
                            {renderActionButtons()}
                            {renderAnalysisPreview()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useRef, useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { detectObjectsInImage } from '../../services/geminiService';
import { PhotoCategory, UserPhoto, CurriculumModule, GamePayload } from '../../types';
import { db } from '../../services/db';
import { AppStage } from '../../types';

export const PhotoGalleryManager: React.FC = () => {
    const { gallery, addPhoto, removePhoto, addCustomHomeworkModule, setStage, setActiveModule } = useUserStore();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<PhotoCategory>('KITCHEN');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categories: PhotoCategory[] = ['KITCHEN', 'BEDROOM', 'FAMILY', 'OTHER'];

    // Shared file processing logic
    const processFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file!');
            return;
        }

        setIsAnalyzing(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;

            // Detect objects for AR-Lite
            const objects = await detectObjectsInImage(base64);

            const newPhoto: UserPhoto = {
                id: `photo_${Date.now()}`,
                category: selectedCategory,
                base64: base64,
                detectedObjects: objects,
                timestamp: Date.now()
            };

            addPhoto(newPhoto);
            setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processFile(file);
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

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            await processFile(file);
        }
    };

    const handleAssignToSchedule = async (photo: UserPhoto) => {
        if (!photo.detectedObjects || photo.detectedObjects.length === 0) {
            alert("No objects detected in this photo!");
            return;
        }

        const moduleId = `photo_game_${Date.now()}`;
        const targets = photo.detectedObjects;

        // Create 5 questions - each targeting a different object
        const questions: GamePayload[] = [];
        const TARGET_QUESTIONS = 5;

        for (let i = 0; i < TARGET_QUESTIONS; i++) {
            // Cycle through objects if we have fewer than 5
            const correctObj = targets[i % targets.length];

            questions.push({
                id: `q_${i}_${Date.now()}`,
                template: 'TAP_TRACK',
                backgroundTheme: 'Real World Photo',
                backgroundImage: photo.base64,
                instruction: `Find the ${correctObj.label || correctObj.name}!`,
                spawnMode: 'STATIC',
                items: targets.map((obj, idx) => ({
                    id: `obj_${idx}_${i}_${Date.now()}`,
                    name: obj.label || obj.name,
                    isCorrect: (obj.box2d?.[0] === correctObj.box2d?.[0] &&
                        obj.box2d?.[1] === correctObj.box2d?.[1] &&
                        obj.box2d?.[2] === correctObj.box2d?.[2] &&
                        obj.box2d?.[3] === correctObj.box2d?.[3]),
                    boundingBox: obj.box2d // [ymin, xmin, ymax, xmax]
                }))
            });
        }

        // Create wrapper payload with questions array
        const payload: GamePayload = {
            id: moduleId,
            template: 'TAP_TRACK',
            backgroundTheme: 'Real World Photo',
            backgroundImage: photo.base64,
            instruction: 'Find objects in your photo!',
            spawnMode: 'STATIC',
            items: [],
            questions: questions // This is the key - pack of 5 questions
        };

        // Cache Game Content
        await db.cache.setGame(moduleId, payload);

        // Create Module
        const newModule: CurriculumModule = {
            id: moduleId,
            title: `Photo Hunt: ${photo.category}`,
            description: "Find objects in your home room!",
            type: 'PHOTO_HUNT',
            durationMinutes: 5,
            icon: '📸',
            visualStyle: 'Realistic'
        };

        // Update Store: Add to Schedule
        addCustomHomeworkModule(newModule);

        // Visual Feedback
        alert("Game added to Child's Schedule! They can play it in their dashboard.");
    };

    const handleTestPlay = async (photo: UserPhoto) => {
        if (!photo.detectedObjects || photo.detectedObjects.length === 0) {
            alert("No objects detected in this photo!");
            return;
        }

        const moduleId = `photo_game_${Date.now()}`;
        const targets = photo.detectedObjects;

        // Create 5 questions - each targeting a different object
        const questions: GamePayload[] = [];
        const TARGET_QUESTIONS = 5;

        for (let i = 0; i < TARGET_QUESTIONS; i++) {
            // Cycle through objects if we have fewer than 5
            const correctObj = targets[i % targets.length];

            questions.push({
                id: `q_${i}_${Date.now()}`,
                template: 'TAP_TRACK',
                backgroundTheme: 'Real World Photo',
                backgroundImage: photo.base64,
                instruction: `Find the ${correctObj.label || correctObj.name}!`,
                spawnMode: 'STATIC',
                items: targets.map((obj, idx) => ({
                    id: `obj_${idx}_${i}_${Date.now()}`,
                    name: obj.label || obj.name,
                    isCorrect: (obj.box2d?.[0] === correctObj.box2d?.[0] &&
                        obj.box2d?.[1] === correctObj.box2d?.[1] &&
                        obj.box2d?.[2] === correctObj.box2d?.[2] &&
                        obj.box2d?.[3] === correctObj.box2d?.[3]),
                    boundingBox: obj.box2d // [ymin, xmin, ymax, xmax]
                }))
            });
        }

        // Create wrapper payload with questions array
        const payload: GamePayload = {
            id: moduleId,
            template: 'TAP_TRACK',
            backgroundTheme: 'Real World Photo',
            backgroundImage: photo.base64,
            instruction: 'Find objects in your photo!',
            spawnMode: 'STATIC',
            items: [],
            questions: questions // This is the key - pack of 5 questions
        };

        // Cache Game Content
        await db.cache.setGame(moduleId, payload);

        // Create Module
        const newModule: CurriculumModule = {
            id: moduleId,
            title: `Testing: ${photo.category}`,
            description: "Test Run",
            type: 'PHOTO_HUNT',
            durationMinutes: 5,
            icon: '🧪',
            visualStyle: 'Realistic'
        };

        // Update Store
        setActiveModule(newModule); // Set as current
        setStage(AppStage.GAME_ARENA); // Launch Game Immediately
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>📸</span> Home Gallery (AR-Lite)
            </h3>
            <p className="text-sm text-slate-500 mb-6">
                Upload photos of your home rooms. We will turn them into interactive games!
                Photos stay on this device.
            </p>

            {/* Category Selector */}
            <div className="flex gap-2 overflow-x-auto pb-4">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors
                            ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                        `}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Upload Area */}
            <div
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`mt-4 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
                    ${isAnalyzing
                        ? 'border-amber-400 bg-amber-50 cursor-wait'
                        : isDragging
                            ? 'border-green-400 bg-green-50 scale-105 shadow-lg'
                            : 'border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400'
                    }
                `}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isAnalyzing}
                />

                {isAnalyzing ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <span className="text-2xl mb-2">🧠</span>
                        <span className="text-amber-600 font-bold">AI is analyzing objects...</span>
                    </div>
                ) : isDragging ? (
                    <div className="flex flex-col items-center">
                        <span className="text-4xl mb-2 animate-bounce">📸</span>
                        <span className="text-green-600 font-bold text-lg">Drop photo here!</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <span className="text-4xl mb-2 text-indigo-300">+</span>
                        <span className="text-indigo-600 font-bold">Add Photo to {selectedCategory}</span>
                        <span className="text-xs text-indigo-400 mt-1">Click to upload or drag & drop</span>
                    </div>
                )}
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {gallery?.filter(p => p.category === selectedCategory).map(photo => (
                    <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square border-2 border-slate-100">
                        <img src={photo.base64} className="w-full h-full object-cover" />

                        {/* Play/Delete Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAssignToSchedule(photo)}
                                    className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-lg hover:bg-indigo-500 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <span className="text-lg">📅</span> Assign
                                </button>
                                <button
                                    onClick={() => handleTestPlay(photo)}
                                    className="bg-amber-500 text-white font-bold py-2 px-3 rounded-full shadow-lg hover:bg-amber-400 hover:scale-105 transition-all flex items-center gap-2"
                                    title="Test Game Immediately"
                                >
                                    <span className="text-lg">▶️</span>
                                </button>
                            </div>

                            <div className="text-white text-xs font-bold drop-shadow-md">
                                {photo.detectedObjects?.length || 0} Objects Found
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
                                title="Delete"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Status Badge - Always Visible */}
                        <div className="absolute bottom-2 right-2 bg-white/90 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            AR Ready
                        </div>
                    </div>
                ))}
            </div>
            {(!gallery || gallery.filter(p => p.category === selectedCategory).length === 0) && (
                <div className="text-center py-8 text-slate-400 italic text-sm">
                    No photos in this category yet.
                </div>
            )}
        </div>
    );
};

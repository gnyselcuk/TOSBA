import React, { useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage } from '../../types';
import { PhotoGalleryManager } from '../parent/PhotoGalleryManager';

const LOADING_TEXT = 'Loading...';

const PhotoSetupScreen: React.FC = () => {
    const { setStage } = useUserStore();
    const [isAcknowledged, setIsAcknowledged] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

                {/* Header Phase: Explanation */}
                {!isAcknowledged ? (
                    <div className="p-12 text-center">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">
                            📸
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-4">
                            Let&apos;s Customize Your Experience
                        </h1>
                        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                            For a truly immersive <strong>AR-Lite</strong> experience, Tosba can use photos of your own home.
                            This allows us to create games like <em>&quot;Find the Apple in YOUR Kitchen&quot;</em>!
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-8 bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🔒</span>
                                <div>
                                    <span className="font-bold text-indigo-900 block">100% Private</span>
                                    <span className="text-sm text-indigo-700">Photos stay on this device. They are NOT uploaded to any cloud server indefinitely.</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">⚡</span>
                                <div>
                                    <span className="font-bold text-indigo-900 block">AI Powered</span>
                                    <span className="text-sm text-indigo-700">Our AI instantly detects objects (Chairs, Toys, Fruits) to build games.</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    if (isNavigating) return;
                                    setIsNavigating(true);
                                    setStage(AppStage.BUDDY_CREATION);
                                }}
                                disabled={isNavigating}
                                className="px-6 py-3 text-slate-400 font-bold hover:text-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {isNavigating ? LOADING_TEXT : 'Skip for Now'}
                            </button>
                            <button
                                onClick={() => {
                                    if (isNavigating) return;
                                    setIsNavigating(true);
                                    setIsAcknowledged(true);
                                    setIsNavigating(false);
                                }}
                                disabled={isNavigating}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-lg shadow-indigo-200"
                            >
                                {isNavigating ? LOADING_TEXT : 'Setup Photos'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Action Phase: Upload Tool */
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-2xl font-bold text-slate-700">Quick Photo Setup</h2>
                            <button
                                onClick={() => {
                                    if (isNavigating) return;
                                    setIsNavigating(true);
                                    setStage(AppStage.BUDDY_CREATION);
                                }}
                                disabled={isNavigating}
                                className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                                {isNavigating ? LOADING_TEXT : 'Done / Skip ➜'}
                            </button>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 mb-6 text-center text-slate-500 text-sm">
                            <p>Tip: Take a wide photo of a room (Kitchen or Bedroom) with many visible objects.</p>
                        </div>

                        {/* Reuse the Manager we built! */}
                        <div className="h-[600px] overflow-y-auto">
                            <PhotoGalleryManager />
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => {
                                    if (isNavigating) return;
                                    setIsNavigating(true);
                                    setStage(AppStage.BUDDY_CREATION);
                                }}
                                disabled={isNavigating}
                                className="w-full md:w-auto px-12 py-4 bg-green-500 text-white rounded-2xl font-bold text-xl hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-lg shadow-green-200"
                            >
                                {isNavigating ? LOADING_TEXT : 'Continue to Buddy Creation ➔'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhotoSetupScreen;

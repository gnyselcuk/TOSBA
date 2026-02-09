import React, { useMemo } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage } from '../../types';
import { PhotoGalleryManager } from './PhotoGalleryManager';
import { HomeworkUploader } from './HomeworkUploader';

const ParentDashboard: React.FC = () => {
   const { profile, curriculum, setStage, completedModuleIds, reset } = useUserStore();

   const handleReturnToChild = () => {
      setStage(AppStage.DASHBOARD);
   };

   const handleOpenQA = () => {
      setStage(AppStage.PARENT_QA);
   };

   const handleResetApp = () => {
      if (window.confirm("WARNING: This will delete the child profile, buddy, and all progress. Start over?")) {
         localStorage.clear();
         const req = indexedDB.deleteDatabase('TOSBA_DB');
         req.onsuccess = () => {
            reset();
            window.location.reload();
         };
         req.onerror = () => {
            reset();
            window.location.reload();
         };
         req.onblocked = () => {
            console.warn("DB Delete Blocked");
            reset();
            window.location.reload();
         };
      }
   };

   const stats = useMemo(() => {
      if (!curriculum || !curriculum.weeklySchedule) return { total: 0, completed: 0, progress: 0, timeSpent: 0 };

      const allModules = curriculum.weeklySchedule.flatMap(d => d.modules || []);
      const total = allModules.length;
      const completed = completedModuleIds.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      const timeSpent = completed * 15;

      return { total, completed, progress, timeSpent };
   }, [curriculum, completedModuleIds]);

   return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 font-sans text-slate-800 flex flex-col">

         {/* Header */}
         <div className="text-center pt-8 pb-4">
            <h1 className="text-4xl font-bold text-sky-600 mb-2">TOSBA</h1>
            <p className="text-slate-500">Parent Insight</p>
         </div>

         {/* Top Exit Button */}
         <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full mb-4">
            <button
               onClick={handleReturnToChild}
               className="w-full py-4 px-8 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-lg font-bold transition-transform active:scale-95 shadow-lg shadow-sky-200"
            >
               Exit to Child Mode ➜
            </button>
         </div>

         <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 w-full">

            {/* Top Row: Profile + Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

               {/* Profile Card */}
               <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
                  <h2 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Learner Profile</h2>
                  <div className="flex items-center space-x-4 mb-6">
                     <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center text-3xl border-2 border-sky-200">
                        👤
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">{profile?.name || 'Child'}</h3>
                        <p className="text-sm text-slate-500">Age: {profile?.chronologicalAge} (Dev: {profile?.developmentalAge})</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Core Interests</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                           {profile?.interests.map(i => (
                              <span key={i} className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-medium">{i}</span>
                           ))}
                        </div>
                     </div>
                     <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Sensitivities</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                           {profile?.avoidances.map(a => (
                              <span key={a} className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-medium">{a}</span>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Progress Card */}
               <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow lg:col-span-2">
                  <div className="flex justify-between items-start mb-6">
                     <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Weekly Progress</h2>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold ${stats.progress > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {stats.progress > 0 ? 'Active' : 'Not Started'}
                     </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                     <div className="bg-gradient-to-br from-sky-50 to-white p-4 rounded-2xl border border-sky-100 text-center">
                        <p className="text-3xl font-bold text-slate-700">{stats.completed}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Missions Complete</p>
                     </div>
                     <div className="bg-gradient-to-br from-sky-50 to-white p-4 rounded-2xl border border-sky-100 text-center">
                        <p className="text-3xl font-bold text-slate-700">{stats.progress}%</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Course Progress</p>
                     </div>
                     <div className="bg-gradient-to-br from-sky-50 to-white p-4 rounded-2xl border border-sky-100 text-center">
                        <p className="text-3xl font-bold text-slate-700">{stats.timeSpent}m</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Est. Learning Time</p>
                     </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                     <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Curriculum Status</h3>
                     {curriculum ? (
                        <div className="space-y-3">
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-700 font-semibold">{curriculum.branchTitle}</span>
                              <span className="text-slate-500 text-xs">{stats.completed} / {stats.total} Modules</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div
                                 className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-1000"
                                 style={{ width: `${stats.progress}%` }}
                              ></div>
                           </div>
                           <p className="text-xs text-slate-500">
                              Current Focus: <span className="text-slate-700 font-medium">{curriculum.theme}</span>
                           </p>
                        </div>
                     ) : (
                        <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-sm border border-amber-100">
                           Initial assessment in progress. Curriculum will be generated shortly.
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* AI Support Guide */}
            <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-6 rounded-3xl shadow-xl text-white hover:shadow-2xl transition-shadow">
               <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                     <h2 className="text-xl font-bold mb-2">Ask AI Support Guide</h2>
                     <p className="text-sky-100 text-sm">
                        Have questions about {profile?.name}&apos;s behavior or the curriculum? Chat with our experimental AI guide trained on academic literature.
                     </p>
                  </div>
                  <button
                     onClick={handleOpenQA}
                     className="bg-white text-sky-700 font-bold px-6 py-3 rounded-2xl hover:bg-sky-50 transition-all shadow-lg shadow-sky-200 whitespace-nowrap active:scale-95"
                  >
                     Start Consultation (Beta)
                  </button>
               </div>
            </div>

            {/* Homework Uploader */}
            <HomeworkUploader />

            {/* Photo Gallery */}
            <PhotoGalleryManager />

            {/* Curriculum View */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
               <h2 className="text-xs font-bold uppercase text-slate-400 mb-6 tracking-wider">Detailed Plan</h2>
               {curriculum && curriculum.weeklySchedule ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {(curriculum.weeklySchedule || []).flatMap(d => d.modules || []).map(mod => {
                        const isDone = completedModuleIds.includes(mod.id);
                        return (
                           <div key={mod.id} className={`border p-4 rounded-2xl flex items-start space-x-3 transition-all hover:shadow-md ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                              <div className="text-2xl">{isDone ? '✅' : mod.icon}</div>
                              <div className="flex-1">
                                 <div className="flex items-start justify-between gap-2">
                                    <p className={`font-bold text-sm leading-tight ${isDone ? 'text-green-800' : 'text-slate-700'}`}>{mod.title}</p>
                                    {isDone && <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">DONE</span>}
                                 </div>
                                 <p className="text-xs text-slate-500 line-clamp-2 mt-1">{mod.description}</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               ) : (
                  <div className="text-center py-8 text-slate-400">
                     No curriculum generated yet.
                  </div>
               )}
            </div>

            {/* Danger Zone - Reset Card */}
            <div className="bg-gradient-to-br from-rose-50 to-red-50 p-8 rounded-3xl shadow-xl border-2 border-rose-200">
               <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-3xl border-2 border-rose-300">
                     ⚠️
                  </div>
                  <div>
                     <h2 className="text-xl font-bold text-rose-800 mb-2">Danger Zone</h2>
                     <p className="text-rose-600 text-sm max-w-md mx-auto">
                        This will permanently delete the child profile, buddy, curriculum, and all progress. This action cannot be undone.
                     </p>
                  </div>
                  <button
                     onClick={handleResetApp}
                     className="mt-2 py-4 px-8 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-lg font-bold transition-all active:scale-95 shadow-lg shadow-rose-200 border-2 border-rose-600"
                  >
                     🗑️ Reset App & Start Over
                  </button>
               </div>
            </div>

            {/* Bottom Exit Button */}
            <button
               onClick={handleReturnToChild}
               className="w-full py-4 px-8 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-lg font-bold transition-transform active:scale-95 shadow-lg shadow-sky-200"
            >
               Exit to Child Mode ➜
            </button>

         </div>
      </div>
   );
};

export default ParentDashboard;
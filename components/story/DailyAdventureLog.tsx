
import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import HTMLFlipBook from 'react-pageflip';
import { useUserStore } from '../../store/userStore';
import { generateStoryBook, playAudioData, stopBuddySpeech, speakBuddyText } from '../../services/geminiService';
import { StoryBook, AppStage, ShopProduct } from '../../types';
import { Backpack, BookOpen, Sparkles, X, ArrowLeft } from 'lucide-react';

// ... (existing imports)
import BuddyWidget from '../buddy/BuddyWidget';

// DRAG TYPE
const DRAG_TYPE_ITEM = 'STORY_ITEM';



// --- DRAGGABLE ITEM COMPONENT ---
interface DraggableItemProps {
    item: ShopProduct;
    onRemove?: () => void;
    isInCauldron?: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item, onRemove, isInCauldron }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: DRAG_TYPE_ITEM,
        item: { ...item },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [item]);

    return (
        <div
            ref={drag}
            className={`
                relative p-2 rounded-xl bg-white border-2 flex flex-col items-center gap-1 shadow-sm 
                transition-all cursor-grab active:cursor-grabbing
                ${isDragging ? 'opacity-40 scale-95' : 'opacity-100 hover:scale-105 hover:shadow-md'}
                ${isInCauldron ? 'border-purple-300 bg-purple-50' : 'border-slate-200'}
            `}
        >
            <img src={item.imageUrl} alt={item.name} className="w-14 h-14 object-contain" />
            <span className="text-xs font-bold text-slate-700 truncate max-w-full text-center">{item.name}</span>
            {isInCauldron && onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition"
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
};

// --- MAIN CONTENT COMPONENT (with DnD hooks) ---
const DailyAdventureLogContent: React.FC = () => {
    const {
        profile,
        buddy,
        stories,
        addStory,
        setStage,
        inventory,
        removeFromInventory
    } = useUserStore();

    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'LIBRARY' | 'READING'>('LIBRARY');
    const [currentStory, setCurrentStory] = useState<StoryBook | null>(null);

    // Cauldron - items selected for story
    const [cauldronItems, setCauldronItems] = useState<ShopProduct[]>([]);

    // Audio Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeWordIndex, setActiveWordIndex] = useState(-1);
    const [activePageAudioId, setActivePageAudioId] = useState<string | null>(null);

    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const karaokeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // AI CONTEXT
    const storyContext = `
        SCENE: Magic Storybook.
        ROLE: Narrator / Story Muse.
        
        CURRENT STATE: ${viewMode === 'READING' ? 'Reading Story: ' + (currentStory?.title || 'Unknown') : 'Creating Story'}.
        CAULDRON ITEMS: ${cauldronItems.map(i => i.name).join(', ') || 'Empty'}.
        
        GOAL:
        - If in LIBRARY mode: Encourge child to drag items to the Cauldron to make a new story.
        - If CAULDRON has items: "Wow! Put those in the cauldron!" or "Click Create Story!"
        - If in READING mode: "Listen to the story!" or "I love this part."
        - Keep it magical and whimsical.
    `;

    // Stop audio when unmounting
    useEffect(() => {
        return () => {
            stopBuddySpeech();
            if (karaokeIntervalRef.current) clearInterval(karaokeIntervalRef.current);
        };
    }, []);

    const removeFromCauldron = (itemId: string) => {
        setCauldronItems(prev => prev.filter(i => i.id !== itemId));
    };

    // Helper to add item to cauldron
    const addToCauldron = (item: ShopProduct) => {
        setCauldronItems(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) {
                return prev;
            }
            return [...prev, item];
        });
    };

    // DROP ZONE - Story Cauldron
    const [{ isOver }, drop] = useDrop(() => ({
        accept: DRAG_TYPE_ITEM,
        drop: (item: ShopProduct) => {
            addToCauldron(item);
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), []);

    // Helper to render text with highlighting
    const renderHighlightedText = (text: string, pageAudioId: string | null) => {
        const words = text.split(/\s+/);
        const isPageActive = isPlaying && activePageAudioId === pageAudioId;

        return (
            <span>
                {words.map((word, i) => (
                    <span
                        key={i}
                        className={`transition-all duration-300 rounded px-1 ml-0.5 ${isPageActive && i === activeWordIndex
                            ? 'bg-yellow-300 text-orange-900 scale-110 inline-block font-bold shadow-sm'
                            : ''
                            } ${isPageActive && i < activeWordIndex ? 'opacity-60 text-stone-500' : ''
                            }`}
                    >
                        {word}{' '}
                    </span>
                ))}
            </span>
        );
    };

    const handleCreateStory = async () => {
        if (!profile || !buddy) return;
        if (cauldronItems.length === 0) {
            alert("Drag some items from your backpack to the magic cauldron first!");
            return;
        }

        setIsGenerating(true);
        try {
            const todayLesson = "Adventure with magical items";
            const interest = profile.interests[0] || "Adventure";

            // Get item names from cauldron
            const selectedItemNames = cauldronItems.map(item => item.name);

            const newStory = await generateStoryBook(
                profile.name,
                buddy.name,
                interest,
                todayLesson,
                profile.chronologicalAge || 6,
                {
                    avoidances: profile.avoidances || [],
                    inventoryItems: selectedItemNames
                }
            );

            if (newStory) {
                // Remove used items from inventory
                cauldronItems.forEach(item => {
                    removeFromInventory(item.id);
                });

                // Clear cauldron
                setCauldronItems([]);

                addStory(newStory);
                setCurrentStory(newStory);
                setViewMode('READING');
            }
        } catch (e) {
            console.error(e);
            alert("Failed to create story. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAudioToggle = async (base64Audio: string | undefined | null, text: string, pageIdStr: string) => {
        if (isPlaying && activePageAudioId === pageIdStr) {
            stopBuddySpeech();
            if (karaokeIntervalRef.current) clearInterval(karaokeIntervalRef.current);
            setIsPlaying(false);
            setActivePageAudioId(null);
            setActiveWordIndex(-1);
            return;
        }

        // If we have pre-generated audio, play it with karaoke highlighting
        if (base64Audio) {
            playAudio(base64Audio, text, pageIdStr);
        } else {
            // Otherwise, use Buddy's voice to read the story text
            setIsPlaying(true);
            setActivePageAudioId(pageIdStr);

            // Use speakBuddyText so Buddy reads the story (no text bubble needed)
            await speakBuddyText(text, buddy?.voiceName);

            // Mark as done after speech completes
            setIsPlaying(false);
            setActivePageAudioId(null);
        }
    };

    const playAudio = async (base64Audio: string, text: string, pageIdStr: string) => {
        if (!base64Audio) return;

        stopBuddySpeech();
        if (karaokeIntervalRef.current) clearInterval(karaokeIntervalRef.current);

        setIsPlaying(true);
        setActivePageAudioId(pageIdStr);
        setActiveWordIndex(-1);

        try {
            // @ts-expect-error - playAudioData return type needs proper typing
            const result = await playAudioData(base64Audio);
            const source = result.source;
            const duration = result.duration;

            currentSourceRef.current = source;

            const words = text.split(/\s+/);
            const totalChars = text.replace(/\s/g, '').length;

            if (words.length > 0 && duration > 0 && totalChars > 0) {
                const wordTimings = words.map(w => {
                    const weight = w.length / totalChars;
                    return duration * weight;
                });

                setActiveWordIndex(0);
                const startTimestamp = Date.now();

                karaokeIntervalRef.current = setInterval(() => {
                    const elapsed = (Date.now() - startTimestamp) / 1000;
                    let accum = 0;
                    let foundIdx = -1;
                    for (let i = 0; i < wordTimings.length; i++) {
                        accum += wordTimings[i];
                        if (elapsed < accum) {
                            foundIdx = i;
                            break;
                        }
                    }
                    if (foundIdx !== -1) {
                        setActiveWordIndex(foundIdx);
                    } else if (elapsed >= duration) {
                        if (karaokeIntervalRef.current) clearInterval(karaokeIntervalRef.current);
                    }
                }, 50);
            }

            source.onended = () => {
                setIsPlaying(false);
                currentSourceRef.current = null;
                setActiveWordIndex(-1);
                setActivePageAudioId(null);
                if (karaokeIntervalRef.current) clearInterval(karaokeIntervalRef.current);
            };
        } catch (e) {
            console.error("Audio Play Error", e);
            setIsPlaying(false);
            setActivePageAudioId(null);
        }
    };

    // Determine view style by age
    const isTeen = (profile?.chronologicalAge || 0) >= 13;

    // Available items (not in cauldron)
    const availableItems = (inventory || []).filter(
        item => !cauldronItems.find(c => c.id === item.id)
    );

    // Track current visible page for external Read button
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const flipBookRef = useRef<HTMLElement | null>(null);

    const renderBookView = () => {
        // Get current page data (accounting for cover page at index 0)
        const actualPageIndex = Math.max(0, Math.floor((currentPageIndex - 1) / 1));
        const currentPage = currentStory?.pages[actualPageIndex];

        return (
            <div className="flex flex-col items-center min-h-screen py-6">
                {/* Header with close button */}
                <button
                    onClick={() => setViewMode('LIBRARY')}
                    className="mb-6 text-stone-500 hover:text-stone-800 font-bold flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm"
                >
                    <ArrowLeft size={20} /> Close Book
                </button>

                {/* Larger Book */}
                {/* @ts-expect-error - HTMLFlipBook types are not fully compatible */}
                <HTMLFlipBook
                    ref={flipBookRef}
                    width={500}
                    height={700}
                    showCover={true}
                    className="shadow-2xl"
                    onFlip={(e: { data: number }) => setCurrentPageIndex(e.data)}
                >
                    {/* Front Cover */}
                    <div className="bg-violet-600 text-white p-8 flex flex-col items-center justify-center border-4 border-violet-800 shadow-inner">
                        <h1 className="text-4xl font-extrabold text-center mb-8 drop-shadow-md leading-tight">{currentStory!.title}</h1>
                        <div className="w-56 h-56 rounded-full overflow-hidden border-8 border-white shadow-2xl mb-8 bg-white">
                            <img src={currentStory!.pages[0]?.imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-2xl font-medium">For {profile?.name}</p>
                        <p className="text-base opacity-75 mt-auto">{new Date(currentStory!.date).toLocaleDateString()}</p>
                    </div>

                    {/* Pages - now without the button inside */}
                    {currentStory!.pages.map((page, index) => (
                        <div key={`page-${index}`} className="bg-amber-50 shadow-inner border-r border-stone-200">
                            <div className="flex flex-col h-full p-6 relative">
                                {/* Larger image area */}
                                <div className="h-[40%] w-full flex-shrink-0 mb-4 rounded-xl overflow-hidden border-4 border-stone-200 bg-white shadow-md">
                                    <img src={page.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                {/* More readable text area */}
                                <div className="flex-1 flex flex-col items-center justify-start text-center overflow-y-auto no-scrollbar">
                                    <p className="text-xl font-medium font-serif leading-relaxed text-stone-800 px-2">
                                        {renderHighlightedText(page.text, `page-${index}`)}
                                    </p>
                                </div>
                                {/* Page number */}
                                <span className="absolute bottom-4 right-6 text-stone-400 text-base font-bold">{index + 1}</span>
                            </div>
                        </div>
                    ))}

                    {/* Back Cover */}
                    <div className="bg-violet-600 text-white p-10 flex flex-col items-center justify-center border-4 border-violet-800 shadow-inner">
                        <h2 className="text-4xl font-bold mb-6">The End</h2>
                        <p className="text-xl opacity-90 mb-10">Great job today, {profile?.name}!</p>
                        <button
                            onClick={() => setViewMode('LIBRARY')}
                            className="px-8 py-4 bg-white text-violet-800 rounded-full font-bold text-lg hover:scale-110 transition"
                        >
                            Close Book
                        </button>
                    </div>
                </HTMLFlipBook>

                {/* Read to me button - OUTSIDE the book */}
                {currentPage && (
                    <div className="mt-8">
                        <button
                            onClick={() => handleAudioToggle(currentPage.audioBase64, currentPage.text, `page-${actualPageIndex}`)}
                            className={`
                                flex items-center gap-4 px-8 py-4 rounded-full text-lg font-bold transition shadow-xl hover:scale-105 active:scale-95
                                ${isPlaying && activePageAudioId === `page-${actualPageIndex}`
                                    ? 'bg-red-500 text-white border-2 border-red-600'
                                    : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 border-2 border-transparent'}
                            `}
                        >
                            {isPlaying && activePageAudioId === `page-${actualPageIndex}`
                                ? <><span className="text-2xl">⏹️</span> Stop Reading</>
                                : <><span className="text-2xl">🔈</span> Read to me</>
                            }
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderComicView = () => (
        <div className="w-full max-w-3xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm sticky top-0 z-20 opacity-95 backdrop-blur">
                <button
                    onClick={() => setViewMode('LIBRARY')}
                    className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2"
                >
                    <ArrowLeft size={20} /> Library
                </button>
                <h2 className="font-bold text-lg text-slate-800 truncate px-4">{currentStory!.title}</h2>
                <div className="w-16"></div>
            </div>

            <div className="space-y-6">
                {currentStory!.pages.map((page, index) => (
                    <div key={`panel-${index}`} className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                        <div className="relative aspect-video bg-slate-100">
                            <img src={page.imageUrl} className="w-full h-full object-cover" />
                            {page.audioBase64 && (
                                <button
                                    onClick={() => handleAudioToggle(page.audioBase64!, page.text, `page-${index}`)}
                                    className="absolute bottom-4 right-4 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 backdrop-blur-sm transition"
                                >
                                    {isPlaying && activePageAudioId === `page-${index}` ? '⏹️' : '🔈'}
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            <p className="text-lg text-slate-700 font-medium leading-relaxed font-sans">
                                {page.text}
                            </p>
                        </div>
                        <div className="bg-slate-50 px-6 py-2 text-xs text-slate-400 text-right uppercase tracking-widest font-bold">
                            Panel {index + 1}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <button
                    onClick={() => setViewMode('LIBRARY')}
                    className="px-8 py-3 bg-slate-800 text-white rounded-full font-bold hover:bg-slate-700 transition"
                >
                    Finish Reading
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-100 via-sky-50 to-white p-4 font-fredoka text-slate-900 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-20 right-10 w-48 h-48 bg-amber-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
                <button
                    onClick={() => setStage(AppStage.DASHBOARD)}
                    className="px-4 py-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition border border-slate-200 text-slate-600 font-bold flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> Dashboard
                </button>
                <h1 className="text-3xl font-bold text-purple-600 drop-shadow-sm flex items-center gap-2">
                    {viewMode === 'LIBRARY' ? <><BookOpen /> Story Magic</> : '📖 Adventure Time'}
                </h1>
                <div className="w-[100px]"></div>
            </div>

            {/* LIBRARY VIEW */}
            {viewMode === 'LIBRARY' && (
                <div className="max-w-7xl mx-auto relative z-10">
                    {/* STORY CREATOR SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

                        {/* BACKPACK (Inventory) */}
                        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/50">
                            <h3 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
                                <Backpack className="text-amber-600" /> My Backpack
                            </h3>
                            {availableItems.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="text-lg mb-2">🎒 Empty!</p>
                                    <p className="text-sm">Visit the shop to get items for your stories.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2">
                                    {availableItems.map(item => (
                                        <DraggableItem key={item.id} item={item} />
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-slate-500 mt-4 text-center">
                                Drag items to the magic cauldron →
                            </p>
                        </div>

                        {/* MAGIC CAULDRON (Drop Zone) */}
                        <div
                            ref={drop}
                            className={`
                                bg-gradient-to-b from-purple-600 to-violet-800 rounded-3xl p-6 shadow-xl 
                                flex flex-col items-center justify-center relative overflow-hidden
                                transition-all duration-300
                                ${isOver ? 'scale-105 ring-4 ring-purple-300 shadow-purple-300/50 shadow-2xl' : ''}
                            `}
                        >
                            {/* Magic Particles */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-2 h-2 bg-white rounded-full opacity-50 animate-pulse"
                                        style={{
                                            /* eslint-disable sonarjs/pseudo-random */
                                            left: `${Math.random() * 100}%`,
                                            top: `${Math.random() * 100}%`,
                                            animationDelay: `${Math.random() * 2}s`,
                                            animationDuration: `${2 + Math.random() * 2}s`
                                            /* eslint-enable sonarjs/pseudo-random */
                                        }}
                                    />
                                ))}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                                <Sparkles className="text-yellow-300" /> Magic Cauldron
                            </h3>

                            {/* Cauldron Items */}
                            <div className="min-h-[150px] w-full flex flex-wrap gap-3 justify-center items-center p-4 bg-black/20 rounded-2xl backdrop-blur-sm relative z-10">
                                {cauldronItems.length === 0 ? (
                                    <div className="text-center text-white/70">
                                        <p className="text-4xl mb-2">🪄</p>
                                        <p className="text-sm">Drop items here to add them to your story!</p>
                                    </div>
                                ) : (
                                    cauldronItems.map(item => (
                                        <DraggableItem
                                            key={item.id}
                                            item={item}
                                            isInCauldron
                                            onRemove={() => removeFromCauldron(item.id)}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Create Button */}
                            <button
                                onClick={handleCreateStory}
                                disabled={isGenerating || cauldronItems.length === 0}
                                className={`
                                    mt-6 px-8 py-4 rounded-full text-lg font-bold transition transform active:scale-95 shadow-lg flex items-center gap-3 relative z-10
                                    ${isGenerating || cauldronItems.length === 0
                                        ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 shadow-orange-300/50'}
                                `}
                            >
                                {isGenerating ? (
                                    <><span className="animate-spin">✨</span> Creating Magic...</>
                                ) : (
                                    <><Sparkles size={20} /> Create Story!</>
                                )}
                            </button>

                            {cauldronItems.length > 0 && !isGenerating && (
                                <p className="text-white/80 text-sm mt-3 relative z-10">
                                    {cauldronItems.length} item{cauldronItems.length > 1 ? 's' : ''} ready for your adventure!
                                </p>
                            )}
                        </div>

                        {/* INSTRUCTIONS / BUDDY */}
                        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/50 flex flex-col items-center justify-center text-center">
                            <div className="text-6xl mb-4">🧙‍♂️</div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">How it works</h3>
                            <div className="text-sm text-slate-600 space-y-2">
                                <p>1️⃣ Drag items from your backpack</p>
                                <p>2️⃣ Drop them in the magic cauldron</p>
                                <p>3️⃣ Click &quot;Create Story&quot; and watch the magic!</p>
                                <p className="text-purple-600 font-bold mt-4">
                                    ✨ Items you use become part of your story forever!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bookshelf */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/50">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            📚 My Story Collection
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {stories && stories.length > 0 ? (
                                stories.map(story => (
                                    <div
                                        key={story.id}
                                        onClick={() => { setCurrentStory(story); setViewMode('READING'); }}
                                        className="aspect-[3/4] bg-white rounded-r-xl rounded-l-sm shadow-md border-l-8 border-violet-700 cursor-pointer hover:-translate-y-2 transition duration-300 relative group overflow-hidden"
                                    >
                                        <div className="absolute inset-0 p-4 flex flex-col">
                                            <div className="flex-1 bg-stone-100 rounded-lg mb-2 overflow-hidden relative">
                                                {story.pages[0]?.imageUrl ? (
                                                    <img src={story.pages[0].imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl">📕</div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-sm leading-tight line-clamp-2">{story.title}</h3>
                                            <p className="text-xs text-stone-500 mt-1">{new Date(story.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition"></div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center text-stone-400">
                                    <p className="text-xl">No stories yet. Create your first magical adventure!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* READING VIEW */}
            {viewMode === 'READING' && currentStory && (
                isTeen ? renderComicView() : renderBookView()
            )}

            {/* GLOBAL BUDDY WIDGET - hideBubble when reading so buddy just speaks without text balloon */}
            <BuddyWidget
                context={storyContext}
                className="fixed bottom-4 left-4 z-50 flex flex-col items-start"
                hideBubble={viewMode === 'READING'}
            />
        </div>
    );
};

// --- EXPORTED WRAPPER WITH DND PROVIDER ---
const DailyAdventureLog: React.FC = () => {
    return (
        <DndProvider backend={HTML5Backend}>
            <DailyAdventureLogContent />
        </DndProvider>
    );
};

export default DailyAdventureLog;

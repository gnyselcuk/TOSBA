
import React, { useEffect, useState, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useUserStore } from '../../store/userStore';
import { generateShopScenario, speakBuddyText } from '../../services/geminiService';
import { ShopScenario, ShopProduct, AppStage, ShopState } from '../../types';
import { ShoppingBag, Wallet } from 'lucide-react';
import BuddyWidget from '../buddy/BuddyWidget';

// TYPES
const DRAG_TYPE_MONEY = 'MONEY';

// --- SUBCOMPONENTS ---

interface MoneyProps {
    value: number;
    type: 'COIN' | 'BILL';
}

const Money: React.FC<MoneyProps> = ({ value, type }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: DRAG_TYPE_MONEY,
        item: { value },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [value]);

    const style = type === 'COIN'
        ? "w-16 h-16 rounded-full border-4 border-yellow-500 bg-yellow-300 flex items-center justify-center shadow-lg text-yellow-900 font-bold text-xl"
        : "w-32 h-16 rounded-md border-2 border-green-600 bg-green-100 flex items-center justify-center shadow-md text-green-800 font-bold text-xl";

    return (
        <div
            ref={drag}
            className={`${style} cursor-grab active:cursor-grabbing hover:scale-105 transition-transform ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        >
            ${value}
        </div>
    );
};

interface ProductProps {
    product: ShopProduct;
    onSelect?: (p: ShopProduct) => void;
    isSelected?: boolean;
}

const Product: React.FC<ProductProps> = ({ product, onSelect, isSelected }) => {
    return (
        <div
            onClick={() => onSelect && onSelect(product)}
            className={`relative p-3 rounded-2xl bg-white/95 backdrop-blur border-2 flex flex-col items-center gap-2 shadow-md transition-all cursor-pointer w-36
        ${isSelected ? 'border-blue-500 ring-4 ring-blue-200 scale-110 shadow-xl' : 'border-slate-200 hover:border-blue-300 hover:scale-105 hover:shadow-lg'}
      `}
        >
            {/* Floating Price Tag */}
            <div className="absolute -top-3 -right-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg border-2 border-white z-10">
                ${product.price}
            </div>

            {/* Product Image */}
            <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-2 flex items-center justify-center">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
            </div>

            {/* Product Name */}
            <div className="text-center w-full mt-1">
                <h3 className="font-bold text-slate-800 text-sm truncate">{product.name}</h3>
            </div>

            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-blue-500 text-xs font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                    ✓ Selected
                </div>
            )}
        </div>
    );
};

// --- CONTENT COMPONENT (Logic & DnD Hooks Here) ---

const ShopModuleContent: React.FC = () => {
    const { profile, buddy, setStage, inventory, addToInventory, buddyState, shopState, setShopState } = useUserStore();
    const [scenario, setScenario] = useState<ShopScenario | null>(null);
    const [loading, setLoading] = useState(true);

    // State
    const [activeProduct, setActiveProduct] = useState<ShopProduct | null>(null); // Focusing on single item logic for L1/L2

    // We don't need local 'cart' state for L3 anymore if we use global inventory, 
    // but for the specific L3 session requirement (shopping list), we might want to track current session progress.
    // For now, let's just focus on the global inventory requirement.

    const [paidAmount, setPaidAmount] = useState(0);
    const [wallet, setWallet] = useState<number[]>([]);
    const [feedback, setFeedback] = useState<string>("");



    // Refs for Drag Logic
    const activeProductRef = useRef(activeProduct);
    const paidAmountRef = useRef(paidAmount);
    const walletRef = useRef(wallet);

    useEffect(() => {
        activeProductRef.current = activeProduct;
        paidAmountRef.current = paidAmount;
        walletRef.current = wallet;
    }, [activeProduct, paidAmount, wallet]);

    useEffect(() => {
        loadScenario();
    }, []);

    // eslint-disable-next-line sonarjs/cognitive-complexity
    const loadScenario = async () => {
        setLoading(true);
        setActiveProduct(null);
        setPaidAmount(0);
        setFeedback("");

        const now = Date.now();

        // 1. CHECK PERSISTENCE
        // If we have a valid state and it hasn't "expired" (restock time), use it.
        // We also check if we actually have products or if the shop was emptied (in which case we might still wait for restock time)
        if (shopState && shopState.restockTime > now && shopState.scenario) {
            // eslint-disable-next-line no-console
            console.log("Loading persisted shop state");
            setScenario(shopState.scenario);
            setWallet(shopState.wallet);

            setLoading(false);

            // Contextual welcome back
            if (shopState.scenario.dialogue) {
                speakBuddyText(shopState.scenario.dialogue.welcome, buddy?.voiceName || "Puck");
            }
            return;
        }

        // 2. GENERATE NEW
        // eslint-disable-next-line no-console
        console.log("Generating new shop scenario");

        // Determine Difficulty based on Age
        const age = profile?.chronologicalAge || 6;
        let difficulty: 'L1' | 'L2' | 'L3' = 'L1';
        if (age >= 7) difficulty = 'L2';
        if (age >= 13) difficulty = 'L3';

        // Generate via Gemini
        const data = await generateShopScenario(
            difficulty,
            profile?.interests || [],
            age
        );

        if (data) {
            // Provide Wallet Money
            const initialWallet: number[] = [];
            if (difficulty === 'L1') {
                for (let i = 0; i < 5; i++) initialWallet.push(1);
            } else if (difficulty === 'L2') {
                for (let i = 0; i < 5; i++) initialWallet.push(1);
                for (let i = 0; i < 2; i++) initialWallet.push(5);
            } else {
                for (let i = 0; i < 3; i++) initialWallet.push(5);
                for (let i = 0; i < 3; i++) initialWallet.push(10);
                for (let i = 0; i < 1; i++) initialWallet.push(20);
            }

            // SAVE TO STORE (Persist for 2 hours)
            const newState: ShopState = {
                scenario: data,
                wallet: initialWallet,
                lastUpdated: now,
                restockTime: now + (2 * 60 * 60 * 1000) // 2 Hours
            };
            setShopState(newState);

            // Update Local State
            setScenario(data);
            setWallet(initialWallet);

            speakBuddyText(data.dialogue.welcome, buddy?.voiceName || "Puck");
        }
        setLoading(false);
    };

    // DROP ZONE LOGIC
    // We strictly use Refs inside the drop callback to avoid stale closures if the hook doesn't update fast enough
    const [{ isOver }, drop] = useDrop(() => ({
        accept: DRAG_TYPE_MONEY,
        drop: (item: { value: number }) => handlePayment(item.value),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), [scenario]); // Scenario determines difficulty rules

    const handlePayment = (amount: number) => {
        const currentActive = activeProductRef.current;
        const currentPaid = paidAmountRef.current;
        const currentWallet = [...walletRef.current];

        // Validation: Must select item
        if (!currentActive) {
            speakBuddyText("First, touch the toy you want!", buddy?.voiceName || "Puck");
            setFeedback("Touch item first 👆");
            return;
        }

        // Play Click Sound
        const audio = new Audio('/sounds/coin.mp3');
        audio.play().catch(() => { });

        // Remove from wallet (Logic using Ref to ensure freshness)
        const wIdx = currentWallet.indexOf(amount);
        if (wIdx > -1) {
            currentWallet.splice(wIdx, 1);
            setWallet(currentWallet);

            // Persist
            if (shopState) {
                setShopState({
                    ...shopState,
                    wallet: currentWallet,
                    lastUpdated: Date.now()
                });
            }
        } else {
            // Should not happen if UI is consistent
            return;
        }

        // Calculate new total
        const newTotal = currentPaid + amount;
        paidAmountRef.current = newTotal;
        setPaidAmount(newTotal);
        checkTransaction(newTotal, currentActive, currentWallet);
    };

    const checkTransaction = (currentPaid: number, product: ShopProduct, currentWallet: number[]) => {
        if (!scenario) return;

        const price = product.price;
        const remaining = price - currentPaid;

        // Autism-friendly text: Focus on what is needed NEXT
        if (remaining > 0) {
            setFeedback(`Need $${remaining} more! 💰`);
        } else {
            setFeedback(`Great! $${price} is perfect! ✨`);
        }

        // Logic check 
        if (currentPaid >= price) {

            // SUCCESS
            speakBuddyText(scenario.dialogue.success, buddy?.voiceName || "Puck");
            setFeedback("Purchased!");

            // 1. Add to Global Inventory
            addToInventory(product);

            // 2. Remove from Current Shop "Shelves"
            const newProducts = scenario.products.filter(p => p.id !== product.id);
            const newScenario = { ...scenario, products: newProducts };

            setScenario(newScenario);

            // PERSIST SCENARIO Update
            if (shopState) {
                // Note: currentWallet is passed in because handlePayment just updated it.
                // But we might need to update it again if there is change.
                setShopState({
                    ...shopState,
                    scenario: newScenario,
                    wallet: currentWallet, // Ensure we have latest wallet
                    lastUpdated: Date.now()
                });
            }


            setTimeout(() => {
                // Reset state
                setPaidAmount(0);
                setActiveProduct(null);
                setFeedback("");

                // Handle Change logic broadly
                if (currentPaid > price) {
                    const change = currentPaid - price;
                    speakBuddyText(`Here is your $${change} change.`, buddy?.voiceName || "Puck");

                    const walletWithChange = [...currentWallet, change];
                    setWallet(walletWithChange);

                    // Persist Change
                    if (shopState) {
                        setShopState({
                            ...shopState,
                            scenario: newScenario, // Use the new scenario we just set
                            wallet: walletWithChange,
                            lastUpdated: Date.now()
                        });
                    }
                }
            }, 1500);

        } else {
            speakBuddyText("You need more money.", buddy?.voiceName || "Puck");
        }
    };



    // AI CONTEXT
    const shopContext = `
        SCENE: Shop Simulation.
        ROLE: You are the Shopkeeper.
        
        CURRENT STATE:
        - Product Selected: ${activeProduct?.name || 'None'}
        - Product Price: ${activeProduct ? '$' + activeProduct.price : '-'}
        - Money Paid So Far: $${paidAmount}
        
        GOAL:
        - Help the child count money.
        - If they drop a coin, say "That is $1".
        - If they need more, say "You need $${activeProduct ? (activeProduct.price - paidAmount) : 0} more!".
        - If they paid enough, celebrate!
        - KEEP IT VERY SIMPLE. Just numbers and encouragement.
    `;

    if (loading) {
        return <div className="min-h-screen bg-sky-100 flex items-center justify-center">
            <div className="animate-spin text-4xl">🐢</div>
            <p className="ml-4 text-xl font-bold text-sky-800">Setting up Shop...</p>
        </div>;
    }

    if (!scenario) return null;

    return (
        <div className="min-h-screen bg-sky-50 relative overflow-hidden flex flex-col font-sans">
            {/* HEADER */}
            <div className="bg-white/90 backdrop-blur p-4 flex justify-between items-center shadow-sm z-30">
                <button
                    onClick={() => setStage(AppStage.DASHBOARD)}
                    className="bg-white hover:bg-slate-50 text-slate-600 rounded-full py-2 px-4 shadow-sm border border-slate-200 transition-transform active:scale-95 font-bold flex items-center gap-2"
                >
                    <span>🔙</span> <span className="hidden sm:inline">Dashboard</span>
                </button>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingBag className="text-blue-600" /> {scenario.theme}
                </h1>

                {/* Right side spacer for centering if needed, or empty */}
                <div className="w-10"></div>
            </div>

            {/* SCENE */}
            <div className="flex-1 relative flex flex-col">

                {/* MAIN AREA */}
                <div className="flex-1 flex justify-center items-end relative pb-12">

                    {/* SHELVES (Left) */}
                    <div className="absolute top-8 left-8 w-1/3 max-w-sm flex flex-wrap gap-4 content-start">
                        {scenario.products.length === 0 && (
                            <div className="p-6 bg-slate-100/50 rounded-xl text-slate-500 italic text-center w-full flex flex-col gap-2">
                                <p>Shop is empty! Great job!</p>
                                {shopState && (
                                    <p className="text-xs text-slate-400">
                                        Next shipment in {Math.ceil((shopState.restockTime - Date.now()) / (1000 * 60))} mins
                                    </p>
                                )}
                            </div>
                        )}
                        {scenario.products.map(p => (
                            <Product
                                key={p.id}
                                product={p}
                                isSelected={activeProduct?.id === p.id}
                                onSelect={(prod) => {
                                    setActiveProduct(prod);
                                    setPaidAmount(0);
                                    speakBuddyText(`${prod.name}, $${prod.price}.`, buddy?.voiceName || "Puck");
                                }}
                            />
                        ))}
                    </div>

                    {/* INVENTORY / BACKPACK (Right) */}
                    <div className="absolute top-8 right-8 w-72 bg-gradient-to-b from-amber-50 to-orange-50 backdrop-blur rounded-2xl p-4 border-2 border-amber-200 shadow-lg max-h-[60vh] overflow-y-auto">
                        <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-4 pb-2 border-b-2 border-amber-200 text-lg">
                            <span className="text-2xl">🎒</span> My Backpack
                        </h3>
                        {inventory.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-4xl mb-2">🎒</p>
                                <p className="text-sm text-amber-600 italic">Your backpack is empty!</p>
                                <p className="text-xs text-amber-500 mt-1">Buy something to fill it up</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {inventory.map((item, idx) => (
                                    <div key={`${item.id}_${idx}`} className="flex items-center gap-3 bg-white p-3 rounded-xl border-2 border-amber-100 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all animate-in fade-in slide-in-from-right-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg p-1 flex items-center justify-center">
                                            <img src={item.imageUrl} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                            <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold mt-1 border border-green-200">
                                                <span>💰</span> ${item.price}
                                            </div>
                                        </div>
                                        <div className="text-green-500 text-xl">✓</div>
                                    </div>
                                ))}
                                <div className="mt-4 pt-3 border-t-2 border-dashed border-amber-200 text-center">
                                    <p className="text-xs text-amber-600 font-bold">{inventory.length} item{inventory.length > 1 ? 's' : ''} in backpack</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SHOP COUNTER / DROP ZONE (Center) */}
                    <div
                        ref={drop}
                        className={`relative w-[500px] transition-all duration-300 flex flex-col items-center justify-end ${isOver ? 'scale-105 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]' : ''}`}
                    >
                        {/* SPEECH BUBBLE - Positioned floating to the LEFT of the counter area to avoid overlap */}
                        {(feedback || buddyState.currentMessage) && (
                            <div className="absolute -top-12 -left-32 bg-white px-6 py-4 rounded-3xl rounded-br-none shadow-xl border-2 border-slate-100 z-50 whitespace-nowrap animate-in zoom-in slide-in-from-bottom-2 pointer-events-auto max-w-xs">
                                <p className="text-xl font-bold text-slate-800 whitespace-normal leading-snug">
                                    {feedback || buddyState.currentMessage}
                                </p>
                                {/* Tail pointing right towards buddy */}
                                <div className="absolute -bottom-2 right-8 w-6 h-6 bg-white transform rotate-45 border-r-2 border-b-2 border-slate-100"></div>
                            </div>
                        )}

                        {/* BUDDY SHOPKEEPER - Properly positioned behind counter */}
                        {/* BUDDY WIDGET AS SHOPKEEPER 
                            Positioned absolutely to sit behind the counter.
                            Providing 'shopContext' so he knows he is the Shopkeeper.
                        */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[30%] w-64 h-64 z-10">
                            <BuddyWidget
                                context={shopContext}
                                forceHighlight={true}
                                hideBubble={true}
                                disableVoiceChat={true}
                                className="w-full h-full flex items-end justify-center cursor-pointer"
                                imageClassName="w-full h-full object-contain filter drop-shadow-lg hover:scale-105 transition-transform"
                            />
                        </div>


                        {/* ACTIVE PRODUCT ON COUNTER - positioned on the right side of counter */}
                        {activeProduct && (
                            <div className="absolute z-20 top-44 right-4 w-24 h-24 bg-white rounded-2xl shadow-xl border-4 border-green-200 flex flex-col items-center justify-center animate-pulse">
                                <span className="text-[9px] text-green-600 font-bold mb-1 uppercase tracking-wider">PAYING FOR</span>
                                <img src={activeProduct.imageUrl} className="w-12 h-12 object-contain" />
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-md border-2 border-white">
                                    ${activeProduct.price}
                                </div>
                            </div>
                        )}

                        {/* Static Shop Counter Image */}
                        <img
                            src="/images/checkout_counter.png"
                            alt="Shop Counter"
                            className="w-full h-auto object-contain filter drop-shadow-2xl relative z-20 pointer-events-none"
                        />

                        {/* Drop Indicator Overlay */}
                        {isOver && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                <div className="bg-green-500/30 backdrop-blur-sm px-6 py-3 rounded-xl border-2 border-green-400 border-dashed animate-pulse">
                                    <span className="text-green-700 font-bold text-lg">Drop money here!</span>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* PAYMENT BAR (Bottom) */}
                <div className="h-48 bg-slate-50 border-t border-slate-200 p-4 flex gap-8 items-center overflow-x-auto z-20">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 h-full min-w-[180px] flex flex-col justify-center items-center">
                        <Wallet className="text-slate-400 mb-2" size={32} />
                        <span className="text-slate-500 font-bold text-sm uppercase tracking-wide">My Wallet</span>

                        {paidAmount > 0 && (
                            <div className="mt-3 bg-green-100 text-green-800 px-4 py-1.5 rounded-full font-bold shadow-inner border border-green-200">
                                Paid: ${paidAmount}
                            </div>
                        )}
                    </div>

                    {/* Money Items */}
                    <div className="flex gap-4 items-center px-4">
                        {wallet.map((val, idx) => (
                            <Money key={idx} value={val} type={val > 1 ? 'BILL' : 'COIN'} />
                        ))}
                        {wallet.length === 0 && (
                            <p className="text-slate-400 italic">No money left!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- EXPORTED WRAPPER ---

const ShopModule: React.FC = () => {
    return (
        <DndProvider backend={HTML5Backend}>
            <ShopModuleContent />
        </DndProvider>
    );
};

export default ShopModule;

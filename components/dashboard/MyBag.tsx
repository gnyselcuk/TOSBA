import React, { useState } from 'react';
import { useUserStore } from '../../store/userStore';

const MyBag: React.FC = () => {
    const { puzzleAssets, inventory } = useUserStore();
    const [isOpen, setIsOpen] = useState(false);

    const totalItems = puzzleAssets.length + inventory.length;

    return (
        <>
            {/* Bag Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="relative w-12 h-12 bg-white hover:bg-slate-50 transition-colors rounded-full text-slate-600 font-bold flex items-center justify-center border-2 border-slate-200 shadow-md"
            >
                <span className="text-2xl">🎒</span>
                {totalItems > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {totalItems}
                    </div>
                )}
            </button>

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-6 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-4xl">🎒</span>
                                <h2 className="text-3xl font-bold">My Bag</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                            >
                                <span className="text-2xl">✕</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                            {/* Puzzle Assets Section */}
                            {puzzleAssets.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-purple-600 mb-3 flex items-center">
                                        <span className="mr-2">🧩</span> Puzzles ({puzzleAssets.length})
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {puzzleAssets.map((asset) => (
                                            <div key={asset.id} className="bg-purple-50 rounded-2xl p-2 border-2 border-purple-200">
                                                <img
                                                    src={asset.imageUrl}
                                                    alt={asset.label}
                                                    className="w-full h-24 object-cover rounded-xl mb-1"
                                                />
                                                <p className="text-xs font-bold text-purple-600 text-center truncate">{asset.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Shop Inventory Section */}
                            {inventory.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-emerald-600 mb-3 flex items-center">
                                        <span className="mr-2">🛒</span> Shop Items ({inventory.length})
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {inventory.map((item) => (
                                            <div key={item.id} className="bg-emerald-50 rounded-2xl p-2 border-2 border-emerald-200">
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-24 object-cover rounded-xl mb-1"
                                                />
                                                <p className="text-xs font-bold text-emerald-600 text-center truncate">{item.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {totalItems === 0 && (
                                <div className="text-center py-12">
                                    <span className="text-8xl mb-4 block">🎒</span>
                                    <p className="text-2xl font-bold text-slate-400">Your bag is empty!</p>
                                    <p className="text-slate-400 mt-2">Play games to collect items!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MyBag;

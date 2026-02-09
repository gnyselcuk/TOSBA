import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getLetterImage,
    getLetterImageVariation,
    getAllLetterVariations,
    getFallbackImage,
    checkLetterAssetExists,
    getGameItemImage
} from './letterAssets';

// Mock fetch for checkLetterAssetExists
global.fetch = vi.fn();

describe('LetterAssets Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getLetterImage', () => {
        it('should return a valid image path for letters', () => {
            const path = getLetterImage('A');
            expect(path).toMatch(/^\/assets\/letters\/A_[1-3]\.png$/);
        });

        it('should return a valid image path for numbers', () => {
            const path = getLetterImage('5');
            expect(path).toMatch(/^\/assets\/letters\/5_[1-3]\.png$/);
        });

        it('should handle lowercase input', () => {
            const path = getLetterImage('a');
            expect(path).toMatch(/^\/assets\/letters\/A_[1-3]\.png$/);
        });

        it('should return fallback for invalid characters', () => {
            const path = getLetterImage('$');
            expect(path).toContain('data:image/svg+xml;base64');
        });
    });

    describe('getLetterImageVariation', () => {
        it('should return specific variation', () => {
            const path = getLetterImageVariation('B', 2);
            expect(path).toBe('/assets/letters/B_2.png');
        });

        it('should clamp variation to valid range [1-3]', () => {
            expect(getLetterImageVariation('B', 0)).toBe('/assets/letters/B_1.png');
            expect(getLetterImageVariation('B', 99)).toBe('/assets/letters/B_3.png');
        });
    });

    describe('getAllLetterVariations', () => {
        it('should return all 3 variations', () => {
            const variations = getAllLetterVariations('C');
            expect(variations).toHaveLength(3);
            expect(variations).toContain('/assets/letters/C_1.png');
            expect(variations).toContain('/assets/letters/C_2.png');
            expect(variations).toContain('/assets/letters/C_3.png');
        });
    });

    describe('getFallbackImage', () => {
        it('should generate valid data URI SVG', () => {
            const fallback = getFallbackImage('X');
            expect(fallback).toMatch(/^data:image\/svg\+xml;base64,/);

            // Decode base64 to check content
            const base64 = fallback.split(',')[1];
            const svg = atob(base64);
            expect(svg).toContain('<text');
            expect(svg).toContain('>X</text>');
        });
    });

    describe('checkLetterAssetExists', () => {
        it('should return true if fetch returns ok', async () => {
            (global.fetch as any).mockResolvedValueOnce({ ok: true });
            const exists = await checkLetterAssetExists('A');
            expect(exists).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith('/assets/letters/A_1.png', { method: 'HEAD' });
        });

        it('should return false if fetch fails', async () => {
            (global.fetch as any).mockResolvedValueOnce({ ok: false });
            const exists = await checkLetterAssetExists('A');
            expect(exists).toBe(false);
        });

        it('should return false if fetch throws', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
            const exists = await checkLetterAssetExists('A');
            expect(exists).toBe(false);
        });
    });

    describe('getGameItemImage', () => {
        it('should detect single letter', () => {
            expect(getGameItemImage('A')).toMatch(/\/assets\/letters\/A_[1-3]\.png/);
        });

        it('should detect "Letter X" format', () => {
            expect(getGameItemImage('Letter B')).toMatch(/\/assets\/letters\/B_[1-3]\.png/);
            expect(getGameItemImage('letter c')).toMatch(/\/assets\/letters\/C_[1-3]\.png/);
        });

        it('should detect "Number X" format', () => {
            expect(getGameItemImage('Number 5')).toMatch(/\/assets\/letters\/5_[1-3]\.png/);
        });

        it('should return fallback for unknown text', () => {
            expect(getGameItemImage('Apple')).toContain('data:image/svg+xml;base64');
            // Check that it uses first char 'A'
            const fallback = getGameItemImage('Apple');
            const base64 = fallback.split(',')[1];
            expect(atob(base64)).toContain('>A</text>');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InfiniteColoring from './InfiniteColoring';
import * as geminiService from '../../services/geminiService';
import { useUserStore } from '../../store/userStore';

vi.mock('../../services/geminiService');
vi.mock('../../store/userStore');

describe('InfiniteColoring', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock useUserStore
        vi.mocked(useUserStore).getState = vi.fn(() => ({
            profile: {
                id: 'test-profile',
                name: 'Test Child',
                chronologicalAge: 6,
                developmentalAge: 6,
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            setProfile: vi.fn(),
            clearProfile: vi.fn()
        }));
    });

    describe('Initial Render', () => {
        it('should render input and create button', () => {
            render(<InfiniteColoring />);
            
            expect(screen.getByPlaceholderText(/what do you want to color/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /create magic page/i })).toBeInTheDocument();
        });

        it('should show empty state message', () => {
            render(<InfiniteColoring />);
            
            expect(screen.getByText(/type something above to start/i)).toBeInTheDocument();
        });

        it('should render color palette with 11 colors', () => {
            const { container } = render(<InfiniteColoring />);
            
            // Color buttons are in the palette div
            const paletteDiv = container.querySelector('.flex.flex-col.space-y-2');
            const colorButtons = paletteDiv?.querySelectorAll('button');
            expect(colorButtons?.length).toBe(11);
        });
    });

    describe('Prompt Input', () => {
        it('should update prompt on input change', () => {
            render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i) as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'cat' } });
            
            expect(input.value).toBe('cat');
        });

        it('should not create page with empty prompt', async () => {
            const generateColoringPage = vi.mocked(geminiService.generateColoringPage);
            render(<InfiniteColoring />);
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            expect(generateColoringPage).not.toHaveBeenCalled();
        });
    });

    describe('Page Generation', () => {
        it('should generate coloring page with prompt', async () => {
            const mockBase64 = 'data:image/png;base64,mockimage';
            vi.mocked(geminiService.generateColoringPage).mockResolvedValue(mockBase64);
            vi.mocked(geminiService.speakBuddyText).mockResolvedValue();
            
            render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i);
            fireEvent.change(input, { target: { value: 'cat' } });
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            await waitFor(() => {
                expect(geminiService.generateColoringPage).toHaveBeenCalledWith(
                    expect.stringContaining('cat')
                );
            });
        });

        it('should show loading state during generation', async () => {
            vi.mocked(geminiService.generateColoringPage).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve('data:image/png;base64,test'), 100))
            );
            vi.mocked(geminiService.speakBuddyText).mockResolvedValue();
            
            render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i);
            fireEvent.change(input, { target: { value: 'dog' } });
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            expect(screen.getByText(/making magic/i)).toBeInTheDocument();
            expect(button).toBeDisabled();
            
            await waitFor(() => {
                expect(screen.queryByText(/making magic/i)).not.toBeInTheDocument();
            });
        });

        it('should add age-appropriate complexity hint for young children', async () => {
            vi.mocked(useUserStore).getState = vi.fn(() => ({
                profile: {
                    id: 'test',
                    name: 'Young Child',
                    chronologicalAge: 4,
                    developmentalAge: 4,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                setProfile: vi.fn(),
                clearProfile: vi.fn()
            }));
            
            vi.mocked(geminiService.generateColoringPage).mockResolvedValue('data:image/png;base64,test');
            vi.mocked(geminiService.speakBuddyText).mockResolvedValue();
            
            render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i);
            fireEvent.change(input, { target: { value: 'flower' } });
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            await waitFor(() => {
                expect(geminiService.generateColoringPage).toHaveBeenCalledWith(
                    expect.stringContaining('simple, bold shapes')
                );
            });
        });

        it('should add age-appropriate complexity hint for older children', async () => {
            vi.mocked(useUserStore).getState = vi.fn(() => ({
                profile: {
                    id: 'test',
                    name: 'Older Child',
                    chronologicalAge: 13,
                    developmentalAge: 13,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                setProfile: vi.fn(),
                clearProfile: vi.fn()
            }));
            
            vi.mocked(geminiService.generateColoringPage).mockResolvedValue('data:image/png;base64,test');
            vi.mocked(geminiService.speakBuddyText).mockResolvedValue();
            
            render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i);
            fireEvent.change(input, { target: { value: 'dragon' } });
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            await waitFor(() => {
                expect(geminiService.generateColoringPage).toHaveBeenCalledWith(
                    expect.stringContaining('intricate details')
                );
            });
        });

        it('should speak buddy text after generation', async () => {
            vi.mocked(geminiService.generateColoringPage).mockResolvedValue('data:image/png;base64,test');
            vi.mocked(geminiService.speakBuddyText).mockResolvedValue();
            
            render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i);
            fireEvent.change(input, { target: { value: 'butterfly' } });
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            await waitFor(() => {
                expect(geminiService.speakBuddyText).toHaveBeenCalledWith(
                    expect.stringContaining('butterfly'),
                    'Puck'
                );
            });
        });
    });

    describe('Color Selection', () => {
        it('should select color when palette button clicked', () => {
            const { container } = render(<InfiniteColoring />);
            
            const paletteDiv = container.querySelector('.flex.flex-col.space-y-2');
            const colorButtons = paletteDiv?.querySelectorAll('button');
            
            if (colorButtons && colorButtons.length > 1) {
                const secondButton = colorButtons[1];
                fireEvent.click(secondButton);
                expect(secondButton).toHaveClass('scale-110');
            }
        });

        it('should highlight selected color by default', () => {
            const { container } = render(<InfiniteColoring />);
            
            const paletteDiv = container.querySelector('.flex.flex-col.space-y-2');
            const colorButtons = paletteDiv?.querySelectorAll('button');
            const firstButton = colorButtons?.[0];
            
            // First button (red) should be selected by default
            if (firstButton) {
                expect(firstButton).toHaveClass('scale-110');
            }
        });
    });

    describe('Canvas Interaction', () => {
        it('should hide canvas before image is generated', () => {
            const { container } = render(<InfiniteColoring />);
            
            const canvas = container.querySelector('canvas');
            expect(canvas).toHaveClass('hidden');
        });

        it('should show canvas after image is generated', async () => {
            vi.mocked(geminiService.generateColoringPage).mockResolvedValue('data:image/png;base64,test');
            vi.mocked(geminiService.speakBuddyText).mockResolvedValue();
            
            const { container } = render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i);
            fireEvent.change(input, { target: { value: 'tree' } });
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            await waitFor(() => {
                const canvas = container.querySelector('canvas');
                expect(canvas).not.toHaveClass('hidden');
            });
        });

        it('should speak feedback on canvas click', async () => {
            vi.mocked(geminiService.generateColoringPage).mockResolvedValue('data:image/png;base64,test');
            vi.mocked(geminiService.speakBuddyText).mockResolvedValue();
            
            const { container } = render(<InfiniteColoring />);
            
            const input = screen.getByPlaceholderText(/what do you want to color/i);
            fireEvent.change(input, { target: { value: 'sun' } });
            
            const button = screen.getByRole('button', { name: /create magic page/i });
            fireEvent.click(button);
            
            await waitFor(() => {
                const canvas = container.querySelector('canvas');
                expect(canvas).not.toHaveClass('hidden');
            });
            
            vi.clearAllMocks();
            
            const canvas = container.querySelector('canvas');
            if (canvas) {
                fireEvent.click(canvas, { clientX: 100, clientY: 100 });
                
                expect(geminiService.speakBuddyText).toHaveBeenCalledWith(
                    expect.any(String),
                    'Puck'
                );
            }
        });
    });
});

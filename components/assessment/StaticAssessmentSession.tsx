/**
 * StaticAssessmentSession.tsx
 * 
 * Static Level Assessment Exam - 9 Questions, 3 Branches
 * Branch 1: Perception & Matching(3 - 6 years)
 * Branch 2: Literacy & Logic(7 - 12 years)
 * Branch 3: Functional & Social Living(13 + years)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage } from '../../types';
import BuddyWidget from '../buddy/BuddyWidget';
import { speakBuddyText } from '../../services/geminiService';

// Types
interface AssessmentOption {
    id: string;
    asset: string | null;
    label: string;
    isCorrect: boolean;
    isTextOnly?: boolean;
}

interface SequenceCard {
    id: string;
    asset: string;
    label: string;
    order: number;
}

interface StaticQuestion {
    id: string;
    branch: 1 | 2 | 3;
    type: string;
    title: string;
    buddyQuestion: string;
    referenceAsset?: string | null;
    referenceText?: string;
    targetSound?: string;
    sequenceCards?: SequenceCard[];
    options: AssessmentOption[];
    branchWeight: number;
}

interface AssessmentData {
    assessment_id: string;
    questions: StaticQuestion[];
    scoring: {
        levelMapping: Array<{
            level: number;
            name: string;
            branch: string;
            condition: string;
            curriculum: string;
        }>;
    };
}

// Asset base path
const ASSET_BASE = '/assets/assessment/';

// CSS Styles
const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f3e8ff 100%)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        position: 'relative' as const,
        overflow: 'hidden',
    },
    progressContainer: {
        position: 'absolute' as const,
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 10,
    },
    progressDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        transition: 'all 0.3s ease',
    },
    branchBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '2rem',
        fontSize: '0.9rem',
        fontWeight: '600',
        marginTop: '3rem',
        marginBottom: '1rem',
    },
    questionCard: {
        background: 'white',
        borderRadius: '2rem',
        padding: '2rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        width: '100%',
        marginBottom: '1.5rem',
        textAlign: 'center' as const,
    },
    questionText: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '1rem',
        lineHeight: 1.4,
    },
    referenceImage: {
        width: '150px',
        height: '150px',
        objectFit: 'contain' as const,
        borderRadius: '1rem',
        border: '3px solid #e2e8f0',
        marginBottom: '1rem',
    },
    referenceText: {
        fontSize: '1.2rem',
        color: '#475569',
        background: '#f8fafc',
        padding: '1rem',
        borderRadius: '1rem',
        marginBottom: '1rem',
        fontStyle: 'italic',
    },
    optionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        width: '100%',
        maxWidth: '550px',
        margin: '0 auto',
    },
    optionButton: {
        aspectRatio: '1',
        background: 'white',
        borderRadius: '1.5rem',
        borderWidth: '4px',
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy transition
        position: 'relative' as const,
    },
    optionImage: {
        width: '80%',
        height: '80%',
        objectFit: 'contain' as const,
    },
    optionText: {
        fontSize: '1.5rem',
        fontWeight: '800',
        color: '#334155',
    },
    sequenceContainer: {
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap' as const,
    },
    sequenceCard: {
        width: '100px',
        height: '100px',
        background: '#f8fafc',
        borderRadius: '1rem',
        border: '2px dashed #cbd5e1',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
    },
    sequenceImage: {
        width: '60px',
        height: '60px',
        objectFit: 'contain' as const,
    },
    sequenceLabel: {
        fontSize: '0.7rem',
        color: '#64748b',
        marginTop: '0.25rem',
    },
    loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    },
    loadingSpinner: {
        fontSize: '4rem',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        color: 'white',
        fontSize: '1.25rem',
        fontWeight: '600',
        marginTop: '1rem',
    },
};

// Branch colors and labels
const BRANCH_CONFIG = {
    1: { color: '#22c55e', bg: '#dcfce7', label: 'Perception & Matching', emoji: '🧩' },
    2: { color: '#f59e0b', bg: '#fef3c7', label: 'Literacy', emoji: '📚' },
    3: { color: '#3b82f6', bg: '#dbeafe', label: 'Functional Living', emoji: '🏠' },
};

const StaticAssessmentSession: React.FC = () => {
    const { profile, buddy, setStage, updateProfile } = useUserStore();

    const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, boolean>>({});

    // Feedback State: Tracks which option received what kind of feedback
    const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong', optionId: string } | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [hasSpokeQuestion, setHasSpokeQuestion] = useState(false);

    // Helper to shuffle array
    const shuffleArray = <T,>(array: T[]): T[] => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            // eslint-disable-next-line sonarjs/pseudo-random
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    // Load assessment data based on age
    useEffect(() => {
        const loadAssessmentData = async () => {
            try {
                // Determine which assessment to load based on chronological age
                const age = profile?.chronologicalAge || 5;
                let assessmentFile = 'static-assessment-early.json'; // Default: 3-6 years

                if (age >= 13) {
                    assessmentFile = 'static-assessment-teen.json'; // 13+ years
                } else if (age >= 7) {
                    assessmentFile = 'static-assessment-school.json'; // 7-12 years
                }



                const response = await fetch(`/data/${assessmentFile}`);
                const data: AssessmentData = await response.json();

                // Shuffle options for each question
                const shuffledQuestions = data.questions.map(q => ({
                    ...q,
                    options: shuffleArray(q.options)
                }));

                setAssessmentData({ ...data, questions: shuffledQuestions });
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load assessment data:', error);
                setIsLoading(false);
            }
        };
        loadAssessmentData();
    }, [profile]);

    // Speak question when it changes
    useEffect(() => {
        if (assessmentData && !hasSpokeQuestion) {
            const question = assessmentData.questions[currentIndex];
            if (question) {
                const voiceName = buddy?.voiceName || 'Kore';
                speakBuddyText(question.buddyQuestion, voiceName);
                setHasSpokeQuestion(true);
            }
        }
    }, [currentIndex, assessmentData, hasSpokeQuestion, buddy]);

    // Reset speak flag when question changes
    useEffect(() => {
        setHasSpokeQuestion(false);
    }, [currentIndex]);

    const calculateLevel = useCallback((currentAnswers: Record<string, boolean>) => {
        if (!assessmentData) return { level: 0, name: 'Pre-School', curriculum: 'Sensory', branch: 'Level 0' };

        // Count correct answers per branch
        const branchScores: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

        assessmentData.questions.forEach((q) => {
            if (currentAnswers[q.id]) {
                branchScores[q.branch]++;
            }
        });

        const b1 = branchScores[1]; // Max 3
        const b2 = branchScores[2]; // Max 3
        const b3 = branchScores[3]; // Max 3

        // eslint-disable-next-line no-console
        console.log('Branch Scores:', branchScores);

        // Decision Matrix
        if (b1 >= 2 && b2 >= 2 && b3 >= 2) {
            return { level: 3, name: 'Advanced', curriculum: 'Functional Living, Money Skills, Social Skills', branch: 'Level 3' };
        } else if (b1 >= 2 && b2 >= 2) {
            return { level: 2, name: 'Intermediate', curriculum: 'Phonics, Reading, Sentence Building', branch: 'Level 2' };
        } else if (b1 >= 2) {
            return { level: 1, name: 'Beginner', curriculum: 'Matching, PECS, Colors', branch: 'Level 1' };
        } else {
            return { level: 0, name: 'Pre-School', curriculum: 'Touch & Sound Reaction Only', branch: 'Level 0' };
        }
    }, [assessmentData]);

    const handleAnswer = (optionId: string, isCorrect: boolean) => {
        if (feedback) return; // Prevent double clicks

        const question = assessmentData?.questions[currentIndex];
        if (!question) return;

        // Record answer
        const updatedAnswers = { ...answers, [question.id]: isCorrect };
        setAnswers(updatedAnswers);

        // Set visual feedback
        setFeedback({ type: isCorrect ? 'correct' : 'wrong', optionId });

        // If Correct: Trigger positive reinforcement
        if (isCorrect) {
            // Optional: Speak a short praise if desired
        }

        // Wait 1.5s then move next
        setTimeout(() => {
            setFeedback(null);

            if (currentIndex < (assessmentData?.questions.length || 0) - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // Assessment complete - calculate level and proceed
                const result = calculateLevel(updatedAnswers);
                // eslint-disable-next-line no-console
                console.log('Assessment Result:', result);

                // Update profile with assessed level ONLY. 
                // DO NOT overwrite developmentalAge, as that comes from the parent's initial setup.
                if (profile) {
                    updateProfile({
                        assessedLevel: result.level as 0 | 1 | 2 | 3
                    });
                }

                // Proceed to dashboard (curriculum will be generated in background)
                setStage(AppStage.DASHBOARD);
            }
        }, 1500);
    };

    // Render loading state
    if (isLoading || !assessmentData) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}>🧩</div>
                <p style={styles.loadingText}>Preparing Assessment...</p>
            </div>
        );
    }

    const question = assessmentData.questions[currentIndex];
    const branchConfig = BRANCH_CONFIG[question.branch];

    return (
        <div style={styles.container}>
            {/* Buddy Widget */}
            <BuddyWidget context={question.buddyQuestion} />

            {/* Progress Dots */}
            <div style={styles.progressContainer}>
                {assessmentData.questions.map((q, idx) => {
                    let bgColor = '#e2e8f0';
                    if (idx === currentIndex) {
                        bgColor = BRANCH_CONFIG[q.branch].color;
                    } else if (idx < currentIndex) {
                        bgColor = answers[q.id] ? '#22c55e' : '#94a3b8';
                    }

                    return (
                        <div
                            key={q.id}
                            style={{
                                ...styles.progressDot,
                                background: bgColor,
                                transform: idx === currentIndex ? 'scale(1.3)' : 'scale(1)',
                            }}
                        />
                    );
                })}
            </div>

            {/* Branch Badge */}
            <div style={{
                ...styles.branchBadge,
                background: branchConfig.bg,
                color: branchConfig.color,
            }}>
                <span>{branchConfig.emoji}</span>
                <span>{branchConfig.label}</span>
                <span style={{ opacity: 0.7 }}>• Question {currentIndex + 1}/9</span>
            </div>

            {/* Question Card */}
            <div style={styles.questionCard}>
                <h2 style={styles.questionText}>{question.buddyQuestion}</h2>

                {/* Reference Image (if exists) */}
                {question.referenceAsset && (
                    <img
                        src={`${ASSET_BASE}${question.referenceAsset}`}
                        alt="Reference"
                        style={styles.referenceImage}
                    />
                )}

                {/* Reference Text for Reading Comprehension */}
                {question.referenceText && (
                    <div style={styles.referenceText}>
                        &quot;{question.referenceText}&quot;
                    </div>
                )}

                {/* Sequence Cards (for sequencing questions) */}
                {question.sequenceCards && (
                    <div style={styles.sequenceContainer}>
                        {question.sequenceCards.map((card) => (
                            <div key={card.id} style={styles.sequenceCard}>
                                <img
                                    src={`${ASSET_BASE}${card.asset}`}
                                    alt={card.label}
                                    style={styles.sequenceImage}
                                />
                                <span style={styles.sequenceLabel}>{card.id.split('_')[1]?.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Options Grid */}
            <div style={styles.optionsGrid}>
                {question.options.map((option) => {
                    const isSelected = feedback?.optionId === option.id;
                    const isCorrect = feedback?.type === 'correct';

                    let buttonStyle: React.CSSProperties = { ...styles.optionButton };

                    if (isSelected) {
                        if (isCorrect) {
                            // CORRECT: Green border, Scale Up
                            buttonStyle = {
                                ...buttonStyle,
                                borderColor: '#22c55e',
                                transform: 'scale(1.1)',
                                boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
                                zIndex: 10,
                            };
                        } else {
                            // WRONG: "No-Fail Illusion"
                            // Neutral blue border (light) and slight opacity fade to indicate it's "done"
                            buttonStyle = {
                                ...buttonStyle,
                                borderColor: '#93c5fd', // neutral blue
                                opacity: 0.6,
                                transform: 'scale(0.95)',
                            };
                        }
                    } else if (feedback) {
                        // Other options when one is selected
                        buttonStyle = {
                            ...buttonStyle,
                            opacity: 0.5, // Fade others out significantly
                        };
                    }

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleAnswer(option.id, option.isCorrect)}
                            style={buttonStyle}
                            disabled={!!feedback}
                        >
                            {option.isTextOnly && (
                                <span style={styles.optionText}>{option.label}</span>
                            )}
                            {!option.isTextOnly && option.asset && (
                                <img
                                    src={`${ASSET_BASE}${option.asset}`}
                                    alt={option.label}
                                    style={styles.optionImage}
                                />
                            )}
                            {!option.isTextOnly && !option.asset && (
                                <span style={styles.optionText}>{option.label}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* CSS Keyframes */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default StaticAssessmentSession;

import { useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useInteractionTracking } from './use-interaction-tracking';
import { InsertUserInteraction } from '@shared/schema';

interface QuestionEffectivenessData {
  repairRequestId: number | null;
  productType: string;
  questionId?: string; // Unique identifier for the question (can be the question text)
  question: string;
  isSpecificQuestion: boolean; // Whether this was an AI-suggested diagnostic question
  wasEffective: boolean; // Whether the question was helpful in diagnosing the issue
  leadToSolution: boolean; // Whether the question directly led to identifying a solution
  userFeedbackRating?: number; // Optional 1-5 rating provided by user
  stepsToSolution?: number; // How many more steps were needed after this question
  metadata?: Record<string, any>; // Additional data
}

/**
 * Hook for tracking effectiveness of diagnostic questions
 */
export function useQuestionEffectiveness() {
  const { trackInteraction } = useInteractionTracking();
  
  /**
   * Track when a question was effective in diagnosing a problem
   */
  const trackEffectiveQuestion = useCallback((data: Omit<QuestionEffectivenessData, 'wasEffective' | 'leadToSolution'>) => {
    return trackInteraction({
      repairRequestId: data.repairRequestId,
      productType: data.productType,
      interactionType: 'question_effective' as InsertUserInteraction['interactionType'],
      metadata: {
        question: data.question,
        isSpecificQuestion: data.isSpecificQuestion,
        leadToSolution: true,
        userFeedbackRating: data.userFeedbackRating,
        stepsToSolution: data.stepsToSolution,
        ...data.metadata
      }
    });
  }, [trackInteraction]);
  
  /**
   * Track when a question was ineffective in diagnosing a problem
   */
  const trackIneffectiveQuestion = useCallback((data: Omit<QuestionEffectivenessData, 'wasEffective' | 'leadToSolution'>) => {
    return trackInteraction({
      repairRequestId: data.repairRequestId,
      productType: data.productType,
      interactionType: 'question_ineffective' as InsertUserInteraction['interactionType'],
      metadata: {
        question: data.question,
        isSpecificQuestion: data.isSpecificQuestion,
        leadToSolution: false,
        userFeedbackRating: data.userFeedbackRating,
        ...data.metadata
      }
    });
  }, [trackInteraction]);
  
  /**
   * Track user feedback on question effectiveness
   * @param rating 1-5 rating with 5 being most effective
   */
  const trackQuestionFeedback = useCallback((
    repairRequestId: number | null,
    productType: string,
    question: string,
    isSpecificQuestion: boolean,
    rating: number,
    leadToSolution: boolean
  ) => {
    const interactionType = rating >= 3 ? 'question_effective' : 'question_ineffective';
    
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: interactionType as InsertUserInteraction['interactionType'],
      metadata: {
        question,
        isSpecificQuestion,
        userFeedbackRating: rating,
        leadToSolution
      }
    });
  }, [trackInteraction]);
  
  /**
   * Track when a set of answers leads to a successful repair guide generation
   */
  const trackSuccessfulGuideCreation = useCallback((
    repairRequestId: number | null,
    productType: string,
    questions: { question: string; isSpecificQuestion: boolean }[]
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'questions_led_to_guide' as InsertUserInteraction['interactionType'],
      metadata: {
        questions,
        totalQuestions: questions.length,
        specificQuestions: questions.filter(q => q.isSpecificQuestion).length
      }
    });
  }, [trackInteraction]);
  
  return {
    trackEffectiveQuestion,
    trackIneffectiveQuestion,
    trackQuestionFeedback,
    trackSuccessfulGuideCreation
  };
}
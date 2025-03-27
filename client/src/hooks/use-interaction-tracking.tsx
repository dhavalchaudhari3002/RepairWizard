import { useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { InsertUserInteraction } from '@shared/schema';

/**
 * Hook for tracking user interactions with repair guides and other app features
 */
export function useInteractionTracking() {
  /**
   * Track a user interaction
   */
  const trackInteraction = useCallback(async (data: Omit<InsertUserInteraction, 'userId'>) => {
    try {
      const interactionData = {
        ...data
      };

      await apiRequest(
        'POST',
        '/api/interactions',
        interactionData
      );

      console.log('Tracked interaction:', interactionData.interactionType);
      return true;
    } catch (error) {
      console.error('Failed to track interaction:', error);
      // Don't throw - tracking failures shouldn't disrupt user experience
      return false;
    }
  }, []);

  /**
   * Track viewing a repair guide
   */
  const trackGuideView = useCallback((
    repairRequestId: number,
    productType: string,
    guideTitle: string
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'view_guide',
      guideTitle
    });
  }, [trackInteraction]);

  /**
   * Track viewing a specific step in a guide
   */
  const trackStepView = useCallback((
    repairRequestId: number,
    productType: string,
    guideTitle: string,
    guideStep: number
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'view_step',
      guideTitle,
      guideStep
    });
  }, [trackInteraction]);

  /**
   * Track skipping a step in a guide
   */
  const trackStepSkip = useCallback((
    repairRequestId: number,
    productType: string,
    guideTitle: string,
    guideStep: number
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'skip_step',
      guideTitle,
      guideStep
    });
  }, [trackInteraction]);

  /**
   * Track asking a question in the repair assistant
   */
  const trackQuestionAsked = useCallback((
    repairRequestId: number | null,
    productType: string,
    metadata?: { question: string }
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'ask_question',
      metadata
    });
  }, [trackInteraction]);

  /**
   * Track completing a guide
   */
  const trackGuideCompletion = useCallback((
    repairRequestId: number,
    productType: string,
    guideTitle: string,
    durationSeconds: number
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'complete_guide',
      guideTitle,
      durationSeconds
    });
  }, [trackInteraction]);

  /**
   * Track abandoning a guide before completion
   */
  const trackGuideAbandonment = useCallback((
    repairRequestId: number,
    productType: string,
    guideTitle: string,
    guideStep: number,
    durationSeconds: number
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'abandon_guide',
      guideTitle,
      guideStep,
      durationSeconds
    });
  }, [trackInteraction]);

  /**
   * Track clicking on a product recommendation
   */
  const trackProductClick = useCallback((
    repairRequestId: number | null,
    productType: string,
    metadata: { productId: number; productName: string }
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'click_product',
      metadata
    });
  }, [trackInteraction]);

  /**
   * Track searching for a video
   */
  const trackVideoSearch = useCallback((
    repairRequestId: number | null,
    productType: string,
    metadata: { searchTerms: string[] }
  ) => {
    return trackInteraction({
      repairRequestId,
      productType,
      interactionType: 'search_video',
      metadata
    });
  }, [trackInteraction]);

  return {
    trackInteraction,
    trackGuideView,
    trackStepView,
    trackStepSkip,
    trackQuestionAsked,
    trackGuideCompletion,
    trackGuideAbandonment,
    trackProductClick,
    trackVideoSearch
  };
}
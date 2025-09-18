/**
 * Feedback Modal Component
 * Provides detailed feedback collection with positive and negative feedback options
 */

import { useState } from 'react';
import { FeedbackModalProps } from '../../types';

export default function FeedbackModal({
  messageId,
  messageText,
  onClose,
  onSubmit,
  mode = 'detailed'
}: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<'helpful' | 'unhelpful' | 'inappropriate' | 'suggestion' | 'error' | ''>('');
  const [userComment, setUserComment] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [emotionalTone, setEmotionalTone] = useState<'too-formal' | 'just-right' | 'too-casual' | ''>('');
  const [responseLength, setResponseLength] = useState<'too-short' | 'just-right' | 'too-long' | ''>('');
  const [culturalSensitivity, setCulturalSensitivity] = useState<'appropriate' | 'inappropriate' | 'unsure' | ''>('');
  const [positiveAspects, setPositiveAspects] = useState<string[]>([]);
  const [negativeAspects, setNegativeAspects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const positiveAspectOptions = [
    'empathetic-tone',
    'helpful-suggestion',
    'new-perspective',
    'cultural-sensitivity',
    'perfect-length',
    'clear-explanation',
    'appropriate-tone',
    'practical-advice'
  ];

  const negativeAspectOptions = [
    'inappropriate-tone',
    'unhelpful-advice',
    'confusing-explanation',
    'cultural-insensitivity',
    'wrong-length',
    'irrelevant-response',
    'factual-errors',
    'unprofessional-language'
  ];

  const positiveAspectLabels: Record<string, string> = {
    'empathetic-tone': 'Empathetic and caring tone',
    'helpful-suggestion': 'Helpful and actionable suggestion',
    'new-perspective': 'Provided a new perspective',
    'cultural-sensitivity': 'Culturally appropriate and sensitive',
    'perfect-length': 'Perfect response length',
    'clear-explanation': 'Clear and easy to understand',
    'appropriate-tone': 'Appropriate tone for the situation',
    'practical-advice': 'Practical and realistic advice'
  };

  const negativeAspectLabels: Record<string, string> = {
    'inappropriate-tone': 'Inappropriate or insensitive tone',
    'unhelpful-advice': 'Unhelpful or impractical advice',
    'confusing-explanation': 'Confusing or unclear explanation',
    'cultural-insensitivity': 'Culturally inappropriate or insensitive',
    'wrong-length': 'Too long or too short response',
    'irrelevant-response': 'Irrelevant or off-topic response',
    'factual-errors': 'Contains factual errors or misinformation',
    'unprofessional-language': 'Unprofessional or inappropriate language'
  };

  const handlePositiveAspectToggle = (aspect: string) => {
    setPositiveAspects(prev =>
      prev.includes(aspect)
        ? prev.filter(a => a !== aspect)
        : [...prev, aspect]
    );
  };

  const handleNegativeAspectToggle = (aspect: string) => {
    setNegativeAspects(prev =>
      prev.includes(aspect)
        ? prev.filter(a => a !== aspect)
        : [...prev, aspect]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackType && mode !== 'positive' && mode !== 'negative') {
      return; // Require feedback type for detailed mode only
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        messageId,
        sessionId: '', // Will be filled by parent component
        feedbackType: mode === 'positive' ? 'helpful' : mode === 'negative' ? 'unhelpful' : (feedbackType as 'helpful' | 'unhelpful' | 'inappropriate' | 'suggestion' | 'error'),
        selectedText: selectedText || undefined,
        userComment: userComment || undefined,
        emotionalTone: emotionalTone || undefined,
        responseLength: responseLength || undefined,
        culturalSensitivity: culturalSensitivity || undefined,
        positiveAspects: positiveAspects.length > 0 ? positiveAspects : undefined,
        negativeAspects: negativeAspects.length > 0 ? negativeAspects : undefined,
        timestamp: new Date()
      });

      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Handle error (could show error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 font-sarabun">
              {mode === 'positive' ? 'What made this response good?' :
                mode === 'negative' ? 'What made this response bad?' : 'Provide Feedback'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close feedback modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Positive Aspects (for positive feedback mode) */}
            {mode === 'positive' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                  What aspects made this response helpful? (Select all that apply)
                </label>
                <div className="space-y-2">
                  {positiveAspectOptions.map(aspect => (
                    <div key={aspect} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`positive-${aspect}`}
                        checked={positiveAspects.includes(aspect)}
                        onChange={() => handlePositiveAspectToggle(aspect)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-200 focus:ring-2"
                      />
                      <label htmlFor={`positive-${aspect}`} className="ml-2 text-sm text-gray-700 font-sarabun cursor-pointer">
                        {positiveAspectLabels[aspect]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Negative Aspects (for negative feedback mode) */}
            {mode === 'negative' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                  What made this response problematic? (Select all that apply)
                </label>
                <div className="space-y-2">
                  {negativeAspectOptions.map(aspect => (
                    <div key={aspect} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`negative-${aspect}`}
                        checked={negativeAspects.includes(aspect)}
                        onChange={() => handleNegativeAspectToggle(aspect)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-200 focus:ring-2"
                      />
                      <label htmlFor={`negative-${aspect}`} className="ml-2 text-sm text-gray-700 font-sarabun cursor-pointer">
                        {negativeAspectLabels[aspect]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Type (for detailed feedback) */}
            {mode === 'detailed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                  Feedback Type *
                </label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  required
                >
                  <option value="">Select feedback type</option>
                  <option value="helpful">This was helpful</option>
                  <option value="unhelpful">This was not helpful</option>
                  <option value="inappropriate">Inappropriate response</option>
                  <option value="suggestion">I have a suggestion</option>
                  <option value="error">There was an error</option>
                </select>
              </div>
            )}

            {/* Response Quality Ratings */}
            {(mode === 'detailed' || mode === 'positive') && (
              <>
                {/* Emotional Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                    How was the emotional tone?
                  </label>
                  <select
                    value={emotionalTone}
                    onChange={(e) => setEmotionalTone(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  >
                    <option value="">Select tone</option>
                    <option value="too-formal">Too formal</option>
                    <option value="just-right">Just right</option>
                    <option value="too-casual">Too casual</option>
                  </select>
                </div>

                {/* Response Length */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                    How was the response length?
                  </label>
                  <select
                    value={responseLength}
                    onChange={(e) => setResponseLength(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  >
                    <option value="">Select length</option>
                    <option value="too-short">Too short</option>
                    <option value="just-right">Just right</option>
                    <option value="too-long">Too long</option>
                  </select>
                </div>

                {/* Cultural Sensitivity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                    How was the cultural sensitivity?
                  </label>
                  <select
                    value={culturalSensitivity}
                    onChange={(e) => setCulturalSensitivity(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  >
                    <option value="">Select sensitivity</option>
                    <option value="appropriate">Appropriate and sensitive</option>
                    <option value="inappropriate">Inappropriate or insensitive</option>
                    <option value="unsure">Not sure</option>
                  </select>
                </div>
              </>
            )}

            {/* Selected Text (for specific feedback) */}
            {mode === 'detailed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                  Specific text (optional)
                </label>
                <input
                  type="text"
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  placeholder="Highlight specific part of the response"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                {mode === 'positive' ? 'Additional comments (optional)' :
                  mode === 'negative' ? 'What specifically was wrong?' : 'Your feedback'}
              </label>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder={
                  mode === 'positive'
                    ? "Any additional thoughts on what made this response great?"
                    : mode === 'negative'
                      ? "What specifically made this response unhelpful or problematic?"
                      : "Please share your thoughts on how Pranara can improve..."
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-sarabun"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (mode === 'detailed' && !feedbackType) || (mode === 'positive' && positiveAspects.length === 0) || (mode === 'negative' && negativeAspects.length === 0)}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-sarabun"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
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
    'empathetic-tone': 'น้ำเสียงที่เข้าใจและเห็นอกเห็นใจ',
    'helpful-suggestion': 'คำแนะนำที่มีประโยชน์และนำไปปฏิบัติได้',
    'new-perspective': 'ให้มุมมองใหม่ที่น่าสนใจ',
    'cultural-sensitivity': 'เหมาะสมกับวัฒนธรรมและละเอียดอ่อน',
    'perfect-length': 'ความยาวของคำตอบที่เหมาะสม',
    'clear-explanation': 'อธิบายชัดเจนและเข้าใจง่าย',
    'appropriate-tone': 'น้ำเสียงที่เหมาะสมกับสถานการณ์',
    'practical-advice': 'คำแนะนำที่ปฏิบัติได้จริงและสมจริง'
  };

  const negativeAspectLabels: Record<string, string> = {
    'inappropriate-tone': 'น้ำเสียงไม่เหมาะสมหรือไม่เหมาะสม',
    'unhelpful-advice': 'คำแนะนำที่ไม่มีประโยชน์หรือไม่สามารถปฏิบัติได้',
    'confusing-explanation': 'คำอธิบายที่สับสนหรือไม่ชัดเจน',
    'cultural-insensitivity': 'ไม่เหมาะสมกับวัฒนธรรมหรือไม่ละเอียดอ่อน',
    'wrong-length': 'คำตอบยาวเกินไปหรือสั้นเกินไป',
    'irrelevant-response': 'คำตอบที่ไม่เกี่ยวข้องหรือนอกเรื่อง',
    'factual-errors': 'มีข้อมูลที่ผิดพลาดหรือข้อมูลเท็จ',
    'unprofessional-language': 'ภาษาที่ไม่เป็นมืออาชีพหรือไม่เหมาะสม'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 font-sarabun">
              {mode === 'positive' ? 'อะไรทำให้คำตอบนี้ดี?' :
                mode === 'negative' ? 'อะไรทำให้คำตอบนี้ไม่ดี?' : 'ให้ความคิดเห็น'}
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
                  อะไรทำให้คำตอบนี้มีประโยชน์? (เลือกได้หลายข้อ)
                </label>
                <div className="space-y-2">
                  {positiveAspectOptions.map(aspect => (
                    <div key={aspect} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`positive-${aspect}`}
                        checked={positiveAspects.includes(aspect)}
                        onChange={() => handlePositiveAspectToggle(aspect)}
                        className="h-4 w-4 rounded border-gray-300 focus:outline-none"
                      />
                      <label htmlFor={`positive-${aspect}`} className="text-sm text-gray-700 font-sarabun cursor-pointer select-none">
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
                  อะไรทำให้คำตอบนี้มีปัญหา? (เลือกได้หลายข้อ)
                </label>
                <div className="space-y-2">
                  {negativeAspectOptions.map(aspect => (
                    <div key={aspect} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`negative-${aspect}`}
                        checked={negativeAspects.includes(aspect)}
                        onChange={() => handleNegativeAspectToggle(aspect)}
                        className="h-4 w-4 rounded border-gray-300 focus:outline-none"
                      />
                      <label htmlFor={`negative-${aspect}`} className="text-sm text-gray-700 font-sarabun cursor-pointer select-none">
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
                  ประเภทความคิดเห็น *
                </label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-0"
                  required
                >
                  <option value="">เลือกประเภทความคิดเห็น</option>
                  <option value="helpful">มีประโยชน์</option>
                  <option value="unhelpful">ไม่มีประโยชน์</option>
                  <option value="inappropriate">คำตอบไม่เหมาะสม</option>
                  <option value="suggestion">มีข้อเสนอแนะ</option>
                  <option value="error">มีข้อผิดพลาด</option>
                </select>
              </div>
            )}

            {/* Response Quality Ratings */}
            {(mode === 'detailed' || mode === 'positive') && (
              <>
                {/* Emotional Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                    น้ำเสียงในการตอบเป็นอย่างไร?
                  </label>
                  <select
                    value={emotionalTone}
                    onChange={(e) => setEmotionalTone(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-0"
                  >
                    <option value="">เลือกน้ำเสียง</option>
                    <option value="too-formal">เป็นทางการเกินไป</option>
                    <option value="just-right">เหมาะสมดี</option>
                    <option value="too-casual">เป็นกันเองเกินไป</option>
                  </select>
                </div>

                {/* Response Length */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                    ความยาวของคำตอบเป็นอย่างไร?
                  </label>
                  <select
                    value={responseLength}
                    onChange={(e) => setResponseLength(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-0"
                  >
                    <option value="">เลือกความยาว</option>
                    <option value="too-short">สั้นเกินไป</option>
                    <option value="just-right">เหมาะสมดี</option>
                    <option value="too-long">ยาวเกินไป</option>
                  </select>
                </div>

                {/* Cultural Sensitivity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                    ความเหมาะสมทางวัฒนธรรมเป็นอย่างไร?
                  </label>
                  <select
                    value={culturalSensitivity}
                    onChange={(e) => setCulturalSensitivity(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-0"
                  >
                    <option value="">เลือกความเหมาะสม</option>
                    <option value="appropriate">เหมาะสมและละเอียดอ่อน</option>
                    <option value="inappropriate">ไม่เหมาะสมหรือไม่ละเอียดอ่อน</option>
                    <option value="unsure">ไม่แน่ใจ</option>
                  </select>
                </div>
              </>
            )}

            {/* Selected Text (for specific feedback) */}
            {mode === 'detailed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                  ข้อความเฉพาะ (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  placeholder="เลือกส่วนเฉพาะของคำตอบ"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-0"
                />
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-sarabun">
                {mode === 'positive' ? 'ความคิดเห็นเพิ่มเติม (ไม่บังคับ)' :
                  mode === 'negative' ? 'มีอะไรผิดพลาดเป็นพิเศษ?' : 'ความคิดเห็นของคุณ'}
              </label>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder={
                  mode === 'positive'
                    ? "มีความคิดเห็นเพิ่มเติมเกี่ยวกับสิ่งที่ทำให้คำตอบนี้ดีไหม?"
                    : mode === 'negative'
                      ? "อะไรทำให้คำตอบนี้ไม่มีประโยชน์หรือมีปัญหาเป็นพิเศษ?"
                      : "กรุณาแบ่งปันความคิดเห็นว่าปราณารา สามารถปรับปรุงอย่างไร..."
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-sarabun focus:outline-none focus:border-gray-500 focus:ring-0 resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-sarabun"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (mode === 'detailed' && !feedbackType) || (mode === 'positive' && positiveAspects.length === 0) || (mode === 'negative' && negativeAspects.length === 0)}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-sarabun"
              >
                {isSubmitting ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
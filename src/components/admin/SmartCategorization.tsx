/**
 * Smart Categorization Component
 * AI-powered feedback analysis and categorization interface
 */

'use client';

import React, { useState, useEffect } from 'react';

interface FeedbackItem {
  id: number;
  messageId: string;
  feedbackType: string;
  userComment: string;
  selectedText: string;
  emotionalTone: string;
  responseLength: string;
  culturalSensitivity: string;
  positiveAspects: string[];
  createdAt: string;
  aiCategory?: string;
  confidenceScore?: number;
  sentimentScore?: number;
  suggestedAction?: string;
  successPatterns?: string[];
  aiProcessedAt?: string;
}

interface SmartCategorizationProps {
  onClose?: () => void;
}

export default function SmartCategorization({ onClose }: SmartCategorizationProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [filter, setFilter] = useState<'all' | 'analyzed' | 'unanalyzed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feedback');
      if (response.ok) {
        const result = await response.json();
        setFeedback(result.data || []);
      } else {
        setError('Failed to fetch feedback');
      }
    } catch (err) {
      setError('Error loading feedback');
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async (feedbackIds: number[]) => {
    try {
      setAnalyzing(true);
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackIds,
          action: 'batch-analyze'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Analysis completed:', result.data);
        // Refresh feedback data
        await fetchFeedback();
        setSelectedItems([]);
      } else {
        setError('Analysis failed');
      }
    } catch (err) {
      setError('Error running analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectAll = () => {
    const unanalyzedItems = filteredFeedback.filter(item => !item.aiProcessedAt).map(item => item.id);
    setSelectedItems(unanalyzedItems);
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFeedback = feedback.filter(item => {
    if (filter === 'analyzed' && !item.aiProcessedAt) return false;
    if (filter === 'unanalyzed' && item.aiProcessedAt) return false;
    if (categoryFilter !== 'all' && item.aiCategory !== categoryFilter) return false;
    return true;
  });

  const categories = [...new Set(feedback.filter(f => f.aiCategory).map(f => f.aiCategory))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading feedback data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Categorization</h1>
              <p className="text-gray-600">AI-powered feedback analysis and insights</p>
            </div>
            <div className="flex items-center space-x-4">
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              {/* Filter Controls */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Feedback</option>
                <option value="analyzed">AI Analyzed</option>
                <option value="unanalyzed">Not Analyzed</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category?.charAt(0).toUpperCase() + category?.slice(1)}
                  </option>
                ))}
              </select>

              <div className="text-sm text-gray-600">
                {filteredFeedback.length} items
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All Unanalyzed
              </button>

              <button
                onClick={() => runAIAnalysis(selectedItems)}
                disabled={selectedItems.length === 0 || analyzing}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {analyzing ? 'Analyzing...' : `Analyze Selected (${selectedItems.length})`}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedback.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      disabled={!!item.aiProcessedAt}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.feedbackType === 'helpful' ? 'bg-green-100 text-green-800' :
                          item.feedbackType === 'unhelpful' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.feedbackType}
                        </span>
                        {item.aiCategory && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.aiCategory}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {item.messageId.substring(0, 8)}... • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {item.aiProcessedAt ? (
                      <div className="space-y-1">
                        {item.confidenceScore && (
                          <div className="text-xs text-gray-600">
                            Confidence: {(item.confidenceScore * 100).toFixed(1)}%
                          </div>
                        )}
                        {item.sentimentScore && (
                          <div className="text-xs text-gray-600">
                            Sentiment: {(item.sentimentScore * 100).toFixed(1)}%
                          </div>
                        )}
                        <div className="text-xs text-green-600">✓ Analyzed</div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Not analyzed</div>
                    )}
                  </div>
                </div>

                {/* User Comment */}
                {item.userComment && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-900 mb-1">User Comment:</div>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      "{item.userComment}"
                    </div>
                  </div>
                )}

                {/* Selected Text */}
                {item.selectedText && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-900 mb-1">Selected Text:</div>
                    <div className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-200">
                      "{item.selectedText}"
                    </div>
                  </div>
                )}

                {/* Ratings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  {item.emotionalTone && (
                    <div>
                      <div className="text-xs text-gray-600">Emotional Tone</div>
                      <div className="text-sm font-medium text-gray-900">{item.emotionalTone}</div>
                    </div>
                  )}
                  {item.responseLength && (
                    <div>
                      <div className="text-xs text-gray-600">Response Length</div>
                      <div className="text-sm font-medium text-gray-900">{item.responseLength}</div>
                    </div>
                  )}
                  {item.culturalSensitivity && (
                    <div>
                      <div className="text-xs text-gray-600">Cultural Sensitivity</div>
                      <div className="text-sm font-medium text-gray-900">{item.culturalSensitivity}</div>
                    </div>
                  )}
                </div>

                {/* Positive Aspects */}
                {item.positiveAspects && item.positiveAspects.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-900 mb-2">Positive Aspects:</div>
                    <div className="flex flex-wrap gap-2">
                      {item.positiveAspects.map((aspect, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-50 text-green-700">
                          {aspect.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis Results */}
                {item.aiProcessedAt && (
                  <div className="border-t pt-3 mt-3">
                    <div className="text-sm font-medium text-gray-900 mb-2">AI Analysis Results:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.suggestedAction && (
                        <div>
                          <div className="text-xs text-gray-600">Suggested Action</div>
                          <div className="text-sm text-gray-900">{item.suggestedAction}</div>
                        </div>
                      )}
                      {item.successPatterns && item.successPatterns.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Success Patterns</div>
                          <div className="flex flex-wrap gap-1">
                            {item.successPatterns.map((pattern, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                                {pattern}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredFeedback.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">No feedback items found</div>
              <div className="text-sm text-gray-400">Try adjusting your filters</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * Admin Feedback Management Page
 * Dedicated page for managing and reviewing user feedback
 */

'use client';

import React, { useState, useEffect } from 'react';

interface FeedbackItem {
  id: number;
  messageId: string;
  sessionId: string;
  feedbackType: string;
  selectedText?: string;
  userComment?: string;
  emotionalTone?: string;
  responseLength?: string;
  culturalSensitivity?: string;
  positiveAspects?: string[];
  negativeAspects?: string[];
  promptVersion?: string;
  createdAt: string;
  isReviewed: boolean;
  adminNotes?: string;
}

export default function FeedbackAdminPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'helpful' | 'unhelpful' | 'unreviewed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

  const itemsPerPage = 20;

  const fetchFeedback = async (page: number = 1) => {
    if (!password) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: 'list',
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString()
      });

      if (filter !== 'all') {
        if (filter === 'unreviewed') {
          // We'll filter this client-side for now
        } else {
          params.append('feedbackType', filter);
        }
      }

      const response = await fetch(`/api/feedback?${params}`, {
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError('Invalid admin password');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        let filteredFeedback = result.data.feedback;
        
        // Client-side filtering for unreviewed
        if (filter === 'unreviewed') {
          filteredFeedback = filteredFeedback.filter((f: FeedbackItem) => !f.isReviewed);
        }
        
        setFeedback(filteredFeedback);
        setTotalCount(result.data.total);
        setIsAuthenticated(true);
      } else {
        throw new Error(result.error?.error || 'Failed to fetch feedback');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      fetchFeedback(1);
    }
  };

  const updateFeedback = async (feedbackId: number, updates: { isReviewed?: boolean; adminNotes?: string }) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: feedbackId,
          ...updates
        })
      });

      if (response.ok) {
        // Refresh the feedback list
        fetchFeedback(currentPage);
        setSelectedFeedback(null);
      } else {
        throw new Error('Failed to update feedback');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feedback');
    }
  };

  const deleteFeedback = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/feedback?id=${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh the feedback list
        fetchFeedback(currentPage);
      } else {
        throw new Error('Failed to delete feedback');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feedback');
    }
  };

  const exportFeedback = async () => {
    try {
      const response = await fetch('/api/feedback?type=export', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Create and download CSV
          const blob = new Blob([result.data.csv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.data.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      setError('Export failed');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeedback(currentPage);
    }
  }, [filter, currentPage]);

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Feedback Management</h1>
            <p className="text-gray-600 mt-2">Enter admin password to manage feedback</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Access Feedback'}
            </button>
          </form>
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
              <h1 className="text-2xl font-bold text-gray-900">Feedback Management</h1>
              <p className="text-gray-600">Review and manage user feedback</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.open('/admin/smart-categorization', '_blank')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
              >
                🤖 Smart Analysis
              </button>
              <button
                onClick={exportFeedback}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => window.close()}
                className="text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex space-x-4">
          {(['all', 'helpful', 'unhelpful', 'unreviewed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => {
                setFilter(filterOption);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {filterOption === 'all' ? 'All Feedback' : 
               filterOption === 'unreviewed' ? 'Unreviewed' :
               filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading feedback...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchFeedback(currentPage)}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.feedbackType === 'helpful' ? 'bg-green-100 text-green-800' :
                      item.feedbackType === 'unhelpful' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.feedbackType}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">
                      ID: {item.messageId.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${
                      item.isReviewed ? 'bg-green-500' : 'bg-yellow-500'
                    }`} title={item.isReviewed ? 'Reviewed' : 'Pending Review'}></span>
                    <button
                      onClick={() => setSelectedFeedback(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {item.isReviewed ? 'View' : 'Review'}
                    </button>
                    <button
                      onClick={() => deleteFeedback(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Delete feedback"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {item.userComment && (
                  <div className="mb-3">
                    <p className="text-gray-700">"{item.userComment}"</p>
                  </div>
                )}

                {item.positiveAspects && item.positiveAspects.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {item.positiveAspects.map((aspect, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                          {aspect.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.negativeAspects && item.negativeAspects.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {item.negativeAspects.map((aspect, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-red-50 text-red-700">
                          {aspect.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  {item.emotionalTone && (
                    <div>
                      <span className="font-medium">Tone:</span> {item.emotionalTone.replace('-', ' ')}
                    </div>
                  )}
                  {item.responseLength && (
                    <div>
                      <span className="font-medium">Length:</span> {item.responseLength.replace('-', ' ')}
                    </div>
                  )}
                  {item.culturalSensitivity && (
                    <div>
                      <span className="font-medium">Cultural:</span> {item.culturalSensitivity}
                    </div>
                  )}
                </div>

                {item.adminNotes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Admin Notes:</span> {item.adminNotes}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="flex justify-center space-x-2 mt-6">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / itemsPerPage), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Review Feedback</h3>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    defaultValue={selectedFeedback.adminNotes || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add notes about this feedback..."
                    id="adminNotes"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const notes = (document.getElementById('adminNotes') as HTMLTextAreaElement).value;
                      updateFeedback(selectedFeedback.id, {
                        isReviewed: true,
                        adminNotes: notes
                      });
                    }}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                  >
                    Mark as Reviewed
                  </button>
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
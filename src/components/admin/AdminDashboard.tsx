/**
 * Admin Dashboard Component
 * Displays comprehensive analytics and usage statistics
 */

'use client';

import React, { useState } from 'react';
import { AdminStatsResponse } from '../../types';

interface AdminDashboardProps {
  onClose?: () => void;
}

interface ExtendedStatsResponse extends AdminStatsResponse {
  conversationFlows: Array<{
    sessionId: string;
    totalSteps: number;
    duration: number;
    endedWithLineHandoff: boolean;
  }>;
  commonPatterns: Array<{
    pattern: string[];
    frequency: number;
    averageDuration: number;
    lineHandoffRate: number;
  }>;
  hourlyDistribution: Record<string, number>;
  dailyTrends: Array<{
    date: string;
    questions: number;
    uniqueSessions: number;
    lineClicks: number;
  }>;
  sessionAnalytics: {
    averageQuestionsPerSession: number;
    sessionLengthDistribution: Record<string, number>;
    abandonmentRate: number;
    conversionRate: number;
  };
  feedbackAnalytics: {
    totalFeedback: number;
    satisfactionRate: number;
    feedbackByType: Record<string, number>;
    feedbackByPromptVersion: Record<string, number>;
    averageRating: number;
    commonIssues: Array<{
      category: string;
      count: number;
      examples: string[];
    }>;
    trendData: Array<{
      date: string;
      positive: number;
      negative: number;
    }>;
  };
  recentFeedback: Array<{
    id: number;
    messageId: string;
    feedbackType: string;
    userComment: string;
    positiveAspects: string[];
    createdAt: string;
    isReviewed: boolean;
  }>;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [data, setData] = useState<ExtendedStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('7d');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [promptAnalysis, setPromptAnalysis] = useState<any>(null);
  const [goldStandard, setGoldStandard] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async (adminPassword: string, selectedPeriod: string = period) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/stats?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${adminPassword}`,
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
      setData(result);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      setAiLoading(true);
      const response = await fetch('/api/ai-analysis?type=insights');
      if (response.ok) {
        const result = await response.json();
        setAiInsights(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchPromptAnalysis = async () => {
    try {
      const response = await fetch('/api/ai-analysis?type=prompt-analysis');
      if (response.ok) {
        const result = await response.json();
        setPromptAnalysis(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch prompt analysis:', err);
    }
  };

  const fetchGoldStandard = async () => {
    try {
      const response = await fetch('/api/ai-analysis?type=gold-standard');
      if (response.ok) {
        const result = await response.json();
        setGoldStandard(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch gold standard:', err);
    }
  };

  const triggerBatchAnalysis = async () => {
    if (!data?.recentFeedback) return;
    
    try {
      setAiLoading(true);
      const feedbackIds = data.recentFeedback.map(f => f.id);
      
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
        console.log('Batch analysis completed:', result.data);
        // Refresh AI insights after analysis
        await fetchAIInsights();
      }
    } catch (err) {
      console.error('Batch analysis failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      fetchData(password);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (isAuthenticated && password) {
      fetchData(password, newPeriod);
    }
  };

  const handleExportCSV = async () => {
    if (!password) return;

    try {
      const response = await fetch(`/api/admin/stats?period=${period}&format=csv`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jirung-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        setError('Failed to export CSV');
      }
    } catch (err) {
      setError('Export failed');
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Jirung Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Enter admin password to access analytics</p>
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
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-4 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchData(password)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Jirung Admin Dashboard</h1>
              <p className="text-gray-600">Analytics for {period} period</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Period Selector */}
              <select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>

              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
              >
                Export CSV
              </button>

              {/* Close Button */}
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'ai-insights', name: 'AI Insights', icon: '🤖' },
                { id: 'prompt-analysis', name: 'Prompt Analysis', icon: '🔍' },
                { id: 'gold-standard', name: 'Gold Standard', icon: '⭐' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'ai-insights' && !aiInsights) fetchAIInsights();
                    if (tab.id === 'prompt-analysis' && !promptAnalysis) fetchPromptAnalysis();
                    if (tab.id === 'gold-standard' && !goldStandard) fetchGoldStandard();
                  }}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <MetricCard
                title="Total Questions"
                value={data.stats.totalQuestions.toLocaleString()}
                icon="💬"
                color="blue"
              />
              <MetricCard
                title="Unique Sessions"
                value={data.stats.uniqueSessions.toLocaleString()}
                icon="👥"
                color="green"
              />
              <MetricCard
                title="Total Feedback"
                value={data.feedbackAnalytics?.totalFeedback?.toLocaleString() || '0'}
                icon="📝"
                color="indigo"
              />
              <MetricCard
                title="Satisfaction Rate"
                value={`${data.feedbackAnalytics?.satisfactionRate?.toFixed(1) || '0'}%`}
                icon="😊"
                color="emerald"
              />
              <MetricCard
                title="LINE Click Rate"
                value={`${data.stats.lineClickRate.toFixed(1)}%`}
                icon="📞"
                color="purple"
              />
            </div>
          </div>

          {/* Top Topics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Topics</h3>
            <div className="space-y-3">
              {data.stats.topTopics.slice(0, 8).map((topic, index) => (
                <div key={topic.topic} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 w-4">
                      {index + 1}.
                    </span>
                    <span className="ml-2 text-sm text-gray-900 capitalize">
                      {topic.topic.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {topic.count}
                    </div>
                    <div className="text-xs text-gray-500">
                      {topic.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Language Distribution</h3>
            <div className="space-y-3">
              {Object.entries(data.stats.languageDistribution).map(([lang, count]) => (
                <div key={lang} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">
                    {lang === 'th' ? '🇹🇭 Thai' : '🇺🇸 English'}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">
                      {((count / data.stats.totalQuestions) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Analytics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Analytics</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Avg Questions/Session</div>
                <div className="text-2xl font-bold text-blue-600">
                  {data.sessionAnalytics.averageQuestionsPerSession}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Conversion Rate</div>
                <div className="text-2xl font-bold text-green-600">
                  {data.sessionAnalytics.conversionRate.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Abandonment Rate</div>
                <div className="text-2xl font-bold text-red-600">
                  {data.sessionAnalytics.abandonmentRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Top Questions */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Common Questions</h3>
            <div className="space-y-3">
              {data.topQuestions.map((question, index) => (
                <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="text-sm text-gray-900 mb-1">
                    &quot;{question.snippet}&quot;
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Topic: {question.topic}</span>
                    <span>{question.count} times</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback by Type */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback by Type</h3>
            <div className="space-y-3">
              {data.feedbackAnalytics && Object.entries(data.feedbackAnalytics.feedbackByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${
                      type === 'helpful' ? 'bg-green-500' : 
                      type === 'unhelpful' ? 'bg-red-500' : 
                      type === 'inappropriate' ? 'bg-orange-500' : 'bg-gray-500'
                    }`}></span>
                    <span className="text-sm text-gray-900 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">
                      {data.feedbackAnalytics.totalFeedback > 0 ? 
                        ((count / data.feedbackAnalytics.totalFeedback) * 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Feedback */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
              <button
                onClick={() => window.open('/admin/feedback', '_blank')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View All →
              </button>
            </div>
            <div className="space-y-4">
              {data.recentFeedback?.slice(0, 5).map((feedback) => (
                <div key={feedback.id} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      feedback.feedbackType === 'helpful' ? 'bg-green-100 text-green-800' :
                      feedback.feedbackType === 'unhelpful' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {feedback.feedbackType}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      feedback.isReviewed ? 'bg-green-500' : 'bg-yellow-500'
                    }`} title={feedback.isReviewed ? 'Reviewed' : 'Pending Review'}></span>
                  </div>
                  {feedback.userComment && (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      "{feedback.userComment}"
                    </p>
                  )}
                  {feedback.positiveAspects && feedback.positiveAspects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {feedback.positiveAspects.slice(0, 3).map((aspect, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                          {aspect.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {new Date(feedback.createdAt).toLocaleDateString()} • ID: {feedback.messageId.substring(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Common Issues */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Issues</h3>
            <div className="space-y-3">
              {data.feedbackAnalytics?.commonIssues?.slice(0, 5).map((issue, index) => (
                <div key={index} className="border-l-4 border-red-200 pl-4 py-2">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {issue.category.replace('_', ' ').replace('-', ' ')}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {issue.count} reports
                  </div>
                  {issue.examples.length > 0 && (
                    <div className="text-xs text-gray-600 italic">
                      "{issue.examples[0].substring(0, 60)}..."
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai-insights' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">AI Analysis Insights</h2>
              <button
                onClick={triggerBatchAnalysis}
                disabled={aiLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {aiLoading ? 'Analyzing...' : 'Run Batch Analysis'}
              </button>
            </div>

            {aiInsights ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Analyzed"
                  value={aiInsights.totalAnalyzed.toLocaleString()}
                  icon="🔍"
                  color="blue"
                />
                <MetricCard
                  title="Avg Confidence"
                  value={`${(aiInsights.averageConfidence * 100).toFixed(1)}%`}
                  icon="🎯"
                  color="green"
                />
                <MetricCard
                  title="Avg Sentiment"
                  value={`${(aiInsights.averageSentiment * 100).toFixed(1)}%`}
                  icon="😊"
                  color="emerald"
                />
                <MetricCard
                  title="Categories"
                  value={Object.keys(aiInsights.categoryDistribution).length.toString()}
                  icon="📂"
                  color="purple"
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Click "Run Batch Analysis" to generate AI insights</p>
              </div>
            )}

            {aiInsights && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(aiInsights.categoryDistribution).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900 capitalize">{category}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{count}</div>
                          <div className="text-xs text-gray-500">
                            {((count / aiInsights.totalAnalyzed) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Suggested Actions */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Suggested Actions</h3>
                  <div className="space-y-3">
                    {aiInsights.topSuggestedActions.map((action: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="text-sm text-gray-900 mb-1">{action.action}</div>
                        <div className="text-xs text-gray-500">{action.count} times</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prompt Analysis Tab */}
        {activeTab === 'prompt-analysis' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Prompt Version Performance</h2>
            
            {promptAnalysis ? (
              <div className="space-y-6">
                {promptAnalysis.map((version: any, index: number) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Version: {version.version}</h3>
                        <p className="text-sm text-gray-600">{version.totalResponses} responses</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {version.averageRating.toFixed(1)}/5
                        </div>
                        <div className="text-xs text-gray-500">Average Rating</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600">Confidence</div>
                        <div className="text-lg font-semibold text-green-600">
                          {(version.averageConfidence * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Sentiment</div>
                        <div className="text-lg font-semibold text-emerald-600">
                          {(version.averageSentiment * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Top Category</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {Object.entries(version.categoryBreakdown).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {version.topSuccessPatterns.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Success Patterns</h4>
                        <div className="flex flex-wrap gap-2">
                          {version.topSuccessPatterns.slice(0, 5).map((pattern: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-50 text-green-700">
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {version.improvementSuggestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Improvement Suggestions</h4>
                        <div className="space-y-1">
                          {version.improvementSuggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                            <div key={idx} className="text-sm text-gray-700 border-l-2 border-orange-200 pl-3">
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading prompt analysis...</p>
              </div>
            )}
          </div>
        )}

        {/* Gold Standard Tab */}
        {activeTab === 'gold-standard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Gold Standard Responses</h2>
            
            {goldStandard ? (
              <div className="space-y-4">
                {goldStandard.map((item: any, index: number) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-400">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm text-gray-600">Message ID: {item.messageId}</div>
                        <div className="text-sm text-gray-600">Prompt Version: {item.promptVersion}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          Sentiment: {(item.sentimentScore * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm font-medium text-blue-600">
                          Confidence: {(item.confidenceScore * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {item.userComment && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-900 mb-1">User Comment:</div>
                        <div className="text-sm text-gray-700 italic">"{item.userComment}"</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.successPatterns.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-2">Success Patterns</div>
                          <div className="flex flex-wrap gap-1">
                            {item.successPatterns.map((pattern: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-50 text-green-700">
                                {pattern}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.positiveAspects.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-2">Positive Aspects</div>
                          <div className="flex flex-wrap gap-1">
                            {item.positiveAspects.map((aspect: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                                {aspect.replace('-', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading gold standard responses...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'emerald';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
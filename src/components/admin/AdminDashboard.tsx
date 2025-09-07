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
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [data, setData] = useState<ExtendedStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('7d');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                title="LINE Click Rate"
                value={`${data.stats.lineClickRate.toFixed(1)}%`}
                icon="📞"
                color="purple"
              />
              <MetricCard
                title="Avg Response Time"
                value={`${data.stats.averageResponseTime.toFixed(1)}s`}
                icon="⚡"
                color="orange"
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

          {/* Common Patterns */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Conversation Patterns</h3>
            <div className="space-y-3">
              {data.commonPatterns.slice(0, 5).map((pattern, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-3">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {pattern.pattern.join(' → ')}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{pattern.frequency} sessions</span>
                    <span>{pattern.lineHandoffRate.toFixed(1)}% handoff</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
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
/**
 * Admin Statistics API Endpoint
 * Provides analytics data for admin dashboard with authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../services/databaseService';
import { calculateUsageStats, analyzeConversationFlow, getCommonPatterns } from '../../../../services/analyticsService';
import { AdminStatsResponse, UsageStats, AnalyticsLog, TopicCategory } from '../../../../types';

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD not set - admin access disabled');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === adminPassword;
}

/**
 * GET /api/admin/stats
 * Returns comprehensive analytics data
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid admin credentials required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const format = searchParams.get('format') || 'json';
    
    // Calculate date range based on period
    const now = new Date();
    let dateFrom: Date;
    
    switch (period) {
      case '1d':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Check if database is configured
    const kvUrl = process.env.KV_URL;
    const postgresUrl = process.env.DATABASE_URL;
    
    if (!kvUrl && !postgresUrl) {
      // Return demo data when no database is configured
      const demoResponse = createDemoResponse(period);
      
      if (format === 'csv') {
        const csv = generateDemoCSV();
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="jirung-demo-analytics-${period}-${now.toISOString().split('T')[0]}.csv"`
          }
        });
      }
      
      return NextResponse.json(demoResponse);
    }

    // Get database connection
    const db = await getDatabase();
    
    // Fetch analytics data including feedback
    const [logs, topQuestions, feedbackAnalytics, recentFeedback] = await Promise.all([
      db.getAnalyticsLogs(1000, 0, { dateFrom, dateTo: now }),
      db.getTopQuestions(10),
      db.getFeedbackAnalytics(),
      db.getFeedback({ limit: 10, offset: 0 })
    ]);

    // Calculate comprehensive statistics
    const stats = calculateUsageStats(logs);
    
    // Analyze conversation flows
    const conversationFlows = analyzeConversationFlow(logs);
    const commonPatterns = getCommonPatterns(conversationFlows);
    
    // Calculate additional metrics
    const hourlyDistribution = calculateHourlyDistribution(logs);
    const dailyTrends = calculateDailyTrends(logs, dateFrom);
    const sessionAnalytics = calculateSessionAnalytics(logs);
    
    const response: AdminStatsResponse & {
      conversationFlows: typeof conversationFlows;
      commonPatterns: typeof commonPatterns;
      hourlyDistribution: typeof hourlyDistribution;
      dailyTrends: typeof dailyTrends;
      sessionAnalytics: typeof sessionAnalytics;
      feedbackAnalytics: typeof feedbackAnalytics;
      recentFeedback: typeof recentFeedback;
    } = {
      period,
      stats,
      topQuestions: topQuestions.map(q => ({
        ...q,
        topic: q.topic as TopicCategory
      })),
      conversationFlows: conversationFlows.slice(0, 20), // Limit for performance
      commonPatterns,
      hourlyDistribution,
      dailyTrends,
      sessionAnalytics,
      feedbackAnalytics,
      recentFeedback
    };

    // Handle CSV export
    if (format === 'csv') {
      const csv = generateCSVExport(logs, stats);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="jirung-analytics-${period}-${now.toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate hourly distribution of questions
 */
function calculateHourlyDistribution(logs: AnalyticsLog[]): Record<string, number> {
  const hourCounts: Record<string, number> = {};
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourCounts[i.toString().padStart(2, '0')] = 0;
  }
  
  logs.forEach(log => {
    const hour = log.timestamp.getHours().toString().padStart(2, '0');
    hourCounts[hour]++;
  });
  
  return hourCounts;
}

/**
 * Calculate daily trends over the period
 */
function calculateDailyTrends(logs: AnalyticsLog[], dateFrom: Date): Array<{
  date: string;
  questions: number;
  uniqueSessions: number;
  lineClicks: number;
}> {
  const dailyData: Record<string, {
    questions: number;
    sessions: Set<string>;
    lineClicks: number;
  }> = {};
  
  // Initialize all days in the period
  const currentDate = new Date(dateFrom);
  const endDate = new Date();
  
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyData[dateKey] = {
      questions: 0,
      sessions: new Set(),
      lineClicks: 0
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Aggregate data by day
  logs.forEach(log => {
    const dateKey = log.timestamp.toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].questions++;
      dailyData[dateKey].sessions.add(log.session_id);
      if (log.line_clicked) {
        dailyData[dateKey].lineClicks++;
      }
    }
  });
  
  return Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      questions: data.questions,
      uniqueSessions: data.sessions.size,
      lineClicks: data.lineClicks
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate session-level analytics
 */
function calculateSessionAnalytics(logs: AnalyticsLog[]): {
  averageQuestionsPerSession: number;
  sessionLengthDistribution: Record<string, number>;
  abandonmentRate: number;
  conversionRate: number;
} {
  const sessionGroups: Record<string, AnalyticsLog[]> = {};
  
  // Group logs by session
  logs.forEach(log => {
    if (!sessionGroups[log.session_id]) {
      sessionGroups[log.session_id] = [];
    }
    sessionGroups[log.session_id].push(log);
  });
  
  const sessions = Object.values(sessionGroups);
  const totalSessions = sessions.length;
  
  if (totalSessions === 0) {
    return {
      averageQuestionsPerSession: 0,
      sessionLengthDistribution: {},
      abandonmentRate: 0,
      conversionRate: 0
    };
  }
  
  // Calculate metrics
  const totalQuestions = sessions.reduce((sum, session) => sum + session.length, 0);
  const averageQuestionsPerSession = totalQuestions / totalSessions;
  
  // Session length distribution
  const lengthDistribution: Record<string, number> = {
    '1': 0,
    '2-3': 0,
    '4-5': 0,
    '6+': 0
  };
  
  let conversions = 0;
  let abandonments = 0;
  
  sessions.forEach(session => {
    const length = session.length;
    
    if (length === 1) {
      lengthDistribution['1']++;
      abandonments++; // Single question sessions are considered abandonments
    } else if (length <= 3) {
      lengthDistribution['2-3']++;
    } else if (length <= 5) {
      lengthDistribution['4-5']++;
    } else {
      lengthDistribution['6+']++;
    }
    
    // Check if session ended with LINE click (conversion)
    const lastLog = session[session.length - 1];
    if (lastLog.line_clicked) {
      conversions++;
    }
  });
  
  return {
    averageQuestionsPerSession: Math.round(averageQuestionsPerSession * 100) / 100,
    sessionLengthDistribution: lengthDistribution,
    abandonmentRate: (abandonments / totalSessions) * 100,
    conversionRate: (conversions / totalSessions) * 100
  };
}

/**
 * Generate CSV export of analytics data
 */
function generateCSVExport(logs: AnalyticsLog[], stats: UsageStats): string {
  const headers = [
    'Date',
    'Session ID',
    'Text Snippet',
    'Topic',
    'Language',
    'LINE Clicked',
    'Routed'
  ];
  
  const rows = logs.map(log => [
    log.timestamp.toISOString(),
    log.session_id,
    `"${log.text_snippet.replace(/"/g, '""')}"`, // Escape quotes in CSV
    log.topic,
    log.language,
    log.line_clicked ? 'Yes' : 'No',
    log.routed
  ]);
  
  // Add summary statistics at the end
  const summaryRows = [
    [''],
    ['SUMMARY STATISTICS'],
    ['Total Questions', stats.totalQuestions.toString()],
    ['Unique Sessions', stats.uniqueSessions.toString()],
    ['LINE Click Rate', `${stats.lineClickRate.toFixed(2)}%`],
    ['Average Response Time', `${stats.averageResponseTime.toFixed(2)}s`],
    [''],
    ['TOP TOPICS'],
    ...stats.topTopics.map(topic => [
      topic.topic,
      topic.count.toString(),
      `${topic.percentage.toFixed(2)}%`,
      `${topic.lineClickRate.toFixed(2)}% LINE clicks`
    ])
  ];
  
  const allRows = [headers, ...rows, ...summaryRows];
  return allRows.map(row => row.join(',')).join('\n');
}

/**
 * Create demo response when no database is configured
 */
function createDemoResponse(period: string) {
  const now = new Date();
  
  return {
    period,
    stats: {
      totalQuestions: 0,
      uniqueSessions: 0,
      topTopics: [],
      languageDistribution: { th: 0, en: 0 },
      lineClickRate: 0,
      averageResponseTime: 0
    },
    topQuestions: [],
    conversationFlows: [],
    commonPatterns: [],
    hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({ [i.toString().padStart(2, '0')]: 0 })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
    dailyTrends: [],
    sessionAnalytics: {
      averageQuestionsPerSession: 0,
      sessionLengthDistribution: { '1': 0, '2-3': 0, '4-5': 0, '6+': 0 },
      abandonmentRate: 0,
      conversionRate: 0
    },
    message: 'No database configured. This is demo data. Configure KV_URL or DATABASE_URL to see real analytics.'
  };
}

/**
 * Generate demo CSV when no database is configured
 */
function generateDemoCSV(): string {
  const headers = [
    'Date',
    'Session ID',
    'Text Snippet',
    'Topic',
    'Language',
    'LINE Clicked',
    'Routed'
  ];
  
  const demoRow = [
    new Date().toISOString(),
    'demo_session',
    '"No data available - configure database"',
    'general',
    'en',
    'No',
    'primary'
  ];
  
  const summaryRows = [
    [''],
    ['DEMO DATA - NO DATABASE CONFIGURED'],
    ['Configure KV_URL or DATABASE_URL to see real analytics'],
    ['Total Questions', '0'],
    ['Unique Sessions', '0'],
    ['LINE Click Rate', '0%']
  ];
  
  const allRows = [headers, demoRow, ...summaryRows];
  return allRows.map(row => row.join(',')).join('\n');
}
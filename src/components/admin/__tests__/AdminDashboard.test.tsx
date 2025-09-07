/**
 * AdminDashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../AdminDashboard';
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = fetch as ReturnType<typeof vi.mocked>;

// Mock URL.createObjectURL and related APIs for CSV export
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn(),
    style: {}
  })),
  writable: true
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn(),
  writable: true
});

describe('AdminDashboard', () => {
  const mockStatsData = {
    period: '7d',
    stats: {
      totalQuestions: 150,
      uniqueSessions: 75,
      topTopics: [
        { topic: 'sleep', count: 45, percentage: 30, lineClickRate: 15.5 },
        { topic: 'diet', count: 30, percentage: 20, lineClickRate: 10.2 },
        { topic: 'diabetes', count: 25, percentage: 16.7, lineClickRate: 20.8 }
      ],
      languageDistribution: { th: 120, en: 30 },
      lineClickRate: 12.5,
      averageResponseTime: 2.3
    },
    topQuestions: [
      { snippet: 'How to help elderly sleep better?', count: 15, topic: 'sleep' },
      { snippet: 'What foods are good for seniors?', count: 12, topic: 'diet' }
    ],
    conversationFlows: [
      { sessionId: 'session1', totalSteps: 3, duration: 5, endedWithLineHandoff: true },
      { sessionId: 'session2', totalSteps: 1, duration: 1, endedWithLineHandoff: false }
    ],
    commonPatterns: [
      { pattern: ['sleep', 'medication'], frequency: 25, averageDuration: 4.5, lineHandoffRate: 18.2 },
      { pattern: ['diet', 'diabetes'], frequency: 20, averageDuration: 6.1, lineHandoffRate: 25.0 }
    ],
    hourlyDistribution: {
      '09': 15, '10': 25, '11': 20, '14': 30, '15': 18, '16': 12
    },
    dailyTrends: [
      { date: '2024-01-10', questions: 20, uniqueSessions: 12, lineClicks: 3 },
      { date: '2024-01-11', questions: 25, uniqueSessions: 15, lineClicks: 4 }
    ],
    sessionAnalytics: {
      averageQuestionsPerSession: 2.1,
      sessionLengthDistribution: { '1': 30, '2-3': 25, '4-5': 15, '6+': 5 },
      abandonmentRate: 40.0,
      conversionRate: 15.5
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should show login form initially', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('Jirung Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Enter admin password to access analytics')).toBeInTheDocument();
      expect(screen.getByLabelText('Admin Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Access Dashboard' })).toBeInTheDocument();
    });

    it('should handle login form submission', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStatsData
      } as Response);

      render(<AdminDashboard />);
      
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });

      await user.type(passwordInput, 'test123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stats?period=7d', {
          headers: {
            'Authorization': 'Bearer test123',
            'Content-Type': 'application/json'
          }
        });
      });
    });

    it('should show error for invalid credentials', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      } as Response);

      render(<AdminDashboard />);
      
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });

      await user.type(passwordInput, 'wrong123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid admin password')).toBeInTheDocument();
      });
    });

    it('should show loading state during authentication', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => mockStatsData
          } as Response), 100)
        )
      );

      render(<AdminDashboard />);
      
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });

      await user.type(passwordInput, 'test123');
      await user.click(submitButton);

      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should call onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<AdminDashboard onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Dashboard Display', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStatsData
      } as Response);

      render(<AdminDashboard />);
      
      // Login first
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });
      
      await userEvent.setup().type(passwordInput, 'test123');
      await userEvent.setup().click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Analytics for 7d period')).toBeInTheDocument();
      });
    });

    it('should display key metrics correctly', () => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Questions
      expect(screen.getByText('75')).toBeInTheDocument(); // Unique Sessions
      expect(screen.getByText('12.5%')).toBeInTheDocument(); // LINE Click Rate
      expect(screen.getByText('2.3s')).toBeInTheDocument(); // Avg Response Time
    });

    it('should display top topics', () => {
      expect(screen.getByText('Top Topics')).toBeInTheDocument();
      expect(screen.getByText('Sleep')).toBeInTheDocument();
      expect(screen.getByText('Diet')).toBeInTheDocument();
      expect(screen.getByText('Diabetes')).toBeInTheDocument();
    });

    it('should display language distribution', () => {
      expect(screen.getByText('Language Distribution')).toBeInTheDocument();
      expect(screen.getByText('🇹🇭 Thai')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸 English')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument(); // Thai count
      expect(screen.getByText('30')).toBeInTheDocument(); // English count
    });

    it('should display session analytics', () => {
      expect(screen.getByText('Session Analytics')).toBeInTheDocument();
      expect(screen.getByText('2.1')).toBeInTheDocument(); // Avg Questions/Session
      expect(screen.getByText('15.5%')).toBeInTheDocument(); // Conversion Rate
      expect(screen.getByText('40.0%')).toBeInTheDocument(); // Abandonment Rate
    });

    it('should display top questions', () => {
      expect(screen.getByText('Most Common Questions')).toBeInTheDocument();
      expect(screen.getByText('"How to help elderly sleep better?"')).toBeInTheDocument();
      expect(screen.getByText('"What foods are good for seniors?"')).toBeInTheDocument();
    });

    it('should display conversation patterns', () => {
      expect(screen.getByText('Common Conversation Patterns')).toBeInTheDocument();
      expect(screen.getByText('sleep → medication')).toBeInTheDocument();
      expect(screen.getByText('diet → diabetes')).toBeInTheDocument();
    });
  });

  describe('Period Selection', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStatsData
      } as Response);

      render(<AdminDashboard />);
      
      // Login first
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });
      
      await userEvent.setup().type(passwordInput, 'test123');
      await userEvent.setup().click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Analytics for 7d period')).toBeInTheDocument();
      });
    });

    it('should change period when dropdown is changed', async () => {
      const user = userEvent.setup();
      
      const periodSelect = screen.getByDisplayValue('Last 7 Days');
      await user.selectOptions(periodSelect, '30d');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stats?period=30d', {
          headers: {
            'Authorization': 'Bearer test123',
            'Content-Type': 'application/json'
          }
        });
      });
    });

    it('should have all period options available', () => {
      const periodSelect = screen.getByDisplayValue('Last 7 Days');
      
      expect(screen.getByRole('option', { name: 'Last 24 Hours' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Last 7 Days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Last 30 Days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Last 90 Days' })).toBeInTheDocument();
    });
  });

  describe('CSV Export', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStatsData
      } as Response);

      render(<AdminDashboard />);
      
      // Login first
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });
      
      await userEvent.setup().type(passwordInput, 'test123');
      await userEvent.setup().click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Analytics for 7d period')).toBeInTheDocument();
      });
    });

    it('should trigger CSV export when button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock CSV response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => new Blob(['csv,data'], { type: 'text/csv' })
      } as Response);

      const exportButton = screen.getByText('Export CSV');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stats?period=7d&format=csv', {
          headers: {
            'Authorization': 'Bearer test123'
          }
        });
      });
    });

    it('should handle CSV export errors', async () => {
      const user = userEvent.setup();
      
      // Mock failed CSV response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const exportButton = screen.getByText('Export CSV');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to export CSV')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AdminDashboard />);
      
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });

      await user.type(passwordInput, 'test123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });
    });

    it('should retry when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<AdminDashboard />);
      
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });

      await user.type(passwordInput, 'test123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStatsData
      } as Response);

      const retryButton = screen.getByRole('button', { name: 'Retry' });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Analytics for 7d period')).toBeInTheDocument();
      });
    });

    it('should handle HTTP error responses', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      render(<AdminDashboard />);
      
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });

      await user.type(passwordInput, 'test123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('HTTP 500: Internal Server Error')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during data fetch', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => mockStatsData
          } as Response), 100)
        )
      );

      render(<AdminDashboard />);
      
      const passwordInput = screen.getByLabelText('Admin Password');
      const submitButton = screen.getByRole('button', { name: 'Access Dashboard' });

      await user.type(passwordInput, 'test123');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Analytics for 7d period')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });
});
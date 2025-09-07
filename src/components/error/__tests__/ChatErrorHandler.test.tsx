/**
 * Tests for Chat Error Handler Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatErrorHandler from '../ChatErrorHandler';
import { ErrorResponse } from '@/types';
import { vi } from 'vitest';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock timers
vi.useFakeTimers();

describe('ChatErrorHandler', () => {
  const mockOnRetry = vi.fn();
  const mockOnDismiss = vi.fn();
  const mockOnLineClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
  });

  it('should not render when no error', () => {
    const { container } = render(
      <ChatErrorHandler
        error={null}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render network error correctly', () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        onLineClick={mockOnLineClick}
      />
    );

    expect(screen.getByText('ปัญหาการเชื่อมต่อ')).toBeInTheDocument();
    expect(screen.getByText(/ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้/)).toBeInTheDocument();
    expect(screen.getByText('ลองใหม่')).toBeInTheDocument();
    expect(screen.getByText('คุยกับทีม Jirung')).toBeInTheDocument();
  });

  it('should render Gemini unavailable error correctly', () => {
    const error: ErrorResponse = {
      error: 'Gemini unavailable',
      code: 'GEMINI_UNAVAILABLE',
      fallbackMessage: 'ระบบไม่พร้อมใช้งาน',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        onLineClick={mockOnLineClick}
      />
    );

    expect(screen.getByText('บริการชั่วคราวไม่พร้อมใช้งาน')).toBeInTheDocument();
    expect(screen.getByText(/ระบบ AI กำลังมีปัญหา/)).toBeInTheDocument();
  });

  it('should render rate limit error correctly', () => {
    const error: ErrorResponse = {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      fallbackMessage: 'คำขอมากเกินไป',
      showLineOption: false,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        onLineClick={mockOnLineClick}
      />
    );

    expect(screen.getByText('ใช้งานเกินขีดจำกัด')).toBeInTheDocument();
    expect(screen.getByText(/คำขอมากเกินไป/)).toBeInTheDocument();
    expect(screen.getByText('ลองใหม่')).toBeInTheDocument();
    expect(screen.queryByText('คุยกับทีม Jirung')).not.toBeInTheDocument();
  });

  it('should render safety violation error correctly', () => {
    const error: ErrorResponse = {
      error: 'Safety violation',
      code: 'SAFETY_VIOLATION',
      fallbackMessage: 'เนื้อหาไม่เหมาะสม',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        onLineClick={mockOnLineClick}
      />
    );

    expect(screen.getByText('เนื้อหาไม่เหมาะสม')).toBeInTheDocument();
    expect(screen.queryByText('ลองใหม่')).not.toBeInTheDocument(); // No retry for safety violations
    expect(screen.getByText('คุยกับทีม Jirung')).toBeInTheDocument();
  });

  it('should handle generic Error objects', () => {
    const error = new Error('Generic error message');

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        onLineClick={mockOnLineClick}
      />
    );

    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument();
    expect(screen.getByText('ลองใหม่')).toBeInTheDocument();
    expect(screen.getByText('คุยกับทีม Jirung')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('ลองใหม่'));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onLineClick when LINE button is clicked', () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        onLineClick={mockOnLineClick}
      />
    );

    fireEvent.click(screen.getByText('คุยกับทีม Jirung'));
    expect(mockOnLineClick).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('ปิด'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when X button is clicked', () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    // Click the X button (close button)
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(button => 
      button.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    );
    
    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    }
  });

  it('should auto-retry for retryable errors', async () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    // Should show auto-retry indicator
    expect(screen.getByText(/กำลังลองใหม่อัตโนมัติ/)).toBeInTheDocument();

    // Fast-forward time to trigger auto-retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('should not auto-retry for non-retryable errors', () => {
    const error: ErrorResponse = {
      error: 'Safety violation',
      code: 'SAFETY_VIOLATION',
      fallbackMessage: 'เนื้อหาไม่เหมาะสม',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    // Should not show auto-retry indicator
    expect(screen.queryByText(/กำลังลองใหม่อัตโนมัติ/)).not.toBeInTheDocument();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockOnRetry).not.toHaveBeenCalled();
  });

  it('should limit auto-retry attempts', async () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    const { rerender } = render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    // First auto-retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    // Re-render with same error (simulating retry failure)
    rerender(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    // Second auto-retry
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(2);
    });

    // Re-render with same error again
    rerender(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    // Should not auto-retry a third time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockOnRetry).toHaveBeenCalledTimes(2);
  });

  it('should reset auto-retry count when manually retrying', async () => {
    const error: ErrorResponse = {
      error: 'Network failed',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'เกิดปัญหาเครือข่าย',
      showLineOption: true,
      timestamp: new Date()
    };

    render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    // Wait for auto-retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    // Manual retry should reset counter
    fireEvent.click(screen.getByText('ลองใหม่'));
    expect(mockOnRetry).toHaveBeenCalledTimes(2);
  });

  it('should apply custom className', () => {
    const error: ErrorResponse = {
      error: 'Test error',
      code: 'NETWORK_ERROR',
      fallbackMessage: 'Test message',
      showLineOption: false,
      timestamp: new Date()
    };

    const { container } = render(
      <ChatErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        className="custom-error-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-error-class');
  });
});
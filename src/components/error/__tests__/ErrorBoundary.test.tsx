/**
 * Tests for Error Boundary Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';
import { vi } from 'vitest';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
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
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';

// Mock fetch for error logging
global.fetch = vi.fn();

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
  (global.fetch as any).mockClear();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument();
    expect(screen.getByText(/ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด/)).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('เกิดข้อผิดพลาด')).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should log error to analytics', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Test error')
      });
    });
  });

  it('should handle analytics logging failure gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should still render error UI even if analytics fails
    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument();
  });

  it('should allow retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByText('ลองใหม่'));

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should allow page reload', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('รีโหลดหน้า'));

    expect(mockReload).toHaveBeenCalled();
  });

  it('should show LINE contact button', () => {
    // Mock environment variable
    process.env.NEXT_PUBLIC_LINE_URL = 'https://line.me/test';

    // Mock window.open
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('ติดต่อทาง LINE'));

    expect(mockOpen).toHaveBeenCalledWith('https://line.me/test', '_blank');
  });

  it('should show debug info in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Debug Information')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show debug info in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Debug Information')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ThrowError shouldThrow={shouldThrow} />
    );

    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent shouldThrow={false} />);
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should handle errors in wrapped component', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ThrowError shouldThrow={shouldThrow} />
    );

    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent shouldThrow={true} />);
    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument();
  });

  it('should use custom fallback in HOC', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ThrowError shouldThrow={shouldThrow} />
    );

    const customFallback = <div>HOC Custom Error</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, customFallback);

    render(<WrappedComponent shouldThrow={true} />);
    expect(screen.getByText('HOC Custom Error')).toBeInTheDocument();
  });

  it('should call custom onError in HOC', () => {
    const onError = vi.fn();
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ThrowError shouldThrow={shouldThrow} />
    );

    const WrappedComponent = withErrorBoundary(TestComponent, undefined, onError);

    render(<WrappedComponent shouldThrow={true} />);
    expect(onError).toHaveBeenCalled();
  });

  it('should set correct display name', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ThrowError shouldThrow={shouldThrow} />
    );
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});
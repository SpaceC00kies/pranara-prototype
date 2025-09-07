import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatInterface from '../ChatInterface';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123')
  }
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('ChatInterface', () => {
  const mockProps = {
    onLineClick: vi.fn(),
    lineUrl: 'https://line.me/test'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders chat interface with header', () => {
    render(<ChatInterface {...mockProps} />);
    
    expect(screen.getByText('Jirung Senior Advisor')).toBeInTheDocument();
    expect(screen.getByText('ผู้ช่วยดูแลผู้สูงอายุ')).toBeInTheDocument();
  });

  it('displays welcome message on mount', () => {
    render(<ChatInterface {...mockProps} />);
    
    expect(screen.getByText(/สวัสดีค่ะ ยินดีต้อนรับสู่ Jirung Senior Advisor/)).toBeInTheDocument();
  });

  it('renders input field with placeholder', () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    expect(input).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<ChatInterface {...mockProps} />);
    
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    expect(sendButton).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<ChatInterface {...mockProps} />);
    
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has text', () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('sends message when form is submitted', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'AI response',
        topic: 'general',
        showLineOption: false,
        sessionId: 'mock-session-id'
      })
    });

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(sendButton);
    
    // Check that user message appears
    expect(screen.getByText('Test question')).toBeInTheDocument();
    
    // Check that API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test question',
          sessionId: 'mock-uuid-123'
        }),
      });
    });
  });

  it('displays typing indicator while loading', async () => {
    // Mock a delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            response: 'AI response',
            topic: 'general',
            showLineOption: false
          })
        }), 100)
      )
    );

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(sendButton);
    
    // Should show typing indicator
    expect(screen.getByText('กำลังพิมพ์...')).toBeInTheDocument();
    
    // Wait for response
    await waitFor(() => {
      expect(screen.queryByText('กำลังพิมพ์...')).not.toBeInTheDocument();
    });
  });

  it('displays AI response after successful API call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'This is an AI response',
        topic: 'sleep',
        showLineOption: false,
        sessionId: 'mock-session-id'
      })
    });

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('This is an AI response')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/ขออภัยค่ะ เกิดข้อผิดพลาดในการตอบกลับ/)).toBeInTheDocument();
    });
  });

  it('submits form when Enter is pressed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'AI response',
        topic: 'general',
        showLineOption: false
      })
    });

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
    
    expect(screen.getByText('Test question')).toBeInTheDocument();
  });

  it('does not submit when Shift+Enter is pressed', () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    // Should not submit - message should not appear in chat messages (only in input)
    const chatMessages = screen.queryAllByText('Test question');
    // Should only be in the input field, not in a chat message bubble
    expect(chatMessages.length).toBe(1); // Only in the textarea
    expect(chatMessages[0].tagName).toBe('TEXTAREA');
  });

  it('clears input after sending message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'AI response',
        topic: 'general',
        showLineOption: false
      })
    });

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...') as HTMLTextAreaElement;
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(sendButton);
    
    expect(input.value).toBe('');
  });

  it('shows LINE button when showLineOption is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'AI response with LINE option',
        topic: 'emergency',
        showLineOption: true,
        sessionId: 'mock-session-id'
      })
    });

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Emergency question' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('AI response with LINE option')).toBeInTheDocument();
    });

    // Wait for LINE button to appear (it has a 1s delay)
    await waitFor(() => {
      expect(screen.getByText('คุยกับทีม Jirung ทาง LINE')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('tracks LINE clicks in analytics', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'AI response',
          topic: 'emergency',
          showLineOption: true
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...');
    const sendButton = screen.getByRole('button', { name: /ส่งข้อความ/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('คุยกับทีม Jirung ทาง LINE')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    const lineButton = screen.getByText('คุยกับทีม Jirung ทาง LINE');
    fireEvent.click(lineButton);
    
    await waitFor(() => {
      // Check that analytics was called (should be the second call after the chat API)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/analytics', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"sessionId":"mock-uuid-123"') && 
              expect.stringContaining('"event":"line_clicked"') &&
              expect.stringContaining('"timestamp"')
      }));
    });
    
    expect(mockProps.onLineClick).toHaveBeenCalledTimes(1);
  });

  it('displays input hint text', () => {
    render(<ChatInterface {...mockProps} />);
    
    expect(screen.getByText('กด Enter เพื่อส่ง, Shift+Enter เพื่อขึ้นบรรทัดใหม่')).toBeInTheDocument();
  });

  it('auto-resizes textarea input', () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ...') as HTMLTextAreaElement;
    
    // Should have initial min-height
    expect(input.style.minHeight).toBe('48px');
  });
});
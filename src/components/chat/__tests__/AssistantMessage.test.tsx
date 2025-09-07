import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssistantMessage from '../AssistantMessage';
import { ChatMessage } from '@/types';

describe('AssistantMessage', () => {
  const mockMessage: ChatMessage = {
    id: '1',
    text: 'This is an assistant response',
    sender: 'assistant',
    timestamp: new Date('2024-01-01T10:30:00Z'),
    topic: 'sleep'
  };

  it('renders assistant message correctly', () => {
    render(<AssistantMessage message={mockMessage} />);
    
    expect(screen.getByText('This is an assistant response')).toBeInTheDocument();
  });

  it('displays avatar with "J" initial', () => {
    render(<AssistantMessage message={mockMessage} />);
    
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('shows timestamp in Thai format', () => {
    render(<AssistantMessage message={mockMessage} />);
    
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('displays topic label in Thai', () => {
    render(<AssistantMessage message={mockMessage} />);
    
    expect(screen.getByText('การนอน')).toBeInTheDocument();
  });

  it('shows LINE button when showLineOption is true', () => {
    const mockOnLineClick = vi.fn();
    
    render(
      <AssistantMessage 
        message={mockMessage} 
        showLineOption={true}
        onLineClick={mockOnLineClick}
      />
    );
    
    expect(screen.getByText('คุยกับทีม Jirung ทาง LINE')).toBeInTheDocument();
  });

  it('does not show LINE button when showLineOption is false', () => {
    render(<AssistantMessage message={mockMessage} showLineOption={false} />);
    
    expect(screen.queryByText('คุยกับทีม Jirung ทาง LINE')).not.toBeInTheDocument();
  });

  it('calls onLineClick when LINE button is clicked', () => {
    const mockOnLineClick = vi.fn();
    
    render(
      <AssistantMessage 
        message={mockMessage} 
        showLineOption={true}
        onLineClick={mockOnLineClick}
      />
    );
    
    const lineButton = screen.getByText('คุยกับทีม Jirung ทาง LINE');
    fireEvent.click(lineButton);
    
    expect(mockOnLineClick).toHaveBeenCalledTimes(1);
  });

  it('handles multiline text correctly', () => {
    const multilineMessage: ChatMessage = {
      ...mockMessage,
      text: 'Line 1\nLine 2\nLine 3'
    };

    render(<AssistantMessage message={multilineMessage} />);
    
    const messageElement = screen.getByText((content, element) => {
      return element?.tagName === 'P' && element?.textContent === 'Line 1\nLine 2\nLine 3';
    });
    expect(messageElement).toHaveClass('whitespace-pre-line');
  });

  it('handles messages without topic', () => {
    const messageWithoutTopic: ChatMessage = {
      ...mockMessage,
      topic: undefined
    };

    render(<AssistantMessage message={messageWithoutTopic} />);
    
    expect(screen.getByText('This is an assistant response')).toBeInTheDocument();
    expect(screen.queryByText('การนอน')).not.toBeInTheDocument();
  });

  it('displays correct topic labels for different topics', () => {
    const topics = [
      { topic: 'alzheimer', label: 'อัลไซเมอร์' },
      { topic: 'fall', label: 'การล้ม' },
      { topic: 'diet', label: 'อาหาร' },
      { topic: 'emergency', label: 'ฉุกเฉิน' },
      { topic: 'general', label: 'ทั่วไป' }
    ];

    topics.forEach(({ topic, label }) => {
      const messageWithTopic: ChatMessage = {
        ...mockMessage,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        topic: topic as any
      };

      const { unmount } = render(<AssistantMessage message={messageWithTopic} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('applies correct styling classes', () => {
    render(<AssistantMessage message={mockMessage} />);
    
    const messageContainer = screen.getByText('This is an assistant response').closest('div');
    expect(messageContainer).toHaveClass('bg-white', 'border', 'rounded-2xl');
  });

  it('has proper accessibility attributes', () => {
    const mockOnLineClick = vi.fn();
    
    render(
      <AssistantMessage 
        message={mockMessage} 
        showLineOption={true}
        onLineClick={mockOnLineClick}
      />
    );
    
    const lineButton = screen.getByRole('button', { name: /ติดต่อทีม Jirung ผ่าน LINE/i });
    expect(lineButton).toBeInTheDocument();
  });
});
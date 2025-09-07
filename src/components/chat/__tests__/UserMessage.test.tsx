import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserMessage from '../UserMessage';
import { ChatMessage } from '@/types';

describe('UserMessage', () => {
  const mockMessage: ChatMessage = {
    id: '1',
    text: 'Hello, this is a test message',
    sender: 'user',
    timestamp: new Date('2024-01-01T10:30:00Z')
  };

  it('renders user message correctly', () => {
    render(<UserMessage message={mockMessage} />);
    
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('displays timestamp in Thai format', () => {
    render(<UserMessage message={mockMessage} />);
    
    // Should display time in Thai format (HH:MM)
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<UserMessage message={mockMessage} />);
    
    const messageContainer = screen.getByText('Hello, this is a test message').closest('div');
    expect(messageContainer).toHaveClass('bg-primary-500', 'text-white', 'rounded-2xl');
  });

  it('handles long messages with word wrapping', () => {
    const longMessage: ChatMessage = {
      ...mockMessage,
      text: 'This is a very long message that should wrap properly when displayed in the user interface to ensure good readability'
    };

    render(<UserMessage message={longMessage} />);
    
    const messageElement = screen.getByText(longMessage.text);
    expect(messageElement).toHaveClass('break-words');
  });

  it('handles Thai text correctly', () => {
    const thaiMessage: ChatMessage = {
      ...mockMessage,
      text: 'สวัสดีครับ ผมต้องการความช่วยเหลือในการดูแลผู้สูงอายุ'
    };

    render(<UserMessage message={thaiMessage} />);
    
    expect(screen.getByText('สวัสดีครับ ผมต้องการความช่วยเหลือในการดูแลผู้สูงอายุ')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<UserMessage message={mockMessage} />);
    
    const messageElement = screen.getByText('Hello, this is a test message');
    expect(messageElement).toBeVisible();
  });
});
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TypingIndicator from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('renders when isVisible is true', () => {
    render(<TypingIndicator isVisible={true} />);
    
    expect(screen.getByText('กำลังพิมพ์...')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<TypingIndicator isVisible={false} />);
    
    expect(screen.queryByText('กำลังพิมพ์...')).not.toBeInTheDocument();
  });

  it('displays avatar with "J" initial when visible', () => {
    render(<TypingIndicator isVisible={true} />);
    
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('shows animated dots when visible', () => {
    render(<TypingIndicator isVisible={true} />);
    
    // Check for the presence of animated dots
    const dotsContainer = screen.getByText('กำลังพิมพ์...').previousElementSibling;
    expect(dotsContainer).toBeInTheDocument();
    
    // Check that there are 3 animated dots
    const dots = dotsContainer?.querySelectorAll('.animate-typing');
    expect(dots).toHaveLength(3);
  });

  it('applies correct styling classes when visible', () => {
    render(<TypingIndicator isVisible={true} />);
    
    const container = screen.getByText('กำลังพิมพ์...').closest('.animate-fade-in');
    expect(container).toBeInTheDocument();
    
    const messageContainer = screen.getByText('กำลังพิมพ์...').closest('.bg-white');
    expect(messageContainer).toHaveClass('bg-white', 'border', 'rounded-2xl');
  });

  it('has proper animation delays on dots', () => {
    render(<TypingIndicator isVisible={true} />);
    
    const dotsContainer = screen.getByText('กำลังพิมพ์...').previousElementSibling;
    const dots = dotsContainer?.querySelectorAll('.animate-typing');
    
    if (dots) {
      expect(dots[0]).not.toHaveStyle('animation-delay: 0.2s');
      expect(dots[1]).toHaveStyle('animation-delay: 0.2s');
      expect(dots[2]).toHaveStyle('animation-delay: 0.4s');
    }
  });

  it('maintains consistent styling with assistant messages', () => {
    render(<TypingIndicator isVisible={true} />);
    
    // Should have same avatar styling as assistant messages
    const avatar = screen.getByText('J').closest('div');
    expect(avatar).toHaveClass('w-8', 'h-8', 'bg-gradient-to-br', 'from-health-green', 'to-health-mint', 'rounded-full');
    
    // Should have same message bubble styling
    const messageBubble = screen.getByText('กำลังพิมพ์...').closest('.bg-white');
    expect(messageBubble).toHaveClass('bg-white', 'border', 'border-gray-200', 'rounded-2xl', 'rounded-tl-md');
  });
});
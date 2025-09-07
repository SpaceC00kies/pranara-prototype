import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LineButton from '../LineButton';

describe('LineButton', () => {
  it('renders with default text', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    expect(screen.getByText('คุยกับทีม Jirung ทาง LINE')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    const mockOnClick = vi.fn();
    const customText = 'Custom LINE text';
    
    render(<LineButton onClick={mockOnClick} text={customText} />);
    
    expect(screen.getByText(customText)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button', { name: /ติดต่อทีม Jirung ผ่าน LINE/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('displays LINE icon', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('applies correct styling classes', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'bg-health-green',
      'hover:bg-green-600',
      'text-white',
      'rounded-xl',
      'transition-all'
    );
  });

  it('applies custom className', () => {
    const mockOnClick = vi.fn();
    const customClass = 'custom-class';
    
    render(<LineButton onClick={mockOnClick} className={customClass} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(customClass);
  });

  it('has hover and focus states', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-green-600', 'hover:scale-105');
    expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-health-green');
  });

  it('has active state styling', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('active:scale-95');
  });

  it('has proper button type', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('maintains consistent styling with design system', () => {
    const mockOnClick = vi.fn();
    render(<LineButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('font-prompt', 'font-medium', 'text-sm');
    expect(button).toHaveClass('shadow-sm', 'hover:shadow-md');
  });
});
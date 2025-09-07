import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeIndicator from '../ModeIndicator';

describe('ModeIndicator', () => {
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    mockOnModeChange.mockClear();
  });

  it('should render conversation mode indicator correctly', () => {
    render(<ModeIndicator mode="conversation" onModeChange={mockOnModeChange} />);
    
    expect(screen.getByText('💬')).toBeInTheDocument();
    expect(screen.getByText('โหมดสนทนา')).toBeInTheDocument();
    expect(screen.getByText('คุยกับใบบุญ')).toBeInTheDocument();
  });

  it('should render intelligence mode indicator correctly', () => {
    render(<ModeIndicator mode="intelligence" onModeChange={mockOnModeChange} />);
    
    expect(screen.getByText('🔬')).toBeInTheDocument();
    expect(screen.getByText('โหมดวิเคราะห์')).toBeInTheDocument();
    expect(screen.getByText('ระบบวิเคราะห์สุขภาพ')).toBeInTheDocument();
  });

  it('should call onModeChange when change button is clicked', () => {
    render(<ModeIndicator mode="conversation" onModeChange={mockOnModeChange} />);
    
    const changeButton = screen.getByText('เปลี่ยนโหมด');
    fireEvent.click(changeButton);
    
    expect(mockOnModeChange).toHaveBeenCalledTimes(1);
  });

  it('should not show change button when showChangeButton is false', () => {
    render(<ModeIndicator mode="conversation" showChangeButton={false} />);
    
    expect(screen.queryByText('เปลี่ยนโหมด')).not.toBeInTheDocument();
  });

  it('should not show change button when onModeChange is not provided', () => {
    render(<ModeIndicator mode="conversation" />);
    
    expect(screen.queryByText('เปลี่ยนโหมด')).not.toBeInTheDocument();
  });

  it('should apply correct styling for conversation mode', () => {
    const { container } = render(<ModeIndicator mode="conversation" onModeChange={mockOnModeChange} />);
    
    const modeContainer = container.querySelector('.bg-blue-50');
    expect(modeContainer).toBeInTheDocument();
  });

  it('should apply correct styling for intelligence mode', () => {
    const { container } = render(<ModeIndicator mode="intelligence" onModeChange={mockOnModeChange} />);
    
    const modeContainer = container.querySelector('.bg-green-50');
    expect(modeContainer).toBeInTheDocument();
  });
});
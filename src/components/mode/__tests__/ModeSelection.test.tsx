import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeSelection from '../ModeSelection';
import { AppMode } from '@/types';

describe('ModeSelection', () => {
  const mockOnModeSelect = vi.fn();

  beforeEach(() => {
    mockOnModeSelect.mockClear();
  });

  it('should render both mode options', () => {
    render(<ModeSelection onModeSelect={mockOnModeSelect} />);
    
    expect(screen.getByText('คุยกับใบบุญ')).toBeInTheDocument();
    expect(screen.getByText('ระบบวิเคราะห์สุขภาพ')).toBeInTheDocument();
  });

  it('should call onModeSelect when conversation mode is clicked', () => {
    render(<ModeSelection onModeSelect={mockOnModeSelect} />);
    
    const conversationButton = screen.getByText('เริ่มสนทนากับใบบุญ');
    fireEvent.click(conversationButton);
    
    expect(mockOnModeSelect).toHaveBeenCalledWith('conversation');
  });

  it('should call onModeSelect when intelligence mode is clicked', () => {
    render(<ModeSelection onModeSelect={mockOnModeSelect} />);
    
    const intelligenceButton = screen.getByText('เริ่มใช้ระบบวิเคราะห์');
    fireEvent.click(intelligenceButton);
    
    expect(mockOnModeSelect).toHaveBeenCalledWith('intelligence');
  });

  it('should render correctly with selected mode', () => {
    render(<ModeSelection onModeSelect={mockOnModeSelect} selectedMode="conversation" />);
    
    // Check that both modes are still rendered
    expect(screen.getByText('คุยกับใบบุญ')).toBeInTheDocument();
    expect(screen.getByText('ระบบวิเคราะห์สุขภาพ')).toBeInTheDocument();
  });

  it('should display mode features correctly', () => {
    render(<ModeSelection onModeSelect={mockOnModeSelect} />);
    
    // Check conversation mode features
    expect(screen.getByText('การสนทนาที่อบอุ่นและเข้าใจ')).toBeInTheDocument();
    expect(screen.getByText('การให้กำลังใจและสนับสนุนทางอารมณ์')).toBeInTheDocument();
    
    // Check intelligence mode features
    expect(screen.getByText('การวิจัยและวิเคราะห์ด้วย AI ขั้นสูง')).toBeInTheDocument();
    expect(screen.getByText('ข้อมูลสุขภาพที่อิงหลักฐานทางวิทยาศาสตร์')).toBeInTheDocument();
  });

  it('should display perfect for sections', () => {
    render(<ModeSelection onModeSelect={mockOnModeSelect} />);
    
    expect(screen.getByText(/เหมาะสำหรับ: ความสบายใจ/)).toBeInTheDocument();
    expect(screen.getByText(/เหมาะสำหรับ: การตัดสินใจ/)).toBeInTheDocument();
  });
});
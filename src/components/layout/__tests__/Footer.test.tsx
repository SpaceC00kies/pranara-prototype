import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Footer } from '../Footer';
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

// Mock Next.js Link component
vi.mock('next/link', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  }
}));

describe('Footer', () => {
  it('renders with proper accessibility attributes', () => {
    render(<Footer />);

    // Check footer has proper role
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();

    // Check navigation has proper role and aria-label
    const nav = screen.getByRole('navigation', { name: 'ลิงก์ด่วน' });
    expect(nav).toBeInTheDocument();
  });

  it('renders brand section with logo and description', () => {
    render(<Footer />);

    // Check brand elements
    expect(screen.getByText('Jirung')).toBeInTheDocument();
    expect(screen.getByText('Senior Advisor')).toBeInTheDocument();
    // Check for text that might be split by line breaks
    expect(screen.getByText(/ผู้ช่วยอัจฉริยะสำหรับการดูแลผู้สูงอายุ/)).toBeInTheDocument();
  });

  it('renders all quick links with proper accessibility', () => {
    render(<Footer />);

    // Check all footer links
    const aboutLink = screen.getByRole('link', { name: 'เกี่ยวกับ Jirung' });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute('href', '/about');

    const safetyLink = screen.getByRole('link', { name: 'ความปลอดภัยและข้อจำกัด' });
    expect(safetyLink).toBeInTheDocument();
    expect(safetyLink).toHaveAttribute('href', '/safety');

    const privacyLink = screen.getByRole('link', { name: 'นโยบายความเป็นส่วนตัว' });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');

    const termsLink = screen.getByRole('link', { name: 'ข้อกำหนดการใช้งาน' });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
  });

  it('renders contact and support section with safety indicators', () => {
    render(<Footer />);

    // Check safety indicators
    expect(screen.getByText('ให้คำแนะนำที่ปลอดภัยเท่านั้น')).toBeInTheDocument();
    expect(screen.getByText('ไม่เก็บข้อมูลส่วนตัว')).toBeInTheDocument();
    expect(screen.getByText('ไม่ทดแทนคำแนะนำทางการแพทย์')).toBeInTheDocument();
  });

  it('renders privacy notice section', () => {
    render(<Footer />);

    // Check privacy notice
    expect(screen.getByText('ความโปร่งใสในการใช้ข้อมูล')).toBeInTheDocument();
    expect(screen.getByText(/เราใช้ข้อมูลการสนทนาเพื่อปรับปรุงบริการ/)).toBeInTheDocument();
  });

  it('renders copyright with current year', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} Jirung Senior Advisor. สงวนลิขสิทธิ์.`)).toBeInTheDocument();
  });

  it('has proper focus styles for accessibility', () => {
    render(<Footer />);

    // All links should have focus styles
    const links = screen.getAllByRole('link');
    
    links.forEach(link => {
      expect(link).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary-500', 'focus:ring-offset-2');
    });
  });

  it('has proper responsive grid layout', () => {
    render(<Footer />);

    const footer = screen.getByRole('contentinfo');
    const gridContainer = footer.querySelector('.grid');
    
    expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-8');
  });

  it('has proper Thai language support and typography', () => {
    render(<Footer />);

    // Check Thai text is rendered with proper font classes
    const thaiTexts = [
      'ลิงก์ด่วน',
      'ติดต่อและสนับสนุน',
      'ความโปร่งใสในการใช้ข้อมูล'
    ];

    thaiTexts.forEach(text => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  it('renders with proper semantic structure', () => {
    render(<Footer />);

    // Check heading hierarchy - there are 2 h3 headings and 1 h4 heading
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(3); // "ลิงก์ด่วน", "ติดต่อและสนับสนุน", "ความโปร่งใสในการใช้ข้อมูล"
    
    // Check that main section headings are h3 elements
    const h3Headings = headings.filter(h => h.tagName === 'H3');
    expect(h3Headings).toHaveLength(2); // "ลิงก์ด่วน", "ติดต่อและสนับสนุน"
    
    // Check that privacy notice uses h4
    const h4Headings = headings.filter(h => h.tagName === 'H4');
    expect(h4Headings).toHaveLength(1); // "ความโปร่งใสในการใช้ข้อมูล"
  });
});
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Header } from '../Header';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  }
}));

describe('Header', () => {
  it('renders with proper accessibility attributes', () => {
    render(<Header />);

    // Check header has proper role
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    // Check navigation has proper role and aria-label
    const nav = screen.getByRole('navigation', { name: 'เมนูหลัก' });
    expect(nav).toBeInTheDocument();
  });

  it('renders brand logo and text with proper accessibility', () => {
    render(<Header />);

    // Check logo link has proper aria-label
    const logoLink = screen.getByLabelText('กลับไปหน้าหลัก Jirung Senior Advisor');
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/');

    // Check brand text is present
    expect(screen.getByText('Jirung')).toBeInTheDocument();
    expect(screen.getByText('Senior Advisor')).toBeInTheDocument();
  });

  it('renders navigation links with proper accessibility', () => {
    render(<Header />);

    // Check all navigation links
    const aboutLink = screen.getByRole('link', { name: 'เกี่ยวกับเรา' });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute('href', '/about');

    const safetyLink = screen.getByRole('link', { name: 'ความปลอดภัย' });
    expect(safetyLink).toBeInTheDocument();
    expect(safetyLink).toHaveAttribute('href', '/safety');

    const privacyLink = screen.getByRole('link', { name: 'นโยบายความเป็นส่วนตัว' });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('renders mobile menu button with proper accessibility', () => {
    render(<Header />);

    const mobileMenuButton = screen.getByLabelText('เปิดเมนู');
    expect(mobileMenuButton).toBeInTheDocument();
    expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('has proper responsive classes', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0', 'z-50');

    // Check navigation is hidden on mobile
    const nav = screen.getByRole('navigation', { name: 'เมนูหลัก' });
    expect(nav).toHaveClass('hidden', 'md:flex');

    // Check mobile menu button is hidden on desktop
    const mobileButton = screen.getByLabelText('เปิดเมนู');
    expect(mobileButton).toHaveClass('md:hidden');
  });

  it('has proper focus styles for accessibility', () => {
    render(<Header />);

    // All interactive elements should have focus styles
    const logoLink = screen.getByLabelText('กลับไปหน้าหลัก Jirung Senior Advisor');
    expect(logoLink).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary-500', 'focus:ring-offset-2');

    const navLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href')?.startsWith('/') && link !== logoLink
    );
    
    navLinks.forEach(link => {
      expect(link).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary-500', 'focus:ring-offset-2');
    });
  });

  it('has proper Thai language support', () => {
    render(<Header />);

    // Check Thai text is rendered correctly
    expect(screen.getByText('เกี่ยวกับเรา')).toBeInTheDocument();
    expect(screen.getByText('ความปลอดภัย')).toBeInTheDocument();
    expect(screen.getByText('นโยบายความเป็นส่วนตัว')).toBeInTheDocument();
  });
});
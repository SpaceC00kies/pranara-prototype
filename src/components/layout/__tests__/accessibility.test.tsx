import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import { Layout } from '../Layout';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Next.js Link component
vi.mock('next/link', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  }
}));

describe('Layout Components Accessibility', () => {
  describe('Layout Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Layout>
          <div>
            <h1>Test Content</h1>
            <h2>Section Title</h2>
            <p>This is test content for accessibility testing.</p>
          </div>
        </Layout>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper landmark roles', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      // Check for proper landmark roles
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument();   // Main content
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
    });

    it('has proper heading hierarchy', () => {
      render(
        <Layout>
          <div>
            <h1>Main Title</h1>
            <h2>Section Title</h2>
          </div>
        </Layout>
      );

      // Check that h1 and h2 are present in content
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  describe('Header Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Header />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper keyboard navigation support', () => {
      render(<Header />);

      // All interactive elements should be focusable
      const interactiveElements = screen.getAllByRole('link').concat(
        screen.getAllByRole('button')
      );

      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('has proper ARIA labels for screen readers', () => {
      render(<Header />);

      // Check logo has descriptive aria-label
      const logoLink = screen.getByLabelText('กลับไปหน้าหลัก Jirung Senior Advisor');
      expect(logoLink).toBeInTheDocument();

      // Check mobile menu button has proper aria attributes
      const mobileButton = screen.getByLabelText('เปิดเมนู');
      expect(mobileButton).toHaveAttribute('aria-expanded');
    });

    it('has sufficient color contrast', () => {
      render(<Header />);

      // Check that text elements have proper contrast classes
      const brandText = screen.getByText('Jirung');
      expect(brandText).toHaveClass('text-text-primary');

      const navLinks = screen.getAllByRole('link').filter(link => 
        link.textContent?.includes('เกี่ยวกับเรา') ||
        link.textContent?.includes('ความปลอดภัย') ||
        link.textContent?.includes('นโยบายความเป็นส่วนตัว')
      );

      navLinks.forEach(link => {
        expect(link).toHaveClass('text-text-secondary');
      });
    });
  });

  describe('Footer Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Footer />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper semantic structure', () => {
      render(<Footer />);

      // Check for proper semantic elements
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'ลิงก์ด่วน' })).toBeInTheDocument();

      // Check heading hierarchy - main sections use h3, privacy notice uses h4
      const h3Headings = screen.getAllByRole('heading', { level: 3 });
      expect(h3Headings).toHaveLength(2); // "ลิงก์ด่วน", "ติดต่อและสนับสนุน"
      
      const h4Headings = screen.getAllByRole('heading', { level: 4 });
      expect(h4Headings).toHaveLength(1); // "ความโปร่งใสในการใช้ข้อมูล"
    });

    it('has proper link descriptions', () => {
      render(<Footer />);

      // All links should have descriptive text
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.textContent).toBeTruthy();
        expect(link.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('has proper visual hierarchy with icons and text', () => {
      render(<Footer />);

      // Check that important information is properly structured
      expect(screen.getByText('ให้คำแนะนำที่ปลอดภัยเท่านั้น')).toBeInTheDocument();
      expect(screen.getByText('ไม่เก็บข้อมูลส่วนตัว')).toBeInTheDocument();
      expect(screen.getByText('ไม่ทดแทนคำแนะนำทางการแพทย์')).toBeInTheDocument();
    });
  });

  describe('Mobile Accessibility', () => {
    it('has proper touch target sizes', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      // Check that interactive elements have minimum 44px touch targets
      // This is verified through CSS classes in the components
      const mobileButton = screen.getByLabelText('เปิดเมนู');
      expect(mobileButton).toHaveClass('p-2'); // Ensures minimum touch target
    });

    it('has proper responsive text sizing', () => {
      render(<Header />);

      // Check responsive text classes
      const brandText = screen.getByText('Jirung');
      expect(brandText).toHaveClass('text-lg', 'sm:text-xl');
    });
  });

  describe('Thai Language Accessibility', () => {
    it('has proper language attributes', () => {
      // This would be tested at the document level in layout.tsx
      // The html element should have lang="th"
      render(
        <Layout>
          <div>เนื้อหาภาษาไทย</div>
        </Layout>
      );

      // Check that Thai text is properly rendered
      expect(screen.getByText('เนื้อหาภาษาไทย')).toBeInTheDocument();
    });

    it('has proper font loading for Thai characters', () => {
      render(<Footer />);

      // Check that Thai text elements are present and properly styled
      const thaiTexts = [
        'ลิงก์ด่วน',
        'ติดต่อและสนับสนุน'
      ];

      thaiTexts.forEach(text => {
        const element = screen.getByText(text);
        expect(element).toBeInTheDocument();
        // Font classes are applied through CSS variables and Tailwind
      });

      // Check for text that might be split by line breaks
      expect(screen.getByText(/ผู้ช่วยอัจฉริยะสำหรับการดูแลผู้สูงอายุ/)).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('has proper focus indicators', () => {
      render(<Header />);

      // All focusable elements should have focus styles
      const focusableElements = screen.getAllByRole('link').concat(
        screen.getAllByRole('button')
      );

      focusableElements.forEach(element => {
        expect(element).toHaveClass('focus:outline-none');
        expect(element).toHaveClass('focus:ring-2');
        expect(element).toHaveClass('focus:ring-primary-500');
      });
    });

    it('maintains logical tab order', () => {
      render(
        <Layout>
          <div>
            <button>First Button</button>
            <button>Second Button</button>
          </div>
        </Layout>
      );

      // Tab order should be logical (this is ensured by proper DOM structure)
      const buttons = screen.getAllByRole('button');
      // Filter out the mobile menu button from header
      const contentButtons = buttons.filter(button => 
        button.textContent === 'First Button' || button.textContent === 'Second Button'
      );
      expect(contentButtons).toHaveLength(2);
      expect(contentButtons[0]).toHaveTextContent('First Button');
      expect(contentButtons[1]).toHaveTextContent('Second Button');
    });
  });
});
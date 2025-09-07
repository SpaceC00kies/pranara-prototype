import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Layout } from '../Layout';

// Mock the Header and Footer components
vi.mock('../Header', () => ({
  Header: () => <header data-testid="header">Header</header>
}));

vi.mock('../Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>
}));

describe('Layout', () => {
  it('renders with proper structure and accessibility attributes', () => {
    render(
      <Layout>
        <div data-testid="content">Test content</div>
      </Layout>
    );

    // Check main structure
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();

    // Check main element has proper role and aria-label
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-label', 'หน้าหลัก');
  });

  it('applies custom className to main element', () => {
    render(
      <Layout className="custom-class">
        <div>Content</div>
      </Layout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('custom-class');
  });

  it('has proper background gradient classes', () => {
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const layoutDiv = container.firstChild as HTMLElement;
    expect(layoutDiv).toHaveClass('min-h-screen', 'flex', 'flex-col', 'bg-gradient-to-br', 'from-background-gradient-start', 'to-background-gradient-end');
  });

  it('maintains proper flex layout structure', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex-1', 'flex', 'flex-col');
  });
});
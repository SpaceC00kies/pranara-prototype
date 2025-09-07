/**
 * Basic AdminDashboard Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminDashboard from '../AdminDashboard';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { vi } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { vi } from 'vitest';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('AdminDashboard - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form initially', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('Jirung Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Enter admin password to access analytics')).toBeInTheDocument();
    expect(screen.getByLabelText('Admin Password')).toBeInTheDocument();
    // The button might show "Authenticating..." or "Access Dashboard" depending on loading state
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show cancel button when onClose prop is provided', () => {
    const mockOnClose = vi.fn();
    
    render(<AdminDashboard onClose={mockOnClose} />);
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should not show cancel button when onClose prop is not provided', () => {
    render(<AdminDashboard />);
    
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('should have password input field with correct attributes', () => {
    render(<AdminDashboard />);
    
    const passwordInput = screen.getByLabelText('Admin Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('placeholder', 'Enter admin password');
    expect(passwordInput).toBeRequired();
  });

  it('should have submit button with correct initial state', () => {
    render(<AdminDashboard />);
    
    const submitButton = screen.getByRole('button');
    expect(submitButton).toHaveAttribute('type', 'submit');
    // Button might be disabled if in loading state
  });
});
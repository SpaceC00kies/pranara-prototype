/**
 * Accessibility utilities tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  focusManagement, 
  colorContrast, 
  keyboardNavigation,
  screenReader,
  touchAccessibility,
  reducedMotion 
} from '../accessibility';

// Mock DOM methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('focusManagement', () => {
  let container: HTMLElement;
  let focusableElements: HTMLElement[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const input = document.createElement('input');
    
    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(input);
    
    focusableElements = [button1, button2, input];
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should trap focus within container', () => {
    const cleanup = focusManagement.trapFocus(container);
    
    // Focus first element
    focusableElements[0].focus();
    expect(document.activeElement).toBe(focusableElements[0]);
    
    // Simulate Tab key on last element
    focusableElements[2].focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    container.dispatchEvent(tabEvent);
    
    cleanup();
  });

  it('should announce messages to screen readers', () => {
    const originalAppendChild = document.body.appendChild;
    const mockAppendChild = vi.fn();
    document.body.appendChild = mockAppendChild;

    focusManagement.announce('Test message', 'assertive');

    expect(mockAppendChild).toHaveBeenCalled();
    
    document.body.appendChild = originalAppendChild;
  });

  it('should save and restore focus', () => {
    const button = focusableElements[0];
    button.focus();
    
    const restoreFocus = focusManagement.saveFocus();
    
    // Focus different element
    focusableElements[1].focus();
    expect(document.activeElement).toBe(focusableElements[1]);
    
    // Restore focus
    restoreFocus();
    expect(document.activeElement).toBe(button);
  });
});

describe('colorContrast', () => {
  it('should calculate contrast ratio correctly', () => {
    // Test high contrast (black on white)
    const highContrast = colorContrast.getContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
    expect(highContrast).toBeGreaterThan(15); // Should be ~21
    
    // Test low contrast
    const lowContrast = colorContrast.getContrastRatio('rgb(200, 200, 200)', 'rgb(255, 255, 255)');
    expect(lowContrast).toBeLessThan(5);
  });

  it('should check WCAG AA compliance', () => {
    // High contrast should pass
    expect(colorContrast.meetsWCAGAA('rgb(0, 0, 0)', 'rgb(255, 255, 255)')).toBe(true);
    
    // Low contrast should fail
    expect(colorContrast.meetsWCAGAA('rgb(200, 200, 200)', 'rgb(255, 255, 255)')).toBe(false);
    
    // Large text has lower requirements (3:1 ratio)
    expect(colorContrast.meetsWCAGAA('rgb(120, 120, 120)', 'rgb(255, 255, 255)', true)).toBe(true);
  });
});

describe('keyboardNavigation', () => {
  let items: HTMLElement[];
  let currentIndex: number;
  let onIndexChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    items = [
      document.createElement('button'),
      document.createElement('button'),
      document.createElement('button')
    ];
    currentIndex = 0;
    onIndexChange = vi.fn((index) => {
      currentIndex = index;
    });
  });

  it('should handle arrow key navigation', () => {
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    keyboardNavigation.handleArrowNavigation(downEvent, items, currentIndex, onIndexChange);
    
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('should wrap around at boundaries', () => {
    // Test wrapping from last to first
    currentIndex = 2;
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    keyboardNavigation.handleArrowNavigation(downEvent, items, currentIndex, onIndexChange);
    
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('should handle Home and End keys', () => {
    const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
    keyboardNavigation.handleArrowNavigation(homeEvent, items, 1, onIndexChange);
    
    expect(onIndexChange).toHaveBeenCalledWith(0);
    
    const endEvent = new KeyboardEvent('keydown', { key: 'End' });
    keyboardNavigation.handleArrowNavigation(endEvent, items, 0, onIndexChange);
    
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });
});

describe('screenReader', () => {
  it('should generate descriptive text', () => {
    const description = screenReader.generateDescription({
      type: 'button',
      state: 'pressed',
      position: { current: 1, total: 3 },
      content: 'Save'
    });
    
    expect(description).toBe('button, pressed, 1 จาก 3, Save');
  });

  it('should create live region', () => {
    const liveRegion = screenReader.createLiveRegion('test-region', 'assertive');
    
    const element = document.getElementById('test-region');
    expect(element).toBeTruthy();
    expect(element?.getAttribute('aria-live')).toBe('assertive');
    
    liveRegion.announce('Test announcement');
    expect(element?.textContent).toBe('Test announcement');
    
    liveRegion.remove();
    expect(document.getElementById('test-region')).toBeFalsy();
  });
});

describe('touchAccessibility', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('button');
    element.style.width = '48px';
    element.style.height = '48px';
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should validate touch target size', () => {
    // Mock getBoundingClientRect
    element.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 48,
      height: 48,
      top: 0,
      left: 0,
      bottom: 48,
      right: 48
    });
    
    expect(touchAccessibility.validateTouchTarget(element)).toBe(true);
    
    // Test small target
    element.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 30,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 30
    });
    
    expect(touchAccessibility.validateTouchTarget(element)).toBe(false);
  });

  it('should add touch feedback', () => {
    const cleanup = touchAccessibility.addTouchFeedback(element);
    
    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart');
    element.dispatchEvent(touchStartEvent);
    
    expect(element.classList.contains('touch-active')).toBe(true);
    
    // Simulate touch end
    const touchEndEvent = new TouchEvent('touchend');
    element.dispatchEvent(touchEndEvent);
    
    expect(element.classList.contains('touch-active')).toBe(false);
    
    cleanup();
  });
});

describe('reducedMotion', () => {
  it('should detect reduced motion preference', () => {
    // Mock matchMedia to return reduced motion preference
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    
    expect(reducedMotion.prefersReducedMotion()).toBe(true);
  });

  it('should conditionally apply animations', () => {
    const element = document.createElement('div');
    
    // Mock no reduced motion preference
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    
    reducedMotion.conditionalAnimation(element, 'animate-bounce');
    expect(element.classList.contains('animate-bounce')).toBe(true);
  });
});
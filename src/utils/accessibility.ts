/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

// Focus management utilities
export const focusManagement = {
  /**
   * Trap focus within a container element
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  },

  /**
   * Announce content to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },

  /**
   * Manage focus restoration
   */
  saveFocus: () => {
    const activeElement = document.activeElement as HTMLElement;
    return () => {
      if (activeElement && activeElement.focus) {
        activeElement.focus();
      }
    };
  }
};

// Color contrast utilities
export const colorContrast = {
  /**
   * Calculate color contrast ratio
   */
  getContrastRatio: (color1: string, color2: string): number => {
    const getLuminance = (color: string): number => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      
      const [r, g, b] = rgb.map(c => {
        const val = parseInt(c) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  },

  /**
   * Check if contrast meets WCAG AA standards
   */
  meetsWCAGAA: (color1: string, color2: string, isLargeText = false): boolean => {
    const ratio = colorContrast.getContrastRatio(color1, color2);
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
  }
};

// Keyboard navigation utilities
export const keyboardNavigation = {
  /**
   * Handle arrow key navigation in lists
   */
  handleArrowNavigation: (
    event: KeyboardEvent,
    items: NodeListOf<HTMLElement> | HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void
  ) => {
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      default:
        return;
    }
    
    event.preventDefault();
    onIndexChange(newIndex);
    (items[newIndex] as HTMLElement).focus();
  },

  /**
   * Create roving tabindex for component groups
   */
  createRovingTabindex: (container: HTMLElement, selector: string) => {
    const items = container.querySelectorAll(selector) as NodeListOf<HTMLElement>;
    let currentIndex = 0;

    // Set initial tabindex
    items.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1;
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      keyboardNavigation.handleArrowNavigation(
        event,
        items,
        currentIndex,
        (newIndex) => {
          items[currentIndex].tabIndex = -1;
          items[newIndex].tabIndex = 0;
          currentIndex = newIndex;
        }
      );
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }
};

// Screen reader utilities
export const screenReader = {
  /**
   * Generate descriptive text for complex UI elements
   */
  generateDescription: (element: {
    type: string;
    state?: string;
    position?: { current: number; total: number };
    content?: string;
  }): string => {
    const { type, state, position, content } = element;
    
    let description = type;
    
    if (state) {
      description += `, ${state}`;
    }
    
    if (position) {
      description += `, ${position.current} จาก ${position.total}`;
    }
    
    if (content) {
      description += `, ${content}`;
    }
    
    return description;
  },

  /**
   * Create live region for dynamic content updates
   */
  createLiveRegion: (id: string, priority: 'polite' | 'assertive' = 'polite') => {
    let liveRegion = document.getElementById(id);
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = id;
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
    
    return {
      announce: (message: string) => {
        if (liveRegion) {
          liveRegion.textContent = message;
        }
      },
      remove: () => {
        if (liveRegion && liveRegion.parentNode) {
          liveRegion.parentNode.removeChild(liveRegion);
        }
      }
    };
  }
};

// Touch accessibility for mobile
export const touchAccessibility = {
  /**
   * Ensure minimum touch target size (44px)
   */
  validateTouchTarget: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44;
  },

  /**
   * Add touch feedback for better accessibility
   */
  addTouchFeedback: (element: HTMLElement) => {
    const handleTouchStart = () => {
      element.classList.add('touch-active');
    };
    
    const handleTouchEnd = () => {
      element.classList.remove('touch-active');
    };
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }
};

// Reduced motion utilities
export const reducedMotion = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Apply animation only if motion is not reduced
   */
  conditionalAnimation: (element: HTMLElement, animationClass: string) => {
    if (!reducedMotion.prefersReducedMotion()) {
      element.classList.add(animationClass);
    }
  }
};
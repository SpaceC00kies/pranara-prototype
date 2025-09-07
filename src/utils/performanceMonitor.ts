/**
 * Performance monitoring utilities
 * Tracks Core Web Vitals and accessibility performance
 */

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
}

interface AccessibilityMetrics {
  focusTime?: number;
  screenReaderAnnouncements?: number;
  keyboardNavigationTime?: number;
  touchTargetViolations?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private a11yMetrics: AccessibilityMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.trackPageLoad();
  }

  private initializeObservers() {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Core Web Vitals observer
    if ('PerformanceObserver' in window) {
      try {
        // LCP Observer
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);

        // FID Observer
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
            if ('processingStart' in fidEntry) {
              this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);

        // CLS Observer
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            const clsEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if ('hadRecentInput' in clsEntry && 'value' in clsEntry && !clsEntry.hadRecentInput) {
              this.metrics.cls = (this.metrics.cls || 0) + clsEntry.value;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);

        // Navigation timing
        const navigationObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            const navEntry = entry as PerformanceEntry & { 
              responseStart: number; 
              requestStart: number;
              domContentLoadedEventEnd: number;
              domContentLoadedEventStart: number;
              loadEventEnd: number;
              loadEventStart: number;
            };
            if ('responseStart' in navEntry && 'requestStart' in navEntry) {
              this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
            }
            if ('domContentLoadedEventEnd' in navEntry && 'domContentLoadedEventStart' in navEntry) {
              this.metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
            }
            if ('loadEventEnd' in navEntry && 'loadEventStart' in navEntry) {
              this.metrics.loadComplete = navEntry.loadEventEnd - navEntry.loadEventStart;
            }
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  private trackPageLoad() {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Track FCP
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.fcp = fcpEntry.startTime;
      }
    }

    // Track DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.domContentLoaded = performance.now();
      });
    } else {
      this.metrics.domContentLoaded = performance.now();
    }

    // Track full load
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        this.metrics.loadComplete = performance.now();
      });
    } else {
      this.metrics.loadComplete = performance.now();
    }
  }

  // Accessibility performance tracking
  trackFocusTime(startTime: number) {
    const focusTime = performance.now() - startTime;
    this.a11yMetrics.focusTime = focusTime;
    
    // Warn if focus takes too long
    if (focusTime > 100) {
      console.warn(`Slow focus time: ${focusTime}ms`);
    }
  }

  trackScreenReaderAnnouncement() {
    this.a11yMetrics.screenReaderAnnouncements = (this.a11yMetrics.screenReaderAnnouncements || 0) + 1;
  }

  trackKeyboardNavigation(startTime: number) {
    const navTime = performance.now() - startTime;
    this.a11yMetrics.keyboardNavigationTime = navTime;
    
    // Warn if navigation is slow
    if (navTime > 50) {
      console.warn(`Slow keyboard navigation: ${navTime}ms`);
    }
  }

  trackTouchTargetViolation() {
    this.a11yMetrics.touchTargetViolations = (this.a11yMetrics.touchTargetViolations || 0) + 1;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics & AccessibilityMetrics {
    return { ...this.metrics, ...this.a11yMetrics };
  }

  // Check if metrics meet performance budgets
  checkPerformanceBudgets(): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    // Core Web Vitals thresholds
    if (this.metrics.lcp && this.metrics.lcp > 2500) {
      violations.push(`LCP too slow: ${this.metrics.lcp}ms (should be < 2500ms)`);
    }

    if (this.metrics.fid && this.metrics.fid > 100) {
      violations.push(`FID too slow: ${this.metrics.fid}ms (should be < 100ms)`);
    }

    if (this.metrics.cls && this.metrics.cls > 0.1) {
      violations.push(`CLS too high: ${this.metrics.cls} (should be < 0.1)`);
    }

    if (this.metrics.fcp && this.metrics.fcp > 1800) {
      violations.push(`FCP too slow: ${this.metrics.fcp}ms (should be < 1800ms)`);
    }

    // Accessibility performance thresholds
    if (this.a11yMetrics.focusTime && this.a11yMetrics.focusTime > 100) {
      violations.push(`Focus time too slow: ${this.a11yMetrics.focusTime}ms (should be < 100ms)`);
    }

    if (this.a11yMetrics.keyboardNavigationTime && this.a11yMetrics.keyboardNavigationTime > 50) {
      violations.push(`Keyboard navigation too slow: ${this.a11yMetrics.keyboardNavigationTime}ms (should be < 50ms)`);
    }

    if (this.a11yMetrics.touchTargetViolations && this.a11yMetrics.touchTargetViolations > 0) {
      violations.push(`Touch target violations: ${this.a11yMetrics.touchTargetViolations}`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  // Send metrics to analytics (if configured)
  sendMetrics() {
    const metrics = this.getMetrics();
    const budget = this.checkPerformanceBudgets();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.table(metrics);
      console.log('Budget Check:', budget);
      console.groupEnd();
    }

    // Send to analytics service (implement based on your analytics provider)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // Google Analytics 4 example
      (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag('event', 'performance_metrics', {
        custom_parameter_1: metrics.lcp,
        custom_parameter_2: metrics.fid,
        custom_parameter_3: metrics.cls,
        custom_parameter_4: budget.passed ? 'pass' : 'fail'
      });
    }
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Font loading performance
export const trackFontLoading = () => {
  if (typeof window === 'undefined' || !('fonts' in document)) return;
  
  if ('fonts' in document) {
    const startTime = performance.now();
    
    document.fonts.ready.then(() => {
      const fontLoadTime = performance.now() - startTime;
      console.log(`Fonts loaded in ${fontLoadTime}ms`);
      
      // Warn if fonts take too long
      if (fontLoadTime > 3000) {
        console.warn(`Slow font loading: ${fontLoadTime}ms`);
      }
    });
  }
};

// Image loading performance
export const trackImageLoading = () => {
  if (typeof window === 'undefined') return;
  
  const images = document.querySelectorAll('img');
  let loadedImages = 0;
  const startTime = performance.now();

  images.forEach(img => {
    if (img.complete) {
      loadedImages++;
    } else {
      img.addEventListener('load', () => {
        loadedImages++;
        if (loadedImages === images.length) {
          const imageLoadTime = performance.now() - startTime;
          console.log(`All images loaded in ${imageLoadTime}ms`);
        }
      });
    }
  });
};

// Bundle size monitoring
export const trackBundleSize = () => {
  if (typeof window === 'undefined') return;
  
  if ('performance' in window && 'getEntriesByType' in performance) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;

    resources.forEach(resource => {
      if (resource.transferSize) {
        totalSize += resource.transferSize;
        
        if (resource.name.endsWith('.js')) {
          jsSize += resource.transferSize;
        } else if (resource.name.endsWith('.css')) {
          cssSize += resource.transferSize;
        }
      }
    });

    console.log('Bundle sizes:', {
      total: `${(totalSize / 1024).toFixed(2)} KB`,
      javascript: `${(jsSize / 1024).toFixed(2)} KB`,
      css: `${(cssSize / 1024).toFixed(2)} KB`
    });

    // Warn if bundles are too large
    if (jsSize > 250 * 1024) { // 250KB
      console.warn(`JavaScript bundle too large: ${(jsSize / 1024).toFixed(2)} KB`);
    }
  }
};

// Create singleton instance only on client side
export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null;

// Auto-track on page load
if (typeof window !== 'undefined' && performanceMonitor) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.sendMetrics();
      trackFontLoading();
      trackImageLoading();
      trackBundleSize();
    }, 1000);
  });
}
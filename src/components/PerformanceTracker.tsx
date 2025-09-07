/**
 * Performance tracking component
 * Monitors Core Web Vitals and accessibility performance
 */

'use client';

import { useEffect } from 'react';
import { performanceMonitor } from '@/utils/performanceMonitor';

export default function PerformanceTracker() {
  useEffect(() => {
    // Only run on client side
    if (!performanceMonitor) return;
    
    // Initialize performance monitoring
    const cleanup = () => {
      performanceMonitor?.disconnect();
    };

    // Track initial page load
    if (document.readyState === 'complete') {
      setTimeout(() => {
        performanceMonitor?.sendMetrics();
      }, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          performanceMonitor?.sendMetrics();
        }, 1000);
      });
    }

    // Track focus performance
    const trackFocusPerformance = () => {
      let focusStartTime: number;
      
      document.addEventListener('focusin', () => {
        focusStartTime = performance.now();
      });
      
      document.addEventListener('focusout', () => {
        if (focusStartTime && performanceMonitor) {
          performanceMonitor.trackFocusTime(focusStartTime);
        }
      });
    };

    // Track keyboard navigation performance
    const trackKeyboardPerformance = () => {
      let keydownTime: number;
      
      document.addEventListener('keydown', (e) => {
        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.key)) {
          keydownTime = performance.now();
        }
      });
      
      document.addEventListener('keyup', (e) => {
        if (keydownTime && performanceMonitor && ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.key)) {
          performanceMonitor.trackKeyboardNavigation(keydownTime);
        }
      });
    };

    // Track touch target violations
    const trackTouchTargets = () => {
      const checkTouchTargets = () => {
        const interactiveElements = document.querySelectorAll('button, a, input, textarea, [tabindex]');
        
        interactiveElements.forEach(element => {
          const rect = element.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            performanceMonitor?.trackTouchTargetViolation();
            console.warn('Touch target too small:', element, `${rect.width}x${rect.height}`);
          }
        });
      };

      // Check on load and after DOM changes
      checkTouchTargets();
      
      const observer = new MutationObserver(() => {
        setTimeout(checkTouchTargets, 100);
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      return () => observer.disconnect();
    };

    trackFocusPerformance();
    trackKeyboardPerformance();
    const touchTargetCleanup = trackTouchTargets();

    return () => {
      cleanup();
      touchTargetCleanup();
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
/**
 * Comprehensive accessibility audit tests
 * WCAG 2.1 AA compliance verification
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test('should pass WCAG 2.1 AA compliance on homepage', async ({ page }) => {
    // Check for accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    });
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    expect(headings.length).toBeGreaterThan(0);
    
    // Ensure h1 exists and is unique
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    
    // Check heading content
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toContain('ใบบุญ');
  });

  test('should have proper color contrast ratios', async ({ page }) => {
    // Test specific color combinations
    const violations = await getViolations(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    expect(violations).toHaveLength(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // Test Enter key on focused button
    const button = page.locator('button').first();
    await button.focus();
    await page.keyboard.press('Enter');
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check for proper ARIA attributes
    const violations = await getViolations(page, null, {
      rules: {
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'aria-required-attr': { enabled: true },
        'button-name': { enabled: true },
        'input-button-name': { enabled: true }
      }
    });
    
    expect(violations).toHaveLength(0);
  });

  test('should support screen readers', async ({ page }) => {
    // Check for screen reader only content
    const srOnlyElements = await page.locator('.sr-only').all();
    
    for (const element of srOnlyElements) {
      const text = await element.textContent();
      expect(text).toBeTruthy();
      expect(text!.trim().length).toBeGreaterThan(0);
    }
    
    // Check for proper live regions
    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);
  });

  test('should have accessible forms', async ({ page }) => {
    // Check form accessibility
    const violations = await getViolations(page, null, {
      rules: {
        'label': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'input-image-alt': { enabled: true }
      }
    });
    
    expect(violations).toHaveLength(0);
    
    // Test form input
    const input = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await expect(input).toBeVisible();
    
    // Check for proper labeling
    const inputId = await input.getAttribute('id');
    if (inputId) {
      const label = page.locator(`label[for="${inputId}"]`);
      await expect(label).toBeVisible();
    }
  });

  test('should handle focus management properly', async ({ page }) => {
    // Test focus trap (if modal exists)
    const modal = page.locator('[role="dialog"]');
    if (await modal.count() > 0) {
      await modal.first().waitFor({ state: 'visible' });
      
      // Test focus trap
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      
      // Focus should be within modal
      const isWithinModal = await focusedElement.evaluate((el, modalEl) => {
        return modalEl.contains(el);
      }, await modal.first().elementHandle());
      
      expect(isWithinModal).toBe(true);
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Test with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Check that animations are disabled or reduced
    const animatedElements = await page.locator('.animate-spin, .animate-pulse, .animate-bounce').all();
    
    for (const element of animatedElements) {
      const animationDuration = await element.evaluate(el => {
        return window.getComputedStyle(el).animationDuration;
      });
      
      // Should be very short or none
      expect(['0s', '0.01ms'].some(duration => animationDuration.includes(duration))).toBe(true);
    }
  });

  test('should have proper touch targets for mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check touch target sizes
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Test with forced colors (high contrast mode)
    await page.emulateMedia({ forcedColors: 'active' });
    
    // Check that content is still visible and accessible
    await checkA11y(page, null, {
      tags: ['wcag2aa'],
      rules: {
        'color-contrast': { enabled: false } // Disabled in forced colors mode
      }
    });
  });

  test('should handle Thai language properly', async ({ page }) => {
    // Check language attributes
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('th');
    
    // Check Thai text rendering
    const thaiText = page.locator('text=ใบบุญ');
    await expect(thaiText).toBeVisible();
    
    // Check font loading for Thai characters
    const fontFamily = await thaiText.evaluate(el => {
      return window.getComputedStyle(el).fontFamily;
    });
    
    expect(fontFamily).toMatch(/Prompt|Sarabun/);
  });

  test('should provide proper error messaging', async ({ page }) => {
    // Test error state accessibility
    const input = page.locator('textarea');
    
    // Try to submit empty form (if validation exists)
    await page.locator('button[type="submit"]').click();
    
    // Check for error messages
    const errorMessages = await page.locator('[role="alert"], .error-message, [aria-invalid="true"]').all();
    
    if (errorMessages.length > 0) {
      for (const error of errorMessages) {
        const text = await error.textContent();
        expect(text).toBeTruthy();
        expect(text!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should support voice control and speech recognition', async ({ page }) => {
    // Check for proper button names and labels
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const accessibleName = await button.evaluate(el => {
        // Get accessible name (aria-label, aria-labelledby, or text content)
        return el.getAttribute('aria-label') || 
               el.textContent?.trim() || 
               el.getAttribute('title') || '';
      });
      
      expect(accessibleName.length).toBeGreaterThan(0);
    }
  });

  test('should handle dynamic content updates', async ({ page }) => {
    // Type a message to trigger dynamic content
    const input = page.locator('textarea');
    await input.fill('สวัสดีครับ');
    await page.locator('button[type="submit"]').click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check that new content is announced to screen readers
    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);
    
    // Check for proper message structure
    const messages = await page.locator('[role="group"]').all();
    expect(messages.length).toBeGreaterThan(0);
  });

  test('should provide skip links for navigation', async ({ page }) => {
    // Check for skip links
    const skipLinks = await page.locator('a[href^="#"]').all();
    
    if (skipLinks.length > 0) {
      for (const link of skipLinks) {
        const href = await link.getAttribute('href');
        const targetId = href?.substring(1);
        
        if (targetId) {
          const target = page.locator(`#${targetId}`);
          await expect(target).toBeVisible();
        }
      }
    }
  });

  test('should maintain focus visibility', async ({ page }) => {
    // Test focus visibility on all interactive elements
    const interactiveElements = await page.locator('button, input, textarea, a, [tabindex]').all();
    
    for (const element of interactiveElements) {
      await element.focus();
      
      // Check if focus is visible (outline or other focus indicator)
      const focusStyles = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
          border: styles.border
        };
      });
      
      // Should have some form of focus indicator
      const hasFocusIndicator = 
        focusStyles.outline !== 'none' ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow.includes('ring') ||
        focusStyles.border.includes('blue');
      
      expect(hasFocusIndicator).toBe(true);
    }
  });
});

test.describe('Performance Accessibility', () => {
  test('should load quickly for assistive technologies', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds for good accessibility
    expect(loadTime).toBeLessThan(3000);
  });

  test('should not have excessive DOM nodes', async ({ page }) => {
    await page.goto('/');
    
    const domNodeCount = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });
    
    // Keep DOM size reasonable for screen readers
    expect(domNodeCount).toBeLessThan(1500);
  });

  test('should have efficient focus management', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    
    // Tab through several elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    
    const tabTime = Date.now() - startTime;
    
    // Focus changes should be fast
    expect(tabTime).toBeLessThan(1000);
  });
});
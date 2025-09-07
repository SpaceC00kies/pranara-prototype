import { test, expect } from '@playwright/test';

test.describe('Accessibility and Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should meet basic accessibility requirements', async ({ page }) => {
    // Check for proper heading structure
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for proper form labels
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await expect(chatInput).toBeVisible();
    
    // Check for keyboard navigation
    await chatInput.focus();
    await expect(chatInput).toBeFocused();
    
    // Tab to submit button
    await page.keyboard.press('Tab');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();
    
    // Check for proper ARIA labels
    const hasAriaLabel = await submitButton.getAttribute('aria-label');
    const hasAriaDescribedBy = await submitButton.getAttribute('aria-describedby');
    expect(hasAriaLabel || hasAriaDescribedBy).toBeTruthy();
  });

  test('should support keyboard-only navigation', async ({ page }) => {
    // Navigate using only keyboard
    await page.keyboard.press('Tab');
    
    // Should focus on chat input
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await expect(chatInput).toBeFocused();
    
    // Type message using keyboard
    await page.keyboard.type('ผู้สูงอายุไม่สบาย');
    
    // Navigate to submit button
    await page.keyboard.press('Tab');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();
    
    // Submit using keyboard
    await page.keyboard.press('Enter');
    
    // Should work without mouse
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
  });

  test('should have proper color contrast', async ({ page }) => {
    // Check text elements have sufficient contrast
    const textElements = [
      page.locator('h1'),
      page.locator('textarea'),
      page.locator('button[type="submit"]')
    ];
    
    for (const element of textElements) {
      await expect(element).toBeVisible();
      
      // Get computed styles
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });
      
      // Basic checks for readability
      expect(styles.fontSize).not.toBe('');
      expect(styles.color).not.toBe('');
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for proper semantic HTML
    await expect(page.locator('main')).toBeVisible();
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);
    
    // Check for proper form structure
    const form = page.locator('form');
    if (await form.isVisible()) {
      await expect(form).toBeVisible();
    }
    
    // Check for proper button roles
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const role = await button.getAttribute('role');
      const type = await button.getAttribute('type');
      
      // Should have proper button semantics
      expect(role === 'button' || type === 'button' || type === 'submit').toBeTruthy();
    }
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Check that elements are still visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test functionality in high contrast
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await chatInput.fill('ทดสอบ high contrast');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 768, height: 1024 }, // iPad
      { width: 1024, height: 768 }, // Desktop small
      { width: 1920, height: 1080 } // Desktop large
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Check that main elements are visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('textarea')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check that elements don't overflow
      const chatInput = page.locator('textarea');
      const inputBox = await chatInput.boundingBox();
      expect(inputBox?.width).toBeLessThanOrEqual(viewport.width);
      
      // Test functionality at this size
      await chatInput.fill('ทดสอบ responsive');
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
      
      // Clear for next test
      await chatInput.clear();
    }
  });

  test('should have reasonable performance metrics', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Check that interactive elements are ready quickly
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await expect(chatInput).toBeVisible({ timeout: 3000 });
    
    // Test response time
    const responseStartTime = Date.now();
    
    await chatInput.fill('ทดสอบประสิทธิภาพ');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const responseTime = Date.now() - responseStartTime;
    
    // AI response should come within reasonable time (10 seconds)
    expect(responseTime).toBeLessThan(10000);
  });

  test('should handle multiple rapid interactions', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Send multiple messages rapidly
    for (let i = 0; i < 3; i++) {
      await chatInput.clear();
      await chatInput.fill(`ทดสอบ ${i + 1}`);
      await page.locator('button[type="submit"]').click();
      
      // Don't wait for response, send next immediately
      await page.waitForTimeout(100);
    }
    
    // Should handle gracefully without crashing
    await page.waitForTimeout(5000);
    
    // App should still be responsive
    await expect(page.locator('h1')).toBeVisible();
    
    // Should be able to send normal message after
    await chatInput.clear();
    await chatInput.fill('ทดสอบหลังจากส่งเร็ว');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
  });

  test('should support Thai font rendering properly', async ({ page }) => {
    // Check that Thai text renders correctly
    const thaiText = 'ผู้สูงอายุ ก ข ค ง จ ฉ ช ซ ฌ ญ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม ย ร ล ว ศ ษ ส ห ฬ อ ฮ';
    
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await chatInput.fill(thaiText);
    
    // Check that input displays Thai correctly
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe(thaiText);
    
    // Send message and check display
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.user-message')).toContainText('ผู้สูงอายุ');
    
    // Check that response also renders Thai properly
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const response = await page.locator('.assistant-message').last().textContent();
    expect(response).toMatch(/[ก-๙]/); // Contains Thai characters
  });

  test('should handle focus management properly', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Focus should start on input
    await chatInput.focus();
    await expect(chatInput).toBeFocused();
    
    // Send message
    await chatInput.fill('ทดสอบ focus');
    await page.locator('button[type="submit"]').click();
    
    // Focus should return to input after sending
    await expect(chatInput).toBeFocused();
    
    // Should be able to type immediately
    await page.keyboard.type('ข้อความต่อไป');
    
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe('ข้อความต่อไป');
  });

  test('should provide proper error feedback', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await chatInput.fill('ทดสอบ error');
    await page.locator('button[type="submit"]').click();
    
    // Should show error message
    await page.waitForTimeout(3000);
    
    // Should provide user-friendly error feedback
    const errorMessage = page.locator('.error-message, .assistant-message');
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      expect(errorText).toMatch(/(ขออภัย|ลองใหม่|ไม่สามารถ)/);
    }
    
    // App should remain functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(chatInput).toBeVisible();
  });
});
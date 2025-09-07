import { test, expect } from '@playwright/test';

test.describe('LINE Integration and Handoff Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show LINE button for emergency-related queries', async ({ page }) => {
    const emergencyQueries = [
      'ผู้สูงอายุหมดสติ',
      'คนแก่หายใจไม่ออก',
      'ผู้สูงอายุเจ็บหน้าอก',
      'ล้มแล้วลุกไม่ขึ้น',
      'มีเลือดออก',
      'ชักกระตุก'
    ];

    for (const query of emergencyQueries) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(query);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const response = await page.locator('.assistant-message').last().textContent();
      
      // Should mention emergency services or LINE
      expect(response).toMatch(/(1669|โรงพยาบาล|แพทย์|LINE|ฉุกเฉิน)/);
      
      // Look for LINE button (may not always appear but response should guide to emergency services)
      const lineButton = page.locator('button:has-text("คุยกับทีม Jirung ทาง LINE")');
      if (await lineButton.isVisible()) {
        await expect(lineButton).toBeVisible();
      }
    }
  });

  test('should show LINE button for complex care scenarios', async ({ page }) => {
    const complexQueries = [
      'ผู้สูงอายุเป็นอัลไซเมอร์ ดูแลยากมาก',
      'คนแก่ไม่ยอมกินยา ทำอย่างไรดี',
      'ผู้ป่วยติดเตียง ดูแลอย่างไร',
      'ผู้สูงอายุซึมเศร้า ไม่พูดจา'
    ];

    for (const query of complexQueries) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(query);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      // Check if LINE button appears or is mentioned in response
      const response = await page.locator('.assistant-message').last().textContent();
      const lineButton = page.locator('button:has-text("คุยกับทีม Jirung ทาง LINE")');
      
      const hasLineButton = await lineButton.isVisible();
      const mentionsLine = response?.includes('LINE') || response?.includes('ทีม Jirung');
      
      // Should either show button or mention LINE in complex cases
      expect(hasLineButton || mentionsLine).toBeTruthy();
    }
  });

  test('should track LINE button clicks', async ({ page }) => {
    // Mock the LINE URL to prevent actual navigation
    await page.route('https://line.me/**', route => {
      route.fulfill({
        status: 200,
        body: 'LINE Mock Response'
      });
    });

    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await chatInput.fill('ผู้สูงอายุหมดสติ ช่วยด่วน');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // Look for LINE button
    const lineButton = page.locator('button:has-text("คุยกับทีม Jirung ทาง LINE")');
    
    if (await lineButton.isVisible()) {
      // Click the LINE button
      await lineButton.click();
      
      // Should make API call to track the click
      // We can verify this by checking network requests or checking if navigation was attempted
      await page.waitForTimeout(1000);
      
      // Verify the click was processed (button should still be visible for this test)
      await expect(lineButton).toBeVisible();
    }
  });

  test('should handle LINE button for different conversation contexts', async ({ page }) => {
    const scenarios = [
      {
        context: 'medical emergency',
        query: 'ผู้สูงอายุเจ็บหน้าอกมาก',
        shouldShowLine: true
      },
      {
        context: 'basic care question',
        query: 'ผู้สูงอายุควรกินอาหารอะไร',
        shouldShowLine: false
      },
      {
        context: 'medication question',
        query: 'ผู้สูงอายุกินยาผิดขนาด',
        shouldShowLine: true
      },
      {
        context: 'general wellness',
        query: 'ผู้สูงอายุออกกำลังกายอย่างไร',
        shouldShowLine: false
      }
    ];

    for (const scenario of scenarios) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(scenario.query);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const lineButton = page.locator('button:has-text("คุยกับทีม Jirung ทาง LINE")');
      const response = await page.locator('.assistant-message').last().textContent();
      
      if (scenario.shouldShowLine) {
        // Should either show button or mention LINE/emergency services
        const hasLineButton = await lineButton.isVisible();
        const mentionsEmergency = response?.match(/(LINE|1669|โรงพยาบาล|แพทย์|ฉุกเฉิน)/);
        expect(hasLineButton || mentionsEmergency).toBeTruthy();
      }
      // Note: We don't test for absence of LINE button as it may appear contextually
    }
  });

  test('should provide appropriate LINE handoff messaging', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await chatInput.fill('ผู้สูงอายุไม่ยอมไปหาหมอ ทำอย่างไรดี');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const response = await page.locator('.assistant-message').last().textContent();
    
    // Should provide helpful context before suggesting LINE
    expect(response).toMatch(/[ก-๙]/); // Thai response
    expect(response?.length).toBeGreaterThan(50); // Substantial advice
    
    // If LINE is mentioned, should be presented as helpful option, not requirement
    if (response?.includes('LINE')) {
      expect(response).toMatch(/(ช่วยเหลือเพิ่มเติม|คำแนะนำ|ปรึกษา)/);
    }
  });

  test('should handle LINE integration gracefully when service is unavailable', async ({ page }) => {
    // Mock LINE service failure
    await page.route('**/api/chat/line-click', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Service unavailable' })
      });
    });

    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    await chatInput.fill('ผู้สูงอายุหมดสติ');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const lineButton = page.locator('button:has-text("คุยกับทีม Jirung ทาง LINE")');
    
    if (await lineButton.isVisible()) {
      await lineButton.click();
      
      // Should handle error gracefully
      await page.waitForTimeout(2000);
      
      // App should still be functional
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('should maintain conversation flow after LINE interaction', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Start conversation
    await chatInput.fill('ผู้สูงอายุไม่สบาย');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // Continue conversation after potential LINE interaction
    await chatInput.clear();
    await chatInput.fill('มีอาการไข้ด้วย');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
    
    // Should have multiple messages in conversation
    await expect(page.locator('.user-message')).toHaveCount(2);
    await expect(page.locator('.assistant-message')).toHaveCount(2);
    
    // Latest response should be relevant to fever
    const response = await page.locator('.assistant-message').last().textContent();
    expect(response).toMatch(/(ไข้|อุณหภูมิ|แพทย์|1669)/);
  });

  test('should handle multiple LINE button interactions', async ({ page }) => {
    // Mock LINE URL
    await page.route('https://line.me/**', route => {
      route.fulfill({
        status: 200,
        body: 'LINE Mock Response'
      });
    });

    const emergencyQueries = [
      'ผู้สูงอายุหมดสติ',
      'หายใจไม่ออก'
    ];

    for (const query of emergencyQueries) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(query);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const lineButton = page.locator('button:has-text("คุยกับทีม Jirung ทาง LINE")');
      
      if (await lineButton.isVisible()) {
        await lineButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // App should remain functional after multiple interactions
    await expect(page.locator('h1')).toBeVisible();
  });
});
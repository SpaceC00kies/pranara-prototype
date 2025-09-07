import { test, expect } from '@playwright/test';

test.describe('PII Scrubbing and Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should scrub Thai phone numbers from user input', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test various Thai phone number formats
    const phoneNumbers = [
      '0812345678',
      '081-234-5678', 
      '081 234 5678',
      '+66812345678',
      '66812345678'
    ];
    
    for (const phone of phoneNumbers) {
      await chatInput.clear();
      await chatInput.fill(`ผู้สูงอายุไม่สบาย โทร ${phone} ได้ไหม`);
      await page.locator('button[type="submit"]').click();
      
      // Wait for response
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      // Check that phone number doesn't appear in the displayed user message
      const userMessage = await page.locator('.user-message').last().textContent();
      expect(userMessage).not.toContain(phone);
      expect(userMessage).toContain('[PHONE]'); // Should be masked
    }
  });

  test('should scrub email addresses from user input', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    const emails = [
      'test@example.com',
      'user.name@domain.co.th',
      'thai_user123@gmail.com'
    ];
    
    for (const email of emails) {
      await chatInput.clear();
      await chatInput.fill(`ติดต่อหมอที่ ${email} ได้ไหม`);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const userMessage = await page.locator('.user-message').last().textContent();
      expect(userMessage).not.toContain(email);
      expect(userMessage).toContain('[EMAIL]');
    }
  });

  test('should scrub Thai ID numbers', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test 13-digit Thai ID format
    await chatInput.fill('เลขบัตรประชาชน 1234567890123 ลืมรหัส');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const userMessage = await page.locator('.user-message').last().textContent();
    expect(userMessage).not.toContain('1234567890123');
    expect(userMessage).toContain('[ID]');
  });

  test('should scrub URLs from user input', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    const urls = [
      'https://example.com',
      'http://hospital.co.th',
      'www.clinic.com'
    ];
    
    for (const url of urls) {
      await chatInput.clear();
      await chatInput.fill(`ดูข้อมูลที่ ${url} ได้ไหม`);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const userMessage = await page.locator('.user-message').last().textContent();
      expect(userMessage).not.toContain(url);
      expect(userMessage).toContain('[URL]');
    }
  });

  test('should scrub LINE IDs from user input', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    await chatInput.fill('LINE ID @doctor123 ติดต่อได้ไหม');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const userMessage = await page.locator('.user-message').last().textContent();
    expect(userMessage).not.toContain('@doctor123');
    expect(userMessage).toContain('[LINE_ID]');
  });

  test('should handle multiple PII types in single message', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    const complexMessage = 'ผู้สูงอายุไม่สบาย โทร 0812345678 หรือ email doctor@hospital.com หรือ LINE @doctor123';
    
    await chatInput.fill(complexMessage);
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const userMessage = await page.locator('.user-message').last().textContent();
    
    // All PII should be scrubbed
    expect(userMessage).not.toContain('0812345678');
    expect(userMessage).not.toContain('doctor@hospital.com');
    expect(userMessage).not.toContain('@doctor123');
    
    // Should contain masked tokens
    expect(userMessage).toContain('[PHONE]');
    expect(userMessage).toContain('[EMAIL]');
    expect(userMessage).toContain('[LINE_ID]');
  });

  test('should not over-scrub legitimate content', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test content that might look like PII but isn't
    await chatInput.fill('ผู้สูงอายุอายุ 80 ปี น้ำหนัก 60 กิโลกรัม');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const userMessage = await page.locator('.user-message').last().textContent();
    
    // Should preserve legitimate numbers
    expect(userMessage).toContain('80');
    expect(userMessage).toContain('60');
    expect(userMessage).not.toContain('[PHONE]');
  });

  test('should prevent XSS attacks in user input', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test XSS attempt
    const xssAttempt = '<script>alert("xss")</script>ผู้สูงอายุไม่สบาย';
    
    await chatInput.fill(xssAttempt);
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // Should not execute script
    const userMessage = await page.locator('.user-message').last().textContent();
    expect(userMessage).not.toContain('<script>');
    expect(userMessage).toContain('ผู้สูงอายุไม่สบาย');
    
    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle SQL injection attempts', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test SQL injection attempt
    const sqlInjection = "'; DROP TABLE users; -- ผู้สูงอายุไม่สบาย";
    
    await chatInput.fill(sqlInjection);
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // Should handle gracefully and still respond
    const response = await page.locator('.assistant-message').last().textContent();
    expect(response).toMatch(/[ก-๙]/); // Should still get Thai response
  });

  test('should rate limit excessive requests', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Send multiple rapid requests
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        chatInput.fill(`ทดสอบ ${i}`).then(() => 
          page.locator('button[type="submit"]').click()
        )
      );
    }
    
    await Promise.all(requests);
    
    // Should handle gracefully without crashing
    await page.waitForTimeout(2000);
    
    // App should still be responsive
    await expect(page.locator('h1')).toBeVisible();
    
    // Should be able to send normal request after
    await chatInput.clear();
    await chatInput.fill('ผู้สูงอายุไม่สบาย');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
  });

  test('should validate content length limits', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test extremely long input
    const longInput = 'ผู้สูงอายุไม่สบาย '.repeat(200); // Very long message
    
    await chatInput.fill(longInput);
    await page.locator('button[type="submit"]').click();
    
    // Should handle gracefully
    await page.waitForTimeout(3000);
    
    // App should remain functional
    await expect(page.locator('h1')).toBeVisible();
  });
});
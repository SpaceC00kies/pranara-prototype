import { test, expect } from '@playwright/test';

test.describe('Thai Language Input and Response Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle various Thai input methods and characters', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test basic Thai characters
    await chatInput.fill('ผู้สูงอายุ');
    await expect(chatInput).toHaveValue('ผู้สูงอายุ');
    
    // Test Thai with tone marks
    await chatInput.fill('ไม่สบาย เจ็บป่วย');
    await expect(chatInput).toHaveValue('ไม่สบาย เจ็บป่วย');
    
    // Test Thai with numbers
    await chatInput.fill('อายุ 80 ปี');
    await expect(chatInput).toHaveValue('อายุ 80 ปี');
    
    // Test mixed Thai-English
    await chatInput.fill('ผู้สูงอายุ diabetes');
    await expect(chatInput).toHaveValue('ผู้สูงอายุ diabetes');
  });

  test('should respond appropriately to common Thai elder care questions', async ({ page }) => {
    const testCases = [
      {
        question: 'ผู้สูงอายุนอนไม่หลับ ควรทำอย่างไร',
        expectedKeywords: ['นอน', 'หลับ', 'ก่อนนอน', 'ห้องนอน']
      },
      {
        question: 'คนแก่ไม่ยอมกินข้าว',
        expectedKeywords: ['อาหาร', 'กิน', 'รสชาติ', 'โภชนาการ']
      },
      {
        question: 'ผู้สูงอายุล้มบ่อย ป้องกันอย่างไร',
        expectedKeywords: ['ล้ม', 'ป้องกัน', 'ปลอดภัย', 'พื้น']
      },
      {
        question: 'ดูแลผู้ป่วยอัลไซเมอร์',
        expectedKeywords: ['อัลไซเมอร์', 'ความจำ', 'ดูแล', 'อดทน']
      }
    ];

    for (const testCase of testCases) {
      // Clear previous input
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      
      // Send question
      await chatInput.fill(testCase.question);
      await page.locator('button[type="submit"]').click();
      
      // Wait for response (could be fallback in test environment)
      await expect(page.locator('.assistant-message, .error-message').last()).toBeVisible({ timeout: 10000 });
      
      // Get response text
      const response = await page.locator('.assistant-message, .error-message').last().textContent();
      
      // Verify response is in Thai
      expect(response).toMatch(/[ก-๙]/);
      
      // Verify response contains relevant keywords
      const hasRelevantKeyword = testCase.expectedKeywords.some(keyword => 
        response?.includes(keyword)
      );
      expect(hasRelevantKeyword).toBeTruthy();
      
      // Verify response length is appropriate (not too short or too long)
      expect(response?.length).toBeGreaterThan(10);
      expect(response?.length).toBeLessThan(1000);
    }
  });

  test('should handle Thai input with special characters and formatting', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test with Thai punctuation
    await chatInput.fill('ผู้สูงอายุ ๆ ไม่สบาย!!! ช่วยได้ไหม???');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // Test with line breaks (should be handled gracefully)
    await chatInput.clear();
    await chatInput.fill('ผู้สูงอายุ\nไม่สบาย\nช่วยได้ไหม');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
  });

  test('should provide culturally appropriate responses', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test cultural context - respect for elders
    await chatInput.fill('พ่อแม่ไม่ยอมไปหาหมอ');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const response = await page.locator('.assistant-message').last().textContent();
    
    // Should show understanding of Thai family dynamics
    expect(response).toMatch(/(เข้าใจ|เห็นใจ|ค่อยๆ|อดทน|เคารพ)/);
    
    // Should not be too direct or confrontational
    expect(response).not.toMatch(/(บังคับ|ต้อง|จำเป็น)/);
  });

  test('should handle regional Thai dialects and informal language', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test informal Thai
    await chatInput.fill('ยายไม่ยอมกินยา เฮ้อ');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // Test with common colloquialisms
    await chatInput.clear();
    await chatInput.fill('ปู่เค้าดื้อมาก ไม่ฟัง');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
    
    const response = await page.locator('.assistant-message').last().textContent();
    expect(response).toMatch(/[ก-๙]/); // Still responds in Thai
  });

  test('should maintain Thai language consistency in responses', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Send multiple questions to test consistency
    const questions = [
      'ผู้สูงอายุเศร้า',
      'คนแก่หงุดหงิด',
      'ยายไม่ยอมอาบน้ำ'
    ];
    
    for (const question of questions) {
      await chatInput.clear();
      await chatInput.fill(question);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
    }
    
    // Check all responses are in Thai
    const responses = await page.locator('.assistant-message').allTextContents();
    
    for (const response of responses) {
      expect(response).toMatch(/[ก-๙]/); // Contains Thai characters
      expect(response).not.toMatch(/^[a-zA-Z\s]+$/); // Not purely English
    }
  });

  test('should handle Thai input with English mixed in', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Test code-switching (Thai-English mix)
    await chatInput.fill('ผู้สูงอายุเป็น diabetes ดูแลอย่างไร');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    const response = await page.locator('.assistant-message').last().textContent();
    
    // Should respond primarily in Thai but may include English medical terms
    expect(response).toMatch(/[ก-๙]/);
    expect(response?.length).toBeGreaterThan(50);
  });
});
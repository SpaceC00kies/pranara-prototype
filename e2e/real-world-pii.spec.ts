import { test, expect } from '@playwright/test';

test.describe('Real-World PII Pattern Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should scrub realistic Thai personal information patterns', async ({ page }) => {
    const realWorldPIIExamples = [
      {
        input: 'ผู้สูงอายุชื่อ นาย สมชาย ใจดี อายุ 75 ปี โทร 081-234-5678',
        expectedMasked: ['081-234-5678'],
        shouldContain: ['[PHONE]']
      },
      {
        input: 'คุณยาย มีอีเมล somchai.jaidee@gmail.com ติดต่อได้',
        expectedMasked: ['somchai.jaidee@gmail.com'],
        shouldContain: ['[EMAIL]']
      },
      {
        input: 'เลขบัตรประชาชน 1-1234-56789-01-2 ลืมรหัสผ่าน',
        expectedMasked: ['1123456789012'],
        shouldContain: ['[ID]']
      },
      {
        input: 'LINE ID @doctor_somchai หรือ @nurse123 ติดต่อได้',
        expectedMasked: ['@doctor_somchai', '@nurse123'],
        shouldContain: ['[LINE_ID]']
      },
      {
        input: 'ดูข้อมูลเพิ่มเติมที่ https://hospital.co.th/patient/12345',
        expectedMasked: ['https://hospital.co.th/patient/12345'],
        shouldContain: ['[URL]']
      }
    ];

    for (const example of realWorldPIIExamples) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(example.input);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const userMessage = await page.locator('.user-message').last().textContent();
      
      // Verify PII is masked
      for (const maskedItem of example.expectedMasked) {
        expect(userMessage).not.toContain(maskedItem);
      }
      
      // Verify replacement tokens are present
      for (const token of example.shouldContain) {
        expect(userMessage).toContain(token);
      }
    }
  });

  test('should handle complex mixed PII scenarios', async ({ page }) => {
    const complexScenarios = [
      {
        description: 'Hospital contact information',
        input: 'โรงพยาบาล ABC โทร 02-123-4567 หรือ emergency@hospital.co.th หรือ LINE @hospital_abc',
        piiCount: 3 // phone, email, LINE ID
      },
      {
        description: 'Family contact details',
        input: 'ลูกชายโทร 081-111-2222 หรือ daughter@company.com บัตรประชาชน 1234567890123',
        piiCount: 3 // phone, email, ID
      },
      {
        description: 'Medical appointment info',
        input: 'นัดหมอวันจันทร์ โทร 089-999-8888 ยืนยันที่ confirm@clinic.th',
        piiCount: 2 // phone, email
      }
    ];

    for (const scenario of complexScenarios) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(scenario.input);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const userMessage = await page.locator('.user-message').last().textContent();
      
      // Count replacement tokens
      const phoneTokens = (userMessage?.match(/\[PHONE\]/g) || []).length;
      const emailTokens = (userMessage?.match(/\[EMAIL\]/g) || []).length;
      const idTokens = (userMessage?.match(/\[ID\]/g) || []).length;
      const lineTokens = (userMessage?.match(/\[LINE_ID\]/g) || []).length;
      const urlTokens = (userMessage?.match(/\[URL\]/g) || []).length;
      
      const totalTokens = phoneTokens + emailTokens + idTokens + lineTokens + urlTokens;
      
      // Should have expected number of PII replacements
      expect(totalTokens).toBeGreaterThanOrEqual(scenario.piiCount);
    }
  });

  test('should preserve legitimate medical and care information', async ({ page }) => {
    const legitimateContent = [
      {
        input: 'ผู้สูงอายุอายุ 80 ปี น้ำหนัก 65 กิโลกรัม ส่วนสูง 160 เซนติเมตร',
        shouldPreserve: ['80', '65', '160']
      },
      {
        input: 'ความดัน 120/80 mmHg น้ำตาลในเลือด 100 mg/dl',
        shouldPreserve: ['120', '80', '100']
      },
      {
        input: 'กินยาเวลา 8.00 น. 12.00 น. และ 18.00 น.',
        shouldPreserve: ['8.00', '12.00', '18.00']
      },
      {
        input: 'ห้องเลขที่ 301 ชั้น 3 อาคาร A',
        shouldPreserve: ['301', '3']
      }
    ];

    for (const example of legitimateContent) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(example.input);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const userMessage = await page.locator('.user-message').last().textContent();
      
      // Should preserve legitimate numbers and information
      for (const item of example.shouldPreserve) {
        expect(userMessage).toContain(item);
      }
      
      // Should not have excessive masking
      expect(userMessage).not.toContain('[PHONE][PHONE]'); // No double masking
    }
  });

  test('should handle edge cases in PII detection', async ({ page }) => {
    const edgeCases = [
      {
        description: 'Phone numbers in different formats',
        inputs: [
          '081-234-5678',
          '081 234 5678', 
          '0812345678',
          '+66812345678',
          '66-81-234-5678'
        ]
      },
      {
        description: 'Email variations',
        inputs: [
          'user@domain.com',
          'user.name@domain.co.th',
          'user+tag@domain.org',
          'user_123@sub.domain.com'
        ]
      },
      {
        description: 'Thai ID number formats',
        inputs: [
          '1234567890123',
          '1-2345-67890-12-3',
          '1 2345 67890 12 3'
        ]
      }
    ];

    for (const edgeCase of edgeCases) {
      for (const input of edgeCase.inputs) {
        const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
        await chatInput.clear();
        await chatInput.fill(`ผู้สูงอายุติดต่อ ${input} ได้ไหม`);
        await page.locator('button[type="submit"]').click();
        
        await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
        
        const userMessage = await page.locator('.user-message').last().textContent();
        
        // Should not contain the original PII
        expect(userMessage).not.toContain(input);
        
        // Should contain appropriate replacement token
        const hasReplacementToken = userMessage?.includes('[PHONE]') || 
                                   userMessage?.includes('[EMAIL]') || 
                                   userMessage?.includes('[ID]') ||
                                   userMessage?.includes('[LINE_ID]') ||
                                   userMessage?.includes('[URL]');
        
        expect(hasReplacementToken).toBeTruthy();
      }
    }
  });

  test('should handle PII in Thai context and language patterns', async ({ page }) => {
    const thaiContextPII = [
      {
        input: 'คุณหมอโทรศัพท์ 02-123-4567 นะครับ',
        context: 'Doctor phone number'
      },
      {
        input: 'พยาบาลส่งอีเมล nurse@hospital.co.th มาแล้ว',
        context: 'Nurse email'
      },
      {
        input: 'เลขบัตรประชาชนคุณยาย 1234567890123 ค่ะ',
        context: 'Grandmother ID number'
      },
      {
        input: 'ไลน์หมอ @doctor_thai ติดต่อได้ตลอด',
        context: 'Doctor LINE ID'
      },
      {
        input: 'เว็บไซต์โรงพยาบาล www.hospital.co.th ดูได้',
        context: 'Hospital website'
      }
    ];

    for (const example of thaiContextPII) {
      const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
      await chatInput.clear();
      await chatInput.fill(example.input);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      const userMessage = await page.locator('.user-message').last().textContent();
      
      // Should preserve Thai context words
      expect(userMessage).toMatch(/[ก-๙]/); // Contains Thai characters
      
      // Should mask PII but preserve context
      const hasThaiContext = userMessage?.includes('คุณหมอ') || 
                            userMessage?.includes('พยาบาล') || 
                            userMessage?.includes('คุณยาย') || 
                            userMessage?.includes('หมอ') ||
                            userMessage?.includes('โรงพยาบาล');
      
      expect(hasThaiContext).toBeTruthy();
      
      // Should have appropriate masking
      const hasMasking = userMessage?.includes('[PHONE]') || 
                        userMessage?.includes('[EMAIL]') || 
                        userMessage?.includes('[ID]') ||
                        userMessage?.includes('[LINE_ID]') ||
                        userMessage?.includes('[URL]');
      
      expect(hasMasking).toBeTruthy();
    }
  });

  test('should maintain conversation quality after PII scrubbing', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="พิมพ์คำถาม"]');
    
    // Send message with PII
    await chatInput.fill('ผู้สูงอายุไม่สบาย โทร 081-234-5678 ได้ไหม');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // Check that AI still provides relevant response despite PII scrubbing
    const response = await page.locator('.assistant-message').last().textContent();
    
    // Should still be relevant to elder care
    expect(response).toMatch(/(ผู้สูงอายุ|ไม่สบาย|ดูแล|แพทย์)/);
    
    // Should be in Thai
    expect(response).toMatch(/[ก-๙]/);
    
    // Should be substantial response
    expect(response?.length).toBeGreaterThan(50);
    
    // Continue conversation to test flow
    await chatInput.clear();
    await chatInput.fill('มีไข้ด้วย');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
    
    const followUpResponse = await page.locator('.assistant-message').last().textContent();
    
    // Should respond appropriately to fever
    expect(followUpResponse).toMatch(/(ไข้|อุณหภูมิ|แพทย์|1669)/);
  });
});
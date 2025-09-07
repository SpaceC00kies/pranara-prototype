/**
 * Admin Dashboard Debug Test
 * This test reproduces the issue with the admin dashboard getting stuck on "Authenticating..."
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Debug', () => {
  test('should debug admin login issue', async ({ page }) => {
    // Listen for console logs and network requests
    const consoleLogs: string[] = [];
    const networkRequests: { url: string; status?: number; response?: any }[] = [];
    
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/admin/stats')) {
        try {
          const responseBody = await response.text();
          networkRequests.push({
            url: response.url(),
            status: response.status(),
            response: responseBody
          });
        } catch (error) {
          networkRequests.push({
            url: response.url(),
            status: response.status(),
            response: `Error reading response: ${error}`
          });
        }
      }
    });

    // Navigate to admin page
    await page.goto('http://localhost:3000/admin');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Jirung Admin Dashboard');
    
    // Check initial state
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Get the initial button text
    const initialButtonText = await page.locator('button[type="submit"]').textContent();
    console.log('Initial button text:', initialButtonText);
    
    // Fill in the password
    await page.fill('input[type="password"]', 'adminjirung1234Aa!');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait a bit to see what happens
    await page.waitForTimeout(2000);
    
    // Check button state after submission
    const buttonAfterSubmit = await page.locator('button[type="submit"]').textContent();
    console.log('Button text after submit:', buttonAfterSubmit);
    
    // Check if button is disabled
    const isButtonDisabled = await page.locator('button[type="submit"]').isDisabled();
    console.log('Button disabled:', isButtonDisabled);
    
    // Wait longer to see if anything changes
    await page.waitForTimeout(5000);
    
    // Check final button state
    const finalButtonText = await page.locator('button[type="submit"]').textContent();
    console.log('Final button text:', finalButtonText);
    
    // Check if we're still on the login page or if we've moved to the dashboard
    const isStillOnLogin = await page.locator('text=Enter admin password to access analytics').isVisible();
    console.log('Still on login page:', isStillOnLogin);
    
    // Check for any error messages
    const errorMessages = await page.locator('[class*="error"], [class*="red"]').allTextContents();
    console.log('Error messages:', errorMessages);
    
    // Print all console logs
    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
    
    // Print all network requests
    console.log('\n=== Network Requests ===');
    networkRequests.forEach(req => {
      console.log(`URL: ${req.url}`);
      console.log(`Status: ${req.status}`);
      console.log(`Response: ${req.response}`);
      console.log('---');
    });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'admin-dashboard-debug.png', fullPage: true });
    
    // If we're stuck on "Authenticating...", let's check the network tab
    if (finalButtonText?.includes('Authenticating')) {
      console.log('\n=== ISSUE CONFIRMED: Stuck on Authenticating ===');
      
      // Check if the API request was made
      if (networkRequests.length === 0) {
        console.log('ERROR: No API requests were made to /api/admin/stats');
      } else {
        console.log('API requests were made, checking responses...');
        networkRequests.forEach((req, index) => {
          console.log(`Request ${index + 1}:`);
          console.log(`  Status: ${req.status}`);
          console.log(`  Response: ${req.response}`);
        });
      }
    }
  });
  
  test('should test API endpoint directly', async ({ request }) => {
    // Test the API endpoint directly
    console.log('\n=== Testing API Endpoint Directly ===');
    
    try {
      const response = await request.get('http://localhost:3000/api/admin/stats', {
        headers: {
          'Authorization': 'Bearer adminjirung1234Aa!'
        }
      });
      
      console.log('API Response Status:', response.status());
      console.log('API Response Headers:', await response.allHeaders());
      
      const responseBody = await response.text();
      console.log('API Response Body:', responseBody);
      
      if (response.status() === 200) {
        console.log('✅ API endpoint is working correctly');
      } else {
        console.log('❌ API endpoint returned error status');
      }
      
    } catch (error) {
      console.log('❌ API request failed:', error);
    }
  });
});
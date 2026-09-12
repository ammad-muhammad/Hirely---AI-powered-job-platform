import { test, expect } from '@playwright/test';

test.describe('Real Browser Signup to MongoDB Verification', () => {
  const timestamp = Date.now();
  const testEmail = `browser_user_${timestamp}@testdomain.com`;
  const testPassword = 'Password123!';
  const testFullName = `Browser User ${timestamp}`;

  test('Signup via browser UI and verify backend database record creation', async ({ page }) => {
    console.log(`\n======================================================`);
    console.log(`[TEST RUN] Starting real browser signup for: ${testEmail}`);
    console.log(`======================================================\n`);

    let signupPayloadData: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('/auth/signup')) {
        try {
          const body = await response.json().catch(() => null);
          signupPayloadData = body;
          console.log(`[REAL BROWSER POST /auth/signup RESPONSE] Status: ${response.status()}`);
          console.log(`[REAL BROWSER POST /auth/signup BODY]:`, JSON.stringify(body, null, 2));
        } catch (e) {
          console.log(`[READ ERROR]`, e);
        }
      }
    });

    // 1. Navigate to signup page
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    // 2. Fill form fields
    await page.fill('input[name="fullName"]', testFullName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Select role button
    const findJobBtn = page.locator('button:has-text("Find a Job")').first();
    if (await findJobBtn.isVisible()) {
      await findJobBtn.click();
    }

    // 3. Click Create Account submit button
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 4. Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log(`\n[UI REDIRECT SUCCESS] Successfully redirected to: ${page.url()}`);

    // 5. Check authenticated /auth/me endpoint to verify user record loaded directly from MongoDB
    const meRes = await page.request.get('http://localhost:5000/api/auth/me');
    const meBody = await meRes.json();

    console.log(`\n[AUTHENTICATED /auth/me MONGO DB CHECK] Status: ${meRes.status()}`);
    console.log(`[AUTHENTICATED /auth/me PAYLOAD]:`, JSON.stringify(meBody, null, 2));

    expect(meRes.status()).toBe(200);
    expect(meBody.success).toBe(true);
    expect(meBody.data.email).toBe(testEmail);
    expect(meBody.data.id).toBeTruthy();

    console.log(`\n======================================================`);
    console.log(`✅ VERIFIED: Browser signup created user in MongoDB Atlas!`);
    console.log(`MongoDB ObjectId: ${meBody.data.id}`);
    console.log(`User Email: ${meBody.data.email}`);
    console.log(`Full Name: ${meBody.data.fullName}`);
    console.log(`Role: ${meBody.data.role}`);
    console.log(`======================================================\n`);
  });
});

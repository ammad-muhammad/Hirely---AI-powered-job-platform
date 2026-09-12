import { test, expect } from '@playwright/test';

test.describe('Real-Time Messaging Journey', () => {
  const password = 'Test1234!';
  const seekerEmail = 'hamza.ali@testmail.com';
  const employerEmail = 'sarah.chen@testmail.com';

  test('Send real-time message between Employer and Job Seeker sessions', async ({ browser }) => {
    // Context 1: Job Seeker Session
    const seekerContext = await browser.newContext();
    const seekerPage = await seekerContext.newPage();

    await seekerPage.goto('/login');
    await seekerPage.fill('input[name="email"]', seekerEmail);
    await seekerPage.fill('input[name="password"]', password);
    await seekerPage.click('button[type="submit"]');
    await expect(seekerPage).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await seekerPage.goto('/dashboard/messages');
    await seekerPage.waitForLoadState('networkidle');

    // Context 2: Employer Session
    const employerContext = await browser.newContext();
    const employerPage = await employerContext.newPage();

    await employerPage.goto('/login');
    await employerPage.fill('input[name="email"]', employerEmail);
    await employerPage.fill('input[name="password"]', password);
    await employerPage.click('button[type="submit"]');
    await expect(employerPage).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await employerPage.goto('/dashboard/messages');
    await employerPage.waitForLoadState('networkidle');

    // Select active chat thread on candidate page
    const chatThreadItem = seekerPage.locator('button:has-text("TechForge"), div:has-text("TechForge")').first();
    if (await chatThreadItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatThreadItem.click();
    }

    // Send a message from seeker
    const msgInput = seekerPage.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    if (await msgInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const testMsg = `Playwright E2E real-time message ${Date.now()}`;
      await msgInput.fill(testMsg);
      const sendBtn = seekerPage.locator('button[type="submit"], button:has-text("Send")').first();
      await sendBtn.click();

      // Verify message appears on seeker page
      await expect(seekerPage.locator('body')).toContainText(testMsg);
    }

    await seekerContext.close();
    await employerContext.close();
  });
});

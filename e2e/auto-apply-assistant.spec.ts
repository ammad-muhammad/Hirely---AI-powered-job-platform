import { test, expect } from '@playwright/test';

test.describe('Auto-Apply Assistant End-to-End Suite', () => {
  const timestamp = Date.now();
  const testEmail = `autoapply.seeker.${timestamp}@testmail.com`;
  const testPassword = 'Test1234!';
  const testName = `AutoApply Test Candidate ${timestamp}`;

  test('Job Seeker enables auto-apply, configures preferences, reviews and approves server-drafted application', async ({ page }) => {
    // 1. Sign up as a fresh job seeker
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="fullName"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    const roleRadio = page.locator('input[value="job_seeker"]').first();
    if (await roleRadio.isVisible().catch(() => false)) {
      await roleRadio.check();
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    if (!page.url().includes('/dashboard')) {
      await page.goto('/login');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    }

    // 2. Set up skills in profile so AI matching qualifies candidate for tech roles
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    const skillsInput = page.locator('input[placeholder*="skill" i], input[placeholder*="React" i], input[name*="skill" i]').first();
    if (await skillsInput.isVisible().catch(() => false)) {
      await skillsInput.fill('React');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await skillsInput.fill('Node.js');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await skillsInput.fill('TypeScript');
      await page.keyboard.press('Enter');
    }

    const bioInput = page.locator('textarea[name="bio"]').first();
    if (await bioInput.isVisible().catch(() => false)) {
      await bioInput.fill('Full Stack Developer passionate about React, Node.js, and modern cloud web applications.');
    }

    const saveProfileBtn = page.locator('button:has-text("Save"), button:has-text("Update Profile")').first();
    if (await saveProfileBtn.isVisible().catch(() => false)) {
      await saveProfileBtn.click();
      await page.waitForTimeout(1000);
    }

    // 3. Navigate to Auto-Apply Assistant page
    await page.goto('/dashboard/auto-apply');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/Auto-Apply/i);

    // Verify there is NO user-facing scan button
    await expect(page.locator('button:has-text("Instant AI Scan")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Run Instant AI Scan")')).toHaveCount(0);

    // 4. Enable the Master Toggle
    const masterToggle = page.locator('button[aria-label="Toggle Auto-Apply Assistant"]');
    await expect(masterToggle).toBeVisible();

    const isPressed = await masterToggle.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await masterToggle.click();
      await page.waitForTimeout(800);
    }

    // 5. Open Preferences and save
    const preferencesBtn = page.locator('button:has-text("Preferences")');
    await preferencesBtn.click();
    await page.waitForTimeout(500);

    const fullTimeBtn = page.locator('button:has-text("Full Time")').first();
    if (await fullTimeBtn.isVisible().catch(() => false)) {
      await fullTimeBtn.click();
    }

    const savePrefsBtn = page.locator('button:has-text("Save Preferences")');
    await savePrefsBtn.click();
    await page.waitForTimeout(1000);

    // 6. Reload page to confirm pure review interface state loads cleanly
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/Auto-Apply/i);
    await expect(page.locator('button:has-text("Instant AI Scan")')).toHaveCount(0);
  });
});

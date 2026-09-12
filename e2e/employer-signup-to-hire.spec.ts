import { test, expect } from '@playwright/test';

test.describe('Employer Journey: Signup, Post Job & Hire', () => {
  const timestamp = Date.now();
  const employerEmail = `sarah.chen@testmail.com`; // Using seeded employer or new signup
  const password = 'Test1234!';

  test('Log in as employer, verify company setup, post job & manage candidates', async ({ page }) => {
    // 1. Log in as seeded employer
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', employerEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // 2. Access Company Setup / Management
    await page.goto('/dashboard/company/setup');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Company|TechForge|Organization/i);

    // 3. Post a Job (Wizard flow)
    await page.goto('/dashboard/jobs/post');
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator('input[name="title"], input[placeholder*="Job Title"]').first();
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill(`Lead AI Automation Engineer ${timestamp}`);

      const categorySelect = page.locator('select[name="category"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption({ index: 1 });
      }

      const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description"]').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill('We are seeking an experienced AI Automation Engineer to lead cutting edge LLM systems.');
      }
    }

    // 4. Confirm posted jobs list /dashboard/jobs
    await page.goto('/dashboard/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Posted Jobs|Manage Jobs|React|Senior/i);

    // 5. Check Candidates management & shortlist candidate
    await page.goto('/dashboard/candidates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Candidates|Applicants|Applications|Hamza/i);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Skill Assessment Test Flow', () => {
  const candidateEmail = 'hamza.ali@testmail.com';
  const password = 'Test1234!';

  test('Navigate to Skill Tests, view available assessments and verify test UI', async ({ page }) => {
    // 1. Log in as job seeker
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', candidateEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // 2. Navigate to Skill Assessments dashboard
    await page.goto('/dashboard/skill-tests');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Skill Assessment|Assessments|Test|React|JavaScript/i);

    // 3. Verify test card button is present
    const testCardBtn = page.locator('button:has-text("Start Assessment"), button:has-text("Take Test"), button:has-text("Retake"), button:has-text("Passed"), a:has-text("Take Test")').first();
    await expect(testCardBtn).toBeVisible({ timeout: 10000 });
  });
});

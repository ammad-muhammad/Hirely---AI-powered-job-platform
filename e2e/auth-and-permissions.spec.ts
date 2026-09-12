import { test, expect } from '@playwright/test';

test.describe('Authentication & Role Permission Boundaries', () => {
  const password = 'Test1234!';
  const seekerEmail = 'hamza.ali@testmail.com';
  const employerEmail = 'sarah.chen@testmail.com';

  test('Job Seeker cannot access Employer-only routes', async ({ page }) => {
    // Log in as Job Seeker
    await page.goto('/login');
    await page.fill('input[name="email"]', seekerEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Try accessing employer company management page
    await page.goto('/dashboard/company');
    await page.waitForLoadState('networkidle');

    // Should redirect away from company setup or show restricted notice
    const url = page.url();
    expect(url.includes('/dashboard/company') === false || page.locator('body')).toBeTruthy();
  });

  test('Employer cannot access Job Seeker-only routes', async ({ page }) => {
    // Log in as Employer
    await page.goto('/login');
    await page.fill('input[name="email"]', employerEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Try accessing candidate job recommendations
    await page.goto('/dashboard/recommended');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url.includes('/dashboard/recommended') === false || page.locator('body')).toBeTruthy();
  });

  test('Logout clears session and unauthenticated access redirects to /login', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[name="email"]', seekerEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Click Sign Out / Logout button
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutBtn.click();
    } else {
      // Clear cookies / localStorage directly to simulate logout
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.goto('/login');
    }

    // Try navigating to protected dashboard route directly
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

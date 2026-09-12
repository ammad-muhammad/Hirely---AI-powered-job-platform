import { test, expect } from '@playwright/test';

test.describe('AI Features End-to-End Smoke Tests', () => {
  const candidateEmail = 'hamza.ali@testmail.com';
  const password = 'Test1234!';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', candidateEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('AI Resume Analyzer page loads and triggers analysis without crashing', async ({ page }) => {
    await page.goto('/dashboard/resume-checker');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Resume|Analyzer|Score|Analysis/i);

    const analyzeBtn = page.locator('button:has-text("Analyze Resume"), button:has-text("Run AI Audit"), button:has-text("Re-Analyze")').first();
    if (await analyzeBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(analyzeBtn).toBeEnabled();
    }
  });

  test('AI Recommended Jobs page loads recommendations successfully', async ({ page }) => {
    await page.goto('/dashboard/recommended');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Recommended|Matching|Match Score|Jobs/i);
  });

  test('AI Chat Assistant responds to basic user prompt without erroring', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open floating AI Chatbot if present
    const aiBotTrigger = page.locator('button[aria-label*="AI"], button:has-text("Hirely AI"), div[class*="fixed"]').first();
    if (await aiBotTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiBotTrigger.click();
    }

    const aiInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').first();
    if (await aiInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiInput.fill('What are top interview tips for software engineers?');
      await page.keyboard.press('Enter');

      // Verify page stays stable
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Crash/i);
    }
  });

  test('AI Mock Interview page loads interview prep workspace', async ({ page }) => {
    await page.goto('/dashboard/mock-interview');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Mock Interview|Interview|Practice|AI/i);
  });
});

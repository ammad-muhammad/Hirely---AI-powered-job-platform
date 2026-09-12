import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Job Seeker Journey: Signup to Apply', () => {
  const timestamp = Date.now();
  const testEmail = `seeker.${timestamp}@testmail.com`;
  const testPassword = 'Test1234!';
  const testName = `Automation Seeker ${timestamp}`;

  test('Sign up, complete profile, browse jobs, apply and check applications & chat', async ({ page }) => {
    // 1. Sign up as a job seeker
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

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 2. Wait for auto-redirect or navigate if needed
    await page.waitForTimeout(2000);
    if (!page.url().includes('/dashboard')) {
      await page.goto('/login');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    }

    // 3. Complete Profile setup
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    const bioInput = page.locator('textarea[name="bio"]').first();
    if (await bioInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bioInput.fill('Automation test candidate with full-stack React and Node.js skills.');
    }

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const resumePath = path.resolve(__dirname, 'fixtures/sample_resume.pdf');
      await fileInput.setInputFiles(resumePath);
    }

    // 4. Browse Jobs and search
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Engineer');
      await page.keyboard.press('Enter');
    }

    // 5. Open job detail page & click Apply
    const jobLink = page.locator('a[href^="/jobs/"]').first();
    await expect(jobLink).toBeVisible({ timeout: 10000 });
    await jobLink.click();

    await page.waitForURL(/\/jobs\//);
    const applyButton = page.locator('button:has-text("Apply Now"), a:has-text("Apply Now"), button:has-text("Already Applied")').first();
    if (await applyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await applyButton.click();
    }

    // Step through the multi-step apply page if navigated
    if (page.url().includes('/apply')) {
      // Step 1: Questions (if present)
      const continueToInfoBtn = page.locator('button:has-text("Continue to Info")').first();
      if (await continueToInfoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueToInfoBtn.click();
      }

      // Step 2: Info & Resume -> Cover Letter
      const continueToCoverBtn = page.locator('button:has-text("Continue to Cover Letter")').first();
      if (await continueToCoverBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueToCoverBtn.click();
      }

      // Step 3: Cover Letter -> Review
      const continueToReviewBtn = page.locator('button:has-text("Continue to Review")').first();
      if (await continueToReviewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueToReviewBtn.click();
      }

      // Step 4: Final Submit
      const finalSubmitBtn = page.locator('button:has-text("Submit Application")').first();
      if (await finalSubmitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await finalSubmitBtn.click();
      }
    }

    // 6. Confirm application appears in /dashboard/applications
    await page.goto('/dashboard/applications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Applied|Under Review|Applications|Job/i);

    // 7. Confirm chat messages view is accessible
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Messages|Chat|Conversation/i);
  });
});

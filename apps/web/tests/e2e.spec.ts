import { test, expect } from '@playwright/test';

test.describe('Clustro.app End-to-End User Flow', () => {
  test('landing page loads and allows 1-click test login', async ({ page }) => {
    await page.goto('/');

    // Check title and branding
    await expect(page.getByText('Clustro.app')).toBeVisible();
    await expect(page.getByText('One shared ledger for')).toBeVisible();

    // Click quick login for Meera Sharma
    await page.getByRole('button', { name: /Meera Sharma/i }).click();

    // Wait for Home Screen
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByText('Meera Sharma')).toBeVisible();

    // Check clusters
    await expect(page.getByText('Sharma Ghar')).toBeVisible();
  });

  test('navigates to cluster, opens Settle Up, and checks rollups', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Meera Sharma/i }).click();

    // Open Sharma Ghar
    await page.getByText('Sharma Ghar').click();

    // Verify Total Cluster Expense is visible
    await expect(page.getByText('Total Cluster Expense')).toBeVisible();

    // Open Settle Up
    await page.getByRole('button', { name: /Settle Up/i }).click();

    // Verify modal header
    await expect(page.getByText('Settle Up & Ledger Balances')).toBeVisible();
    await expect(page.getByText('Suggested Payments')).toBeVisible();

    // Close modal
    await page.getByLabel('Close dialog').click();
  });

  test('switches tabs and checks My Ledger view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Meera Sharma/i }).click();

    // Click My Ledger tab
    await page.getByRole('button', { name: 'My Ledger' }).click();

    // Verify personal overview cards
    await expect(page.getByText('You Paid')).toBeVisible();
    await expect(page.getByText('Your Share')).toBeVisible();
    await expect(page.getByText('Net Position')).toBeVisible();
  });
});

import { expect, test } from '@playwright/test';

test('visitor can use replay, navigate interactions, and load the lazy 3D stage', async ({
  page,
}) => {
  await page.goto('/gallery/landmarks');
  await page.getByRole('button', { name: 'Try replay' }).click();
  await expect(page.getByText(/synthetic replay/i)).toBeVisible();
  await expect(page.getByText(/2 hands/i).first()).toBeVisible();
  await page.getByRole('link', { name: /spatial cards/i }).click();
  await expect(page.getByText('Captured object')).toBeVisible();
  await page.goto('/gallery/orientation');
  await expect(page.getByLabel('Procedural 3D hand orientation exhibit')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('camera worker initializes with same-origin runtime assets', async ({ page, baseURL }) => {
  const thirdParty: string[] = [];
  const localOrigin = new URL(baseURL ?? 'http://127.0.0.1:45456').origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== localOrigin)
      thirdParty.push(request.url());
  });
  await page.goto('/gallery/gestures');
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('No runtime errors.')).toBeVisible();
  expect(thirdParty).toEqual([]);
  await page.getByRole('button', { name: 'Stop' }).click();
});

test('required fallback interactions are keyboard reachable', async ({ page }) => {
  await page.goto('/gallery/two-hand');
  const card = page.getByText('Captured object').locator('..');
  await card.focus();
  await page.keyboard.press('ArrowRight');
  await expect(card).toHaveCSS('transform', /matrix/);
  await page.goto('/gallery/drag');
  const movable = page.getByRole('button', { name: /grab this module/i });
  await movable.focus();
  await page.keyboard.press('ArrowDown');
  await expect(movable).toHaveCSS('transform', /matrix/);
});

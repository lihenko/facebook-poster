import { Page } from 'playwright';

export async function hasPendingPost(page: Page): Promise<boolean> {
  const pendingText = 'Очікує схвалення адміністратора';

  const count = await page.getByText(pendingText, {
    exact: false,
  }).count();

  console.log(`Pending text occurrences: ${count}`);

  return count > 0;
}
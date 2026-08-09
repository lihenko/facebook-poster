import { chromium, BrowserContext } from 'playwright';
import path from 'node:path';

const profilePath = path.resolve('data/browser-profile');

export async function launchBrowser(): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chrome',
    headless: false,
    viewport: null,
  });

  return context;
}
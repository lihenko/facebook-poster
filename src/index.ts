import { launchBrowser } from './browser';
import { groups } from './groups';
import { posts } from './posts';
import { getImages } from './images';
import { randomDelay, randomItem } from './random';
import { hasPendingPost } from './group-check';

import {
  openComposer,
  fillPostText,
  attachPostImage,
  publishPost,
} from './composer';

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  // Отримуємо всі доступні зображення
  const images = getImages();

  if (images.length === 0) {
    throw new Error('No images found in data/images');
  }

  if (posts.length === 0) {
    throw new Error('No posts found in posts.ts');
  }

  console.log(`Found ${groups.length} groups.`);
  console.log(`Found ${posts.length} posts.`);
  console.log(`Found ${images.length} images.`);

  // Зображення, які вже використовувалися в цьому запуску
  const usedImages = new Set<string>();

  for (const [index, groupUrl] of groups.entries()) {
    console.log('\n----------------------------------------');
    console.log(`[${index + 1}/${groups.length}] Opening group:`);
    console.log(groupUrl);
    console.log('----------------------------------------');

    try {
      // Відкриваємо групу
      await page.goto(groupUrl, {
        waitUntil: 'domcontentloaded',
      });

      console.log('Page loaded.');

      // Чекаємо 10 секунд після завантаження групи
      console.log('Waiting 10 seconds...');

      await page.waitForTimeout(10_000);

      // Перевіряємо pending-пост
      const pendingPost = await hasPendingPost(page);

      if (pendingPost) {
        console.log(
          '⚠️ Pending post found: "Очікує схвалення адміністратора"'
        );

        console.log('Skipping group.');

        // Якщо є неопублікований пост — відразу наступна група
        continue;
      }

      console.log('✅ No pending post found.');
      console.log('Group is ready.');

      // Вибираємо випадковий текст
      const postText = randomItem(posts);

      // Вибираємо випадкове невикористане зображення
      let availableImages = images.filter(
        (image) => !usedImages.has(image)
      );

      // Якщо всі зображення вже використані,
      // очищаємо список використаних
      if (availableImages.length === 0) {
        console.log(
          'All images have been used. Resetting image pool.'
        );

        usedImages.clear();

        availableImages = [...images];
      }

      const image = randomItem(availableImages);

      usedImages.add(image);

      console.log('\n## Selected post:');
      console.log('');
      console.log(postText);

      console.log('\n## Selected image:');
      console.log(image);

      // ==========================================================
      // ВІДКРИВАЄМО FACEBOOK COMPOSER
      // ==========================================================

      const composerOpened = await openComposer(page);

      if (!composerOpened) {
        console.log(
          '❌ Composer was not found. Skipping group.'
        );

        continue;
      }

      console.log('✅ Composer opened.');

      // ==========================================================
      // ДОДАЄМО ТЕКСТ
      // ==========================================================

      const textInserted = await fillPostText(
        page,
        postText
      );

      if (!textInserted) {
        console.log('❌ Could not insert post text.');

        await page.keyboard.press('Escape');

        continue;
      }

      console.log(
        '✅ Text successfully inserted.'
      );

      // ==========================================================
      // ДОДАЄМО ЗОБРАЖЕННЯ
      // ==========================================================

      const imageAttached = await attachPostImage(
        page,
        image
      );

      if (!imageAttached) {
        console.log(
          '❌ Could not attach post image.'
        );

        await page.keyboard.press('Escape');

        continue;
      }

      console.log(
        '✅ Image successfully attached.'
      );

      const published = await publishPost(page);

if (!published) {
  console.log(
    '❌ Could not publish post.'
  );

  await page.keyboard.press('Escape');

  continue;
}

console.log(
  '✅ Post published successfully.'
);

      // ==========================================================
      // ТЕСТ COMPOSER
      // ==========================================================

      console.log(
        '⏸ Composer contains text and image. No post will be published.'
      );

      // Даємо час подивитися результат
      await page.waitForTimeout(5_000);

      console.log(
        'Composer test finished.'
      );

      // Закриваємо composer, не публікуючи пост
      await page.keyboard.press('Escape');

      await page.waitForTimeout(1_000);

      // Пауза перед наступною групою
      if (index < groups.length - 1) {
        const delay = randomDelay(
          30_000,
          50_000
        );

        console.log(
          `Waiting ${Math.round(delay / 1000)} seconds before next group...`
        );

        await page.waitForTimeout(delay);
      }
    } catch (error) {
      console.error(
        '\n❌ Error processing group:'
      );

      console.error(groupUrl);
      console.error(error);

      // При помилці переходимо до наступної групи
      continue;
    }
  }

  console.log(
    '\n========================================'
  );

  console.log(
    'All groups processed.'
  );

  console.log(
    '========================================'
  );

  await browser.close();
}

main().catch((error) => {
  console.error('\nFatal error:');
  console.error(error);

  process.exit(1);
});

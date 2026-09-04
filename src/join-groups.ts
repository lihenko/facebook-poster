import { launchBrowser } from './browser';
import { groups } from './groups';
import { randomDelay } from './random';

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto('https://www.facebook.com/', {
    waitUntil: 'domcontentloaded',
  });

  console.log('\n⏸ Залогіньтесь у Facebook у вікні браузера.');
  console.log('Коли будете готові — натисніть Enter у цьому терміналі...\n');

  await waitForEnter();

  console.log('▶️ Починаю перевірку груп...\n');

  console.log(`Found ${groups.length} groups.`);

  for (const [index, groupUrl] of groups.entries()) {
    console.log('\n----------------------------------------');
    console.log(`[${index + 1}/${groups.length}]`);
    console.log(groupUrl);
    console.log('----------------------------------------');

    try {
      await page.goto(groupUrl, {
        waitUntil: 'domcontentloaded',
      });

      console.log('Page loaded.');
      console.log('Waiting 8 seconds...');

      await page.waitForTimeout(8_000);

      const result = await tryJoinGroup(page);

      console.log(`Result: ${result}`);

      // Пауза між групами
      if (index < groups.length - 1) {
        const delay = randomDelay(10_000, 15_000);

        console.log(
          `Waiting ${Math.round(delay / 1000)} seconds before next group...`
        );

        await page.waitForTimeout(delay);
      }
    } catch (error) {
      console.error('\n❌ Error processing group:');
      console.error(groupUrl);
      console.error(error);

      continue;
    }
  }

  console.log('\n========================================');
  console.log('All groups processed.');
  console.log('========================================');

  await browser.close();
}

async function tryJoinGroup(
  page: import('playwright').Page
): Promise<string> {
  // Якщо вже учасник групи
  const alreadyMember = page.getByText(
    /You joined|Ви приєдналися|Ви є учасником/i
  );

  if (await alreadyMember.count()) {
    return 'ℹ️ Already a member';
  }

  // Основна кнопка приєднання
  const joinButton = page.getByRole('button', {
    name: /Join group|Приєднатися до групи|Приєднатися/i,
  }).first();

  if (await joinButton.count()) {
    const visible = await joinButton.isVisible().catch(() => false);

    if (visible) {
      console.log('🔘 Join button found.');

      await joinButton.click();

      console.log('✅ Join button clicked.');

      // Даємо Facebook час показати результат
      await page.waitForTimeout(3_000);

      // Перевіряємо, чи з'явилися питання
      const questions = page.getByText(
        /questions|питання|answer.*question|відповісти/i
      );

      if (await questions.count()) {
        return '⏳ Join request requires questions';
      }

      return '✅ Join request submitted';
    }
  }

  // Можливо, Facebook уже показав стан очікування
  const pending = page.getByText(
    /Pending|Запит надіслано|Очікує схвалення|Очікується схвалення/i
  );

  if (await pending.count()) {
    return '⏳ Request already pending';
  }

  return '⚠️ Join button not found';
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();

    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

main().catch((error) => {
  console.error('\nFatal error:');
  console.error(error);
  process.exit(1);
});
import { Page } from 'playwright';

export async function openComposer(
  page: Page
): Promise<boolean> {
  console.log('Looking for post composer...');

  const texts = [
    'Напишіть щось...',
    'Напишіть щось',
    'Write something...',
    'Write something',
  ];

  for (const text of texts) {
    const locator = page.getByText(text, {
      exact: true,
    });

    const count = await locator.count();

    console.log(
      `Searching "${text}" — found: ${count}`
    );

    if (count === 0) {
      continue;
    }

    for (let i = 0; i < count; i++) {
      const element = locator.nth(i);

      if (!(await element.isVisible())) {
        continue;
      }

      console.log(
        `Found visible composer text: "${text}"`
      );

      await element.click();

      await page.waitForTimeout(2_000);

      console.log('Composer opened.');

      return true;
    }
  }

  console.log(
    '❌ Composer button not found.'
  );

  return false;
}

/**
 * Вставляє текст у Facebook public post composer.
 *
 * Підтримує:
 *
 * # Заголовок        -> H1
 * ## Заголовок       -> H2
 * **жирний текст**   -> Bold
 * ***жирний текст*** -> Bold
 * звичайний текст    -> звичайний текст
 */
export async function fillPostText(
  page: Page,
  text: string
): Promise<boolean> {
  console.log(
    'Looking for composer text field...'
  );

  /*
   * Шукаємо тільки Lexical editor
   * публічного допису.
   *
   * Коментарі сюди не потраплять.
   */
  const locator = page.locator(
  '[contenteditable="true"][role="textbox"][aria-placeholder="Створіть публічний допис…"][data-lexical-editor="true"]'
);

console.log(
  'Waiting for public post composer text field...'
);

try {
  await locator.first().waitFor({
    state: 'visible',
    timeout: 30_000,
  });

  console.log(
    '✅ Public post composer text field appeared.'
  );
} catch {
  console.log(
    '❌ Public post composer text field did not appear within 10 seconds.'
  );

  return false;
}

const count = await locator.count();

  console.log(
    `Composer text fields found: ${count}`
  );

  if (count === 0) {
    console.log(
      '❌ Public post composer text field not found.'
    );

    return false;
  }

  let editor = null;

  for (let i = 0; i < count; i++) {
    const element = locator.nth(i);

    if (await element.isVisible()) {
      editor = element;
      break;
    }
  }

  if (!editor) {
    console.log(
      '❌ Public post composer is not visible.'
    );

    return false;
  }

  console.log(
    'Found visible public post composer.'
  );

  await editor.click();

  /*
   * Очищаємо editor.
   */
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');

  await page.waitForTimeout(200);

  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n');

  for (
    let lineIndex = 0;
    lineIndex < lines.length;
    lineIndex++
  ) {
    const line = lines[lineIndex];

    console.log(
      `Processing line ${lineIndex + 1}/${lines.length}: "${line}"`
    );

    /*
     * ------------------------------------------------------
     * H1
     * ------------------------------------------------------
     */

    if (/^#\s+/.test(line)) {
      const headingText = line.replace(
        /^#\s+/,
        ''
      );

      console.log(
        'Formatting line as H1.'
      );

      await page.keyboard.type('#');
      await page.keyboard.press('Space');

      await insertFormattedInlineText(
        page,
        headingText
      );

      if (lineIndex < lines.length - 1) {
        await page.keyboard.press(
          'Enter'
        );
      }

      continue;
    }

    /*
     * ------------------------------------------------------
     * H2
     * ------------------------------------------------------
     */

    if (/^##\s+/.test(line)) {
      const headingText = line.replace(
        /^##\s+/,
        ''
      );

      console.log(
        'Formatting line as H2.'
      );

      await page.keyboard.type('##');
      await page.keyboard.press('Space');

      await insertFormattedInlineText(
        page,
        headingText
      );

      if (lineIndex < lines.length - 1) {
        await page.keyboard.press(
          'Enter'
        );
      }

      continue;
    }

    /*
     * ------------------------------------------------------
     * Порожній рядок
     * ------------------------------------------------------
     */

    if (line.trim() === '') {
      if (lineIndex < lines.length - 1) {
        await page.keyboard.press(
          'Enter'
        );
      }

      continue;
    }

    /*
     * ------------------------------------------------------
     * Звичайний текст + Bold
     * ------------------------------------------------------
     */

    await insertFormattedInlineText(
      page,
      line
    );

    if (lineIndex < lines.length - 1) {
      await page.keyboard.press(
        'Enter'
      );
    }
  }

  console.log(
    '✅ Post text inserted with formatting.'
  );

  return true;
}

/**
 * Вставляє один рядок із підтримкою:
 *
 * **bold**
 * ***bold***
 */
async function insertFormattedInlineText(
  page: Page,
  text: string
): Promise<void> {
  /*
   * Спочатку ***text***,
   * потім **text**.
   */
  const regex =
    /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*)/g;

  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const fullMatch = match[0];

    const index =
      match.index ?? 0;

    /*
     * Звичайний текст перед bold.
     */
    if (index > lastIndex) {
      const normalText =
        text.slice(
          lastIndex,
          index
        );

      await page.keyboard.insertText(
        normalText
      );
    }

    /*
     * Текст, який має бути жирним.
     */
    const boldText =
      match[2] ?? match[3];

    console.log(
      `Formatting bold text: "${boldText}"`
    );

    /*
     * Увімкнути Bold.
     */
    await page.keyboard.press(
      'Control+b'
    );

    /*
     * Вставити текст.
     */
    await page.keyboard.insertText(
      boldText
    );

    /*
     * Вимкнути Bold.
     */
    await page.keyboard.press(
      'Control+b'
    );

    lastIndex =
      index + fullMatch.length;
  }

  /*
   * Текст після останнього bold.
   */
  if (lastIndex < text.length) {
    const normalText =
      text.slice(lastIndex);

    await page.keyboard.insertText(
      normalText
    );
  }
}

/**
 * Додає зображення до відкритого Facebook public post composer.
 *
 * ВАЖЛИВО:
 *
 * Тут ми НЕ чіпаємо fillPostText().
 *
 * Після setInputFiles() Facebook може очистити
 * input[type=file], тому input.files не перевіряємо.
 */
export async function attachPostImage(
  page: Page,
  imagePath: string
): Promise<boolean> {
  console.log('');
  console.log(
    '========================================'
  );
  console.log(
    'IMAGE UPLOAD'
  );
  console.log(
    '========================================'
  );

  console.log(
    `Image path: ${imagePath}`
  );

  /*
   * ------------------------------------------------------
   * Шукаємо кнопку "Світлина/відео"
   * ------------------------------------------------------
   */

  const button = page.locator(
    '[role="button"][aria-label="Світлина/відео"]'
  );

  const buttonCount =
    await button.count();

  console.log(
    `Photo/video buttons found: ${buttonCount}`
  );

  if (buttonCount === 0) {
    console.log(
      '❌ Photo/video button not found.'
    );

    return false;
  }

  let visibleButton = null;

  for (
    let i = 0;
    i < buttonCount;
    i++
  ) {
    const element =
      button.nth(i);

    if (await element.isVisible()) {
      visibleButton = element;
      break;
    }
  }

  if (!visibleButton) {
    console.log(
      '❌ Photo/video button is not visible.'
    );

    return false;
  }

  console.log(
    '✅ Visible photo/video button found.'
  );

  /*
   * ------------------------------------------------------
   * Перехоплюємо системний file chooser
   *
   * ВАЖЛИВО:
   * Promise створюємо ДО click().
   *
   * Тоді системне вікно вибору файлу
   * не зависає на екрані.
   * ------------------------------------------------------
   */

  console.log(
    'Preparing to intercept system file chooser...'
  );

  const fileChooserPromise =
    page.waitForEvent(
      'filechooser',
      {
        timeout: 10_000,
      }
    );

  /*
   * ------------------------------------------------------
   * Натискаємо "Світлина/відео"
   * ------------------------------------------------------
   */

  console.log(
    'Clicking "Світлина/відео"...'
  );

  await visibleButton.click();

  console.log(
    '✅ Photo/video button clicked.'
  );

  /*
   * ------------------------------------------------------
   * Отримуємо file chooser
   * ------------------------------------------------------
   */

  let fileChooser;

  try {
    fileChooser =
      await fileChooserPromise;

    console.log(
      '✅ System file chooser intercepted.'
    );
  } catch (error) {
    console.log(
      '❌ System file chooser was not detected.'
    );

    console.error(error);

    return false;
  }

  /*
   * ------------------------------------------------------
   * Передаємо файл без відкриття системного вікна
   * ------------------------------------------------------
   */

  try {
    console.log(
      'Setting image file...'
    );

    await fileChooser.setFiles(
      imagePath
    );

    console.log(
      '✅ Image file assigned.'
    );
  } catch (error) {
    console.log(
      '❌ Failed to set image file.'
    );

    console.error(error);

    return false;
  }

  /*
   * ------------------------------------------------------
   * Чекаємо, поки Facebook обробить файл
   * ------------------------------------------------------
   */

  console.log(
    'Facebook is processing the image...'
  );

  await page.waitForTimeout(
    3_000
  );

  /*
   * ------------------------------------------------------
   * DEBUG
   *
   * Не використовуємо dialog для завантаження.
   * Просто перевіряємо стан сторінки.
   * ------------------------------------------------------
   */

  console.log(
    '--- AFTER FILE UPLOAD DEBUG ---'
  );

  console.log(
    'Page URL:',
    page.url()
  );

  console.log(
    '--- END DEBUG ---'
  );

  /*
   * ------------------------------------------------------
   * Шукаємо preview
   * ------------------------------------------------------
   */

  console.log(
    'Checking for image preview...'
  );

  /*
   * Facebook може створити preview:
   *
   * 1. всередині dialog;
   * 2. у самому Composer.
   *
   * Залишаємо перевірку максимально широкою,
   * не змінюючи логіку, яка вже працювала.
   */

  const previewSelectors = [
    '[role="dialog"] img',
    '[role="dialog"] video',
    '[aria-label="Світлина/відео"] ~ * img',
  ];

  for (
    const selector of previewSelectors
  ) {
    const preview =
      page.locator(selector);

    const count =
      await preview.count();

    console.log(
      `Preview selector "${selector}" — found: ${count}`
    );

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const element =
        preview.nth(i);

      if (
        await element.isVisible()
      ) {
        console.log(
          `✅ Visible image preview found: ${selector}`
        );

        console.log(
          '✅ Image successfully attached to composer.'
        );

        console.log(
          '========================================'
        );

        return true;
      }
    }
  }

  /*
   * ------------------------------------------------------
   * Додаткове очікування
   * ------------------------------------------------------
   */

  console.log(
    '⚠️ Preview not found yet. Waiting longer...'
  );

  await page.waitForTimeout(
    5_000
  );

  /*
   * ------------------------------------------------------
   * Повторна перевірка preview
   * ------------------------------------------------------
   */

  for (
    const selector of previewSelectors
  ) {
    const preview =
      page.locator(selector);

    const count =
      await preview.count();

    console.log(
      `Preview selector "${selector}" — found after waiting: ${count}`
    );

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const element =
        preview.nth(i);

      if (
        await element.isVisible()
      ) {
        console.log(
          `✅ Image preview found after waiting: ${selector}`
        );

        console.log(
          '✅ Image successfully attached to composer.'
        );

        console.log(
          '========================================'
        );

        return true;
      }
    }
  }

  /*
   * ------------------------------------------------------
   * Preview не знайдено
   * ------------------------------------------------------
   */

  console.log(
    '❌ Image preview was not detected.'
  );

  console.log(
    '========================================'
  );

  return false;
}


export async function publishPost(
  page: Page
): Promise<boolean> {
  console.log('');
  console.log('========================================');
  console.log('PUBLISH POST');
  console.log('========================================');

  const publishButton = page.locator(
    '[role="button"][aria-label="Опублікувати"]'
  );

  console.log(
    `Publish buttons found: ${await publishButton.count()}`
  );

  let visibleButton = null;

  const count = await publishButton.count();

  for (let i = 0; i < count; i++) {
    const button = publishButton.nth(i);

    if (await button.isVisible()) {
      visibleButton = button;
      break;
    }
  }

  if (!visibleButton) {
    console.log(
      '❌ Publish button not found or not visible.'
    );

    return false;
  }

  console.log(
    '✅ Visible "Опублікувати" button found.'
  );

  /*
   * Переконуємося, що кнопка активна.
   */
  const disabled =
    await visibleButton.getAttribute('aria-disabled');

  if (disabled === 'true') {
    console.log(
      '❌ Publish button is disabled.'
    );

    return false;
  }

  console.log(
    'Clicking "Опублікувати"...'
  );

  await visibleButton.click();

  console.log(
    '✅ Publish button clicked.'
  );

  /*
   * Даємо Facebook час почати публікацію.
   */
  await page.waitForTimeout(3_000);

  console.log(
    'Waiting for post publication...'
  );

  /*
   * Чекаємо, поки кнопка "Опублікувати"
   * зникне з Composer.
   */
  try {
    await publishButton.first().waitFor({
      state: 'hidden',
      timeout: 15_000,
    });

    console.log(
      '✅ Publish button disappeared.'
    );

    console.log(
      '✅ Post was published.'
    );

    console.log(
      '========================================'
    );

    return true;
  } catch {
    console.log(
      '⚠️ Publish button is still visible after 15 seconds.'
    );

    console.log(
      'Publication status could not be confirmed.'
    );

    console.log(
      '========================================'
    );

    return false;
  }
}
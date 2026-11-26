/**
 * @param {unknown} input
 * @returns {string}
 */
export function normalizePrompt(input) {
  const MAX_PROMPT_LENGTH = 8_000;

  if (typeof input !== "string") {
    throw new TypeError("Prompt must be a string.");
  }

  const prompt = input.trim();

  if (prompt.length === 0) {
    throw new TypeError("Prompt must not be empty.");
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new TypeError(`Prompt must be at most ${MAX_PROMPT_LENGTH} characters.`);
  }

  return prompt;
}

/**
 * @param {(binding: any) => Promise<any>} launchBrowser
 * @param {any} browserBinding
 * @param {string} prompt
 * @returns {Promise<Response>}
 */
export async function captureResponse(launchBrowser, browserBinding, prompt) {
  let stage = 1;
  /** @type {any | undefined} */
  let browser;

  try {
    browser = await launchBrowser(browserBinding);
    const page = await browser.newPage();

    stage = 2;
    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

    stage = 3;
    return Response.json({
      ok: true,
      date: new Date(),
      prompt: prompt,
      title: await page.title(),
      browserVersion: await browser.version(),
      html: await page.content(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`stage: ${stage}, ${message}`);

    return Response.json(
      {
        ok: false,
        date: new Date(),
        error: `stage: ${stage}, ${message}`,
        prompt: prompt,
      },
      { status: 500 },
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Browser close failed: ${message}`);
      }
    }
  }
}

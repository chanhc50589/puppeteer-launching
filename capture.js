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
export async function captureResponse(launchBrowser, getLimits, browserBinding, url, prompt) {
  let stage = 1;

  let browser, limits;
  let found = null, foundDiv = null, foundButton = null, foundDiv2 = null, result = null;

  try {
    browser = await launchBrowser(browserBinding);
    limits = await getLimits(browserBinding);

    // 1. Check concurrency cap
    if (limits.activeSessions.length >= limits.maxConcurrentSessions) {
      return Response.json( { ok: false, date: new Date(), error: `All browser slots are currently in use: ${limits}` }, { status: 429 } );
    }

    // 2. Wait out rate-limit cooldown if needed
    if (limits.allowedBrowserAcquisitions === 0 && limits.timeUntilNextAllowedBrowserAcquisition > 0) {
      return Response.json( { ok: false, date: new Date(), error: `rate-limit: ${limits}` }, { status: 429 } );
    }

    const page = await browser.newPage();

    stage = 2;
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

/* --- */

    stage = 3;

found = await page
  .waitForSelector('#app-root', { timeout: 20000 })
  .then(() => ({ found: true }))
  .catch(e => ({ found: false, error: e.message }));

    stage = 4;

foundDiv = await page
  .waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 5_000 })
  .then(() => ({ foundDiv: true }))
  .catch(e => ({ foundDiv: false, error: e.message }));

    stage = 5;

await page.$eval('div[contenteditable="true"]', el => {
  const p = document.createElement('p');
  p.textContent = prompt;
  el.replaceChildren(p);
});

    stage = 6;

foundButton = await page
  .waitForSelector('button[aria-label="Send message"]', { visible: true, timeout: 5_000 })
  .then(() => ({ foundButton: true }))
  .catch(e => ({ foundButton: false, error: e.message }));

    stage = 7;

await page.click('button[aria-label="Send message"]');

    stage = 8;

foundDiv2 = await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    stage = 9;

result = await page.$eval( 'code', (element) => element.outerHTML );

    stage = 10;

await page.waitForNetworkIdle({
  idleTime: 2500,
  concurrency: 0,
  timeout: 50000,
});

/* --- */

    stage = 11;

    await browser.close();

    return Response.json({
      ok: true,
      date: new Date(),
      prompt: prompt,
      result: result,
      html: (!result || result.length === 0) ? await page.content() : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`stage: ${stage}, ${message}, limits: ${limits}, html: ${html}`);

    return Response.json(
      {
        ok: false,
        date: new Date(),
        error: `stage: ${stage}, ${message}`,
        //connected: browser.isConnected(),
        limits: limits,
        prompt: prompt,
        html: await page.content(),
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

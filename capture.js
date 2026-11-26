/**
 * @param {unknown} input
 * @returns {string}
 */
export function normalizePrompt(url, input) {

    if (typeof url !== "string") {
      throw new TypeError("url must be a string");
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new TypeError("url must be a valid absolute URL");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new TypeError("url must use HTTP or HTTPS");
    }



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
export async function captureResponse(launchBrowser, browserBinding, url, inputPrompt) {
  let stage = 1;

  let browser, page, html;
  let found = null, foundDiv = null, foundButton = null, foundDiv2 = null, result = null;
  const deadline = new Date().getTime() + 55_000;
  const remainingMs = () => Math.max(0, deadline - new Date().getTime());

  try {
    browser = await launchBrowser(browserBinding);

    page = await browser.newPage();

    stage = 2;
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

/* --- */

    stage = 3;

found = await page
  .waitForSelector('#app-root', { timeout: 20_000 })
  .then(() => ({ found: true }))
  .catch(e => ({ found: false, error: e.message }));

    stage = 4;

foundDiv = await page
  .waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 5_000 })
  .then(() => ({ foundDiv: true }))
  .catch(e => ({ foundDiv: false, error: e.message }));

    stage = 5;

await page.$eval('div[contenteditable="true"]', (el, prompt) => {
  const p = document.createElement('p');
  p.textContent = prompt;
  el.replaceChildren(p);
}, 
  inputPrompt
);

    stage = 6;

foundButton = await page
  .waitForSelector('button[aria-label="Send message"]', { visible: true, timeout: 5_000 })
  .then(() => ({ foundButton: true }))
  .catch(e => ({ foundButton: false, error: e.message }));

    stage = 7;

await page.click('button[aria-label="Send message"]');

    stage = 8;

foundDiv2 = await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: remainingMs() });

    stage = 9;

foundButton2 = await page
  .waitForSelector('gem-icon-button[arialabel="Copy"]', { visible: true, timeout: remainingMs() })
  .then(() => ({ foundButton: true }))
  .catch(e => ({ foundButton: false, error: e.message }));

	      stage = 10;

await page.waitForNetworkIdle({
  idleTime: 1500,
  concurrency: 0,
  timeout: remainingMs(),
});
	      stage = 11;

	  result = await page.$eval( 'model-response-content', (element) => element.outerHTML );  // 'code'

/* --- */

    stage = 12;

    //if (result && result.length > 0){ html = await page.content(); }
	html = await page.content();
    await browser.close();
	  console.log("done");

    return Response.json({
      ok: true,
      date: new Date(),
      prompt: inputPrompt,
      result: result,
      html: html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`stage: ${stage}, ${message}, html: ${html}`);

    return Response.json(
      {
        ok: false,
        date: new Date(),
        error: `stage: ${stage}, ${message}`,
        prompt: inputPrompt,
        html: html,
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

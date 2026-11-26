import puppeteer from "@cloudflare/puppeteer";
import { WorkerEntrypoint } from "cloudflare:workers";
import { captureResponse, normalizePrompt } from "./capture.js";

export class CaptureService extends WorkerEntrypoint {
  async capture(url, input) {
    const prompt = normalizePrompt(url, input);
    return captureResponse(
      (binding) => puppeteer.launch(binding),
      this.env.BROWSER,
      url,
      prompt,
    );
  }
}

// The capture Worker is intended to be called through its RPC entrypoint.
export default {
  fetch() {
    return new Response("Not found.", { status: 404 });
  },
};

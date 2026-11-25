import assert from "node:assert/strict";
import test from "node:test";
import { captureResponse, normalizePrompt } from "./capture.js";

test("normalizePrompt trims valid input", () => {
  assert.equal(normalizePrompt("  take a snapshot  "), "take a snapshot");
});

test("normalizePrompt rejects non-string input", () => {
  assert.throws(() => normalizePrompt(123), {
    name: "TypeError",
    message: "Prompt must be a string.",
  });
});

test("normalizePrompt rejects blank input", () => {
  assert.throws(() => normalizePrompt(" \n\t "), {
    name: "TypeError",
    message: "Prompt must not be empty.",
  });
});

test("normalizePrompt accepts the maximum length", () => {
  const prompt = "a".repeat(8_000);
  assert.equal(normalizePrompt(prompt), prompt);
});

test("normalizePrompt rejects input over the maximum length", () => {
  assert.throws(() => normalizePrompt("a".repeat(8_001)), {
    name: "TypeError",
    message: "Prompt must be at most 8000 characters.",
  });
});

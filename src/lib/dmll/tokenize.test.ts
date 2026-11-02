import { describe, expect, it } from "vitest";

import { tokenize } from "./tokenize";

const texts = (line: string) => tokenize(line).map((token) => token.text);

describe("tokenize", () => {
  it("splits Latin words on spaces and keeps each trailing space", () => {
    expect(texts("Drugs got me numb")).toEqual(["Drugs ", "got ", "me ", "numb"]);
  });

  it("keeps punctuation with the word before it", () => {
    expect(texts("Shit, drugs")).toEqual(["Shit, ", "drugs"]);
    expect(texts("I'm sayin'?")).toEqual(["I'm ", "sayin'?"]);
    expect(texts("Mr. Anti")).toEqual(["Mr. ", "Anti"]);
  });

  it("starts a token for punctuation that stands alone", () => {
    expect(texts("Love - hate")).toEqual(["Love ", "- ", "hate"]);
  });

  it("gives every CJK character its own token", () => {
    expect(texts("你好，世界")).toEqual(["你", "好，", "世", "界"]);
    expect(texts("药 物")).toEqual(["药 ", "物"]);
  });

  it("collapses repeated spaces and trims the line", () => {
    expect(texts("  Drugs   got  ")).toEqual(["Drugs ", "got"]);
  });

  it("joins back to the same text", () => {
    const line = "(yeah) what? 你好";
    expect(tokenize(line).map((token) => token.text).join("")).toBe(line);
  });
});

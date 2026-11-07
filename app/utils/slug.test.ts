import { describe, expect, it } from "vitest";

import { slug } from "./slug";

// Every expected slug here is what the slug package (version 2.1.1, symbol
// names off) gave for the title. A change that breaks one of these changes
// which URL a new or renamed dex gets.
describe("slug", () => {
  it.each([
    // Letters with an ASCII spelling are spelled with it.
    ["Pokémon Ωmega", "pokemon-wmega"],
    ["Ёлка", "yolka"],
    // A few map to nothing, and the letter is dropped.
    ["Мальчик", "malchik"],
    // Some symbols are spelled out too, including a few ASCII ones.
    ["Sun & Moon", "sun-and-moon"],
    ["X&Y", "xandy"],
    ["A < B > C", "a-less-b-greater-c"],
    ["$hiny", "dollarhiny"],
    ["Dex ♥", "dex-love"],
    ["© Ash", "c-ash"],
    // Some pairs of characters are spelled out together.
    ["Dex <3", "dex-love"],
    ["Black && White", "black-and-white"],
    ["Red || Blue", "red-or-blue"],
    ["Dex w/ Forms", "dex-with-forms"],
    // Underscores and tildes are kept, and periods are dropped.
    ["Living Dex_8", "living-dex_8"],
    ["Pokédex ~", "pokedex-~"],
    ["Gen. 8 Dex.", "gen-8-dex"],
    // Runs of spaces and dashes become one dash, but a dash at either end
    // stays.
    ["  Living   --  Dex  ", "living-dex"],
    ["Living Dex -", "living-dex-"],
    ["- Living Dex", "-living-dex"],
    // Other symbols are dropped, not spelled out by name.
    ["Dex ★", "dex"],
    ["Shiny✨", "shiny"],
    ["Living Dex ♀", "living-dex"],
    // So are emoji and other characters outside the Basic Multilingual Plane.
    ["Dex 😀 Shiny", "dex-shiny"],
    ["𝙻𝚒𝚟𝚒𝚗𝚐 Dex", "dex"],
    // A title with nothing left gets the slug of its base64.
    ["ポケモン", "44od44kx44oi44oz"],
    ["???", "pz8"],
  ])("turns %j into %j", (title, expected) => {
    expect(slug(title)).toBe(expected);
  });
});

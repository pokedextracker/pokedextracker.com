import { describe, expect, it } from "vitest";

// The server's source, as text.
import source from "../../pkg/server/analytics.go?raw";
import { tokenToUser } from "./state";

// The hook that adds the signed-in user's id to analytics lives in the server,
// which adds it to the page before Umami's tracker (pkg/server/analytics.go).
// It's run here, against the same tokens as the app's own reader, so the two
// can't drift apart: a hook that quietly stopped reading tokens would stop
// counting signed-in users without anything failing.
const hook = /const analyticsIdentify = `<script>([\s\S]*?)<\/script>`/.exec(
  source,
)?.[1];

type BeforeSend = (
  type: string,
  payload: Record<string, unknown>,
) => Record<string, unknown>;

// beforeSend runs the hook with storage holding token, under production's key.
function beforeSend(token: string | null, storage?: Partial<Storage>) {
  const window: { umamiBeforeSend?: BeforeSend } = {};
  const localStorage = storage ?? {
    getItem: (key: string) => (key === "token" ? token : null),
  };
  new Function("window", "localStorage", hook ?? "")(window, localStorage);
  return window.umamiBeforeSend!("event", { url: "/" });
}

function token(claims: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(claims));
  const payload = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

describe("analytics identify hook", () => {
  it("is in the server's source", () => {
    expect(hook).toBeTruthy();
  });

  it.each([
    ["signed in", token({ id: 42, username: "ash" })],
    // base64url without padding, and with characters base64 spells
    // differently.
    ["a username outside ASCII", token({ id: 7, username: "ポケモン~~?>" })],
    ["no token", null],
    ["a token that isn't a JWT", "garbage"],
    ["an id that isn't a number", token({ id: "42", username: "ash" })],
    ["no username", token({ id: 42 })],
  ])("agrees with the app for %s", (_, value) => {
    const id = tokenToUser(value)?.id;
    expect(beforeSend(value)).toEqual(
      id === undefined ? { url: "/" } : { url: "/", id: String(id) },
    );
  });

  it("sends the event anyway when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(beforeSend(null, blocked)).toEqual({ url: "/" });
  });
});

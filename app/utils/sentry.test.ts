import { describe, expect, it, vi } from "vitest";

import { PokedexTrackerError } from "./api";
import { groupApiErrors } from "./sentry";

// Importing the config and api reads and writes window (the server's
// settings, localStorage, the shared token), and these tests don't run in a
// browser.
vi.hoisted(() => vi.stubGlobal("window", {}));

function apiError(status: number, code?: string) {
  return new PokedexTrackerError(
    "message",
    new Response(null, { status }),
    code,
  );
}

describe("groupApiErrors", () => {
  it("groups API errors by their code too", () => {
    expect(
      groupApiErrors({}, { originalException: apiError(403, "forbidden") }),
    ).toEqual({ fingerprint: ["{{ default }}", "forbidden"] });
    expect(
      groupApiErrors({}, { originalException: apiError(401, "deleted_user") }),
    ).toEqual({ fingerprint: ["{{ default }}", "deleted_user"] });
  });

  it("keeps the rest of the event", () => {
    const event: { message: string; fingerprint?: string[] } = {
      message: "x",
    };
    expect(
      groupApiErrors(event, { originalException: apiError(403, "forbidden") }),
    ).toEqual({ message: "x", fingerprint: ["{{ default }}", "forbidden"] });
  });

  it("leaves everything else to Sentry's grouping", () => {
    expect(groupApiErrors({}, { originalException: apiError(500) })).toEqual(
      {},
    );
    expect(
      groupApiErrors({}, { originalException: new TypeError("NetworkError") }),
    ).toEqual({});
    expect(groupApiErrors({}, {})).toEqual({});
  });
});

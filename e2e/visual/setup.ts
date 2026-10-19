import { slugOf } from "../slug";

// The fixed data the screenshots show, made fresh for each side of the
// comparison (the launcher rebuilds the database for each). Everything is
// created in the same order, so ids and contents match on both sides.

export const PASSWORD = "visual-password";

interface DexSpec {
  title: string;
  shiny: boolean;
  // Pokémon ids, all from the Legends: Z-A regional dex.
  captures: number[];
}

interface UserSpec {
  username: string;
  friendCode3ds?: string;
  friendCodeSwitch?: string;
  dexes: DexSpec[];
}

// Legends: Z-A's regional dex (dex type 23), which every dex here uses.
const GAME = "legends_za";
const DEX_TYPE = 23;

export const USERS = {
  ash: {
    username: "visual_ash",
    friendCode3ds: "1234-5678-9012",
    friendCodeSwitch: "SW-1234-5678-9012",
    dexes: [
      {
        title: "Living Dex",
        shiny: false,
        captures: [152, 153, 154, 498, 158, 661, 662],
      },
      { title: "Shiny Hunt", shiny: true, captures: [152] },
    ],
  },
  misty: {
    username: "visual_misty",
    dexes: [{ title: "Water Dex", shiny: false, captures: [158, 159, 160] }],
  },
  // Renamed by the edit confirmation screenshot (though not saved), so
  // nothing else uses it.
  gary: {
    username: "visual_gary",
    dexes: [{ title: "Living Dex", shiny: false, captures: [152] }],
  },
  // Saved over by the account screenshot, so nothing else uses it.
  brock: {
    username: "visual_brock",
    dexes: [{ title: "Rock Dex", shiny: false, captures: [] }],
  },
} satisfies Record<string, UserSpec>;

async function api(
  path: string,
  body: unknown,
  token?: string,
  method = "POST",
) {
  const response = await fetch(`${process.env.E2E_BASE_URL}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `${method} ${path}: ${response.status} ${await response.text()}`,
    );
  }
  return response.json();
}

// Profiles list dexes by when they were made. The API stamps a user's first
// dex with its own clock and later ones with the database's, so each user
// registers with a placeholder dex that's deleted once the real ones, all
// made the same way, exist.
const PLACEHOLDER = "Placeholder";

// waitForServer waits for the server to answer. The launcher starts it before
// the browsers, but a new Docker container can take a moment to reach it.
async function waitForServer() {
  const deadline = Date.now() + 30_000;
  let problem = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${process.env.E2E_BASE_URL}/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        return;
      }
      problem = `status ${response.status}`;
    } catch (err) {
      problem = String((err as Error).cause ?? err);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `The server at ${process.env.E2E_BASE_URL} didn't answer within 30 seconds (${problem})`,
  );
}

export default async function setup() {
  await waitForServer();
  for (const user of Object.values(USERS) as UserSpec[]) {
    // The launcher runs the specs more than once against the same server
    // when it checks the reference, so users made by an earlier run are kept.
    const existing = await fetch(
      `${process.env.E2E_BASE_URL}/api/users/${user.username}`,
    );
    if (existing.ok) {
      continue;
    }
    const { token } = await api("/users", {
      username: user.username,
      password: PASSWORD,
      friend_code_3ds: user.friendCode3ds,
      friend_code_switch: user.friendCodeSwitch,
      title: PLACEHOLDER,
      slug: slugOf(PLACEHOLDER),
      shiny: false,
      game: GAME,
      dex_type: DEX_TYPE,
    });
    for (const dex of user.dexes) {
      const { id } = await api(
        `/users/${user.username}/dexes`,
        {
          title: dex.title,
          slug: slugOf(dex.title),
          shiny: dex.shiny,
          game: GAME,
          dex_type: DEX_TYPE,
        },
        token,
      );
      if (dex.captures.length > 0) {
        await api("/captures", { dex: id, pokemon: dex.captures }, token);
      }
    }
    await api(
      `/users/${user.username}/dexes/${slugOf(PLACEHOLDER)}`,
      undefined,
      token,
      "DELETE",
    );
  }
}

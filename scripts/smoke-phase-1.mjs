const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const apiKey = process.env.API_KEY;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;

if (!apiKey) {
  throw new Error("API_KEY is required for the Phase 1 smoke test.");
}

if (!adminPassword) {
  throw new Error("ADMIN_PASSWORD is required for the Phase 1 smoke test.");
}

if (!adminSessionSecret) {
  throw new Error("ADMIN_SESSION_SECRET is required for the Phase 1 smoke test.");
}

function url(path) {
  return new URL(path, baseUrl).toString();
}

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response from ${response.url}, received: ${text.slice(0, 120)}`);
  }
}

async function request(path, init) {
  try {
    return await fetch(url(path), init);
  } catch (error) {
    if (error?.cause?.code === "ECONNREFUSED" || error?.cause?.errors) {
      throw new Error(
        `Could not reach ${baseUrl}. Start the Phase 1 app with Docker Compose or pnpm dev before running this smoke test.`,
        {
          cause: error
        }
      );
    }

    throw error;
  }
}

async function expectStatus(label, response, expectedStatus) {
  const body = await readJson(response);

  if (response.status !== expectedStatus) {
    throw new Error(
      `${label} expected HTTP ${expectedStatus}, received HTTP ${response.status}: ${JSON.stringify(
        body
      )}`
    );
  }

  return body;
}

function cookieHeader(response) {
  const getSetCookie = response.headers.getSetCookie?.() ?? [];
  const setCookie = getSetCookie.length > 0 ? getSetCookie : [response.headers.get("set-cookie")];
  return setCookie
    .filter(Boolean)
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function run() {
  await expectStatus(
    "health with API key",
    await request("/api/v1/health", {
      headers: {
        "x-api-key": apiKey
      }
    }),
    200
  );

  await expectStatus("health without API key", await request("/api/v1/health"), 401);

  const loginResponse = await request("/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      password: adminPassword
    })
  });
  await expectStatus("admin login", loginResponse, 200);

  const adminCookie = cookieHeader(loginResponse);

  if (!adminCookie.includes("slhdr_admin_session=")) {
    throw new Error("admin login did not return the expected session cookie.");
  }

  const session = await expectStatus(
    "admin session",
    await request("/api/admin/session", {
      headers: {
        cookie: adminCookie
      }
    }),
    200
  );

  if (session?.authenticated !== true) {
    throw new Error("admin session did not authenticate with the login cookie.");
  }

  const shootName = `Smoke Test Shoot ${new Date().toISOString()}`;
  const createBody = await expectStatus(
    "create shoot",
    await request("/api/v1/shoots", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        name: shootName,
        clientName: "Phase 1 Smoke",
        propertyAddress: "123 Smoke Test Lane",
        notes: "Created by scripts/smoke-phase-1.mjs",
        tags: ["smoke", "phase-1"]
      })
    }),
    201
  );

  const shootId = createBody?.shoot?.id;

  if (!shootId) {
    throw new Error("create shoot response did not include shoot.id.");
  }

  const listBody = await expectStatus(
    "list shoots",
    await request("/api/v1/shoots", {
      headers: {
        "x-api-key": apiKey
      }
    }),
    200
  );

  if (!Array.isArray(listBody?.shoots) || !listBody.shoots.some((shoot) => shoot.id === shootId)) {
    throw new Error("created shoot was not found in list_shoots response.");
  }

  const getBody = await expectStatus(
    "get shoot",
    await request(`/api/v1/shoots/${shootId}`, {
      headers: {
        "x-api-key": apiKey
      }
    }),
    200
  );

  if (getBody?.shoot?.name !== shootName) {
    throw new Error("get_shoot response did not match the created shoot.");
  }

  const updateBody = await expectStatus(
    "admin update shoot",
    await request(`/api/shoots/${shootId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        notes: "Updated by Phase 1 smoke test"
      })
    }),
    200
  );

  if (updateBody?.shoot?.notes !== "Updated by Phase 1 smoke test") {
    throw new Error("admin shoot update response did not include the updated notes.");
  }

  console.log("Phase 1 smoke test passed.");
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

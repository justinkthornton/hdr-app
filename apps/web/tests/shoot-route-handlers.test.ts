import { describe, expect, it } from "vitest";
import type { Shoot } from "@structure-locked-hdr/core";
import {
  handleCreateShoot,
  handleGetShoot,
  handleListShoots,
  type ShootRouteDeps
} from "../src/lib/shoot-route-handlers";

const shoot: Shoot = {
  id: "6e559077-11fc-4f53-8e32-0dcb047893ea",
  name: "Maple Street",
  clientName: "Acme Realty",
  propertyAddress: "123 Maple Street",
  notes: null,
  tags: ["exterior"],
  createdAt: new Date("2026-06-27T12:00:00.000Z"),
  updatedAt: new Date("2026-06-27T12:00:00.000Z")
};

const deps: ShootRouteDeps = {
  listShoots: async () => [shoot],
  createShoot: async (input) => ({
    ...shoot,
    name: input.name,
    tags: input.tags
  }),
  getShoot: async (shootId) => (shootId === shoot.id ? shoot : null),
  updateShoot: async () => shoot
};

describe("shoot endpoint behavior", () => {
  it("lists shoots", async () => {
    const response = await handleListShoots(deps);
    const body = (await response.json()) as { shoots: Shoot[] };

    expect(body.shoots).toHaveLength(1);
    expect(body.shoots[0]?.name).toBe("Maple Street");
  });

  it("creates shoots from valid JSON", async () => {
    const response = await handleCreateShoot(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        body: JSON.stringify({
          name: "Oak Avenue",
          tags: ["Kitchen"]
        })
      }),
      deps
    );
    const body = (await response.json()) as { shoot: Shoot };

    expect(response.status).toBe(201);
    expect(body.shoot.name).toBe("Oak Avenue");
    expect(body.shoot.tags).toEqual(["kitchen"]);
  });

  it("rejects invalid shoot payloads", async () => {
    const response = await handleCreateShoot(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        body: JSON.stringify({
          name: ""
        })
      }),
      deps
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for missing shoots", async () => {
    const response = await handleGetShoot("missing", deps);

    expect(response.status).toBe(404);
  });
});

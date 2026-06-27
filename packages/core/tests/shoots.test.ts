import { describe, expect, it } from "vitest";
import { createShoot, getShoot, listShoots, updateShoot, type Queryable } from "../src/index";

const row = {
  id: "6e559077-11fc-4f53-8e32-0dcb047893ea",
  name: "Maple Street",
  client_name: "Acme Realty",
  property_address: "123 Maple Street",
  notes: "Front exterior and kitchen.",
  tags: ["interior"],
  created_at: "2026-06-27T12:00:00.000Z",
  updated_at: "2026-06-27T12:00:00.000Z"
};

function makeDb(handler: (text: string, values?: unknown[]) => unknown[]): Queryable {
  return {
    query: async <T>(text: string, values?: unknown[]) => ({
      rows: handler(text, values) as T[],
      rowCount: 1,
      command: "",
      oid: 0,
      fields: []
    })
  } as Queryable;
}

describe("shoot repository", () => {
  it("lists shoots in API shape", async () => {
    const shoots = await listShoots(makeDb(() => [row]));

    expect(shoots[0]?.clientName).toBe("Acme Realty");
    expect(shoots[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("creates a shoot with app-generated ids", async () => {
    const shoot = await createShoot(
      makeDb((_text, values) => {
        expect(values?.[1]).toBe("Maple Street");
        expect(values?.[5]).toEqual(["interior"]);
        return [row];
      }),
      {
        name: "Maple Street",
        clientName: "Acme Realty",
        propertyAddress: "123 Maple Street",
        notes: "Front exterior and kitchen.",
        tags: ["interior"]
      }
    );

    expect(shoot.name).toBe("Maple Street");
  });

  it("returns null when a shoot is not found", async () => {
    await expect(
      getShoot(
        makeDb(() => []),
        row.id
      )
    ).resolves.toBeNull();
  });

  it("updates only supplied shoot fields", async () => {
    const shoot = await updateShoot(
      makeDb((text, values) => {
        expect(text).toContain("client_name = $1");
        expect(text).toContain("updated_at = now()");
        expect(values).toEqual(["New Client", row.id]);
        return [{ ...row, client_name: "New Client" }];
      }),
      row.id,
      {
        clientName: "New Client"
      }
    );

    expect(shoot?.clientName).toBe("New Client");
  });
});

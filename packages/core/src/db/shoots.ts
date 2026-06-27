import { randomUUID } from "node:crypto";
import type { CreateShootInput, Shoot, UpdateShootInput } from "../domain/shoot";
import type { Queryable } from "./pool";

type ShootRow = {
  id: string;
  name: string;
  client_name: string | null;
  property_address: string | null;
  notes: string | null;
  tags: string[];
  created_at: Date | string;
  updated_at: Date | string;
};

const shootFields = `
  id,
  name,
  client_name,
  property_address,
  notes,
  tags,
  created_at,
  updated_at
`;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function mapShootRow(row: ShootRow): Shoot {
  return {
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    propertyAddress: row.property_address,
    notes: row.notes,
    tags: row.tags,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at)
  };
}

export async function listShoots(db: Queryable): Promise<Shoot[]> {
  const result = await db.query<ShootRow>(
    `select ${shootFields} from shoots order by created_at desc, name asc`
  );

  return result.rows.map(mapShootRow);
}

export async function createShoot(db: Queryable, input: CreateShootInput): Promise<Shoot> {
  const result = await db.query<ShootRow>(
    `insert into shoots (
      id,
      name,
      client_name,
      property_address,
      notes,
      tags
    ) values ($1, $2, $3, $4, $5, $6)
    returning ${shootFields}`,
    [
      randomUUID(),
      input.name,
      input.clientName ?? null,
      input.propertyAddress ?? null,
      input.notes ?? null,
      input.tags
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create shoot");
  }

  return mapShootRow(row);
}

export async function getShoot(db: Queryable, shootId: string): Promise<Shoot | null> {
  const result = await db.query<ShootRow>(`select ${shootFields} from shoots where id = $1`, [
    shootId
  ]);
  const row = result.rows[0];
  return row ? mapShootRow(row) : null;
}

export async function updateShoot(
  db: Queryable,
  shootId: string,
  input: UpdateShootInput
): Promise<Shoot | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  function addAssignment(column: string, value: unknown): void {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (input.name !== undefined) {
    addAssignment("name", input.name);
  }

  if (input.clientName !== undefined) {
    addAssignment("client_name", input.clientName);
  }

  if (input.propertyAddress !== undefined) {
    addAssignment("property_address", input.propertyAddress);
  }

  if (input.notes !== undefined) {
    addAssignment("notes", input.notes);
  }

  if (input.tags !== undefined) {
    addAssignment("tags", input.tags);
  }

  values.push(shootId);
  const result = await db.query<ShootRow>(
    `update shoots
    set ${assignments.join(", ")}, updated_at = now()
    where id = $${values.length}
    returning ${shootFields}`,
    values
  );

  const row = result.rows[0];
  return row ? mapShootRow(row) : null;
}

import {
  createShootSchema,
  updateShootSchema,
  type CreateShootInput,
  type Shoot,
  type UpdateShootInput
} from "@structure-locked-hdr/core";
import { jsonResponse, parseJsonBody } from "./http";

export type ShootRouteDeps = {
  listShoots(): Promise<Shoot[]>;
  createShoot(input: CreateShootInput): Promise<Shoot>;
  getShoot(shootId: string): Promise<Shoot | null>;
  updateShoot(shootId: string, input: UpdateShootInput): Promise<Shoot | null>;
};

function serializeShoot(shoot: Shoot): Record<string, unknown> {
  return {
    id: shoot.id,
    name: shoot.name,
    clientName: shoot.clientName,
    propertyAddress: shoot.propertyAddress,
    notes: shoot.notes,
    tags: shoot.tags,
    createdAt: shoot.createdAt.toISOString(),
    updatedAt: shoot.updatedAt.toISOString()
  };
}

export async function handleListShoots(deps: ShootRouteDeps): Promise<Response> {
  const shoots = await deps.listShoots();
  return jsonResponse({
    shoots: shoots.map(serializeShoot)
  });
}

export async function handleCreateShoot(request: Request, deps: ShootRouteDeps): Promise<Response> {
  const parsed = createShootSchema.safeParse(await parseJsonBody(request));

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "invalid_shoot",
        issues: parsed.error.issues
      },
      {
        status: 400
      }
    );
  }

  const shoot = await deps.createShoot(parsed.data);

  return jsonResponse(
    {
      shoot: serializeShoot(shoot)
    },
    {
      status: 201
    }
  );
}

export async function handleGetShoot(shootId: string, deps: ShootRouteDeps): Promise<Response> {
  const shoot = await deps.getShoot(shootId);

  if (!shoot) {
    return jsonResponse(
      {
        error: "shoot_not_found"
      },
      {
        status: 404
      }
    );
  }

  return jsonResponse({
    shoot: serializeShoot(shoot)
  });
}

export async function handleUpdateShoot(
  request: Request,
  shootId: string,
  deps: ShootRouteDeps
): Promise<Response> {
  const parsed = updateShootSchema.safeParse(await parseJsonBody(request));

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "invalid_shoot",
        issues: parsed.error.issues
      },
      {
        status: 400
      }
    );
  }

  const shoot = await deps.updateShoot(shootId, parsed.data);

  if (!shoot) {
    return jsonResponse(
      {
        error: "shoot_not_found"
      },
      {
        status: 404
      }
    );
  }

  return jsonResponse({
    shoot: serializeShoot(shoot)
  });
}

export type ActorRole = "PATIENT" | "DOCTOR" | "ADMIN";

type ActorContext = {
  id: string;
  role: ActorRole;
  name?: string;
};

const actorKey = (role: ActorRole) => `physiocare_actor_${role.toLowerCase()}`;

export function setActorContext(context: ActorContext) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(actorKey(context.role), JSON.stringify(context));
}

export function getActorContext(role: ActorRole): ActorContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(actorKey(role));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActorContext;
    if (!parsed?.id || parsed.role !== role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getActorHeaders(role: ActorRole): Record<string, string> {
  const actor = getActorContext(role);
  if (!actor) {
    return {};
  }
  return {
    "x-actor-id": actor.id,
    "x-actor-role": actor.role,
  };
}

export function resolveActorFromRequest(
  request: Request,
  sessionUser: { id?: string | null; role?: string | null } | null | undefined,
  expectedRole?: ActorRole,
) {
  const headerId = request.headers.get("x-actor-id")?.trim();
  const headerRole = (request.headers.get("x-actor-role") || "").toUpperCase() as ActorRole;

  const validRole = headerRole === "PATIENT" || headerRole === "DOCTOR" || headerRole === "ADMIN";

  if (headerId && validRole && (!expectedRole || headerRole === expectedRole)) {
    return { id: headerId, role: headerRole };
  }

  const sessionRole = (sessionUser?.role || "").toUpperCase() as ActorRole;
  if (sessionUser?.id && sessionRole && (!expectedRole || sessionRole === expectedRole)) {
    return { id: sessionUser.id, role: sessionRole };
  }

  return null;
}

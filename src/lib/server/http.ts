import { unstable_rethrow } from "next/navigation";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function error(status: number, code: string, message: string): Response {
  return Response.json({ error: code, message }, { status });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Wrap a route handler so unexpected errors become a JSON 500 instead of an HTML error page. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      unstable_rethrow(e); // let Next.js handle its own control-flow errors (e.g. dynamic bail-out)
      console.error(e);
      return error(500, "server_error", e instanceof Error ? e.message : "Something went wrong.");
    }
  };
}

import { env as workerEnv } from "cloudflare:workers";
import { approvedAccount } from "../../lib/auth";

interface StoredObject {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface RuntimeEnv {
  PHOTOS: { get: (key: string) => Promise<StoredObject | null> };
}

export async function GET(request: Request) {
  if (!(await approvedAccount(request)))
    return new Response("Sign in required", { status: 401 });
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("issues/")) {
    return new Response("Not found", { status: 404 });
  }
  const { PHOTOS } = workerEnv as unknown as RuntimeEnv;
  const object = await PHOTOS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

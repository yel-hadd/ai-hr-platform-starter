import { getObject } from "@/lib/storage";

// Same-origin proxy that streams a KB cover from the PRIVATE object-storage
// bucket. Public (no auth): covers are decorative, keys are unguessable UUIDs,
// and the next/image optimizer fetches this server-side (without user cookies).
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join("/");
  // Only ever serve covers/* — never let a crafted path reach another key.
  if (!objectKey.startsWith("covers/")) {
    return new Response("Not found", { status: 404 });
  }

  const obj = await getObject(objectKey);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.bytes as BodyInit, {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

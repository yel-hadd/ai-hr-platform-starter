import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { putCover, coverUrl } from "@/lib/storage";

// Upload a KB collection cover to object storage. Manager-only (kb:manage), same
// permission the data layer (lib/kb.ts assertManage) and the server actions enforce.
export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 2_000_000; // 2 MB — image-field pre-compresses rasters to WebP
const ALLOWED = ["image/webp", "image/png", "image/jpeg", "image/gif", "image/svg+xml"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!can(session.user.role, "kb:manage")) {
    return new Response("Forbidden", { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return new Response("No file", { status: 400 });
  if (!ALLOWED.includes(file.type)) return new Response("Unsupported type", { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return new Response("File too large", { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = await putCover(bytes, file.type);
  return Response.json({ url: coverUrl(key) });
}

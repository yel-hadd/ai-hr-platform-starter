import { randomUUID } from "node:crypto";
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// S3-compatible object storage (MinIO in dev) for Knowledge Base cover images.
// The bucket is PRIVATE — images are only ever served through the same-origin
// proxy route (src/app/api/kb/images/[...key]/route.ts), never exposed directly.
// Server-only: reads S3_* secrets and uses the AWS SDK, so it must not be
// imported into any client component.

const BUCKET = process.env.S3_BUCKET ?? "kb-images";

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  forcePathStyle: true, // required for MinIO / non-AWS S3
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
  },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let bucketReady = false;

/**
 * Create the bucket if it doesn't exist. Retries a few times so we tolerate
 * MinIO still starting up (compose brings it up alongside the app). Idempotent.
 */
export async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
      bucketReady = true;
      return;
    } catch (headErr) {
      // Missing bucket (or first boot): try to create it.
      try {
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
        bucketReady = true;
        return;
      } catch (createErr) {
        const name = (createErr as { name?: string })?.name;
        if (name === "BucketAlreadyOwnedByYou" || name === "BucketAlreadyExists") {
          bucketReady = true;
          return;
        }
        // Likely MinIO not reachable yet — back off and retry.
        lastErr = createErr ?? headErr;
        await sleep(1000);
      }
    }
  }
  throw new Error(`MinIO bucket "${BUCKET}" not ready`, { cause: lastErr });
}

function extFor(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("webp")) return "webp";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("svg")) return "svg";
  if (ct.includes("gif")) return "gif";
  return "bin";
}

/** Upload a cover image; returns the object key (e.g. `covers/<uuid>.webp`). */
export async function putCover(
  bytes: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  await ensureBucket();
  const key = `covers/${randomUUID()}.${extFor(contentType)}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );
  return key;
}

/** Fetch an object's bytes + content type, or null if it doesn't exist. */
export async function getObject(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return { bytes, contentType: res.ContentType ?? "application/octet-stream" };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    const name = (err as { name?: string })?.name;
    if (status === 404 || name === "NoSuchKey" || name === "NotFound") return null;
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Turn a stored object key into the same-origin proxy path used in <img>/<Image>. */
export function coverUrl(key: string): string {
  return `/api/kb/images/${key}`;
}

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

export interface StoreEntry {
  label: string;
  prefix: string;
  /** "env" = came from STORES env var, "custom" = saved via UI */
  source: "env" | "custom";
}

export interface StoresState {
  stores: StoreEntry[];
}

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

const bucket = process.env.S3_BUCKET_NAME ?? "";
const key = process.env.S3_STATE_KEY ?? "ecommerce-admin/stores-state.json";


export async function readState(): Promise<StoresState> {
  if (!bucket) return { stores: [] };
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await res.Body?.transformToString("utf-8");
    if (!body) return { stores: [] };
    return JSON.parse(body) as StoresState;
  } catch (err: unknown) {
    const code = (err as { name?: string; Code?: string }).name ?? (err as { Code?: string }).Code;
    // NoSuchKey = file doesn't exist yet; AccessDenied = misconfigured creds/policy
    if (code === "NoSuchKey" || code === "AccessDenied") return { stores: [] };
    throw err;
  }
}

export async function writeState(state: StoresState): Promise<void> {
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(state, null, 2),
      ContentType: "application/json",
    })
  );
}

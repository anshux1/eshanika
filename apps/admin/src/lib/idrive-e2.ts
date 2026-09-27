import { custom } from "@better-upload/server/clients";
import { headObject, presignGetObject } from "@better-upload/server/helpers";

let storage: ReturnType<typeof custom> | undefined;

export function getIdriveE2(): ReturnType<typeof custom> {
  if (storage) return storage;

  const endpoint = process.env.IDRIVE_E2_ENDPOINT;
  const region = process.env.IDRIVE_E2_REGION;
  const accessKeyId = process.env.IDRIVE_E2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.IDRIVE_E2_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("IDrive e2 storage is not configured");
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.pathname !== "/") {
    throw new Error("IDrive e2 endpoint must be an HTTPS origin");
  }
  storage = custom({
    host: url.host,
    region,
    accessKeyId,
    secretAccessKey,
    secure: true,
    forcePathStyle: true,
  });
  return storage;
}

export function getIdriveE2Bucket() {
  const bucket = process.env.IDRIVE_E2_BUCKET;
  if (!bucket) throw new Error("IDrive e2 bucket is not configured");
  return bucket;
}

export function getUploadedImage(key: string): ReturnType<typeof headObject> {
  return headObject(getIdriveE2(), { bucket: getIdriveE2Bucket(), key });
}

export function getImageReadUrl(
  key: string,
): ReturnType<typeof presignGetObject> {
  return presignGetObject(getIdriveE2(), {
    bucket: getIdriveE2Bucket(),
    key,
    expiresIn: 15 * 60,
  });
}

// Reads only the start of an upload. That is enough to check the file type and
// image size without pulling a 10 MB file into memory. A store that ignores
// the Range header returns the whole file, which still works.
export async function getUploadedImageStart(
  key: string,
  byteCount: number,
): Promise<Uint8Array> {
  const response = await fetch(await getImageReadUrl(key), {
    headers: { Range: `bytes=0-${byteCount - 1}` },
  });
  if (!response.ok) {
    throw new Error(
      `Reading image ${key} failed with status ${response.status}`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

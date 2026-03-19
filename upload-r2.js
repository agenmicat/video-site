import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";

const mediaDir = "./media";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Env R2 belum lengkap. Cek .env");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".mp4") return "video/mp4";
  if (ext === ".m3u8") return "application/vnd.apple.mpegurl";
  if (ext === ".ts") return "video/mp2t";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".json") return "application/json";

  return "application/octet-stream";
}

async function objectExists(key) {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: key
      })
    );
    return true;
  } catch (err) {
    const code = err?.name || err?.Code || err?.code;
    const status = err?.$metadata?.httpStatusCode;

    if (
      code === "NotFound" ||
      code === "NoSuchKey" ||
      status === 404
    ) {
      return false;
    }

    throw err;
  }
}

async function uploadFile(fileName) {
  const fullPath = path.join(mediaDir, fileName);

  if (!fs.statSync(fullPath).isFile()) return;

  const exists = await objectExists(fileName);

  if (exists) {
    console.log(`Skip (exists): ${fileName}`);
    return;
  }

  const body = fs.readFileSync(fullPath);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: fileName,
    Body: body,
    ContentType: getContentType(fileName)
  });

  await client.send(command);
  console.log(`Uploaded: ${fileName}`);
}

async function main() {
  const files = fs.readdirSync(mediaDir);

  for (const file of files) {
    await uploadFile(file);
  }

  console.log("R2 upload selesai.");
}

main().catch(err => {
  console.error("Upload gagal:", err);
  process.exit(1);
});
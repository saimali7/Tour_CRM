import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT;
const accessKey = process.env.S3_ACCESS_KEY;
const secretKey = process.env.S3_SECRET_KEY;
const region = process.env.S3_REGION || "us-east-1";
const bucket = process.env.S3_BUCKET || "tour-images";

if (!endpoint || !accessKey || !secretKey) {
  console.log("[s3:init] S3 endpoint/credentials not configured. Skipping bucket init.");
  process.exit(0);
}

const client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true,
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`[s3:init] Bucket already exists: ${bucket}`);
} catch (error) {
  const code = error?.name || error?.Code || error?.code;
  if (code === "NotFound" || code === "NoSuchBucket" || code === "404") {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`[s3:init] Created bucket: ${bucket}`);
  } else {
    console.error("[s3:init] Failed to verify/create bucket:", error);
    process.exit(1);
  }
}

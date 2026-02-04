import { S3Client } from "@aws-sdk/client-s3";

// Validate R2 environment variables
function validateR2Config() {
  if (!process.env.R2_ACCOUNT_ID) {
    throw new Error("R2_ACCOUNT_ID is not set in environment variables");
  }
  if (!process.env.R2_ACCESS_KEY_ID) {
    throw new Error("R2_ACCESS_KEY_ID is not set in environment variables");
  }
  if (!process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2_SECRET_ACCESS_KEY is not set in environment variables");
  }
}

// Lazy initialization - only create client when needed
let r2ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!r2ClientInstance) {
    validateR2Config();
    r2ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2ClientInstance;
}

// Export getter for lazy initialization - returns the client instance
export const r2Client = new Proxy({} as S3Client, {
  get(_target, prop) {
    return getR2Client()[prop as keyof S3Client];
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "easy-rek-videos";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

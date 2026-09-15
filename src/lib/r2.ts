import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;

export const uploadFileToR2 = async (file: File, path: string) => {
  const buffer = await file.arrayBuffer();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: path,
    Body: new Uint8Array(buffer),
    ContentType: file.type,
  });

  await r2Client.send(command);
  return path; // We return the path instead of a public URL since R2 may require presigned URLs
};

export const getR2FileUrl = async (path: string) => {
  // Try generating a presigned URL valid for 1 hour
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: path,
  });
  
  return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
};

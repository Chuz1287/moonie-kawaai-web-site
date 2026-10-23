import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const secretKey = process.env.SECRET_ENCRYPTION_KEY ?? "moonie-kawaai-dev-key-0123456789abcdef";
const ivLength = 16;

export function encryptValue(value: string): string {
  const iv = randomBytes(ivLength);
  const key = Buffer.from(secretKey.padEnd(32, "0").slice(0, 32));
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptValue(value: string): string {
  const buffer = Buffer.from(value, "base64");
  const iv = buffer.subarray(0, ivLength);
  const tag = buffer.subarray(ivLength, ivLength + 16);
  const encrypted = buffer.subarray(ivLength + 16);
  const key = Buffer.from(secretKey.padEnd(32, "0").slice(0, 32));
  const decipher = createDecipheriv(algorithm, key, iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

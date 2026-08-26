import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

const PRFS: Record<number, "sha1" | "sha256" | "sha512"> = {
  0: "sha1",
  1: "sha256",
  2: "sha512",
};

function readUInt32(buffer: Buffer, offset: number) {
  if (buffer.length < offset + 4) return null;
  return buffer.readUInt32BE(offset);
}

export function verifyAspNetIdentityPassword(encodedHash: string, password: string) {
  try {
    const hash = Buffer.from(encodedHash, "base64");

    if (hash[0] === 0x00) {
      if (hash.length !== 49) return false;
      const salt = hash.subarray(1, 17);
      const expected = hash.subarray(17);
      const actual = pbkdf2Sync(password, salt, 1_000, expected.length, "sha1");
      return timingSafeEqual(actual, expected);
    }

    if (hash[0] !== 0x01) return false;
    const prf = readUInt32(hash, 1);
    const iterations = readUInt32(hash, 5);
    const saltLength = readUInt32(hash, 9);
    if (prf === null || iterations === null || saltLength === null) return false;

    const algorithm = PRFS[prf];
    const saltStart = 13;
    const subkeyStart = saltStart + saltLength;
    if (!algorithm || iterations < 1 || saltLength < 16 || hash.length <= subkeyStart) return false;

    const salt = hash.subarray(saltStart, subkeyStart);
    const expected = hash.subarray(subkeyStart);
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, algorithm);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

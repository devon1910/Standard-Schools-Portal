import { pbkdf2Sync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyAspNetIdentityPassword } from "../lib/legacy-password";

function identityV3Hash(password: string) {
  const salt = randomBytes(16);
  const iterations = 10_000;
  const subkey = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const payload = Buffer.alloc(13 + salt.length + subkey.length);
  payload[0] = 0x01;
  payload.writeUInt32BE(1, 1);
  payload.writeUInt32BE(iterations, 5);
  payload.writeUInt32BE(salt.length, 9);
  salt.copy(payload, 13);
  subkey.copy(payload, 13 + salt.length);
  return payload.toString("base64");
}

describe("ASP.NET Identity password compatibility", () => {
  it("accepts a matching Identity V3 password", () => {
    const encoded = identityV3Hash("former-password");
    expect(verifyAspNetIdentityPassword(encoded, "former-password")).toBe(true);
  });

  it("rejects a non-matching or malformed password", () => {
    const encoded = identityV3Hash("former-password");
    expect(verifyAspNetIdentityPassword(encoded, "wrong-password")).toBe(false);
    expect(verifyAspNetIdentityPassword("not-a-hash", "former-password")).toBe(false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SourcePlatform } from "@prisma/client";
import { assertSafePublicUrl, detectPlatform, InvalidUrlError } from "./urlValidator";

describe("assertSafePublicUrl", () => {
  it("rejects private and mapped IPv6 addresses", () => {
    for (const url of [
      "http://127.0.0.1/video.mp4",
      "http://[::1]/video.mp4",
      "http://[::ffff:127.0.0.1]/video.mp4",
      "http://10.1.2.3/video.mp4",
    ]) {
      assert.throws(() => assertSafePublicUrl(url), InvalidUrlError);
    }
  });

  it("rejects embedded credentials and local hostnames", () => {
    assert.throws(() => assertSafePublicUrl("http://user:pass@example.com/video.mp4"), InvalidUrlError);
    assert.throws(() => assertSafePublicUrl("http://printer.local/video.mp4"), InvalidUrlError);
    assert.throws(() => assertSafePublicUrl("https://cdn.example.com:8443/video.mp4"), InvalidUrlError);
  });

  it("accepts a public HTTPS URL", () => {
    assert.equal(assertSafePublicUrl("https://cdn.example.com/video.mp4").hostname, "cdn.example.com");
  });
});

describe("detectPlatform", () => {
  it("does not mistake hostnames that merely end in a platform name", () => {
    assert.equal(detectPlatform(new URL("https://fakeyoutube.com/watch?v=1")), SourcePlatform.OTHER);
    assert.equal(detectPlatform(new URL("https://youtube.com.evil.example/watch?v=1")), SourcePlatform.OTHER);
    assert.equal(detectPlatform(new URL("https://www.youtube.com/watch?v=1")), SourcePlatform.YOUTUBE);
  });
});

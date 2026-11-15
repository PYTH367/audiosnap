import { lookup as dnsLookup } from "node:dns/promises";
import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Agent, fetch } from "undici";
import ipaddr from "ipaddr.js";
import { env } from "@/config/env";
import { UnsupportedSourceError } from "@/middleware/error.middleware";
import { assertSafePublicUrl, InvalidUrlError } from "@/utils/urlValidator";

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

async function resolvePublicAddresses(hostname: string) {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");
  const addresses = await dnsLookup(normalizedHostname, { all: true, verbatim: true });

  if (
    addresses.length === 0 ||
    addresses.some((entry) => ipaddr.process(entry.address).range() !== "unicast")
  ) {
    throw new UnsupportedSourceError("URLs pointing to internal/private addresses are not allowed.");
  }

  return addresses;
}

function createPinnedAgent(hostname: string, addresses: Awaited<ReturnType<typeof resolvePublicAddresses>>) {
  const expectedHostname = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  return new Agent({
    connect: {
      lookup: (requestedHostname, options, callback) => {
        if (requestedHostname.replace(/^\[|\]$/g, "").toLowerCase() !== expectedHostname) {
          callback(new Error("Outbound host changed after DNS validation."), "", 0);
          return;
        }

        if (typeof options === "object" && "all" in options && options.all) {
          callback(null, addresses);
        } else {
          callback(null, addresses[0].address, addresses[0].family);
        }
      },
    },
  });
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

export async function downloadPublicMedia(url: URL, destination: string): Promise<void> {
  let currentUrl = url;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const addresses = await resolvePublicAddresses(currentUrl.hostname);
    const dispatcher = createPinnedAgent(currentUrl.hostname, addresses);
    let response: Awaited<ReturnType<typeof fetch>> | undefined;
    let bodyConsumed = false;

    try {
      response = await fetch(currentUrl, {
        dispatcher,
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (isRedirect(response.status)) {
        if (redirectCount >= MAX_REDIRECTS) {
          throw new UnsupportedSourceError("The media URL redirected too many times.");
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new UnsupportedSourceError("The media URL returned an invalid redirect.");
        }

        let redirectedUrl: URL;
        try {
          redirectedUrl = new URL(location, currentUrl);
        } catch {
          throw new UnsupportedSourceError("The media URL returned an invalid redirect.");
        }

        if (currentUrl.protocol === "https:" && redirectedUrl.protocol !== "https:") {
          throw new UnsupportedSourceError("Secure media URLs cannot redirect to an insecure URL.");
        }

        try {
          currentUrl = assertSafePublicUrl(redirectedUrl.toString());
        } catch (error) {
          if (error instanceof InvalidUrlError) {
            throw new UnsupportedSourceError(error.message);
          }
          throw error;
        }

        await response.body?.cancel();
        bodyConsumed = true;
        continue;
      }

      if (!response.ok || !response.body) {
        throw new UnsupportedSourceError(`Could not fetch the video (HTTP ${response.status}).`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("video/") && !contentType.startsWith("application/octet-stream")) {
        throw new UnsupportedSourceError(
          "That URL doesn't appear to point directly at a video file. Direct links must serve video content."
        );
      }

      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > env.MAX_SOURCE_SIZE_BYTES) {
        throw new UnsupportedSourceError(
          `Video files must be ${Math.floor(env.MAX_SOURCE_SIZE_BYTES / 1024 / 1024)} MB or smaller.`
        );
      }

      let downloadedBytes = 0;
      const sizeLimit = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          downloadedBytes += chunk.length;
          if (downloadedBytes > env.MAX_SOURCE_SIZE_BYTES) {
            callback(
              new UnsupportedSourceError(
                `Video files must be ${Math.floor(env.MAX_SOURCE_SIZE_BYTES / 1024 / 1024)} MB or smaller.`
              )
            );
            return;
          }
          callback(null, chunk);
        },
      });

      await pipeline(Readable.fromWeb(response.body), sizeLimit, createWriteStream(destination, { flags: "wx" }));
      bodyConsumed = true;
      return;
    } finally {
      if (response?.body && !bodyConsumed) {
        await response.body.cancel().catch(() => undefined);
      }
      await dispatcher.close();
    }
  }
}

import { lookup } from "node:dns/promises";
import { Agent, fetch as request } from "undici";
import ipaddr from "ipaddr.js";
import { AppError } from "../../core/errors";
export function publicAddress(address: string) {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress())
      ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function publicUrl(value: string) {
  const u = new URL(value);
  if (
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port && !["80", "443"].includes(u.port)) ||
    u.hostname.endsWith(".localhost") ||
    u.hostname === "localhost" ||
    u.hostname.endsWith(".local")
  )
    throw new AppError(
      "validation_failed",
      "Use a public HTTP or HTTPS source.",
    );
  if (
    [...u.searchParams.keys()].some((k) =>
      /^(?:access_token|token|api_key|apikey|password|signature|x-amz-signature)$/i.test(
        k,
      ),
    )
  )
    throw new AppError(
      "validation_failed",
      "Use a public source without access credentials.",
    );
  u.hash = "";
  return u;
}
export async function safeFetch(
  value: string,
): Promise<{ url: string; text: string; contentType: string }> {
  let u = publicUrl(value);
  for (let redirects = 0; redirects < 4; redirects++) {
    const host = u.hostname.replace(/^\[|\]$/g, "");
    const addresses = await lookup(host, { all: true });
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new AppError(
        "retrieval_failed",
        "This source does not resolve to a public network.",
      );
    const pinned = addresses[0];
    const agent = new Agent({
      connect: {
        lookup: ((
          _hostname: string,
          opts: { all?: boolean },
          cb: (...args: unknown[]) => void,
        ) =>
          opts.all
            ? cb(null, [pinned])
            : cb(null, pinned.address, pinned.family)) as never,
      },
    });
    try {
      const res = await request(u, {
        dispatcher: agent,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: {
          "user-agent": "Afield/0.1 public-source research",
          accept:
            "text/html,application/rss+xml,application/atom+xml,application/xml,text/plain",
        },
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        await res.body?.cancel();
        if (!location)
          throw new AppError("retrieval_failed", "Invalid source redirect.");
        u = publicUrl(new URL(location, u).href);
        continue;
      }
      if (!res.ok)
        throw new AppError(
          "retrieval_failed",
          "This source is unavailable or access-restricted.",
        );
      const ct = res.headers.get("content-type") || "";
      if (
        !/text\/(html|plain|xml)|application\/(rss\+xml|atom\+xml|xml|xhtml\+xml)/i.test(
          ct,
        )
      )
        throw new AppError(
          "retrieval_failed",
          "This source format is not supported.",
        );
      let bytes = 0,
        text = "";
      for await (const chunk of res.body!) {
        bytes += chunk.length;
        if (bytes > 2000000)
          throw new AppError(
            "retrieval_failed",
            "This source exceeds the retrieval size limit.",
          );
        text += Buffer.from(chunk).toString("utf8");
      }
      return { url: u.href, text, contentType: ct };
    } finally {
      await agent.close();
    }
  }
  throw new AppError(
    "retrieval_failed",
    "This source redirects too many times.",
  );
}
export function inScope(
  candidate: string,
  source: { url: string; scope: string },
) {
  try {
    const c = publicUrl(candidate),
      s = publicUrl(source.url);
    if (source.scope === "page")
      return (
        c.origin === s.origin &&
        c.pathname === s.pathname &&
        c.search === s.search
      );
    return (
      c.origin === s.origin &&
      (s.pathname === "/" ||
        c.pathname === s.pathname ||
        c.pathname.startsWith(s.pathname.replace(/\/$/, "") + "/"))
    );
  } catch {
    return false;
  }
}

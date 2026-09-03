// Server-only helper: sends FCM v1 push messages using a Firebase service
// account. Uses the Web Crypto API so it runs on the Cloudflare Workers
// runtime that TanStack Start uses in production.

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const parsed = JSON.parse(raw) as ServiceAccount;
  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
}

function b64url(bytes: ArrayBuffer | Uint8Array | string): string {
  let bin: string;
  if (typeof bytes === "string") {
    bin = bytes;
  } else {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    bin = "";
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  }
  return btoa(bin).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const enc = new TextEncoder();
  const signingInput =
    b64url(enc.encode(JSON.stringify(header))) +
    "." +
    b64url(enc.encode(JSON.stringify(claims)));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(signingInput));
  const jwt = signingInput + "." + b64url(sig);

  const resp = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" +
      encodeURIComponent(jwt),
  });
  if (!resp.ok) {
    throw new Error(`FCM token exchange failed: ${resp.status} ${await resp.text()}`);
  }
  const json = (await resp.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, exp: now + json.expires_in };
  return json.access_token;
}

export type FcmMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
  tag?: string;
};

async function sendOne(
  sa: ServiceAccount,
  accessToken: string,
  token: string,
  msg: FcmMessage,
): Promise<{ token: string; ok: boolean; status: number; error?: string }> {
  const payload = {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      data: msg.data ?? {},
      android: {
        priority: "HIGH",
        notification: {
          sound: "default",
          default_vibrate_timings: true,
          channel_id: "orders_high_priority",
          tag: msg.tag,
        },
      },
    },
  };

  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const text = await resp.text();
  return { token, ok: resp.ok, status: resp.status, error: resp.ok ? undefined : text };
}

/**
 * Per-token send result, for diagnostics screens. Does NOT prune anything —
 * callers decide what to do with invalid tokens.
 */
export async function sendFcmDetailed(
  tokens: string[],
  msg: FcmMessage,
): Promise<{ token: string; ok: boolean; status: number; error?: string }[]> {
  if (tokens.length === 0) return [];
  const sa = loadServiceAccount();
  const accessToken = await getAccessToken(sa);
  return Promise.all(tokens.map((t) => sendOne(sa, accessToken, t, msg)));
}

export async function sendFcmToTokens(
  tokens: string[],
  msg: FcmMessage,
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  if (tokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [] };
  const sa = loadServiceAccount();
  const accessToken = await getAccessToken(sa);
  const results = await Promise.all(tokens.map((t) => sendOne(sa, accessToken, t, msg)));
  const invalidTokens: string[] = [];
  let sent = 0;
  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      sent++;
    } else {
      failed++;
      // 404 UNREGISTERED / 400 INVALID_ARGUMENT for token means it's stale
      if (
        r.status === 404 ||
        (r.error && /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/i.test(r.error))
      ) {
        invalidTokens.push(r.token);
      }
      console.error("[fcm] send failed", r.status, r.error);
    }
  }
  return { sent, failed, invalidTokens };
}

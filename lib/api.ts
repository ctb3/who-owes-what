"use client";

/**
 * Fetch wrapper for JSON API calls that carry a body.
 *
 * In production the app sits behind CloudFront, which signs origin requests to
 * the Lambda function URL with Origin Access Control. CloudFront does not hash
 * request bodies itself: for POST/PUT the *client* must send the payload's
 * SHA-256 in `x-amz-content-sha256`, or the signature check rejects the
 * request before it reaches the app. Harmless everywhere else (locally it's
 * just an extra header), so it is always sent.
 */
async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function apiSend(
  url: string,
  method: "POST" | "PUT",
  payload: unknown,
): Promise<Response> {
  const body = JSON.stringify(payload);
  return fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-amz-content-sha256": await sha256Hex(body),
    },
    body,
  });
}

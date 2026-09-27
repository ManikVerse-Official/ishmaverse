// Manage Bot — lets a card's sender inspect or permanently delete it via the
// secret `management_token` minted at creation.
//
// Security model:
//   • The token is a random UUID (122 bits) and is never exposed by any public
//     read — the step8 migration grants clients only the safe columns.
//   • The token is the sole authorization for the action, so lookups are exact
//     and cannot enumerate other cards.
//   • Deletion is permanent and removes the row for everyone immediately.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/auth.ts";

interface ManageRequest {
  token?: string;
  action?: "get" | "delete";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public-safe columns only — never the management_token. */
const SAFE_COLUMNS =
  "id, sender_name, receiver_name, message, theme, external_image_url, created_at, expires_at, amount, paid, font, text_color, title_color, message_color, signature_color, background_color, background_color_start, background_color_end, background_gradient_angle, title, eyebrow, signoff, audio_track";
// NOTE: payment_id is intentionally excluded — the sender never needs the
// gateway reference, and it should not travel through a public-ish endpoint.

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body = (await req.json()) as ManageRequest;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!UUID_RE.test(token)) return errorResponse("Invalid management link", 400);

    const action: "get" | "delete" = body.action === "delete" ? "delete" : "get";
    const supabase = createAdminClient();

    const { data: card, error } = await supabase
      .from("greeting_cards")
      .select(SAFE_COLUMNS)
      .eq("management_token", token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!card) return errorResponse("This card no longer exists", 404);

    if (action === "delete") {
      const { error: deleteError } = await supabase
        .from("greeting_cards")
        .delete()
        .eq("management_token", token);
      if (deleteError) throw new Error(deleteError.message);

      return jsonResponse({ success: true, deleted: true, card_id: card.id });
    }

    const expired =
      Boolean(card.expires_at) && new Date(card.expires_at as string).getTime() <= Date.now();

    return jsonResponse({ success: true, expired, card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("manage-greeting failed:", message);
    return errorResponse(message, 500);
  }
});

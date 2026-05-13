import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const FLW_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "";

const EXPECTED_DOMAIN = "kmercoders.com";
const STRIPE_HOOK_PATH = "/functions/v1/stripe-webhook";
const FLW_HOOK_PATH = "/functions/v1/flutterwave-webhook";

type ProviderReport = {
  provider: string;
  status: "ok" | "warn" | "error";
  expected_endpoint: string;
  configured_endpoints: string[];
  notes: string[];
};

function expectedSupabaseUrl(path: string) {
  return SUPABASE_URL.replace(/\/$/, "") + path;
}

async function checkStripe(): Promise<ProviderReport> {
  const expected = expectedSupabaseUrl(STRIPE_HOOK_PATH);
  const report: ProviderReport = {
    provider: "stripe",
    status: "ok",
    expected_endpoint: expected,
    configured_endpoints: [],
    notes: [],
  };
  if (!STRIPE_SECRET_KEY) {
    report.status = "warn";
    report.notes.push("STRIPE_SECRET_KEY not configured — skipping check.");
    return report;
  }
  try {
    const res = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) {
      report.status = "error";
      report.notes.push(`Stripe API ${res.status}: ${await res.text()}`);
      return report;
    }
    const json = await res.json();
    const endpoints = (json.data ?? []) as Array<{ url: string; status: string }>;
    report.configured_endpoints = endpoints.map((e) => e.url);
    const match = endpoints.find((e) => e.url === expected && e.status === "enabled");
    if (!match) {
      report.status = "error";
      report.notes.push(
        `No enabled webhook found pointing to ${expected}. Add it in Stripe → Developers → Webhooks.`,
      );
    }
    const stale = endpoints.filter((e) => /khai\.africa/i.test(e.url));
    if (stale.length > 0) {
      report.status = report.status === "ok" ? "warn" : report.status;
      report.notes.push(
        `Found ${stale.length} legacy khai.africa webhook(s) — disable them.`,
      );
    }
  } catch (err) {
    report.status = "error";
    report.notes.push(`Stripe check failed: ${(err as Error).message}`);
  }
  return report;
}

async function checkFlutterwave(): Promise<ProviderReport> {
  // Flutterwave does not expose a public endpoint to list webhook URLs;
  // we can only verify the API key works and surface what we expect.
  const expected = expectedSupabaseUrl(FLW_HOOK_PATH);
  const report: ProviderReport = {
    provider: "flutterwave",
    status: "ok",
    expected_endpoint: expected,
    configured_endpoints: [],
    notes: [],
  };
  if (!FLW_SECRET_KEY) {
    report.status = "warn";
    report.notes.push("FLUTTERWAVE_SECRET_KEY not configured — skipping check.");
    return report;
  }
  try {
    const res = await fetch("https://api.flutterwave.com/v3/banks/NG", {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });
    if (!res.ok) {
      report.status = "error";
      report.notes.push(`Flutterwave API ${res.status}: credentials may be invalid.`);
      return report;
    }
    report.notes.push(
      "Flutterwave does not expose webhook URLs via API. Manually verify in dashboard → Settings → Webhooks.",
    );
    report.notes.push(`Expected webhook URL: ${expected}`);
    report.status = "warn";
  } catch (err) {
    report.status = "error";
    report.notes.push(`Flutterwave check failed: ${(err as Error).message}`);
  }
  return report;
}

function checkAppUrl(): ProviderReport {
  const report: ProviderReport = {
    provider: "app_url",
    status: "ok",
    expected_endpoint: `https://${EXPECTED_DOMAIN}`,
    configured_endpoints: [APP_URL],
    notes: [],
  };
  if (!APP_URL) {
    report.status = "error";
    report.notes.push("APP_URL secret is not set.");
  } else if (!APP_URL.includes(EXPECTED_DOMAIN)) {
    report.status = "error";
    report.notes.push(
      `APP_URL '${APP_URL}' does not point to ${EXPECTED_DOMAIN}.`,
    );
  }
  return report;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const [stripe, flutterwave] = await Promise.all([
      checkStripe(),
      checkFlutterwave(),
    ]);
    const appUrl = checkAppUrl();
    const reports = [appUrl, stripe, flutterwave];
    const overall = reports.some((r) => r.status === "error")
      ? "error"
      : reports.some((r) => r.status === "warn")
      ? "warn"
      : "ok";

    return new Response(
      JSON.stringify({
        domain: EXPECTED_DOMAIN,
        overall,
        checked_at: new Date().toISOString(),
        reports,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
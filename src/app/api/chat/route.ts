/**
 * /api/chat — server-side entry point for the AI adapter.
 *
 * Edge runtime: minimal cold-start, deploys to Vercel's edge network.
 * All provider logic lives in `lib/ai-adapter.ts` so this file stays tiny.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAdapter, getProviderClient, type AdapterRequest } from '@/lib/ai-adapter';
import { PROVIDERS, type ProviderId } from '@/lib/providers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && value in PROVIDERS;
}

export async function POST(req: NextRequest) {
  let raw: AdapterRequest;
  try {
    raw = (await req.json()) as AdapterRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'upstream_error', message: 'Request body must be JSON.', status: 400, retryable: false } },
      { status: 400 },
    );
  }

  const { provider, model, messages, credentials } = raw;

  if (!isProviderId(provider)) {
    return NextResponse.json(
      { ok: false, error: { code: 'unsupported_provider', message: `Unknown provider: ${String(provider)}.`, status: 400, retryable: false } },
      { status: 400 },
    );
  }

  // Pre-flight check: Ensure required API key is configured
  const clientConfig = getProviderClient(provider, credentials);
  if (provider !== 'ollama' && !clientConfig.apiKey) {
    const providerLabel = PROVIDERS[provider]?.label ?? provider;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'missing_credentials',
          message: `Missing API key for provider [${providerLabel}]. Configure ${provider.toUpperCase()}_API_KEY in .env.local or enter key in Settings.`,
          status: 400,
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  if (!model || typeof model !== 'string') {
    return NextResponse.json(
      { ok: false, error: { code: 'upstream_error', message: 'Missing model id.', status: 400, retryable: false } },
      { status: 400 },
    );
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: 'upstream_error', message: 'Messages array is required.', status: 400, retryable: false } },
      { status: 400 },
    );
  }

  const outcome = await runAdapter(raw);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.error.status });
  }
  return NextResponse.json({ ok: true, data: outcome.data });
}
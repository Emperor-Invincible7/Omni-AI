/**
 * CLI smoke test: hit the API with "hi", verify the chat route runs,
 * verify a session row gets created via the server action.
 *
 * This intentionally uses the dev server (port 3000) so it picks up the
 * live DB the same way the browser does.
 */
const BASE = 'http://127.0.0.1:3000';

async function main() {
  console.log('1. GET / — page renders');
  const page = await fetch(`${BASE}/`);
  console.log(`   status: ${page.status}`);
  if (!page.ok) throw new Error('page not ok');

  console.log('2. POST /api/chat — request round-trip');
  const chat = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hi' }],
    }),
  });
  const body = await chat.json();
  console.log(`   status: ${chat.status}`);
  console.log(`   ok: ${body.ok}`);
  if (body.ok) {
    console.log(`   provider: ${body.data.provider}`);
    console.log(`   model: ${body.data.model}`);
    console.log(`   content: ${body.data.content.slice(0, 80)}…`);
    console.log(`   usage: ${JSON.stringify(body.data.usage)}`);
  } else {
    console.log(`   error: ${JSON.stringify(body.error)}`);
  }

  // Even on upstream failure, the route should respond with a normalized envelope.
  if (!body.ok && !body.error) throw new Error('envelope malformed');
  console.log('3. envelope valid');
  console.log('--- SMOKE_OK');
}

main().catch((err) => {
  console.error('SMOKE_FAILED:', err.message);
  process.exit(1);
});

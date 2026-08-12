/**
 * Verify the SQLite DB has the expected schema and is writable.
 * Uses the Prisma client directly to mirror what the server actions do.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('1. Connect to DB');
  await prisma.$connect();
  console.log('   connected');

  console.log('2. Create session');
  const session = await prisma.session.create({
    data: { title: 'Hi Test' },
  });
  console.log(`   session id: ${session.id}`);

  console.log('3. Create turn pair (user + assistant)');
  const [userMsg, assistantMsg] = await prisma.$transaction([
    prisma.message.create({
      data: { sessionId: session.id, role: 'user', content: 'hi' },
    }),
    prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: 'Hello. OMNI-AI runtime online.',
        metrics: JSON.stringify({ model: 'claude-haiku-4-5', provider: 'anthropic', latencyMs: 123, tokens: 24 }),
      },
    }),
  ]);
  console.log(`   user msg id: ${userMsg.id}`);
  console.log(`   assistant msg id: ${assistantMsg.id}`);

  console.log('4. Read back');
  const msgs = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`   ${msgs.length} messages in session`);
  for (const m of msgs) {
    console.log(`     [${m.role}] ${m.content}`);
  }

  console.log('5. Cleanup');
  await prisma.session.delete({ where: { id: session.id } });
  console.log('   deleted session');

  console.log('--- DB_OK');
}

main()
  .catch((err) => {
    console.error('DB_FAILED:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

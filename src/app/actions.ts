'use server';

/**
 * Server actions for session management.
 * Called from the client via React's `use server` directive.
 */
import { revalidatePath } from 'next/cache';
import {
  createSession,
  listSessions,
  getMessages,
  deleteSession,
  renameSessionIfEmpty,
  serializeMetrics,
} from '@/lib/sessions';
import { prisma } from '@/lib/db';

export async function listSessionsAction() {
  return listSessions();
}

export async function createSessionAction(): Promise<string> {
  const id = await createSession();
  revalidatePath('/');
  return id;
}

export async function deleteSessionAction(id: string): Promise<void> {
  await deleteSession(id);
  revalidatePath('/');
}

export async function loadSessionMessagesAction(id: string) {
  return getMessages(id);
}

/**
 * Persist a turn pair. Called after a successful chat completion.
 * Returns the session id so the client can verify.
 */
export async function saveTurnAction(args: {
  sessionId: string;
  userContent: string;
  assistantContent: string;
  metrics?: Record<string, unknown>;
}): Promise<{ ok: true; messageIds: string[] } | { ok: false; error: string }> {
  if (!args.sessionId) return { ok: false, error: 'missing_sessionId' };
  if (!args.userContent.trim() || !args.assistantContent.trim()) {
    return { ok: false, error: 'empty_content' };
  }
  const session = await prisma.session.findUnique({ where: { id: args.sessionId } });
  if (!session) return { ok: false, error: 'unknown_session' };

  const [userRow, assistantRow] = await prisma.$transaction([
    prisma.message.create({
      data: {
        sessionId: args.sessionId,
        role: 'user',
        content: args.userContent,
      },
    }),
    prisma.message.create({
      data: {
        sessionId: args.sessionId,
        role: 'assistant',
        content: args.assistantContent,
        metrics: serializeMetrics(args.metrics ?? null),
      },
    }),
    prisma.session.update({
      where: { id: args.sessionId },
      data: { updatedAt: new Date() },
    }),
  ]);

  await renameSessionIfEmpty(args.sessionId, args.userContent);
  revalidatePath('/');
  return { ok: true, messageIds: [userRow.id, assistantRow.id] };
}
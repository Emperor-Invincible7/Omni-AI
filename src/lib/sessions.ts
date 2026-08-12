/**
 * Session repository — thin wrapper over Prisma for chat session persistence.
 * Used by both the server actions and the chat route.
 */
import { prisma } from './db';

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
}

export interface MessageRow {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metrics: Record<string, unknown> | null;
  createdAt: string;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const rows = await prisma.session.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { content: true },
      },
    },
    take: 50,
  });

  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    messageCount: s._count.messages,
    preview: s.messages[0]?.content.slice(0, 80) ?? null,
  }));
}

export async function createSession(initialTitle = 'New Chat'): Promise<string> {
  const session = await prisma.session.create({ data: { title: initialTitle } });
  return session.id;
}

/** Rename a session, deriving a title from the first user message if empty. */
export async function renameSessionIfEmpty(sessionId: string, proposed: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return;
  if (session.title !== 'New Chat') return;
  const trimmed = proposed.trim().slice(0, 80);
  if (!trimmed) return;
  await prisma.session.update({ where: { id: sessionId }, data: { title: trimmed } });
}

export async function getMessages(sessionId: string): Promise<MessageRow[]> {
  const rows = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((m) => ({
    id: m.id,
    role: m.role as MessageRow['role'],
    content: m.content,
    metrics: parseMetrics(m.metrics),
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function deleteSession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

function parseMetrics(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function serializeMetrics(metrics: Record<string, unknown> | null | undefined): string | null {
  if (!metrics) return null;
  try {
    return JSON.stringify(metrics);
  } catch {
    return null;
  }
}
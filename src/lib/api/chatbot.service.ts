import axios from 'axios';
import type {
  ChatConversationResponse,
  ChatMessage,
  ChatSource,
  SendChatMessageResponse,
} from '@/types';

const CHATBOT_BASE_URL =
  process.env.NEXT_PUBLIC_AI_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const STORAGE_KEY = 'virtualmed-chat-direct';

const chatbotClient = axios.create({
  baseURL: CHATBOT_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

interface ChatbotSourceDto {
  file_name: string;
  page_label: string;
  score?: number | null;
}

interface ChatbotChatResponseDto {
  answer: string;
  sources: ChatbotSourceDto[];
}

interface StoredConversation {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

function mapSource(source: ChatbotSourceDto): ChatSource {
  return {
    fileName: source.file_name,
    pageLabel: source.page_label,
    score: source.score ?? null,
  };
}

function readStoredConversation(): StoredConversation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConversation;
  } catch {
    return null;
  }
}

function writeStoredConversation(conversation: StoredConversation): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
}

function getOrCreateSessionId(): string {
  const existing = readStoredConversation();
  if (existing?.sessionId) return existing.sessionId;
  return crypto.randomUUID();
}

function buildConversationResponse(stored: StoredConversation | null): ChatConversationResponse {
  const now = new Date().toISOString();
  const sessionId = stored?.sessionId ?? getOrCreateSessionId();

  if (!stored) {
    const empty: StoredConversation = {
      sessionId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    writeStoredConversation(empty);
    return {
      id: sessionId,
      patientId: 'local',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
  }

  return {
    id: stored.sessionId,
    patientId: 'local',
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    messages: stored.messages,
  };
}

export const chatbotService = {
  getConversation: async (): Promise<ChatConversationResponse> => {
    return buildConversationResponse(readStoredConversation());
  },

  sendMessage: async (message: string): Promise<SendChatMessageResponse> => {
    const stored = readStoredConversation();
    const sessionId = stored?.sessionId ?? getOrCreateSessionId();
    const now = new Date().toISOString();

    const { data } = await chatbotClient.post<ChatbotChatResponseDto>('/chat', {
      session_id: sessionId,
      message,
      similarity_top_k: 5,
    });

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'User',
      content: message,
      createdAt: now,
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'Assistant',
      content: data.answer,
      sources: data.sources?.map(mapSource) ?? [],
      createdAt: new Date().toISOString(),
    };

    const nextConversation: StoredConversation = {
      sessionId,
      createdAt: stored?.createdAt ?? now,
      updatedAt: assistantMessage.createdAt,
      messages: [...(stored?.messages ?? []), userMessage, assistantMessage],
    };
    writeStoredConversation(nextConversation);

    return { userMessage, assistantMessage };
  },
};

export type { ChatSource } from '@/types';

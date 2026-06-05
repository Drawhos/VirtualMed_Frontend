// src/lib/api/chatbot.service.ts
import apiClient from './axios';
import {
  ChatConversationResponse,
  SendChatMessageResponse,
} from '@/types';

export const chatbotService = {
  getConversation: async (): Promise<ChatConversationResponse> => {
    const response = await apiClient.get<ChatConversationResponse>('/patients/me/chat');
    return response.data;
  },

  sendMessage: async (message: string): Promise<SendChatMessageResponse> => {
    const response = await apiClient.post<SendChatMessageResponse>(
      '/patients/me/chat/messages',
      { message },
      { timeout: 90000 }
    );
    return response.data;
  },
};

export type { ChatSource } from '@/types';

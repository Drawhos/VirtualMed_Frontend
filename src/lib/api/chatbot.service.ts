// src/lib/api/chatbot.service.ts
import axios from 'axios';

const CHATBOT_API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://127.0.0.1:8000';

export interface ChatbotRequest {
  session_id: string;
  message: string;
}

export interface ChatbotSource {
  file_name: string;
  page_label: string;
  score: number;
}

export interface ChatbotResponse {
  answer: string;
  sources: ChatbotSource[];
}

const chatbotClient = axios.create({
  baseURL: CHATBOT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const chatbotService = {
  sendMessage: async (payload: ChatbotRequest): Promise<ChatbotResponse> => {
    const response = await chatbotClient.post<ChatbotResponse>('/chat', payload);
    return response.data;
  },
};

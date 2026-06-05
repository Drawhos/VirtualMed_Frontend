// src/lib/api/rag-document.service.ts
import apiClient from './axios';
import { RagDocument, UploadRagDocumentResponse } from '@/types';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const ragDocumentService = {
  list: async (): Promise<RagDocument[]> => {
    const response = await apiClient.get<RagDocument[]>('/admin/rag/documents');
    return response.data;
  },

  upload: async (file: File, onUploadProgress?: (percent: number) => void): Promise<UploadRagDocumentResponse> => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Solo se permiten archivos PDF.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('El archivo supera el máximo de 20 MB.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadRagDocumentResponse>(
      '/admin/rag/documents',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
        onUploadProgress: (event) => {
          if (!event.total) return;
          onUploadProgress?.(Math.round((event.loaded * 100) / event.total));
        },
      }
    );

    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/rag/documents/${id}`);
  },
};

export { MAX_FILE_SIZE_BYTES };

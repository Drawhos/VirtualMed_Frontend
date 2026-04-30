"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";

import apiClient from "@/lib/api/axios";
import { doctorService } from "@/lib/api/doctor.service";
import type { VideoChatMessage, VideoSession } from "@/types";

const CHAT_PAGE_NUMBER = 1;
const CHAT_PAGE_SIZE = 50;

export function useVideoSession(sessionId: string) {
	const [chatHistory, setChatHistory] = useState<VideoChatMessage[]>([]);
	const [isLoadingChat, setIsLoadingChat] = useState(false);
	const [chatError, setChatError] = useState<string | null>(null);

	const loadChatHistory = useCallback(async () => {
		if (!sessionId) return;

		setIsLoadingChat(true);
		setChatError(null);

		try {
			const response = await apiClient.get<VideoChatMessage[]>(
				`/video-sessions/${sessionId}/chat`,
				{
					params: {
						pageNumber: CHAT_PAGE_NUMBER,
						pageSize: CHAT_PAGE_SIZE,
					},
				}
			);
			setChatHistory(response.data ?? []);
		} catch (err) {
			const message = isAxiosError(err)
				? err.response?.data?.message || "No fue posible cargar el chat."
				: "No fue posible cargar el chat.";
			setChatError(message);
		} finally {
			setIsLoadingChat(false);
		}
	}, [sessionId]);

	useEffect(() => {
		loadChatHistory();
	}, [loadChatHistory]);

	const endSession = useCallback(
		async (reason?: string): Promise<VideoSession | null> => {
			if (!sessionId) return null;

			try {
				const response = await doctorService.postEndVideoSession(
					sessionId,
					reason ?? null
				);
				return response;
			} catch (err) {
				const message = isAxiosError(err)
					? err.response?.data?.message || "No fue posible finalizar la sesion."
					: "No fue posible finalizar la sesion.";
				throw new Error(message);
			}
		},
		[sessionId]
	);

	return {
		chatHistory,
		isLoadingChat,
		chatError,
		refreshChat: loadChatHistory,
		endSession,
	};
}

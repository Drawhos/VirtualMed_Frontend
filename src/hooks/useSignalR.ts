"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	HubConnection,
	HubConnectionBuilder,
	HubConnectionState,
} from "@microsoft/signalr";
import { getCookie } from "@/lib/auth-utils";

type ConnectionStatus =
	| "connected"
	| "connecting"
	| "reconnecting"
	| "disconnected";

type OfferPayload = {
	sessionId: string;
	fromConnectionId?: string;
	sdp: RTCSessionDescriptionInit;
};

type AnswerPayload = {
	sessionId: string;
	fromConnectionId?: string;
	sdp: RTCSessionDescriptionInit;
};

type IceCandidatePayload = {
	sessionId: string;
	fromConnectionId?: string;
	candidate: RTCIceCandidateInit;
};

type MessagePayload = {
	id: string;
	sessionId: string;
	senderId: string;
	message: string;
	sentAt: string;
	messageType?: number | string;
};

type JoinedRoomPayload = {
	sessionId: string;
};

type Callback<T> = ((payload: T) => void) | null;

const mapStatus = (state: HubConnectionState): ConnectionStatus => {
	switch (state) {
		case HubConnectionState.Connected:
			return "connected";
		case HubConnectionState.Connecting:
			return "connecting";
		case HubConnectionState.Reconnecting:
			return "reconnecting";
		default:
			return "disconnected";
	}
};

export function useSignalR(sessionId: string) {
	const connectionRef = useRef<HubConnection | null>(null);
	const [status, setStatus] = useState<ConnectionStatus>("disconnected");
	const [isJoined, setIsJoined] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const offerHandlerRef = useRef<Callback<OfferPayload>>(null);
	const answerHandlerRef = useRef<Callback<AnswerPayload>>(null);
	const iceHandlerRef = useRef<Callback<IceCandidatePayload>>(null);
	const messageHandlerRef = useRef<Callback<MessagePayload>>(null);
	const joinedHandlerRef = useRef<Callback<JoinedRoomPayload>>(null);

	const onOffer = useCallback((handler: Callback<OfferPayload>) => {
		offerHandlerRef.current = handler;
	}, []);

	const onAnswer = useCallback((handler: Callback<AnswerPayload>) => {
		answerHandlerRef.current = handler;
	}, []);

	const onIceCandidate = useCallback((handler: Callback<IceCandidatePayload>) => {
		iceHandlerRef.current = handler;
	}, []);

	const onMessageReceived = useCallback((handler: Callback<MessagePayload>) => {
		messageHandlerRef.current = handler;
	}, []);

	const onJoinedRoom = useCallback((handler: Callback<JoinedRoomPayload>) => {
		joinedHandlerRef.current = handler;
	}, []);

	const sendOffer = useCallback(async (targetSessionId: string, sdp: RTCSessionDescriptionInit) => {
		const connection = connectionRef.current;
		if (!connection || connection.state !== HubConnectionState.Connected) return;
		await connection.invoke("SendOffer", targetSessionId, sdp);
	}, []);

	const sendAnswer = useCallback(async (targetSessionId: string, sdp: RTCSessionDescriptionInit) => {
		const connection = connectionRef.current;
		if (!connection || connection.state !== HubConnectionState.Connected) return;
		await connection.invoke("SendAnswer", targetSessionId, sdp);
	}, []);

	const sendIceCandidate = useCallback(
		async (targetSessionId: string, candidate: RTCIceCandidateInit) => {
			const connection = connectionRef.current;
			if (!connection || connection.state !== HubConnectionState.Connected) return;
			await connection.invoke("SendIceCandidate", targetSessionId, candidate);
		},
		[]
	);

	const sendMessage = useCallback(
		async (targetSessionId: string, message: string, messageType?: number) => {
			const connection = connectionRef.current;
			if (!connection || connection.state !== HubConnectionState.Connected) return;
			await connection.invoke(
				"SendMessage",
				targetSessionId,
				message,
				typeof messageType === "number" ? messageType : undefined
			);
		},
		[]
	);

	const leaveRoom = useCallback(async () => {
		const connection = connectionRef.current;
		if (!connection || connection.state !== HubConnectionState.Connected) return;
		await connection.invoke("LeaveRoom", sessionId);
		setIsJoined(false);
	}, [sessionId]);

	useEffect(() => {
		if (!sessionId) return undefined;

		const connection = new HubConnectionBuilder()
			.withUrl("http://localhost:5045/hubs/video-chat",
				{
					accessTokenFactory: () => {
						const token = getCookie('token');
						console.log('SignalR token:', token ? 'presente' : 'VACÍO');
						return token ?? "";
					},
    				withCredentials: false,
				}
			)
			
			.withAutomaticReconnect()
			.build();

		connectionRef.current = connection;

		connection.on("offer", (payload: OfferPayload) => {
			offerHandlerRef.current?.(payload);
		});
		connection.on("answer", (payload: AnswerPayload) => {
			answerHandlerRef.current?.(payload);
		});
		connection.on("iceCandidate", (payload: IceCandidatePayload) => {
			iceHandlerRef.current?.(payload);
		});
		connection.on("messageReceived", (payload: MessagePayload) => {
			messageHandlerRef.current?.(payload);
		});
		connection.on("joinedRoom", (payload: JoinedRoomPayload) => {
			setIsJoined(true);
			joinedHandlerRef.current?.(payload);
		});

		connection.onreconnecting(() => {
			setStatus(mapStatus(connection.state));
		});

		connection.onreconnected(async () => {
			setStatus(mapStatus(connection.state));
			try {
				await connection.invoke("JoinRoom", sessionId);
				setIsJoined(true);
			} catch (err) {
				setError("No fue posible reconectar al chat.");
			}
		});

		connection.onclose(() => {
			setStatus(mapStatus(connection.state));
			setIsJoined(false);
		});

		const startConnection = async () => {
			try {
				setStatus("connecting");
				await connection.start();
				setStatus(mapStatus(connection.state));
				await connection.invoke("JoinRoom", sessionId);
				setIsJoined(true);
			} catch (err) {
				setError("No se pudo conectar al chat en tiempo real.");
				setStatus(mapStatus(connection.state));
			}
		};

		startConnection();

		return () => {
			const teardown = async () => {
				try {
					if (connection.state === HubConnectionState.Connected) {
						await connection.invoke("LeaveRoom", sessionId);
					}
				} catch {
					// noop
				}
				await connection.stop();
			};

			teardown();
		};
	}, [sessionId]);

	return {
		status,
		isConnected: status === "connected",
		isJoined,
		error,
		sendOffer,
		sendAnswer,
		sendIceCandidate,
		sendMessage,
		onOffer,
		onAnswer,
		onIceCandidate,
		onMessageReceived,
		onJoinedRoom,
		leaveRoom,
	};
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WebRtcRole = "doctor" | "patient";

type SignalRClient = {
	isConnected: boolean;
	isJoined: boolean;
	sendOffer: (sessionId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
	sendAnswer: (sessionId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
	sendIceCandidate: (
		sessionId: string,
		candidate: RTCIceCandidateInit
	) => Promise<void>;
	onOffer: (handler: ((payload: { sdp: RTCSessionDescriptionInit }) => void) | null) => void;
	onAnswer: (handler: ((payload: { sdp: RTCSessionDescriptionInit }) => void) | null) => void;
	onIceCandidate: (
		handler: ((payload: { candidate: RTCIceCandidateInit }) => void) | null
	) => void;
	onJoinedRoom: (handler: ((payload: { sessionId: string }) => void) | null) => void;
};

export function useWebRTC(
	sessionId: string,
	iceServers: RTCIceServer[],
	role: WebRtcRole,
	signalR: SignalRClient | null
) {
	const peerRef = useRef<RTCPeerConnection | null>(null);
	const signalRRef = useRef<SignalRClient | null>(null);
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
	const [mediaError, setMediaError] = useState<string | null>(null);
	const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
	const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
	const offerSentRef = useRef(false);
	const answerReceivedRef = useRef(false);

	const sendOffer = async (force = false) => {
		const peer = peerRef.current;
		const sr = signalRRef.current;
		if (!peer || !sr || role !== "doctor") return;
		if (peer.signalingState !== "stable") return;
		if (peer.connectionState === "connected" && answerReceivedRef.current) return;
		if (!force && offerSentRef.current) return;

		try {
			const offer = await peer.createOffer();
			await peer.setLocalDescription(offer);
			if (peer.localDescription) {
				await sr.sendOffer(sessionId, peer.localDescription);
				offerSentRef.current = true;
			}
		} catch {
			// noop
		}
	};
	useEffect(() => {
		signalRRef.current = signalR;
	}, [signalR]);

	useEffect(() => {
		if (!sessionId || !iceServers.length) return undefined;

		let isCancelled = false;
		setMediaError(null);

		const setupPeer = async () => {
			// Intentar obtener cámara/micrófono, pero continuar sin ellos si falla
			let stream: MediaStream | null = null;
			try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
			} catch (err) {
				const message =
					err instanceof DOMException && err.name === "NotReadableError"
						? "La cámara o micrófono está en uso por otra aplicación."
						: err instanceof DOMException && err.name === "NotAllowedError"
							? "No se concedió permiso para acceder a la cámara."
							: "No se pudo acceder a la cámara o micrófono.";
				if (!isCancelled) setMediaError(message);
			}

			if (isCancelled) {
				stream?.getTracks().forEach((t) => t.stop());
				return;
			}

			if (stream) setLocalStream(stream);

			try {
				const peer = new RTCPeerConnection({ iceServers });
				peerRef.current = peer;
				offerSentRef.current = false;
				answerReceivedRef.current = false;

				if (stream) {
					stream.getTracks().forEach((track) => {
						peer.addTrack(track, stream);
					});
				}

				peer.ontrack = (event) => {
					const [firstStream] = event.streams;
					if (firstStream) {
						setRemoteStream(firstStream);
						return;
					}

					setRemoteStream((previous) => {
						const next = previous ?? new MediaStream();
						next.addTrack(event.track);
						return new MediaStream(next.getTracks());
					});
				};

				peer.onicecandidate = (event) => {
					if (!event.candidate || !signalRRef.current) return;
					signalRRef.current.sendIceCandidate(sessionId, event.candidate.toJSON());
				};

				peer.onconnectionstatechange = () => {
					setConnectionState(peer.connectionState);
				};

				if (pendingOfferRef.current && role === "patient") {
					const offer = pendingOfferRef.current;
					pendingOfferRef.current = null;
					await peer.setRemoteDescription(new RTCSessionDescription(offer));
					const answer = await peer.createAnswer();
					await peer.setLocalDescription(answer);
					if (peer.localDescription && signalRRef.current) {
						await signalRRef.current.sendAnswer(sessionId, peer.localDescription);
					}
				}

				// Si el doctor ya está conectado a SignalR, enviar offer ahora que el peer existe
				if (role === "doctor" && signalRRef.current?.isConnected && signalRRef.current?.isJoined) {
					offerSentRef.current = false;
					const offer = await peer.createOffer();
					await peer.setLocalDescription(offer);
					if (peer.localDescription && signalRRef.current) {
						await signalRRef.current.sendOffer(sessionId, peer.localDescription);
						offerSentRef.current = true;
					}
				}
			} catch (err) {
				if (!isCancelled) {
					console.error("[useWebRTC] setupPeer failed:", err);
					setConnectionState("failed");
				}
			}
		};

		setupPeer();

		return () => {
			isCancelled = true;
			const peer = peerRef.current;
			if (peer) {
				peer.ontrack = null;
				peer.onicecandidate = null;
				peer.onconnectionstatechange = null;
				peer.close();
				peerRef.current = null;
			}
			setConnectionState("closed");
			localStream?.getTracks().forEach((track) => track.stop());
			setLocalStream(null);
			setRemoteStream(null);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId, iceServers, role]);

	useEffect(() => {
		const sr = signalRRef.current;
		if (!sr) return undefined;

		sr.onOffer(async ({ sdp }) => {
			const peer = peerRef.current;
			if (!peer) {
				pendingOfferRef.current = sdp;
				return;
			}

			if (role !== "patient") return;
			await peer.setRemoteDescription(new RTCSessionDescription(sdp));
			const answer = await peer.createAnswer();
			await peer.setLocalDescription(answer);
			if (peer.localDescription && signalRRef.current) {
				await signalRRef.current.sendAnswer(sessionId, peer.localDescription);
			}

			const pendingCandidates = pendingCandidatesRef.current;
			pendingCandidatesRef.current = [];
			await Promise.all(
				pendingCandidates.map((candidate) =>
					peer.addIceCandidate(new RTCIceCandidate(candidate))
				)
			);
		});

		sr.onAnswer(async ({ sdp }) => {
			const peer = peerRef.current;
			if (!peer || role !== "doctor") return;
			await peer.setRemoteDescription(new RTCSessionDescription(sdp));
			answerReceivedRef.current = true;

			const pendingCandidates = pendingCandidatesRef.current;
			pendingCandidatesRef.current = [];
			await Promise.all(
				pendingCandidates.map((candidate) =>
					peer.addIceCandidate(new RTCIceCandidate(candidate))
				)
			);
		});

		sr.onIceCandidate(async ({ candidate }) => {
			const peer = peerRef.current;
			if (!peer) {
				pendingCandidatesRef.current.push(candidate);
				return;
			}

			if (!peer.remoteDescription) {
				pendingCandidatesRef.current.push(candidate);
				return;
			}

			await peer.addIceCandidate(new RTCIceCandidate(candidate));
		});

		return () => {
			sr.onOffer(null);
			sr.onAnswer(null);
			sr.onIceCandidate(null);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [role, sessionId]);

	const offerSchedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const scheduleOffer = useCallback((immediate = false) => {
		// Cancela cualquier oferta pendiente
		if (offerSchedulerRef.current) {
			clearTimeout(offerSchedulerRef.current);
			offerSchedulerRef.current = null;
		}

		const delay = immediate ? 0 : 2000;

		offerSchedulerRef.current = setTimeout(async () => {
			offerSchedulerRef.current = null;
			await sendOffer(immediate);
		}, delay);
		}, []);
	
	useEffect(() => {
		const sr = signalRRef.current;
		if (!sr || role !== "doctor") return undefined;

		sr.onJoinedRoom(() => {
			offerSentRef.current = false;
			scheduleOffer(true);
		});

		return () => {
			sr.onJoinedRoom(null);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [role, scheduleOffer]);

	useEffect(() => {
		if (role !== "doctor") return;
		if (!signalR?.isConnected || !signalR?.isJoined) return;
		if (offerSentRef.current) return;

		scheduleOffer(false); // 2s de delay

		return () => {
			if (offerSchedulerRef.current) {
				clearTimeout(offerSchedulerRef.current);
				offerSchedulerRef.current = null;
			}
		};
	}, [role, sessionId, signalR?.isConnected, signalR?.isJoined, scheduleOffer]);

	const closeConnection = () => {
		const peer = peerRef.current;
		if (peer) {
			peer.close();
			peerRef.current = null;
		}

		localStream?.getTracks().forEach((track) => track.stop());
		setLocalStream(null);
		setRemoteStream(null);
		setConnectionState("closed");
	};

	const retryOffer = async () => {
		if (!signalR?.isConnected) return;
		offerSentRef.current = false;
		await sendOffer(true);
	};

	return {
		localStream,
		remoteStream,
		connectionState,
		mediaError,
		closeConnection,
		retryOffer
	};
}

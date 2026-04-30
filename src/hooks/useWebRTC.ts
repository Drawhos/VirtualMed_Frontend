"use client";

import { useEffect, useRef, useState } from "react";

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
};

export function useWebRTC(
	sessionId: string,
	iceServers: RTCIceServer[],
	role: WebRtcRole,
	signalR: SignalRClient | null
) {
	const peerRef = useRef<RTCPeerConnection | null>(null);
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
	const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
	const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
	const offerSentRef = useRef(false);

	useEffect(() => {
		if (!sessionId || !iceServers.length) return undefined;

		let isCancelled = false;

		const setupPeer = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: true,
				});
				if (isCancelled) return;

				setLocalStream(stream);

				const peer = new RTCPeerConnection({ iceServers });
				peerRef.current = peer;
				offerSentRef.current = false;

				stream.getTracks().forEach((track) => {
					peer.addTrack(track, stream);
				});

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
					if (!event.candidate || !signalR) return;
					signalR.sendIceCandidate(sessionId, event.candidate.toJSON());
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
					if (peer.localDescription && signalR) {
						await signalR.sendAnswer(sessionId, peer.localDescription);
					}
				}
			} catch {
				setConnectionState("failed");
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
	}, [iceServers, role, sessionId]);

	useEffect(() => {
		if (!signalR) return undefined;

		signalR.onOffer(async ({ sdp }) => {
			const peer = peerRef.current;
			if (!peer) {
				pendingOfferRef.current = sdp;
				return;
			}

			if (role !== "patient") return;
			await peer.setRemoteDescription(new RTCSessionDescription(sdp));
			const answer = await peer.createAnswer();
			await peer.setLocalDescription(answer);
			if (peer.localDescription) {
				await signalR.sendAnswer(sessionId, peer.localDescription);
			}

			const pendingCandidates = pendingCandidatesRef.current;
			pendingCandidatesRef.current = [];
			await Promise.all(
				pendingCandidates.map((candidate) =>
					peer.addIceCandidate(new RTCIceCandidate(candidate))
				)
			);
		});

		signalR.onAnswer(async ({ sdp }) => {
			const peer = peerRef.current;
			if (!peer || role !== "doctor") return;
			await peer.setRemoteDescription(new RTCSessionDescription(sdp));

			const pendingCandidates = pendingCandidatesRef.current;
			pendingCandidatesRef.current = [];
			await Promise.all(
				pendingCandidates.map((candidate) =>
					peer.addIceCandidate(new RTCIceCandidate(candidate))
				)
			);
		});

		signalR.onIceCandidate(async ({ candidate }) => {
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
			signalR.onOffer(null);
			signalR.onAnswer(null);
			signalR.onIceCandidate(null);
		};
	}, [role, sessionId, signalR]);

	const offerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (role !== "doctor") return;
		if (!signalR?.isConnected || !signalR?.isJoined) return;
		if (offerSentRef.current) return;

		// Espera 2s para dar tiempo al paciente de unirse
		// Si ya recibió un answer, offerSentRef evita reenvío
		offerTimeoutRef.current = setTimeout(async () => {
			const peer = peerRef.current;
			if (!peer || offerSentRef.current || !signalR) return;

			try {
				const offer = await peer.createOffer();
				await peer.setLocalDescription(offer);
				if (peer.localDescription) {
					await signalR.sendOffer(sessionId, peer.localDescription);
					offerSentRef.current = true;
				}
			} catch {
				// El paciente aún no está
			}
		}, 20000);

		return () => {
			if (offerTimeoutRef.current) {
				clearTimeout(offerTimeoutRef.current);
			}
		};
	}, [role, sessionId, signalR?.isConnected, signalR?.isJoined]);

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
		const peer = peerRef.current;
		if (!peer || !signalR || role !== "doctor") return;

		offerSentRef.current = false; // permite reenviar
		try {
			const offer = await peer.createOffer();
			await peer.setLocalDescription(offer);
			if (peer.localDescription) {
				await signalR.sendOffer(sessionId, peer.localDescription);
				offerSentRef.current = true;
			}
		} catch {
		}
	};

	return {
		localStream,
		remoteStream,
		connectionState,
		closeConnection,
		retryOffer
	};
}

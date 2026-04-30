"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Signal,
  Users,
  Video,
  VideoOff,
  WifiOff,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useIceCredentials } from "@/hooks/useIceCredentials";
import { useSignalR } from "@/hooks/useSignalR";
import { useVideoSession } from "@/hooks/useVideoSession";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoSessionStatus } from "@/constants/videoSessionStatus";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

type ChatStatus = "connected" | "connecting" | "reconnecting" | "disconnected";

interface VideoCallRoomProps {
  sessionId: string;
  role: "doctor" | "patient";
}

interface ChatMessage {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  sentAt: number;
  isLocal: boolean;
}

type RealtimeMessagePayload = {
  id: string;
  sessionId: string;
  senderId: string;
  message: string;
  sentAt: string;
  messageType?: number | string;
};

const SESSION_STATUS_LABELS: Record<VideoSessionStatus, string> = {
  [VideoSessionStatus.WAITING]: "Esperando",
  [VideoSessionStatus.ACTIVE]: "Activa",
  [VideoSessionStatus.RECONNECTING]: "Reconectando",
  [VideoSessionStatus.ENDED]: "Finalizada",
  [VideoSessionStatus.ERROR]: "Error",
};

const SESSION_STATUS_VARIANTS: Record<VideoSessionStatus, BadgeVariant> = {
  [VideoSessionStatus.WAITING]: "outline",
  [VideoSessionStatus.ACTIVE]: "secondary",
  [VideoSessionStatus.RECONNECTING]: "default",
  [VideoSessionStatus.ENDED]: "outline",
  [VideoSessionStatus.ERROR]: "destructive",
};

const CHAT_STATUS_LABELS: Record<ChatStatus, string> = {
  connected: "Conectado",
  connecting: "Conectando",
  reconnecting: "Reconectando",
  disconnected: "Desconectado",
};

const CHAT_STATUS_VARIANTS: Record<ChatStatus, BadgeVariant> = {
  connected: "secondary",
  connecting: "outline",
  reconnecting: "default",
  disconnected: "destructive",
};

const formatTime = (value: Date) =>
  new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

const parseSentAt = (value?: string) => {
  if (!value) return Date.now();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const formatSentAt = (value?: string) => formatTime(new Date(parseSentAt(value)));

interface ChatPanelProps {
  messages: ChatMessage[];
  messageDraft: string;
  onDraftChange: (value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  chatStatus: ChatStatus;
  isChatDisabled: boolean;
}

const ChatPanel = ({
  messages,
  messageDraft,
  onDraftChange,
  onSendMessage,
  chatStatus,
  isChatDisabled,
}: ChatPanelProps) => {
  const statusLabel = CHAT_STATUS_LABELS[chatStatus];
  const statusVariant = CHAT_STATUS_VARIANTS[chatStatus];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Chat en tiempo real
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Signal className="h-4 w-4" />
            <span>SignalR {statusLabel}</span>
          </div>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.isLocal ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                  message.isLocal
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-900"
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex items-center justify-between gap-2 text-[11px]",
                    message.isLocal ? "text-white/80" : "text-slate-500"
                  )}
                >
                  <span className="font-medium">{message.author}</span>
                  <span>{message.timestamp}</span>
                </div>
                <p className="leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <form onSubmit={onSendMessage} className="flex gap-2 p-4">
        <Input
          value={messageDraft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={
            isChatDisabled
              ? "Chat deshabilitado"
              : "Escribe un mensaje"
          }
          disabled={isChatDisabled}
        />
        <Button type="submit" disabled={isChatDisabled || !messageDraft.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
};

export function VideoCallRoom({ sessionId, role }: VideoCallRoomProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const messageIdsRef = useRef(new Set<string>());
  const remotePresenceRef = useRef(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [messageDraft, setMessageDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  const { iceServers, isLoading: isIceLoading, error: iceError, refresh } =
    useIceCredentials(sessionId);
  const signalR = useSignalR(sessionId);
  const { chatHistory, chatError, endSession } = useVideoSession(sessionId);
  const { localStream, remoteStream, connectionState, closeConnection, retryOffer } =
    useWebRTC(sessionId, iceServers, role, signalR);

  const localInitials = useMemo(() => {
    const initials = user?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    return initials || "TU";
  }, [user?.fullName]);

  const remoteParticipant = useMemo(
    () =>
      role === "doctor"
        ? { name: "Paciente invitado", initials: "PI" }
        : { name: "Doctor invitado", initials: "DI" },
    [role]
  );

  const sessionStatus = useMemo<VideoSessionStatus>(() => {
    if (hasEnded) return VideoSessionStatus.ENDED;
    if (iceError) return VideoSessionStatus.ERROR;
    if (connectionState === "failed") return VideoSessionStatus.ERROR;
    if (signalR.status === "reconnecting") return VideoSessionStatus.RECONNECTING;
    if (connectionState === "connected") return VideoSessionStatus.ACTIVE;
    if (connectionState === "disconnected") return VideoSessionStatus.RECONNECTING;
    return VideoSessionStatus.WAITING;
  }, [connectionState, hasEnded, iceError, signalR.status]);

  const isRemoteVideoOn =
    remoteStream?.getVideoTracks().some((track) => track.enabled) ?? false;
  const remoteConnected = Boolean(remoteStream);
  const isChatDisabled =
    sessionStatus === VideoSessionStatus.ERROR ||
    sessionStatus === VideoSessionStatus.ENDED;
  const areMediaControlsDisabled =
    sessionStatus === VideoSessionStatus.ERROR ||
    sessionStatus === VideoSessionStatus.ENDED ||
    !localStream;
  const showStreamSkeleton =
    isIceLoading ||
    sessionStatus === VideoSessionStatus.WAITING ||
    sessionStatus === VideoSessionStatus.RECONNECTING;
  const chatStatus = signalR.status as ChatStatus;

  const appendMessage = useCallback((message: ChatMessage) => {
    if (messageIdsRef.current.has(message.id)) return;
    messageIdsRef.current.add(message.id);
    setMessages((previous) =>
      [...previous, message].sort((left, right) => left.sentAt - right.sentAt)
    );
  }, []);

  const buildChatMessage = useCallback(
    (payload: RealtimeMessagePayload): ChatMessage => {
      const isLocal = payload.senderId && payload.senderId === user?.sub;
      const isSystem =
        payload.messageType === 1 ||
        payload.messageType === "system" ||
        payload.messageType === "SYSTEM";
      const author = isSystem
        ? "Sistema"
        : isLocal
        ? "Tu"
        : remoteParticipant.name;

      return {
        id: payload.id,
        author,
        content: payload.message,
        timestamp: formatSentAt(payload.sentAt),
        sentAt: parseSentAt(payload.sentAt),
        isLocal: Boolean(isLocal),
      };
    },
    [remoteParticipant.name, user?.sub]
  );

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [isMuted, localStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOn;
    });
  }, [isCameraOn, localStream]);

  useEffect(() => {
    if (!chatHistory.length) return;
    chatHistory.forEach((entry) => {
      appendMessage(
        buildChatMessage({
          id: entry.id,
          sessionId,
          senderId: entry.senderId,
          message: entry.message,
          sentAt: entry.sentAt,
          messageType: entry.messageType,
        })
      );
    });
  }, [appendMessage, buildChatMessage, chatHistory, sessionId]);

  useEffect(() => {
    signalR.onMessageReceived((payload) => {
      appendMessage(buildChatMessage(payload));
    });

    return () => {
      signalR.onMessageReceived(null);
    };
  }, [appendMessage, buildChatMessage, signalR]);

  useEffect(() => {
    if (signalR.error) {
      toast({
        title: "SignalR",
        description: signalR.error,
        variant: "destructive",
      });
    }
  }, [signalR.error, toast]);

  useEffect(() => {
    if (chatError) {
      toast({
        title: "Chat",
        description: chatError,
        variant: "destructive",
      });
    }
  }, [chatError, toast]);

  useEffect(() => {
    if (iceError) {
      toast({
        title: "Credenciales ICE",
        description: iceError,
        variant: "destructive",
      });
    }
  }, [iceError, toast]);

  useEffect(() => {
    if (remotePresenceRef.current === remoteConnected) return;
    remotePresenceRef.current = remoteConnected;

    toast({
      title: remoteConnected
        ? "Participante conectado"
        : "Participante desconectado",
      description: remoteConnected
        ? "El participante se ha unido a la sesion."
        : "El participante ha salido de la sesion.",
    });
  }, [remoteConnected, toast]);

  const handleReconnect = async () => {
      const refreshed = await refresh();
      if (!refreshed) return;
      if (role === "doctor") {
          await retryOffer(); // reenvía el offer al paciente
      }

      toast({
          title: "Reconectando",
          description: "Actualizamos las credenciales para la sesion.",
      });
  };

  const handleEndSession = async () => {
    try {
      await signalR.leaveRoom();
      await endSession();
      closeConnection();
      setHasEnded(true);
      toast({
        title: "Sesion finalizada",
        description: "La llamada se cerro correctamente.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo finalizar.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsEndDialogOpen(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = messageDraft.trim();
    if (!trimmed || isChatDisabled) return;

    if (!signalR.isConnected) {
      toast({
        title: "Chat desconectado",
        description: "No hay conexion con el chat en tiempo real.",
        variant: "destructive",
      });
      return;
    }

    try {
      await signalR.sendMessage(sessionId, trimmed, 0);
      setMessageDraft("");
    } catch {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje.",
        variant: "destructive",
      });
    }
  };

  const videoStage = (chatTrigger?: React.ReactNode) => (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>
            {remoteConnected ? "2 participantes" : "1 participante"}
          </span>
        </div>
        <span>
          Calidad de red:{" "}
          {sessionStatus === VideoSessionStatus.RECONNECTING ||
          sessionStatus === VideoSessionStatus.ERROR
            ? "Inestable"
            : "Estable"}
        </span>
      </div>

      <div className="flex-1 px-4 pb-4">
        <div className="relative h-full min-h-[360px] overflow-hidden rounded-lg border bg-slate-950 text-white">
          <video
            ref={remoteVideoRef}
            className={cn(
              "h-full w-full object-cover",
              remoteConnected && isRemoteVideoOn ? "opacity-100" : "opacity-0"
            )}
            playsInline
            autoPlay
          />

          {(!remoteConnected || !isRemoteVideoOn) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <Avatar className="h-16 w-16 border border-white/20">
                <AvatarFallback className="bg-white/10 text-white">
                  {remoteParticipant.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {remoteConnected ? remoteParticipant.name : "Sin participante"}
                </p>
                <p className="text-xs text-white/70">
                  {remoteConnected ? "Video apagado" : "Esperando conexion"}
                </p>
              </div>
            </div>
          )}

          {showStreamSkeleton && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
              <div className="space-y-3">
                <Skeleton className="h-6 w-44 bg-white/10" />
                <Skeleton className="h-4 w-60 bg-white/10" />
              </div>
            </div>
          )}

          {sessionStatus === VideoSessionStatus.WAITING && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
              <div className="space-y-3 text-center">
                <p className="text-lg font-semibold">Esperando al participante</p>
                <p className="text-sm text-white/70">
                  Puedes preparar tu audio y camara mientras tanto.
                </p>
                <Button onClick={handleReconnect} disabled={isIceLoading}>
                  Iniciar sesion
                </Button>
              </div>
            </div>
          )}

          {sessionStatus === VideoSessionStatus.ENDED && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
              <div className="space-y-2 text-center">
                <p className="text-lg font-semibold">Sesion finalizada</p>
                <p className="text-sm text-white/70">
                  La videollamada termino.
                </p>
              </div>
            </div>
          )}

          {sessionStatus === VideoSessionStatus.ERROR && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
              <div className="space-y-2 text-center">
                <p className="text-lg font-semibold">Error de red</p>
                <p className="text-sm text-white/70">
                  No se pudo recuperar la sesion.
                </p>
              </div>
            </div>
          )}

          <Badge className="absolute left-4 top-4 border-white/20 bg-white/10 text-white">
            Remoto
          </Badge>

          <div className="absolute bottom-4 right-4 w-40 sm:w-48 md:w-56">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-slate-900">
              <video
                ref={localVideoRef}
                className={cn(
                  "h-full w-full object-cover",
                  isCameraOn ? "opacity-100" : "opacity-0"
                )}
                muted
                playsInline
                autoPlay
              />

              {!isCameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                  <Avatar className="h-10 w-10 border border-white/20">
                    <AvatarFallback className="bg-white/10 text-white">
                      {localInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-white/80">Camara apagada</span>
                </div>
              )}

              {showStreamSkeleton && (
                <Skeleton className="absolute inset-0 rounded-none bg-white/10" />
              )}

              <div className="absolute left-2 top-2 rounded bg-black/40 px-2 py-0.5 text-[11px] text-white">
                Tu video
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                onClick={() => setIsMuted((previous) => !previous)}
                disabled={areMediaControlsDisabled}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isMuted ? "Activar microfono" : "Silenciar microfono"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isCameraOn ? "secondary" : "destructive"}
                size="icon"
                onClick={() => setIsCameraOn((previous) => !previous)}
                disabled={areMediaControlsDisabled}
              >
                {isCameraOn ? <Video /> : <VideoOff />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isCameraOn ? "Apagar camara" : "Encender camara"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chatTrigger}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            disabled={sessionStatus === VideoSessionStatus.ENDED}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Reconectar</span>
          </Button>

          <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={sessionStatus === VideoSessionStatus.ENDED}
              >
                <PhoneOff className="h-4 w-4" />
                <span className="hidden sm:inline">Finalizar</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Finalizar sesion?</DialogTitle>
                <DialogDescription>
                  La llamada terminara para todos los participantes.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEndDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleEndSession}>
                  Finalizar sesion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-4 p-6 pt-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              Sesion de videollamada
            </h1>
            <p className="text-sm text-muted-foreground">
              ID de sesion: {sessionId}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={SESSION_STATUS_VARIANTS[sessionStatus]}>
              Estado: {SESSION_STATUS_LABELS[sessionStatus]}
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              SignalR {CHAT_STATUS_LABELS[chatStatus]}
            </Badge>
          </div>
        </div>

        {sessionStatus === VideoSessionStatus.RECONNECTING && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <WifiOff className="h-4 w-4" />
            <div>
              <AlertTitle>Reconectando</AlertTitle>
              <AlertDescription>
                Intentando restablecer la conexion de audio y video.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {sessionStatus === VideoSessionStatus.ERROR && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <AlertTitle>Error de red</AlertTitle>
              <AlertDescription>
                No pudimos restablecer la conexion. Puedes intentar nuevamente.
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={handleReconnect}>
                    Reintentar
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="hidden lg:block">
          <div className="rounded-xl border bg-white shadow-sm">
            <ResizablePanelGroup orientation="horizontal" className="min-h-[620px]">
              <ResizablePanel defaultSize={70} minSize={45}>
                {videoStage()}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25}>
                <ChatPanel
                  messages={messages}
                  messageDraft={messageDraft}
                  onDraftChange={setMessageDraft}
                  onSendMessage={handleSendMessage}
                  chatStatus={chatStatus}
                  isChatDisabled={isChatDisabled}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>

        <div className="lg:hidden">
          <Sheet>
            {videoStage(
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
              </SheetTrigger>
            )}
            <SheetContent side="right" className="p-0">
              <ChatPanel
                messages={messages}
                messageDraft={messageDraft}
                onDraftChange={setMessageDraft}
                onSendMessage={handleSendMessage}
                chatStatus={chatStatus}
                isChatDisabled={isChatDisabled}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </TooltipProvider>
  );
}

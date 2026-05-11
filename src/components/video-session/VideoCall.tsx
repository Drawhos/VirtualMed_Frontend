"use client";

import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { CalendarCheck2, Loader2, Play, RefreshCw } from "lucide-react";

import { doctorService } from "@/lib/api/doctor.service";
import { useRouter } from 'next/navigation';
import { AppointmentGetResponse, VideoSession } from "@/types";
import { VideoSessionStatus } from "@/constants/videoSessionStatus";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, getSessionBadgeVariant, 
    getSessionStatusLabel, getStartSessionErrorMessage, 
    getStatusBadgeName, getStatusBadgeVariant, 
    isExpiredStatus, isTokenExpiredError, getPatientName } from "@/lib/utils";
import { AppointmentStatus } from "@/constants/appointmentStatus";
import { useAuthStore } from "@/store/auth.store";


export default function VideoCall() {
	const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuthStore();
	const todayIso = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return today.toISOString();
	}, []);

	const [appointments, setAppointments] = useState<AppointmentGetResponse[]>(
		[]
	);
	const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
	const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

	const [session, setSession] = useState<VideoSession | null>(null);
	const [sessionId, setSessionId] = useState("");
	const [isCreatingSession, setIsCreatingSession] = useState(false);
	const [isFetchingSession, setIsFetchingSession] = useState(false);
	const [isStartingSession, setIsStartingSession] = useState(false);
	const [hasRefreshedIce, setHasRefreshedIce] = useState(false);

	const loadAppointments = async () => {
		setIsLoadingAppointments(true);
		try {
			const response = await doctorService.getAppointments({ from: todayIso });
			setAppointments(response.filter((apt) => apt.status === AppointmentStatus.CONFIRMED));
		} catch (error) {
			const description = isAxiosError(error)
				? error.response?.data?.message || "Error al cargar las citas."
				: "Error al cargar las citas.";

			toast({
				title: "Error",
				description,
				variant: "destructive",
			});
		} finally {
			setIsLoadingAppointments(false);
		}
	};

	useEffect(() => {
		loadAppointments();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const refreshIceCredentials = async (
		targetSessionId: string,
		description: string
	) => {
		try {
			await doctorService.postIceCredentials(targetSessionId);
			setHasRefreshedIce(true);
			toast({
				title: "Credenciales ICE actualizadas",
				description,
			});
			return true;
		} catch (error) {
			const message = isAxiosError(error)
				? error.response?.data?.message || "No fue posible refrescar las credenciales."
				: "No fue posible refrescar las credenciales.";

			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
			return false;
		}
	};

	const loadSession = async (targetSessionId: string) => {
		setIsFetchingSession(true);
		try {
			const response = await doctorService.getVideoSession(targetSessionId);
			setSession(response);

			if (isExpiredStatus(response.status) && !hasRefreshedIce) {
				const refreshed = await refreshIceCredentials(
					targetSessionId,
					"La sesion estaba expirada, renovamos las credenciales."
				);

				if (refreshed) {
					const updated = await doctorService.getVideoSession(targetSessionId);
					setSession(updated);
				}
			}
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined;
			const description =
				status === 403
					? "No eres miembro de esta sesion."
					: status === 404
					? "La sesion no existe."
					: isAxiosError(error)
					? error.response?.data?.message || "Error al cargar la sesion."
					: "Error al cargar la sesion.";

			toast({
				title: "Error",
				description,
				variant: "destructive",
			});
		} finally {
			setIsFetchingSession(false);
		}
	};

	const handleCreateSession = async () => {
		if (!selectedAppointmentId) {
			toast({
				title: "Selecciona una cita",
				description: "Debes elegir la cita antes de crear la sesion.",
				variant: "destructive",
			});
			return;
		}

		setIsCreatingSession(true);
		setSession(null);
		setSessionId("");
		setHasRefreshedIce(false);

		try {
			const response = await doctorService.postVideoSession({
				appointmentId: selectedAppointmentId,
			});

			setSessionId(response.sessionId);
			toast({
				title: "Sesion creada",
				description: "La sesion se creo correctamente.",
			});
			await loadSession(response.sessionId);
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined;
			const description =
				status === 400
					? "La cita no esta Confirmed o ya existe una sesion activa."
					: status === 403
					? "No eres el doctor de esta cita."
					: status === 404
					? "La cita no existe."
					: isAxiosError(error)
					? error.response?.data?.message || "No se pudo crear la sesion."
					: "No se pudo crear la sesion.";

			toast({
				title: "Error",
				description,
				variant: "destructive",
			});
		} finally {
			setIsCreatingSession(false);
		}
	};

	const handleStartSession = async () => {
		if (!session) {
			toast({
				title: "Sin sesion",
				description: "Crea una sesion antes de iniciar.",
				variant: "destructive",
			});
			return;
		}

		if (session.status === VideoSessionStatus.ENDED) {
			toast({
				title: "Sesion finalizada",
				description: "No puedes iniciar una sesion finalizada.",
				variant: "destructive",
			});
			return;
		}

		setIsStartingSession(true);

		try {
			try {
				await doctorService.postStartVideoSession(session.sessionId);
			} catch (error) {
				if (isTokenExpiredError(error)) {
					const refreshed = await refreshIceCredentials(
						session.sessionId,
						"Token expirado, renovamos credenciales."
					);
					if (!refreshed) {
						return;
					}
					await doctorService.postStartVideoSession(session.sessionId);
				} else {
					throw error;
				}
			}

			toast({
				title: "Sesion iniciada",
				description: "La sesion esta activa.",
			});

			router.push(`/dashboard/video-session/${session.sessionId}?role=${user?.role}`, );
		} catch (error) {
			toast({
				title: "Error",
				description: getStartSessionErrorMessage(error),
				variant: "destructive",
			});
		} finally {
			setIsStartingSession(false);
		}
	};

	const selectedAppointment = appointments.find(
		(appointment) => appointment.id === selectedAppointmentId
	);

	return (
		<div className="space-y-6 p-6 pt-16">
			<Card className="border-blue-100 shadow-sm">
				<CardHeader>
					<CardTitle className="text-xl text-slate-900">
						Crear sesion de video
					</CardTitle>
					<CardDescription>
						Selecciona la cita del dia para habilitar la videollamada.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
						<div className="flex items-center gap-2">
							<CalendarCheck2 className="h-4 w-4" />
							<span>Citas desde {formatDate(todayIso)}</span>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={loadAppointments}
							disabled={isLoadingAppointments}
						>
							{isLoadingAppointments ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
							Recargar
						</Button>
					</div>

					<div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-900">
								Cita (ID)
							</label>
							<Select
								value={selectedAppointmentId}
								onValueChange={setSelectedAppointmentId}
								disabled={isLoadingAppointments}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecciona una cita" />
								</SelectTrigger>
								<SelectContent>
									{appointments.map((appointment) => (
										<SelectItem key={appointment.id} value={appointment.id}>
											{appointment.patientFullName} - {formatDateTime(appointment.scheduledAt)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<Button
							onClick={handleCreateSession}
							disabled={isCreatingSession || !selectedAppointmentId}
							className="bg-blue-600 hover:bg-blue-700"
						>
							{isCreatingSession ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : null}
							Crear sesion
						</Button>
					</div>

					{!appointments.length && !isLoadingAppointments && (
						<Alert>
							<AlertTitle>Sin citas</AlertTitle>
							<AlertDescription>
								No se encontraron citas para el dia de hoy.
							</AlertDescription>
						</Alert>
					)}

					{selectedAppointment && (
						<div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
							<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
								<div>
									<p className="font-medium text-slate-900">
										{selectedAppointment.patientFullName}
									</p>
									<p className="text-slate-500">
										{formatDateTime(selectedAppointment.scheduledAt)}
									</p>
								</div>
								<Badge variant={getStatusBadgeVariant(selectedAppointment.status)}>
									{getStatusBadgeName(selectedAppointment.status)}
								</Badge>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="border-slate-200 shadow-sm">
				<CardHeader>
					<CardTitle className="text-xl text-slate-900">
						Sesion creada
					</CardTitle>
					<CardDescription>
						Detalles de la sesion y control de inicio.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isFetchingSession && (
						<div className="flex items-center gap-2 text-sm text-slate-500">
							<Loader2 className="h-4 w-4 animate-spin" />
							Cargando sesion...
						</div>
					)}

					{!session && !isFetchingSession && (
						<Alert>
							<AlertTitle>Sin sesion activa</AlertTitle>
							<AlertDescription>
								Crea una sesion para visualizar los detalles.
							</AlertDescription>
						</Alert>
					)}

					{session && (
						<div className="space-y-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="text-sm text-slate-500">Session ID</p>
									<p className="text-sm font-medium text-slate-900">
										{session.sessionId}
									</p>
								</div>
								<Badge variant={getSessionBadgeVariant(session.status)}>
									{getSessionStatusLabel(session.status)}
								</Badge>
							</div>

							<Table>
								<TableBody>
									<TableRow>
										<TableCell className="text-slate-500">Doctor</TableCell>
										<TableCell className="text-slate-900">
											{session.doctorId}
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell className="text-slate-500">Paciente</TableCell>
										<TableCell className="text-slate-900">
											{session.patientId}
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell className="text-slate-500">Inicio</TableCell>
										<TableCell className="text-slate-900">
											{formatDateTime(session.startedAt)}
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell className="text-slate-500">Fin</TableCell>
										<TableCell className="text-slate-900">
											{formatDateTime(session.endedAt)}
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell className="text-slate-500">Token expira</TableCell>
										<TableCell className="text-slate-900">
											{formatDateTime(session.tokenExpiresAt)}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
				<CardFooter className="justify-between">
					<div className="text-sm text-slate-500">
						{sessionId ? "Sesion lista para iniciar." : "No hay sesion creada."}
					</div>
					<Button
						onClick={handleStartSession}
						disabled={!session || isStartingSession}
						className="bg-slate-900 hover:bg-slate-950"
					>
						{isStartingSession ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Play className="h-4 w-4" />
						)}
						Iniciar
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

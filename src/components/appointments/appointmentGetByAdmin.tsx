"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, Search, Edit } from "lucide-react";

import { doctorService } from "@/lib/api/doctor.service";
import { patientService } from "@/lib/api/patient.service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AppointmentStatus } from "@/constants/appointmentStatus";
import { AppointmentGetResponse } from "@/types";

// ============================================
// Interface para filtros
// ============================================
interface Filters {
  fromDate: string;
  toDate: string;
  status: string;
  patientId: string;
  doctorId: string;
}

interface PatientOption {
  id: string;
  fullname: string;
  email: string;
}

interface DoctorOption {
  id: string;
  fullname: string;
  email: string;
}

// ============================================
// Interface para formulario de edición
// ============================================
interface EditFormData {
  scheduledAt: string;
  scheduledAtTime: string;
  durationMinutes: number;
  reason: string;
  status: string;
}

// ============================================
// Component
// ============================================
export default function ListAppointmentsComponent() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentGetResponse[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentGetResponse[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    fromDate: "",
    toDate: "",
    status: "",
    patientId: "",
    doctorId: "",
  });

  // Estados para edición
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<AppointmentGetResponse | null>(
    null
  );
  const [editFormData, setEditFormData] = useState<EditFormData>({
    scheduledAt: "",
    scheduledAtTime: "",
    durationMinutes: 0,
    reason: "",
    status: "",
  });

  // ============================================
  // Cargar pacientes y doctores
  // ============================================
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoadingPatients(true);
        const patientsData = await patientService.getPatients();
        const patientOptions = patientsData.map((patient) => ({
          id: patient.sub,
          fullname: patient.fullname,
          email: patient.email,
        }));
        setPatients(patientOptions);
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los pacientes.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPatients(false);
      }
    };

    const fetchDoctors = async () => {
      try {
        setIsLoadingDoctors(true);
        const doctorsData = await doctorService.getDoctors();
        const doctorOptions = doctorsData.map((doctor) => ({
          id: doctor.sub,
          fullname: doctor.fullname,
          email: doctor.email,
        }));
        setDoctors(doctorOptions);
      } catch (error) {
        console.error("Error al cargar doctores:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los doctores.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    fetchPatients();
    fetchDoctors();
  }, [toast]);

  // ============================================
  // Obtener citas
  // ============================================
  const handleSearchAppointments = async () => {
    if (!filters.fromDate || !filters.toDate) {
      toast({
        title: "Validación",
        description: "Por favor, completa las fechas de inicio y fin.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(filters.fromDate) > new Date(filters.toDate)) {
      toast({
        title: "Validación",
        description: "La fecha de inicio no puede ser mayor a la fecha de fin.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const queryParams: any = {
        from: new Date(filters.fromDate).toISOString(),
        to: new Date(filters.toDate).toISOString(),
      };

      if (filters.patientId) {
        queryParams.patientId = filters.patientId;
      }

      if (filters.doctorId) {
        queryParams.doctorId = filters.doctorId;
      }

      const response = await doctorService.getAppointments(queryParams);

      setAppointments(response);
      applyStatusFilter(response, filters.status);

      if (response.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron citas para el rango de fechas especificado.",
        });
      }
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401) {
          toast({
            title: "No autorizado",
            description: "Tu sesión ha expirado.",
            variant: "destructive",
          });
        } else if (status === 403) {
          toast({
            title: "Acceso denegado",
            description: "No tienes permiso para ver estas citas.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description:
              error.response?.data?.message || "Error al obtener las citas.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Aplicar filtro por estado
  // ============================================
  const applyStatusFilter = (data: AppointmentGetResponse[], status: string) => {
    if (status === "" || status === "all") {
      setFilteredAppointments(data);
    } else {
      setFilteredAppointments(
        data.filter((appointment) => appointment.status === status)
      );
    }
  };

  // ============================================
  // Manejar cambios en filtros
  // ============================================
  const handleFilterChange = (field: keyof Filters, value: string) => {
    const updatedFilters = { ...filters, [field]: value };
    setFilters(updatedFilters);

    if (appointments.length > 0) {
      applyStatusFilter(appointments, updatedFilters.status);
    }
  };

  // ============================================
  // Resetear filtros
  // ============================================
  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      status: "",
      patientId: "",
      doctorId: "",
    });
    setAppointments([]);
    setFilteredAppointments([]);
  };

  // ============================================
  // Obtener color de badge según estado
  // ============================================
  const getStatusBadgeVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return "outline";
      case AppointmentStatus.CONFIRMED:
        return "secondary";
      case AppointmentStatus.INPROGRESS:
        return "default";
      case AppointmentStatus.COMPLETED:
        return "secondary";
      case AppointmentStatus.CANCELLED:
        return "destructive";
      default:
        return "outline";
    }
  };

  // ============================================
  // Abrir diálogo para editar cita
  // ============================================
  const openEditDialog = (appointment: AppointmentGetResponse) => {
    const appointmentDate = new Date(appointment.scheduledAt);
    const dateStr = appointmentDate.toISOString().split("T")[0];
    const timeStr = appointmentDate.toTimeString().slice(0, 5);

    setAppointmentToEdit(appointment);
    setEditFormData({
      scheduledAt: dateStr,
      scheduledAtTime: timeStr,
      durationMinutes: appointment.durationMinutes,
      reason: appointment.reason || "",
      status: appointment.status,
    });
    setIsEditDialogOpen(true);
  };

  // ============================================
  // Cerrar diálogo de edición
  // ============================================
  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setAppointmentToEdit(null);
    setEditFormData({
      scheduledAt: "",
      scheduledAtTime: "",
      durationMinutes: 0,
      reason: "",
      status: "",
    });
  };

  // ============================================
  // Manejar cambios en formulario de edición
  // ============================================
  const handleEditFormChange = (
    field: keyof EditFormData,
    value: string | number
  ) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================
  // Actualizar cita
  // ============================================
  const handleUpdateAppointment = async () => {
    if (!appointmentToEdit) return;

    if (!editFormData.scheduledAt || !editFormData.scheduledAtTime) {
      toast({
        title: "Validación",
        description: "Por favor completa la fecha y hora.",
        variant: "destructive",
      });
      return;
    }

    if (editFormData.durationMinutes < 30 || editFormData.durationMinutes > 1440) {
      toast({
        title: "Validación",
        description: "La duración debe estar entre 30 y 1440 minutos.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const scheduledAtDateTime = new Date(
        `${editFormData.scheduledAt}T${editFormData.scheduledAtTime}`
      ).toISOString();

      const updateData: Partial<AppointmentGetResponse> = {
        scheduledAt: scheduledAtDateTime,
        durationMinutes: editFormData.durationMinutes,
        reason: editFormData.reason || null,
        status: editFormData.status as any,
      };

      await doctorService.updateAppointment(appointmentToEdit.id, updateData);

      toast({
        title: "Éxito",
        description: "La cita ha sido actualizada correctamente.",
      });

      // Actualizar la cita en la lista
      const updatedAppointments = appointments.map((apt) =>
        apt.id === appointmentToEdit.id
          ? { ...apt, ...updateData }
          : apt
      ) as AppointmentGetResponse[];

      setAppointments(updatedAppointments);
      applyStatusFilter(updatedAppointments, filters.status);

      closeEditDialog();
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401) {
          toast({
            title: "No autorizado",
            description: "Tu sesión ha expirado.",
            variant: "destructive",
          });
        } else if (status === 403) {
          toast({
            title: "Acceso denegado",
            description: "No tienes permiso para actualizar esta cita.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description:
              error.response?.data?.message || "Error al actualizar la cita.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold">Mis Citas</h1>
        <p className="text-muted-foreground mt-2">
          Filtra y visualiza tus citas por rango de fechas y estado
        </p>
      </div>

      {/* Card de filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Paciente */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente</label>
              <Select
                value={filters.patientId}
                onValueChange={(value) => handleFilterChange("patientId", value)}
                disabled={isLoadingPatients}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingPatients ? "Cargando..." : "Todos"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los pacientes</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <span className="truncate">{patient.fullname}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Doctor</label>
              <Select
                value={filters.doctorId}
                onValueChange={(value) => handleFilterChange("doctorId", value)}
                disabled={isLoadingDoctors}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingDoctors ? "Cargando..." : "Todos"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los doctores</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      <span className="truncate">{doctor.fullname}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha inicio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio *</label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              />
            </div>

            {/* Fecha fin */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin *</label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange("toDate", e.target.value)}
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value={AppointmentStatus.SCHEDULED}>
                    {AppointmentStatus.SCHEDULED}
                  </SelectItem>
                  <SelectItem value={AppointmentStatus.CONFIRMED}>
                    {AppointmentStatus.CONFIRMED}
                  </SelectItem>
                  <SelectItem value={AppointmentStatus.INPROGRESS}>
                    {AppointmentStatus.INPROGRESS}
                  </SelectItem>
                  <SelectItem value={AppointmentStatus.COMPLETED}>
                    {AppointmentStatus.COMPLETED}
                  </SelectItem>
                  <SelectItem value={AppointmentStatus.CANCELLED}>
                    {AppointmentStatus.CANCELLED}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botones */}
            <div className="flex gap-2 items-end">
              <Button
                onClick={handleSearchAppointments}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de citas */}
      {filteredAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Citas ({filteredAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Duración (min)</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">
                        {appointment.patientId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {appointment.doctorId}
                      </TableCell>
                      <TableCell>
                        {new Date(appointment.scheduledAt).toLocaleString(
                          "es-ES",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell>{appointment.durationMinutes}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {appointment.reason || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(appointment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vacío */}
      {appointments.length === 0 && appointments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              {filters.fromDate && filters.toDate
                ? "No se encontraron citas para el rango de fechas seleccionado."
                : "Completa los filtros y haz clic en 'Buscar' para visualizar tus citas."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Diálogo para editar cita */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
          </DialogHeader>

          {appointmentToEdit && (
            <div className="grid gap-4 py-4">
              {/* Paciente (solo lectura) */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Paciente</label>
                <Input
                  type="text"
                  value={appointmentToEdit.patientId}
                  disabled
                />
              </div>

              {/* Doctor (solo lectura) */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Doctor</label>
                <Input
                  type="text"
                  value={appointmentToEdit.doctorId || ""}
                  disabled
                />
              </div>

              {/* Fecha */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Fecha *</label>
                <Input
                  type="date"
                  value={editFormData.scheduledAt}
                  onChange={(e) =>
                    handleEditFormChange("scheduledAt", e.target.value)
                  }
                />
              </div>

              {/* Hora */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Hora *</label>
                <Input
                  type="time"
                  value={editFormData.scheduledAtTime}
                  onChange={(e) =>
                    handleEditFormChange("scheduledAtTime", e.target.value)
                  }
                />
              </div>

              {/* Duración */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Duración (minutos) * (30 - 1440)
                </label>
                <Input
                  type="number"
                  min="30"
                  max="1440"
                  value={editFormData.durationMinutes}
                  onChange={(e) =>
                    handleEditFormChange("durationMinutes", parseInt(e.target.value))
                  }
                />
              </div>

              {/* Razón */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Razón</label>
                <textarea
                  value={editFormData.reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    handleEditFormChange("reason", e.target.value)
                  }
                  placeholder="Razón de la cita (opcional)"
                  maxLength={1000}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  {editFormData.reason.length}/1000
                </p>
              </div>

              {/* Estado */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) =>
                    handleEditFormChange("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AppointmentStatus.SCHEDULED}>
                      {AppointmentStatus.SCHEDULED}
                    </SelectItem>
                    <SelectItem value={AppointmentStatus.CONFIRMED}>
                      {AppointmentStatus.CONFIRMED}
                    </SelectItem>
                    <SelectItem value={AppointmentStatus.INPROGRESS}>
                      {AppointmentStatus.INPROGRESS}
                    </SelectItem>
                    <SelectItem value={AppointmentStatus.COMPLETED}>
                      {AppointmentStatus.COMPLETED}
                    </SelectItem>
                    <SelectItem value={AppointmentStatus.CANCELLED}>
                      {AppointmentStatus.CANCELLED}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateAppointment}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUpdating ? "Actualizando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isAxiosError } from "axios";
import { Loader2, Calendar } from "lucide-react";

import { doctorService } from "@/lib/api/doctor.service";
import { patientService } from "@/lib/api/patient.service";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentStatus } from "@/constants/appointmentStatus";
import { adminService } from "@/lib/api/admin.service";

// ============================================
// Schema de validación
// ============================================
const appointmentSchema = z.object({
  patientId: z.string().min(1, { message: "Debes seleccionar un paciente" }),
  doctorId: z.string().min(1, { message: "Debes seleccionar un doctor" }),
  scheduledAt: z
    .string()
    .min(1, { message: "La fecha es requerida" })
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        return selectedDate > today && selectedDate <= oneYearFromNow;
      },
      { message: "La fecha debe estar entre hoy y 1 año en el futuro" }
    ),
  durationMinutes: z
    .number()
    .min(30, { message: "La duración mínima es 30 minutos" })
    .max(1440, { message: "La duración máxima es 1440 minutos (24 horas)" }),
  reason: z
    .string()
    .max(1000, { message: "La razón no puede exceder 1000 caracteres" })
    .optional()
    .nullable(),
  status: z.enum([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED], {
    invalid_type_error: "El estado debe ser Scheduled o Confirmed",
  }),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// ============================================
// Interface para pacientes
// ============================================
interface PatientOption {
  id: string;
  fullname: string;
  email: string;
}

// ============================================
// Interface para doctores
// ============================================
interface DoctorOption {
  id: string;
  fullname: string;
  email: string;
}

// ============================================
// Component
// ============================================
export default function AppointmentForm() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [reasonCharCount, setReasonCharCount] = useState(0);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      scheduledAt: "",
      durationMinutes: 30,
      reason: "",
      status: AppointmentStatus.SCHEDULED,
    },
    mode: "onChange",
  });

  // ============================================
  // Cargar lista de pacientes
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
          description: "No se pudieron cargar los pacientes. Intenta de nuevo.",
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
          description: "No se pudieron cargar los doctores. Intenta de nuevo.",
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
  // Manejar envío del formulario
  // ============================================
  const onSubmit = async (values: AppointmentFormValues) => {
    setIsLoading(true);

    try {
      if (!user?.sub) {
        toast({
          title: "Error",
          description: "No se pudo validar tu identidad. Por favor, recarga la página.",
          variant: "destructive",
        });
        return;
      }

      // Convertir durationMinutes a number si es string
      const appointmentData = {
        patientId: values.patientId,
        doctorId: values.doctorId,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        durationMinutes: Number(values.durationMinutes),
        reason: values.reason || null,
        status: values.status,
      };

      await adminService.createAppointment(appointmentData);

      toast({
        title: "Éxito",
        description: "La cita ha sido creada correctamente.",
        variant: "default",
      });

      // Resetear el formulario
      form.reset();
      setReasonCharCount(0);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 400) {
          const errorMessage =
            error.response?.data?.message || "Datos inválidos";
          toast({
            title: "Error de validación",
            description: errorMessage,
            variant: "destructive",
          });
        } else if (status === 401) {
          toast({
            title: "No autorizado",
            description: "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
            variant: "destructive",
          });
        } else if (status === 403) {
          toast({
            title: "Acceso denegado",
            description: "No tienes permiso para crear citas.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description:
              error.response?.data?.message ||
              "Ocurrió un error al crear la cita.",
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

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Crear Nueva Cita</h1>
        <p className="text-muted-foreground mt-2">
          Completa el formulario para agendar una cita con el paciente
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Seleccionar Paciente */}
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paciente *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingPatients}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingPatients
                            ? "Cargando pacientes..."
                            : "Selecciona un paciente"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        <div className="flex flex-col">
                          <span>{patient.fullname}</span>
                          <span className="text-xs text-muted-foreground">
                            {patient.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Seleccionar Doctor */}
          <FormField
            control={form.control}
            name="doctorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingDoctors}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingDoctors
                            ? "Cargando doctores..."
                            : "Selecciona un doctor"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        <div className="flex flex-col">
                          <span>{doctor.fullname}</span>
                          <span className="text-xs text-muted-foreground">
                            {doctor.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha y Hora */}
          <FormField
            control={form.control}
            name="scheduledAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha y Hora *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="datetime-local"
                      {...field}
                      className="pl-10"
                      min={new Date().toISOString().slice(0, 16)}
                      max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 16)}
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </FormControl>
                <FormDescription>
                  Máximo 1 año en el futuro
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duración */}
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (minutos) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    min="30"
                    max="1440"
                    step="15"
                  />
                </FormControl>
                <FormDescription>
                  Entre 30 y 1440 minutos (24 horas)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Razón de la cita */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razón de la cita (opcional)</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="Describe el motivo de la consulta..."
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setReasonCharCount(e.target.value.length);
                    }}
                    maxLength={1000}
                    className="min-h-24 w-full px-3 py-2 text-sm border rounded-md border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <FormDescription>
                    Máximo 1000 caracteres
                  </FormDescription>
                  <span>
                    {reasonCharCount}/1000
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={AppointmentStatus.SCHEDULED}>
                      {AppointmentStatus.SCHEDULED}
                    </SelectItem>
                    <SelectItem value={AppointmentStatus.CONFIRMED}>
                      {AppointmentStatus.CONFIRMED}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Scheduled: Pendiente de confirmación
                  <br />
                  Confirmed: Confirmada
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Botón envío */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Creando cita..." : "Crear Cita"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setReasonCharCount(0);
              }}
            >
              Limpiar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

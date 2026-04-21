'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

import { doctorService } from '@/lib/api/doctor.service';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DiagnosisType } from '@/constants/diagnosisType';
import { AppointmentGetResponse } from '@/types';
import { EncounterType } from '@/constants/encounterType';

// ============================================
// Códigos CIE-10 comunes (expandible)
// ============================================
const COMMON_ICD10_CODES = [
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'E11', description: 'Type 2 diabetes mellitus' },
  { code: 'E78.5', description: 'Lipoid disorders, unspecified' },
  { code: 'M79.3', description: 'Panniculitis, unspecified' },
  { code: 'K21.9', description: 'Unspecified gastro-esophageal reflux disease' },
  { code: 'F41.1', description: 'Generalized anxiety disorder' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
  { code: 'J45.909', description: 'Unspecified asthma with (acute) exacerbation' },
  { code: 'M79.1', description: 'Myalgia' },
  { code: 'R51.9', description: 'Headache, unspecified' },
];

// ============================================
// Esquema de validación con Zod
// ============================================
const diagnosisSchema = z.object({
  icd10Code: z.string().min(1, 'Código CIE-10 requerido'),
  description: z.string().min(1, 'Descripción requerida'),
  type: z.nativeEnum(DiagnosisType, {
    errorMap: () => ({ message: 'Tipo de diagnóstico requerido' }),
  }),
});

const examinationFormSchema = z
  .object({
    appointmentId: z.string().min(1, 'Debes seleccionar una cita'),
    encounterType: z.enum([EncounterType.Consultation, EncounterType.FollowUp, 
      EncounterType.Emergency, EncounterType.Telehealth, EncounterType.Other], {
      errorMap: () => ({ message: 'Tipo de consulta requerido' }),
    }),
    startAt: z
    .string()
    .min(1, 'Hora de inicio requerida')
    .refine(
        (time) => {
        const [hours] = time.split(':').map(Number);
        return hours >= 7 && hours < 20;
        },
        'La hora de inicio debe estar entre 7:00 AM y 7:00 PM'
    ),
    endAt: z
    .string()
    .min(1, 'Hora de fin requerida')
    .refine(
        (time) => {
        const [hours] = time.split(':').map(Number);
        return hours >= 7 && hours < 20;
        },
        'La hora de fin debe estar entre 7:00 AM y 8:00 PM'
    ),
    chiefComplaint: z.string().min(1, 'Motivo requerido').min(5, 'El motivo debe tener al menos 5 caracteres'),
    currentCondition: z.string().max(1000, 'La condición actual no puede exceder 1000 caracteres').optional().nullable(),
    physicalExam: z.string().max(1000, 'El examen físico no puede exceder 1000 caracteres').optional().nullable(),
    assessment: z.string().max(1000, 'La evaluación no puede exceder 1000 caracteres').optional().nullable(),
    plan: z.string().max(1000, 'El plan no puede exceder 1000 caracteres').optional().nullable(),
    diagnoses: z
        .array(diagnosisSchema)
        .min(1, 'Debes agregar al menos un diagnóstico'),
    })
    .refine(
    (data) => {
        const startTime = new Date(`2000-01-01T${data.startAt}`);
        const endTime = new Date(`2000-01-01T${data.endAt}`);
        const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= 3;
    },
    {
        message: 'La hora de fin debe ser posterior a la hora de inicio y no puede exceder 3 horas',
        path: ['endAt'],
    }
    );

type ExaminationFormValues = z.infer<typeof examinationFormSchema>;

// ============================================
// Componente principal
// ============================================
export function ExaminationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [appointments, setAppointments] = useState<AppointmentGetResponse[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [filteredCodes, setFilteredCodes] = useState(COMMON_ICD10_CODES);

  const form = useForm<ExaminationFormValues>({
    resolver: zodResolver(examinationFormSchema),
    mode: 'onChange',
    defaultValues: {
      appointmentId: '',
      encounterType: EncounterType.Consultation,
      startAt: '',
      endAt: '',
      chiefComplaint: '',
      currentCondition: '',
      physicalExam: '',
      assessment: '',
      plan: '',
      diagnoses: [
        {
          icd10Code: '',
          description: '',
          type: DiagnosisType.PRIMARY,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'diagnoses',
  });

  // Cargar citas del doctor logueado
  useEffect(() => {
    const loadAppointments = async () => {
      if (!user?.sub) return;

      setIsLoadingAppointments(true);
      try {
        const data = await doctorService.getAppointments({
          doctorId: '',
        });
        setAppointments(data || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las citas',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    loadAppointments();
  }, [user?.sub, toast]);

  // Filtrar códigos CIE-10
  const handleICD10Filter = useCallback((value: string, fieldIndex: number) => {
    if (value.length === 0) {
      setFilteredCodes(COMMON_ICD10_CODES);
    } else {
      const filtered = COMMON_ICD10_CODES.filter(
        (item) =>
          item.code.toLowerCase().includes(value.toLowerCase()) ||
          item.description.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCodes(filtered);
    }
  }, []);

  // Enviar formulario
  const onSubmit = async (values: ExaminationFormValues) => {
    setIsSubmitting(true);

    try {
      const appointmentId = await doctorService.getAppointment(values.appointmentId).then(res => res.id);
      const today = new Date().toISOString().split('T')[0];
      
      const payload = {
        appointmentId: appointmentId,
        encounterType: values.encounterType as EncounterType,
        startAt: new Date(`${today}T${values.startAt}`).toISOString(),
        endAt:   new Date(`${today}T${values.endAt}`).toISOString(),
        chiefComplaint: values.chiefComplaint,
        currentCondition: values.currentCondition || null,
        physicalExam: values.physicalExam || null,
        assessment: values.assessment || null,
        plan: values.plan || null,
        recordingUrl: null,
        diagnoses: values.diagnoses,
      };

      const response = await doctorService.createClinicalEncounter(payload);

      setSuccessMessage('Registro clínico creado exitosamente');
      toast({
        title: 'Éxito',
        description: 'Registro clínico creado correctamente',
        variant: 'default',
      });

      setTimeout(() => {
        router.push(`/dashboard/doctor/encounters/prescriptions?encounterId=${response.id}`);
      }, 2000);
    } catch (error) {
      const errorMessage = isAxiosError(error)
        ? error.response?.data?.message || 'Error al crear el registro'
        : 'Error desconocido';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 pt-16">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Registro de Encuentro Clínico
          </h1>
          <p className="text-gray-600">
            Completa los datos del encuentro clínico con el paciente
          </p>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* ============================================ */}
            {/* SECCIÓN 1: SELECCIÓN DE CITA */}
            {/* ============================================ */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Seleccionar Cita
              </h2>

              <FormField
                control={form.control}
                name="appointmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Cita *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoadingAppointments}
                      >
                        <SelectTrigger className="border-gray-300 bg-white hover:border-blue-400 focus:border-blue-500">
                          <SelectValue placeholder="Selecciona una cita" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingAppointments ? (
                            <div className="p-2 text-sm text-gray-600">
                              Cargando citas...
                            </div>
                          ) : appointments.length === 0 ? (
                            <div className="p-2 text-sm text-gray-600">
                              No hay citas disponibles
                            </div>
                          ) : (
                            appointments.map((apt) => (
                              <SelectItem key={apt.id} value={apt.id}>
                                {apt.patientFullName} -{' '}
                                {new Date(apt.scheduledAt).toLocaleString()}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ============================================ */}
            {/* SECCIÓN 2: DATOS DE EXAMINACIÓN */}
            {/* ============================================ */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Datos de Examinación
              </h2>

              <div className="space-y-4">
                {/* Hora inicio y hora fin */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Hora de Inicio *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Hora de Fin *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tipo de consulta */}
                <FormField
                  control={form.control}
                  name="encounterType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Tipo de Consulta *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="border-gray-300 bg-white hover:border-blue-400 focus:border-blue-500">
                            <SelectValue placeholder="Selecciona tipo de consulta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EncounterType.Consultation}>Consulta General</SelectItem>
                            <SelectItem value={EncounterType.FollowUp}>Seguimiento</SelectItem>
                            <SelectItem value={EncounterType.Emergency}>Emergencia</SelectItem>
                            <SelectItem value={EncounterType.Telehealth}>Telemedicina</SelectItem>
                            <SelectItem value={EncounterType.Other}>Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Motivo */}
                <FormField
                  control={form.control}
                  name="chiefComplaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Motivo *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el motivo de la consulta"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Condición actual */}
                <FormField
                  control={form.control}
                  name="currentCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Condición Actual
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Estado actual del paciente"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                          rows={2}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Examen físico */}
                <FormField
                  control={form.control}
                  name="physicalExam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Examen Físico
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Hallazgos del examen físico"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                          rows={2}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Evaluación */}
                <FormField
                  control={form.control}
                  name="assessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Evaluación</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Evaluación clínica y análisis"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                          rows={2}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Plan */}
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Plan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Plan de tratamiento y seguimiento"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                          rows={2}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ============================================ */}
            {/* SECCIÓN 3: DIAGNÓSTICOS */}
            {/* ============================================ */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Diagnósticos
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      icd10Code: '',
                      description: '',
                      type: DiagnosisType.SECONDARY,
                    })
                  }
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Diagnóstico
                </Button>
              </div>

              {fields.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                  <p>Debes agregar al menos un diagnóstico</p>
                </div>
              )}

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border border-gray-300 rounded-lg bg-white"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        Diagnóstico {index + 1}
                      </h3>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Código CIE-10 */}
                      <FormField
                        control={form.control}
                        name={`diagnoses.${index}.icd10Code`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Código CIE-10 *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: I10, E11"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleICD10Filter(e.target.value, index);
                                }}
                                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </FormControl>
                            {filteredCodes.length > 0 && (
                              <div className="mt-2 border border-gray-200 rounded-md bg-white max-h-56 overflow-y-auto">
                                {filteredCodes.slice(0, 8).map((item) => (
                                  <div
                                    key={item.code}
                                    className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                    onClick={() => {
                                      form.setValue(
                                        `diagnoses.${index}.icd10Code`,
                                        item.code
                                      );
                                      form.setValue(
                                        `diagnoses.${index}.description`,
                                        item.description
                                      );
                                      setFilteredCodes(COMMON_ICD10_CODES);
                                    }}
                                  >
                                    <p className="font-semibold text-blue-600">
                                      {item.code}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {item.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Descripción */}
                      <FormField
                        control={form.control}
                        name={`diagnoses.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Descripción *
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descripción del diagnóstico"
                                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                                rows={2}
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tipo de diagnóstico */}
                      <FormField
                        control={form.control}
                        name={`diagnoses.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Tipo de Diagnóstico *
                            </FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="border-gray-300 bg-white hover:border-blue-400 focus:border-blue-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={DiagnosisType.PRIMARY}>
                                    Primario
                                  </SelectItem>
                                  <SelectItem value={DiagnosisType.SECONDARY}>
                                    Secundario
                                  </SelectItem>
                                  <SelectItem value={DiagnosisType.DIFFERENTIAL}>
                                    Diferencial
                                  </SelectItem>
                                  <SelectItem value={DiagnosisType.RULEDOUT}>
                                    Descartado
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {form.formState.errors.diagnoses && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-700">
                    {form.formState.errors.diagnoses.message}
                  </p>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* BOTÓN DE ENVÍO */}
            {/* ============================================ */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

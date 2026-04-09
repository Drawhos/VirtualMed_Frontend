'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doctorService } from '@/lib/api/doctor.service';
import { Prescription } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Esquema de validación con Zod
const prescriptionLineSchema = z.object({
  medicationName: z.string()
    .min(1, 'El nombre del medicamento es requerido')
    .max(40, 'Máximo 40 caracteres'),
  dosage: z.string()
    .min(1, 'La dosis es requerida'),
  frequency: z.string()
    .min(1, 'La frecuencia es requerida'),
  durationDays: z.coerce.number()
    .min(1, 'La duración debe ser al menos 1 día')
    .max(365, 'Máximo 365 días'),
  instructions: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val)
});

const prescriptionFormSchema = z.object({
  lines: z.array(prescriptionLineSchema)
    .min(1, 'Debe agregar al menos un medicamento')
});

type PrescriptionFormData = z.infer<typeof prescriptionFormSchema>;

export function PrescriptionForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const encounterId = searchParams.get('encounterId');
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      lines: [
        {
          medicationName: '',
          dosage: '',
          frequency: '',
          durationDays: 1,
          instructions: ''
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines'
  });

  const onSubmit = useCallback(async (data: PrescriptionFormData) => {
    if (!encounterId) {
      toast({
        title: 'Error',
        description: 'ID de encuentro no encontrado',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const validUntilFormatted = validUntil.toISOString().split('T')[0];

      const prescriptionData: Prescription = {
        encounterId,
        issuedAt: now.toISOString(),
        validUntil: validUntilFormatted,
        doctorSignatureHash: null,
        lines: data.lines.map(line => ({
          medicationId: null, // El ID del medicamento se asignará en el backend
          medicationName: line.medicationName,
          dosage: line.dosage,
          frequency: line.frequency,
          durationDays: line.durationDays,
          instructions: line.instructions || undefined
        }))
      };

      await doctorService.createPrescription(prescriptionData);

      toast({
        title: 'Éxito',
        description: 'Prescripción guardada correctamente',
        variant: 'default'
      });

      reset();
      router.push(`/dashboard/doctor`);
    } catch (error) {
      console.log('Error al guardar la prescripción:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar la prescripción. Intente nuevamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [encounterId, router, toast, reset]);

  if (!encounterId) {
    return (
      <div className="bg-white p-6 pt-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>Error: ID de encuentro no encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 pt-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-black">Crear Prescripción para Encuentro {encounterId}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            {/* Medicamentos */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-black">Medicamentos</h3>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-black">Medicamento {index + 1}</h4>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre del medicamento */}
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Nombre del Medicamento
                      </label>
                      <input
                        {...register(`lines.${index}.medicationName`)}
                        type="text"
                        maxLength={40}
                        placeholder="Paracetamol, Ibuprofeno..."
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.lines?.[index]?.medicationName
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white'
                        } text-black placeholder-gray-400`}
                      />
                      {errors.lines?.[index]?.medicationName && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.lines[index]?.medicationName?.message}
                        </p>
                      )}
                    </div>

                    {/* Dosis */}
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Dosis
                      </label>
                      <input
                        {...register(`lines.${index}.dosage`)}
                        type="text"
                        placeholder="500mg, 2 comprimidos..."
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.lines?.[index]?.dosage
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white'
                        } text-black placeholder-gray-400`}
                      />
                      {errors.lines?.[index]?.dosage && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.lines[index]?.dosage?.message}
                        </p>
                      )}
                    </div>

                    {/* Frecuencia */}
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Frecuencia (por hora)
                      </label>
                      <input
                        {...register(`lines.${index}.frequency`)}
                        type="text"
                        placeholder="Cada 6 horas, 3 veces al día..."
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.lines?.[index]?.frequency
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white'
                        } text-black placeholder-gray-400`}
                      />
                      {errors.lines?.[index]?.frequency && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.lines[index]?.frequency?.message}
                        </p>
                      )}
                    </div>

                    {/* Duración */}
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Duración (días)
                      </label>
                      <input
                        {...register(`lines.${index}.durationDays`, { valueAsNumber: true })}
                        type="number"
                        min="1"
                        max="365"
                        placeholder="5, 10, 30..."
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.lines?.[index]?.durationDays
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white'
                        } text-black placeholder-gray-400`}
                      />
                      {errors.lines?.[index]?.durationDays && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.lines[index]?.durationDays?.message}
                        </p>
                      )}
                    </div>

                    {/* Instrucciones */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-black mb-2">
                        Instrucciones (Opcional)
                      </label>
                      <textarea
                        {...register(`lines.${index}.instructions`)}
                        maxLength={500}
                        placeholder="Tomar con alimentos, No tomar con lácteos..."
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.lines?.[index]?.instructions
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white'
                        } text-black placeholder-gray-400`}
                      />
                      {errors.lines?.[index]?.instructions && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.lines[index]?.instructions?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {errors.lines && (
                <p className="text-red-600 text-sm mt-2">
                  {errors.lines.message}
                </p>
              )}

              {/* Botón agregar medicamento */}
              <button
                type="button"
                onClick={() =>
                  append({
                    medicationName: '',
                    dosage: '',
                    frequency: '',
                    durationDays: 1,
                    instructions: ''
                  })
                }
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 transition font-medium"
              >
                + Agregar Medicamento
              </button>
            </div>

            {/* Botón enviar */}
            <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Guardando...' : 'Guardar Prescripción'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
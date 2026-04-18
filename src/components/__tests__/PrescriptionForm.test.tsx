import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionForm } from '../clinicalEncounters/prescriptionForm';
import { doctorService } from '@/lib/api/doctor.service';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';

vi.mock('@/lib/api/doctor.service', () => ({
  doctorService: {
    createPrescription: vi.fn(),
  },
}));
vi.mock('@/hooks/use-toast');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe('PrescriptionForm', () => {
  const mockToast = vi.fn();
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  const mockSearchParams = (encounterId: string | null) => ({
    get: (key: string) => (key === 'encounterId' ? encounterId : null),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    (useRouter as any).mockReturnValue({ push: mockPush, back: mockBack });
    (useSearchParams as any).mockReturnValue(mockSearchParams('enc-123'));
    vi.mocked(doctorService.createPrescription).mockResolvedValue(undefined);
  });

  describe('Renderizado', () => {
    it('debe mostrar el formulario cuando existe encounterId', () => {
      render(<PrescriptionForm />);

      expect(
        screen.getByText(/Crear Prescripción para Encuentro enc-123/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Medicamentos/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Guardar Prescripción/i })
      ).toBeInTheDocument();
    });

    it('debe mostrar error si no existe encounterId', () => {
      (useSearchParams as any).mockReturnValue(mockSearchParams(null));
      render(<PrescriptionForm />);

      expect(
        screen.getByText(/Error: ID de encuentro no encontrado/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Guardar Prescripción/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Medicamentos', () => {
    it('debe permitir agregar y remover un medicamento', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm />);

      await user.click(
        screen.getByRole('button', { name: /\+ Agregar Medicamento/i })
      );

      expect(screen.getByText(/Medicamento 2/i)).toBeInTheDocument();

      await user.click(screen.getAllByRole('button', { name: /Remover/i })[0]);
      expect(screen.queryByText(/Medicamento 2/i)).not.toBeInTheDocument();
    });
  });

  describe('Validación', () => {
    it('debe validar campos requeridos', async () => {
      render(<PrescriptionForm />);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(
          screen.getByText(/El nombre del medicamento es requerido/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/La dosis es requerida/i)).toBeInTheDocument();
        expect(
          screen.getByText(/La frecuencia es requerida/i)
        ).toBeInTheDocument();
      });
    });

    it('debe validar duración máxima', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm />);

      const durationInput = screen.getByPlaceholderText(/5, 10, 30/i);
      await user.clear(durationInput);
      await user.type(durationInput, '400');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText(/Máximo 365 días/i)).toBeInTheDocument();
      });
    });
  });

  describe('Envío del formulario', () => {
    it('debe enviar la prescripción con datos válidos', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm />);

      await fillValidPrescription(user);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(doctorService.createPrescription).toHaveBeenCalledWith(
          expect.objectContaining({
            encounterId: 'enc-123',
            issuedAt: expect.any(String),
            validUntil: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            doctorSignatureHash: null,
            lines: [
              {
                medicationId: null,
                medicationName: 'Paracetamol',
                dosage: '500mg',
                frequency: 'Cada 8 horas',
                durationDays: 5,
                instructions: 'Tomar con agua',
              },
            ],
          })
        );
      });
    });

    it('debe mostrar toast de éxito y redirigir', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm />);

      await fillValidPrescription(user);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Éxito',
            description: 'Prescripción guardada correctamente',
          })
        );
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard/doctor');
    });

    it('debe mostrar error si falla el guardado', async () => {
      vi.mocked(doctorService.createPrescription).mockRejectedValueOnce(
        new Error('Network error')
      );

      const user = userEvent.setup();
      render(<PrescriptionForm />);
      await fillValidPrescription(user);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            description: 'Error al guardar la prescripción. Intente nuevamente.',
            variant: 'destructive',
          })
        );
      });
    });

    it('debe mostrar estado de carga mientras se envía', async () => {
      vi.mocked(doctorService.createPrescription).mockImplementation(
        () => new Promise(() => {})
      );

      const user = userEvent.setup();
      render(<PrescriptionForm />);
      await fillValidPrescription(user);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Guardando.../i })
        ).toBeDisabled();
      });
    });
  });
});

// ============================================================================
// Helpers
// ============================================================================

async function fillValidPrescription(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByPlaceholderText(/Paracetamol, Ibuprofeno/i),
    'Paracetamol'
  );
  await user.type(
    screen.getByPlaceholderText(/500mg, 2 comprimidos/i),
    '500mg'
  );
  await user.type(
    screen.getByPlaceholderText(/Cada 6 horas/i),
    'Cada 8 horas'
  );

  const durationInput = screen.getByPlaceholderText(/5, 10, 30/i);
  await user.clear(durationInput);
  await user.type(durationInput, '5');

  await user.type(
    screen.getByPlaceholderText(/Tomar con alimentos/i),
    'Tomar con agua'
  );
}

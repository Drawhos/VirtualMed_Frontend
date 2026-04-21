import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExaminationForm } from '../clinicalEncounters/examinationForm';
import { doctorService } from '@/lib/api/doctor.service';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { AppointmentStatus } from '@/constants/appointmentStatus';
import { DiagnosisType } from '@/constants/diagnosisType';
import { EncounterType } from '@/constants/encounterType';
import axios from 'axios';
import type { AppointmentGetResponse } from '@/types';

vi.mock('@/lib/api/doctor.service', () => ({
  doctorService: {
    getAppointments: vi.fn(),
    getApppointment: vi.fn(),
    createClinicalEncounter: vi.fn(),
  },
}));
vi.mock('@/hooks/use-toast');
vi.mock('@/store/auth.store');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const mockAppointment: AppointmentGetResponse = {
  id: 'apt-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  doctorFullName: 'Dra. López',
  patientFullName: 'Juan Pérez',
  scheduledAt: '2026-04-18T09:00:00.000Z',
  durationMinutes: 30,
  reason: null,
  status: AppointmentStatus.SCHEDULED,
  hasClinicalEncounter: false,
  createdAt: '2026-04-18T08:00:00.000Z',
  updatedAt: '2026-04-18T08:00:00.000Z',
};

describe('ExaminationForm', () => {
  const mockToast = vi.fn();
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    (useRouter as any).mockReturnValue({ push: mockPush, back: mockBack });
    (useAuthStore as any).mockReturnValue({ user: { sub: 'doctor-1' } });
    vi.mocked(doctorService.getAppointments).mockResolvedValue([mockAppointment]);
    vi.mocked(doctorService.getApppointment).mockResolvedValue(mockAppointment);
    vi.mocked(doctorService.createClinicalEncounter).mockResolvedValue({ id: 'encounter-1' });
  });

  describe('Renderizado', () => {
    it('debe renderizar las secciones y el botón de envío', () => {
      render(<ExaminationForm />);

      expect(screen.getByText(/Registro de Encuentro Clínico/i)).toBeInTheDocument();
      expect(screen.getByText(/Seleccionar Cita/i)).toBeInTheDocument();
      expect(screen.getByText(/Datos de Examinación/i)).toBeInTheDocument();
      expect(screen.getByText(/Diagnósticos/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Guardar Registro/i })).toBeInTheDocument();
    });
  });

  describe('Carga de citas', () => {
    it('debe cargar citas del doctor y listarlas en el selector', async () => {
      const user = userEvent.setup();
      render(<ExaminationForm />);

      await waitFor(() => {
        expect(doctorService.getAppointments).toHaveBeenCalledWith({ doctorId: '' });
      });

      const appointmentTrigger = screen.getAllByRole('combobox')[0];
      await user.click(appointmentTrigger);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText(/Juan Pérez/i)).toBeInTheDocument();
    });
  });

  describe('Validación', () => {
    it('debe validar que la hora de inicio esté en rango', async () => {
      render(<ExaminationForm />);

      const timeInputs = document.querySelectorAll('input[type="time"]') as NodeListOf<HTMLInputElement>;
      fireEvent.change(timeInputs[0], { target: { value: '06:00' } });
      fireEvent.blur(timeInputs[0]);

      await waitFor(() => {
        expect(screen.getByText(/hora de inicio debe estar entre/i)).toBeInTheDocument();
      });
    });

    it('debe validar que la hora de fin no exceda 3 horas', async () => {
      render(<ExaminationForm />);

      const timeInputs = document.querySelectorAll('input[type="time"]') as NodeListOf<HTMLInputElement>;
      fireEvent.change(timeInputs[0], { target: { value: '10:00' } });
      fireEvent.change(timeInputs[1], { target: { value: '14:30' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(
          screen.getByText(/no puede exceder 3 horas/i)
        ).toBeInTheDocument();
      });
    });

    it('debe validar que el motivo tenga al menos 5 caracteres', async () => {
      const user = userEvent.setup();
      render(<ExaminationForm />);

      await user.type(
        screen.getByPlaceholderText(/Describe el motivo de la consulta/i),
        '1234'
      );
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/al menos 5 caracteres/i)).toBeInTheDocument();
      });
    });
  });

  describe('Diagnósticos', () => {
    it('debe agregar un nuevo diagnóstico', async () => {
      const user = userEvent.setup();
      render(<ExaminationForm />);

      await user.click(screen.getByRole('button', { name: /Agregar Diagnóstico/i }));

      expect(screen.getByText(/Diagnóstico 2/i)).toBeInTheDocument();
    });

    it('debe autocompletar el código CIE-10 y descripción', async () => {
      const user = userEvent.setup();
      render(<ExaminationForm />);

      const codeInput = screen.getByPlaceholderText(/Ej: I10/i);
      await user.type(codeInput, 'I10');

      await waitFor(() => {
        expect(screen.getByText('I10')).toBeInTheDocument();
      });

      await user.click(screen.getByText('I10'));

      const descriptionInput = screen.getByPlaceholderText(/Descripción del diagnóstico/i);
      expect(codeInput).toHaveValue('I10');
      expect(descriptionInput).toHaveValue('Essential (primary) hypertension');
    });
  });

  describe('Envío del formulario', () => {
    it('debe enviar el formulario correctamente', async () => {
      const user = userEvent.setup();
      render(<ExaminationForm />);

      await fillValidForm(user);
      const today = new Date().toISOString().split('T')[0];
      const expectedStartAt = new Date(`${today}T10:00`).toISOString();
      const expectedEndAt = new Date(`${today}T11:00`).toISOString();

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(doctorService.getApppointment).toHaveBeenCalledWith('apt-1');
      });

      await waitFor(() => {
        expect(doctorService.createClinicalEncounter).toHaveBeenCalledWith(
          expect.objectContaining({
            appointmentId: 'apt-1',
            encounterType: EncounterType.Consultation,
            startAt: expectedStartAt,
            endAt: expectedEndAt,
            chiefComplaint: 'Dolor de cabeza intenso',
            currentCondition: null,
            physicalExam: null,
            assessment: null,
            plan: null,
            recordingUrl: null,
            diagnoses: [
              {
                icd10Code: 'I10',
                description: 'Essential (primary) hypertension',
                type: DiagnosisType.PRIMARY,
              },
            ],
          })
        );
      });
    });

    it('debe mostrar mensaje de éxito y redirigir al crear el registro', async () => {
      const user = userEvent.setup();
      render(<ExaminationForm />);

      await fillValidForm(user);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Éxito',
            description: 'Registro clínico creado correctamente',
          })
        );
      });

      expect(
        screen.getByText(/Registro clínico creado exitosamente/i)
      ).toBeInTheDocument();

      await new Promise((resolve) => setTimeout(resolve, 2100));

      expect(mockPush).toHaveBeenCalledWith(
        '/dashboard/doctor/encounters/prescriptions?encounterId=encounter-1'
      );
    });

    it('debe manejar errores de API', async () => {
      const axiosError = new axios.AxiosError('Bad Request', '400', undefined, undefined, {
        status: 400,
        data: { message: 'No se pudo crear el registro' },
      } as any);
      vi.mocked(doctorService.createClinicalEncounter).mockRejectedValueOnce(axiosError);

      const user = userEvent.setup();
      render(<ExaminationForm />);
      await fillValidForm(user);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            description: 'No se pudo crear el registro',
            variant: 'destructive',
          })
        );
      });
    });

    it('debe mostrar estado de carga mientras se envía', async () => {
      vi.mocked(doctorService.createClinicalEncounter).mockImplementation(
        () => new Promise(() => {})
      );

      const user = userEvent.setup();
      render(<ExaminationForm />);
      await fillValidForm(user);

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guardando.../i })).toBeDisabled();
      });
    });
  });
});

// ============================================================================
// Helpers
// ============================================================================

async function selectAppointment(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(doctorService.getAppointments).toHaveBeenCalled();
  });

  const appointmentTrigger = screen.getAllByRole('combobox')[0];
  await user.click(appointmentTrigger);

  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByText(/Juan Pérez/i));
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await selectAppointment(user);

  const timeInputs = document.querySelectorAll('input[type="time"]') as NodeListOf<HTMLInputElement>;
  fireEvent.change(timeInputs[0], { target: { value: '10:00' } });
  fireEvent.change(timeInputs[1], { target: { value: '11:00' } });

  await user.type(
    screen.getByPlaceholderText(/Describe el motivo de la consulta/i),
    'Dolor de cabeza intenso'
  );

  const codeInput = screen.getByPlaceholderText(/Ej: I10/i);
  await user.type(codeInput, 'I10');

  await waitFor(() => {
    expect(screen.getByText('I10')).toBeInTheDocument();
  });

  await user.click(screen.getByText('I10'));
}

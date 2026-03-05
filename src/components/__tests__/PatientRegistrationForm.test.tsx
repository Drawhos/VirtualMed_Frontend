import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientRegistrationForm from '../PatientRegistrationForm';
import { authService } from '@/lib/api/auth.service';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Mock service y hooks
vi.mock('@/lib/api/auth.service');
vi.mock('@/hooks/use-toast');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('PatientRegistrationForm', () => {
  const mockToast = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    (useRouter as any).mockReturnValue({ push: mockPush });
    (authService.registerPacient as any).mockResolvedValue(undefined);
  });

  describe('Renderizado del formulario', () => {
    it('debe renderizar todos los campos del formulario', () => {
      render(<PatientRegistrationForm />);

      // Usar IDs para evitar ambigüedades
      expect(document.getElementById('email')).toBeInTheDocument();
      expect(document.getElementById('password')).toBeInTheDocument();
      expect(document.getElementById('confirmPassword')).toBeInTheDocument();
      expect(document.getElementById('firstName')).toBeInTheDocument();
      expect(document.getElementById('lastName')).toBeInTheDocument();
      expect(document.getElementById('dateOfBirth')).toBeInTheDocument();
      expect(document.getElementById('phoneNumber')).toBeInTheDocument();
    });

    it('debe renderizar el botón de submit', () => {
      render(<PatientRegistrationForm />);
      const buttons = screen.getAllByRole('button').filter(btn => btn.getAttribute('type') === 'submit');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('debe tener valores por defecto en los campos', () => {
      render(<PatientRegistrationForm />);
      const emailInput = document.getElementById('email') as HTMLInputElement;
      expect(emailInput?.value).toBe('');
    });
  });

  describe('Validación del formulario', () => {
    it('debe validar email inválido', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const emailInput = document.getElementById('email') as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/correo inválido/i)).toBeInTheDocument();
      });
    });

    it('debe validar contraseña muy corta', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const passwordInput = document.getElementById('password') as HTMLInputElement;
      await user.type(passwordInput, 'short');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
      });
    });

    it('debe validar que las contraseñas coincidan', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;

      await user.type(passwordInput, 'Password123');
      await user.type(confirmInput, 'DifferentPassword123');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
      });
    });

    it('debe validar teléfono con 10 dígitos', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const phoneInput = document.getElementById('phoneNumber') as HTMLInputElement;
      await user.type(phoneInput, '123');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/10 dígitos/i)).toBeInTheDocument();
      });
    });

    it('debe validar que la fecha sea en el pasado', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const dateInput = document.getElementById('dateOfBirth') as HTMLInputElement;
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      await user.type(dateInput, futureDateStr);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/anterior a hoy/i)).toBeInTheDocument();
      });
    });
  });

  describe('Submit del formulario', () => {
    it('debe enviar el formulario con datos válidos', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      await fillFormWithValidData(user);

      const submitButton = screen.getAllByRole('button').find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(authService.registerPacient).toHaveBeenCalled();
      });
    });

    it('debe mostrar mensaje de éxito al registrarse', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      await fillFormWithValidData(user);

      const submitButton = screen.getAllByRole('button').find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.any(String) }));
      });
    });

    it('debe redirigir a login después de registrarse', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      await fillFormWithValidData(user);

      const submitButton = screen.getAllByRole('button').find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('debe manejar errores de API', async () => {
      const user = userEvent.setup();
      (authService.registerPacient as any).mockRejectedValueOnce(new Error('API Error'));

      render(<PatientRegistrationForm />);
      await fillFormWithValidData(user);

      const submitButton = screen.getAllByRole('button').find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });
    });

    it('debe mostrar error cuando no acepta política de privacidad', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      await fillFormWithValidData(user, false, true);

      const submitButton = screen.getAllByRole('button').find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/política de privacidad/i)).toBeInTheDocument();
      });
    });

    it('debe mostrar error cuando no autoriza tratamiento de datos', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      await fillFormWithValidData(user, true, false);

      const submitButton = screen.getAllByRole('button').find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/tratamiento de datos/i)).toBeInTheDocument();
      });
    });

    it('debe alternar visibilidad de contraseña', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const passwordInput = document.getElementById('password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleButtons = screen.getAllByRole('button', { name: /mostrar|ocultar/i });
      const firstToggle = toggleButtons[0];

      await user.click(firstToggle);
      expect(passwordInput.type).toBe('text');

      await user.click(firstToggle);
      expect(passwordInput.type).toBe('password');
    });

    it('debe alternar visibilidad de confirmación de contraseña', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
      expect(confirmPasswordInput.type).toBe('password');

      const toggleButtons = screen.getAllByRole('button', { name: /mostrar|ocultar/i });
      const secondToggle = toggleButtons[1];

      await user.click(secondToggle);
      expect(confirmPasswordInput.type).toBe('text');

      await user.click(secondToggle);
      expect(confirmPasswordInput.type).toBe('password');
    });

    it('debe revalidar confirmPassword cuando cambia password', async () => {
      const user = userEvent.setup();
      render(<PatientRegistrationForm />);

      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;

      await user.type(passwordInput, 'InitialPassword123');
      await user.type(confirmInput, 'DifferentPassword123');
      
      // Cambiar password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'NewPassword123');

      // Debe revalidar y mostrar error
      await waitFor(() => {
        expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Helpers
// ============================================================================

async function fillFormWithValidData(
  user: ReturnType<typeof userEvent.setup>,
  acceptPrivacy: boolean = true,
  authorizeData: boolean = true
) {
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;
  const firstNameInput = document.getElementById('firstName') as HTMLInputElement;
  const lastNameInput = document.getElementById('lastName') as HTMLInputElement;
  const dateInput = document.getElementById('dateOfBirth') as HTMLInputElement;
  const phoneInput = document.getElementById('phoneNumber') as HTMLInputElement;

  await user.type(emailInput, 'test@example.com');
  await user.type(passwordInput, 'Password123!');
  await user.type(confirmInput, 'Password123!');
  await user.type(firstNameInput, 'Juan');
  await user.type(lastNameInput, 'Pérez');
  await user.type(dateInput, '1990-05-15');
  await user.type(phoneInput, '3001234567');

  // Check the checkboxes based on parameters
  const checkboxes = screen.getAllByRole('checkbox');
  if (acceptPrivacy && checkboxes[0]) {
    await user.click(checkboxes[0]);
  }
  if (authorizeData && checkboxes[1]) {
    await user.click(checkboxes[1]);
  }
}

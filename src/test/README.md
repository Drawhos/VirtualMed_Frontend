# Frontend Tests Documentation

## Overview

Este proyecto incluye tests unitarios para el formulario de registro de pacientes utilizando **Vitest** y **React Testing Library**.

## Estructura de Tests

```
src/
├── components/
│   ├── __tests__/
│   │   └── PatientRegistrationForm.test.tsx  # Tests del formulario de registro
│   └── PatientRegistrationForm.tsx
├── test/
│   ├── setup.ts                               # Configuración global de tests
│   └── ...
```

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

Las dependencias de testing ya están instaladas. Si necesitas instalarlas manualmente:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @testing-library/dom @vitest/ui @vitest/coverage-v8 happy-dom @vitejs/plugin-react vite
```

## Ejecutar Tests

### Modo ejecución única
```bash
npm run test
```

### Modo watch (se re-ejecutan con cambios)
```bash
npm run test:watch
```

### Con coverage
```bash
npm run test:coverage
```

## Configuración

### vitest.config.ts
- **Environment**: happy-dom (más ligero que jsdom)
- **Globals**: true (no necesitas importar describe, it, expect, etc.)
- **Coverage threshold**: 60% mínimo para todas las métricas

### src/test/setup.ts
- Importa jest-dom matchers
- Mockea módulos de Next.js (next/navigation, next/link)
- Limpia DOM después de cada test

## Tests Incluidos

### PatientRegistrationForm.test.tsx

#### Renderizado
- ✅ Verifica que todos los campos del formulario se rendericen
- ✅ Verifica que exista el botón de submit
- ✅ Verifica que haya valores por defecto

#### Validación
- ✅ Email inválido
- ✅ Contraseña muy corta (< 8 caracteres)
- ✅ Contraseña y confirmación no coinciden
- ✅ Teléfono sin 10 dígitos
- ✅ Fecha de nacimiento en el futuro

#### Submit
- ✅ Envío exitoso del formulario
- ✅ Mostrar mensaje de éxito
- ✅ Redirección a /login
- ✅ Manejo de errores de API
- ✅ Rechazo sin aceptar política de privacidad
- ✅ Rechazo sin autorizar tratamiento de datos
- ✅ Alternar visibilidad de contraseña
- ✅ Revalidación de confirmación cuando cambia password

### Total: 17 tests ✅

## Cobertura

Cobertura mínima requerida: **60%**

Cobertura actual:
- **Statements**: 82.8%
- **Branches**: 63.52% ✅
- **Functions**: 87.75%
- **Lines**: 82.35%

Para generar un reporte HTML:
```bash
npm run test:coverage
```

El reporte estará disponible en `coverage/index.html`

## Escribir Nuevos Tests

### Estructura básica
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Componente', () => {
  const mockFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe hacer algo', async () => {
    const user = userEvent.setup();
    render(<Componente />);
    
    // Interact with component
    await user.type(screen.getByRole('textbox'), 'text');
    
    // Assert
    expect(screen.getByText('expected')).toBeInTheDocument();
  });
});
```

### Mejores prácticas
1. Use IDs html para selectores específicos vía `document.getElementById()`
2. Use `screen.getByRole()` para elementos interactive (buttons, inputs, etc.)
3. Use `waitFor()` para operaciones asincrónicas
4. Mock servicios y hooks externos con `vi.mock()`
5. Limpie mocks en `beforeEach()`

## Troubleshooting

### Los tests no se ejecutan
```bash
# Limpiar cache
npm run test -- --clearCache

# Reinstalar dependencias
npm install
```

### Coverage no alcanza el 60%
- Agrega más tests para branches no cubiertas
- Revisa `coverage/index.html` para ver qué líneas falta cubrir
- Añade tests para casos edge

### Errores de MockedFunction
- Asegúrate de que los mocks están en `beforeEach(() => { vi.clearAllMocks() })`
- Verifica que los módulos mockeados estén en la raíz del archivo de tests

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

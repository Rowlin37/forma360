import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import HomePage from '@/app/page';
import { Forma360Provider } from '@/context/Forma360Context';

describe('Forma360 UI — Registro de cuenta, persistencia tras cerrar sesión y módulos principales', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('permite cerrar sesión, registrar una cuenta nueva, registrar peso/cintura y conservar los datos al volver a iniciar sesión', async () => {
    const user = userEvent.setup();

    const { unmount } = render(
      <Forma360Provider>
        <HomePage />
      </Forma360Provider>
    );

    // Carga inicialmente el Dashboard con el aviso del basal 779 kcal
    await waitFor(() => {
      expect(screen.getAllByText(/779 kcal/i).length).toBeGreaterThan(0);
    });

    // Cerrar sesión para probar el flujo completo de alta y login
    const logoutButtons = screen.getAllByLabelText(/Cerrar sesión/i);
    await user.click(logoutButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/Crear mi cuenta e inicializar perfil/i)).toBeInTheDocument();
    });

    // Registrar un usuario nuevo
    await user.type(screen.getByLabelText(/Nombre o alias/i), 'Miguel Madrid');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'miguel@forma360.es');
    await user.type(screen.getByLabelText(/Contraseña/i), 'claveSegura123');
    await user.click(screen.getByRole('button', { name: /Crear mi cuenta e inicializar perfil/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Miguel Madrid/i).length).toBeGreaterThan(0);
    });

    // Registrar peso rápido y cintura desde el Dashboard
    await user.type(screen.getByLabelText(/Peso \(kg\)/i), '88,6');
    await user.type(screen.getByLabelText(/Cintura \(cm\)/i), '96,2');
    await user.click(screen.getByRole('button', { name: /Guardar medición del día/i }));

    await waitFor(() => {
      expect(screen.getByText(/88,6 kg/i)).toBeInTheDocument();
      expect(screen.getByText(/96,2 cm/i)).toBeInTheDocument();
    });

    // Cerrar sesión, desmontar y volver a entrar con las mismas credenciales
    await user.click(screen.getAllByLabelText(/Cerrar sesión/i)[0]!);
    unmount();

    render(
      <Forma360Provider>
        <HomePage />
      </Forma360Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'miguel@forma360.es');
    await user.type(screen.getByLabelText(/Contraseña/i), 'claveSegura123');
    await user.click(screen.getByRole('button', { name: /Entrar a mi cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/88,6 kg/i)).toBeInTheDocument();
      expect(screen.getByText(/96,2 cm/i)).toBeInTheDocument();
    });
  });
});

import { expect, test } from '@playwright/test';

test('Flujo integral Forma360 (Escritorio y Móvil): perfil, plan, equipamiento, fuerza, fútbol sin duplicar, carrera, nutrición, objetivos y persistencia de sesión', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');

  // 1. Verificar Dashboard inicial, alerta de TMB anómalo (779 kcal/día) y /api/status
  await expect(page.getByText(/¿Qué me toca hacer hoy\?/i)).toBeVisible();
  await expect(page.getByText(/779 kcal\/día/).first()).toBeVisible();

  const apiRes = await page.request.get('/api/status');
  expect(apiRes.ok()).toBeTruthy();
  const statusJson = await apiRes.json();
  expect(statusJson.app).toBe('Forma360');

  // Helper de navegación compatible con escritorio (sidebar) y móvil (cajón de menú)
  const navigateTo = async (labelRegex: RegExp) => {
    if (isMobile) {
      await page.getByRole('button', { name: 'Abrir todas las secciones' }).click();
    }
    await page.getByRole('button', { name: labelRegex }).first().click();
  };

  // 2. Registrar peso y cintura desde Inicio y comprobar actualización en tiempo real
  await page.getByLabel('Peso (kg)').fill('89,1');
  await page.getByLabel('Cintura (cm)').fill('97,0');
  await page.getByRole('button', { name: 'Guardar medición del día' }).click();
  await expect(page.getByText('89,1 kg')).toBeVisible();
  await expect(page.getByText('97 cm')).toBeVisible();

  // 3. Ir a Entrenamientos -> completar sesión de Fuerza con series y cargas + probar Fútbol sin duplicar
  await page.getByRole('button', { name: 'Registrar sesión' }).click();
  await expect(page.getByRole('heading', { name: /Registro de Entrenamientos/i })).toBeVisible();

  await page.getByRole('button', { name: 'Fuerza (Series/Kg)' }).click();
  await page.getByRole('button', { name: 'Finalizar y guardar sesión de fuerza' }).click();
  await expect(page.getByText(/Evaluación post-sesión aplicada/i)).toBeVisible();

  await page.getByRole('button', { name: 'Fútbol / Deporte' }).click();
  await page.getByRole('button', { name: 'Guardar actividad en mi carga semanal' }).click();
  await page.getByRole('button', { name: 'Guardar actividad en mi carga semanal' }).click();
  await expect(page.getByText(/Duplicado evitado/i)).toBeVisible();

  // 4. Cambiar equipamiento disponible y comprobar sustitución dinámica en el plan
  await navigateTo(/Ejercicios y material/i);
  await page.getByRole('button', { name: 'Cambiar disponibilidad de Barra de dominadas' }).click();
  await expect(page.getByText(/ejercicios adaptados en tus próximas sesiones/i)).toBeVisible();

  // 5. Registrar comida en Nutrición y verificar totales coherentes
  await navigateTo(/^Nutrición$/i);
  await page.getByRole('button', { name: 'Registrar en diario' }).click();
  await expect(page.getByText(/226 kcal/).first()).toBeVisible();

  // 6. Progresión configurable en Carrera y Media Maratón
  await navigateTo(/Carrera y media maratón/i);
  await page.getByRole('button', { name: 'Guardar sesión de carrera' }).click();
  await expect(page.getByText(/Historial reciente de carrera \(1\)/i)).toBeVisible();

  // 7. Cerrar sesión, crear usuario propio, salir y volver a entrar verificando persistencia
  await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Elena Runner');
  await page.getByLabel('Correo electrónico').fill('elena@forma360.es');
  await page.getByLabel('Contraseña (mín. 6 caracteres)').fill('forma360segura');
  await page.getByRole('button', { name: 'Crear mi cuenta e inicializar perfil' }).click();

  await expect(page.getByText(/¿Qué me toca hacer hoy\?/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/¿Qué me toca hacer hoy\?/i)).toBeVisible();
});

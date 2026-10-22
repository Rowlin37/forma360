# Forma360 — Plataforma Integral de Transformación Física Personal

**Forma360** es una aplicación web full-stack construida con **Next.js 16 (App Router)**, **React 19**, **TypeScript estricto**, **Tailwind CSS v4**, **Recharts**, **Zod** y **Supabase (PostgreSQL + Auth + Row Level Security)** diseñada para planificar, registrar, analizar y adaptar de forma realista y sostenible un proceso completo de recomposición corporal, fuerza, fútbol semanal, nutrición mediterránea y preparación progresiva hacia **Media Maratón (21,1 km)**.

---

## 1. Arquitectura y Principios de Dominio

```text
forma360/
├── src/
│   ├── app/
│   │   ├── api/status/route.ts      # Diagnóstico en vivo del entorno y estado Cloud/Local
│   │   ├── api/account/route.ts     # Eliminación segura de cuenta (servidor) con SUPABASE_SERVICE_ROLE_KEY
│   │   ├── auth/callback/route.ts   # Intercambio seguro de código PKCE de Supabase Auth
│   │   ├── manifest.ts              # Manifiesto PWA instalable en móvil y escritorio
│   │   ├── layout.tsx               # Raíz accesible en español (es-ES)
│   │   └── page.tsx                 # Enrutador de las 10 secciones interactivas
│   ├── components/
│   │   ├── AuthGate.tsx             # Registro / inicio de sesión + selector transparente Cloud/Local
│   │   ├── AppShell.tsx             # Navegación lateral de escritorio + barra inferior móvil a una mano
│   │   └── sections/                # 10 módulos completos (Inicio, Plan, Entrenos, 21K, Nutrición, etc.)
│   ├── context/
│   │   └── Forma360Context.tsx      # Estado reactivo unificado, acciones, tema claro/oscuro y avisos
│   └── lib/
│       ├── types.ts                 # Tipos estrictos y esquemas Zod
│       ├── format.ts                # Formato numérico/fechas español (coma decimal, Europe/Madrid)
│       ├── domain/                  # Motores puros auditables y 100% testeados:
│       │   ├── physiology.ts        # Validación TMB anómalo, Mifflin-St Jeor, Katch-McArdle, media 7d
│       │   ├── equipment.ts         # Inventario actual/futuro y cálculo real de cargas con barra+discos
│       │   ├── exercises.ts         # Catálogo técnico en español + sustitución automática por material
│       │   ├── planner.ts           # Cribado de salud, plan Full-Body A/B 8 semanas, fútbol y sobrecarga
│       │   ├── running.ts           # Ruta progresiva de 8 etapas (Caco -> 5K -> 10K -> 15K -> 21,1 km)
│       │   ├── nutrition.ts         # Catálogo español, recetas, menú diario, exclusiones y CSV
│       │   ├── recommendations.ts   # Reglas transparentes aceptables / modificables / rechazables
│       │   └── initial-state.ts     # Perfil base configurable (35 años, 90 kg, hitos 85,5/81/78/75 kg)
│       ├── persistence/
│       │   └── repository.ts        # Persistencia dual Supabase Cloud + modo Local multiusuario aislado
│       └── supabase/                # Clientes navegador, SSR y administración segura en servidor
├── supabase/migrations/
│   ├── 202610220001_forma360_schema.sql # 21 tablas PostgreSQL, claves anti-duplicado e índices
│   └── 202610220002_forma360_seed.sql   # Catálogo semilla de material, ejercicios y alimentos
├── tests/
│   ├── domain-and-safety.test.ts    # Reglas fisiológicas, nutrición, progresión y anti-duplicados
│   ├── postgres-rls.test.ts         # Ejecución real de las migraciones SQL y RLS sobre PostgreSQL WASM (PGlite)
│   ├── ui-components.test.tsx       # Flujos de interfaz React Testing Library (auth, persistencia, peso)
│   └── e2e/critical-flows.spec.ts   # Flujos E2E reales en Chromium Escritorio y Móvil (Pixel 7)
└── .github/workflows/ci.yml         # Pipeline CI completo (typecheck, lint, tests SQL/UI, build, E2E)
```

### Garantías fisiológicas y de seguridad implementadas
- **TMB anómalo bloqueado automáticamente**: el valor `779 kcal/día` reportado por báscula doméstica queda marcado como `Dato pendiente de verificación / posible error de medición` y **jamás** se usa para calcular objetivos calóricos.
- **Altura sin suposiciones ocultas**: a partir de `90 kg` e `IMC 25,7` se infiere de forma orientativa `~187 cm`, pero permanece explícitamente pendiente de confirmación por el usuario.
- **Separación estricta de fuentes**: las métricas domésticas de bioimpedancia Xiaomi (`25,7 %` grasa estimada, `51 %` agua, `63,5 kg` masa muscular, `19,6 %` proteína, `3,4 kg` masa ósea) se almacenan como `household_bioimpedance` y nunca se presentan como DEXA clínica.
- **Integración real del fútbol semanal**: el partido exigente de los **miércoles (60–90 min)** reduce automáticamente el volumen/estrés excéntrico de pierna en las 24 h previas y programa descarga/movilidad regenerativa los jueves; la pachanga suave de los **domingos (~20 min)** se integra como carga recreativa.
- **Anti-duplicados deterministas**: tanto la capa de repositorio como las tablas PostgreSQL (`UNIQUE (user_id, client_dedup_key)`) evitan registros duplicados accidentales en sesiones de fuerza, partidos de fútbol y entradas de nutrición.

---

## 2. Ejecución en Local

### Requisitos previos
- **Node.js 20.x o superior** (`node -v`)
- **npm 10.x o superior** (`npm -v`)

### Pasos
```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) Configurar variables de entorno copiando la plantilla sin secretos
cp .env.example .env.local

# 3. Arrancar el servidor de desarrollo
npm run dev
```

Abre `http://localhost:3000`.
- Si **no** has configurado aún credenciales de Supabase en `.env.local`, la aplicación informa con total transparencia de que opera en **Modo Local Persistente** (con cuentas multiusuario con hash SHA-256, cierre e inicio de sesión reales, persistencia entre recargas y exportación/importación JSON/CSV).
- En cuanto añades tus claves reales de Supabase en `.env.local`, la aplicación conmuta automáticamente a **Supabase Cloud Auth + PostgreSQL RLS**.

---

## 3. Verificación y Suite de Pruebas Automatizadas

Ejecuta cualquiera de los siguientes comandos (o `npm run check` para lanzarlos todos encadenados):

```bash
# Tipado estricto TypeScript
npm run typecheck

# Linter estático ESLint 9 (Next Core Web Vitals + TypeScript)
npm run lint

# Pruebas unitarias, de componentes UI y PostgreSQL real con Row Level Security (PGlite)
npm test

# Compilación optimizada de producción Next.js
npm run build

# Pruebas End-to-End reales en Chromium Escritorio y Móvil (Pixel 7)
npm run test:e2e
```

---

## 4. Configuración Paso a Paso de Supabase (Producción Cloud)

1. Crea un nuevo proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard) (región recomendada: `eu-central-1` o `eu-west-1`).
2. Ve a **Authentication -> Providers -> Email** y asegúrate de tener habilitado **Email / Password** (puedes desactivar *Confirm email* en entorno de pruebas si deseas acceso inmediato tras registro).
3. Ve a **Authentication -> URL Configuration**:
   - **Site URL**: URL de tu despliegue en Vercel (ej. `https://forma360.vercel.app`) o `http://localhost:3000` en local.
   - **Redirect URLs**: añade `https://TU-DOMINIO.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`.
4. Abre **SQL Editor** en el panel de Supabase y ejecuta **en orden**:
   1. Todo el contenido de `supabase/migrations/202610220001_forma360_schema.sql` (crea las 21 tablas, índices, `UNIQUE` anti-duplicado y activa `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` en todas las tablas privadas).
   2. Todo el contenido de `supabase/migrations/202610220002_forma360_seed.sql` (puebla el catálogo base de equipamiento, ejercicios en español y alimentos habituales).
5. Ve a **Project Settings -> API** y copia:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key -> `SUPABASE_SERVICE_ROLE_KEY` (**solo en variables privadas de servidor en Vercel / `.env.local`; jamás con prefijo `NEXT_PUBLIC_`**).

---

## 5. Subida a GitHub e Integración Continua (GitHub Actions)

```bash
git add .
git commit -m "feat: Forma360 physical transformation platform"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/forma360.git
git push -u origin main
```

Al subir a `main` o abrir una Pull Request, el flujo `.github/workflows/ci.yml` ejecuta automáticamente:
1. `npm run typecheck`
2. `npm run lint`
3. `npm test` (incluyendo validación real de las migraciones PostgreSQL y aislamiento RLS entre dos usuarios distintos)
4. `npm run build`
5. `npm run test:e2e` en navegadores reales de escritorio y móvil

---

## 6. Despliegue en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com/new) o despliega directamente con Vercel CLI / conector Vercel.
2. En **Project Settings -> Environment Variables**, añade para `Production`, `Preview` y `Development`:
   - `NEXT_PUBLIC_APP_URL` = URL pública de tu proyecto en Vercel
   - `NEXT_PUBLIC_DEFAULT_TIMEZONE` = `Europe/Madrid`
   - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase *(opcional si quieres usar modo local persistente)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu clave `anon` pública de Supabase *(opcional)*
   - `SUPABASE_SERVICE_ROLE_KEY` = tu clave `service_role` marcada como **Sensitive / Server-only** *(necesaria únicamente para borrado completo de cuenta Auth desde `/api/account`)*
3. Despliega y verifica el endpoint de diagnóstico `https://TU-DOMINIO.vercel.app/api/status`.

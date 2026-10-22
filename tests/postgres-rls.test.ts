import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

describe('PostgreSQL Real (PGlite) — Migraciones SQL, Semillas y Aislamiento Row Level Security (RLS)', () => {
  it('ejecuta las migraciones SQL reales, persiste registros de usuario, bloquea duplicados SQL y garantiza aislamiento RLS total entre dos usuarios', async () => {
    const db = new PGlite();

    const schemaSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/202610220001_forma360_schema.sql'),
      'utf8'
    );
    const seedSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/202610220002_forma360_seed.sql'),
      'utf8'
    );

    await db.exec(schemaSql);
    await db.exec(seedSql);

    // Crear identidades en auth.users
    await db.query(
      `INSERT INTO auth.users (id, email) VALUES ($1, 'usera@forma360.es'), ($2, 'userb@forma360.es')`,
      [USER_A, USER_B]
    );

    // 1. Operando autenticado como USER_A
    await db.exec(`
      BEGIN;
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '${USER_A}', true);

      INSERT INTO public.profiles (user_id, display_name, age, initial_weight_kg, target_weight_kg)
      VALUES ('${USER_A}', 'Carlos A', 35, 90.0, 75.0);

      INSERT INTO public.body_measurements (user_id, measured_on, source_type, weight_kg, waist_cm)
      VALUES ('${USER_A}', '2026-10-22', 'manual', 89.4, 96.5);

      INSERT INTO public.nutrition_logs (
        user_id, logged_on, meal_slot, entry_name, data_source,
        quantity, unit, grams_equivalent, kcal, protein_g, client_dedup_key
      ) VALUES (
        '${USER_A}', '2026-10-22', 'lunch', 'Pechuga de pollo', 'bedca_reference',
        200, 'g', 200, 226, 45.6, 'dedup-lunch-1'
      );
      COMMIT;
    `);

    // 2. Comprobar que PostgreSQL rechaza inserción accidental duplicada por UNIQUE(user_id, client_dedup_key)
    await expect(
      db.exec(`
        BEGIN;
        SET LOCAL ROLE authenticated;
        SELECT set_config('request.jwt.claim.sub', '${USER_A}', true);
        INSERT INTO public.nutrition_logs (
          user_id, logged_on, meal_slot, entry_name, data_source,
          quantity, unit, grams_equivalent, kcal, protein_g, client_dedup_key
        ) VALUES (
          '${USER_A}', '2026-10-22', 'lunch', 'Pechuga de pollo', 'bedca_reference',
          200, 'g', 200, 226, 45.6, 'dedup-lunch-1'
        );
        COMMIT;
      `)
    ).rejects.toThrow();
    await db.exec('ROLLBACK;');

    // 3. Operando autenticado como USER_B -> NO puede leer, modificar ni borrar datos de USER_A
    await db.exec('BEGIN;');
    await db.exec('SET LOCAL ROLE authenticated;');
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [USER_B]);

    const visibleProfilesForB = await db.query(`SELECT * FROM public.profiles`);
    expect(visibleProfilesForB.rows).toHaveLength(0);

    const visibleMeasurementsForB = await db.query(`SELECT * FROM public.body_measurements`);
    expect(visibleMeasurementsForB.rows).toHaveLength(0);

    // Intento malicioso de USER_B de insertar una medición a nombre de USER_A -> bloqueado por WITH CHECK RLS
    await expect(
      db.query(
        `INSERT INTO public.body_measurements (user_id, measured_on, source_type, weight_kg) VALUES ($1, '2026-10-22', 'manual', 70.0)`,
        [USER_A]
      )
    ).rejects.toThrow();
    await db.exec('ROLLBACK;');

    // 4. USER_A sigue viendo intactos sus propios datos y el catálogo público de ejercicios
    await db.exec('BEGIN;');
    await db.exec('SET LOCAL ROLE authenticated;');
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [USER_A]);

    const ownMeasurements = await db.query<{ weight_kg: string; waist_cm: string }>(
      `SELECT weight_kg, waist_cm FROM public.body_measurements`
    );
    expect(ownMeasurements.rows).toHaveLength(1);
    expect(Number(ownMeasurements.rows[0]?.weight_kg)).toBeCloseTo(89.4, 1);

    const seededExercises = await db.query(`SELECT slug FROM public.exercises WHERE is_system = true`);
    expect(seededExercises.rows.length).toBeGreaterThanOrEqual(7);
    await db.exec('COMMIT;');

    await db.close();
  });
});

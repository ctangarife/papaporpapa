# Database - PostgreSQL Schemas (English field names)

## Schema Structure

The database uses descriptive schemas for each module. The `public` schema is used ONLY for migration tracking.

### Schemas

- **`public`** - Migration tracking only
- **`auth`** - Authentication, users, and sessions
- **`projects`** - Projects and tasks (potatoes)
- **`llm**** - LLM configuration and credentials

## Migration Scripts

Scripts must be executed in numerical order:

1. `00-init-schemas.sql` - Schema creation and migrations table
2. `01-auth-schema.sql` - Authentication schema
3. `02-projects-schema.sql` - Projects schema
4. `03-llm-schema.sql` - LLM credentials schema

## Connection from TypeORM

Configure the schema in each entity:

```typescript
@Entity({ name: 'users', schema: 'auth' })
export class User { ... }

@Entity({ name: 'projects', schema: 'projects' })
export class Project { ... }

@Entity({ name: 'tasks', schema: 'projects' })
export class Task { ... }

@Entity({ name: 'user_llm_credentials', schema: 'llm' })
export class UserLLMCredential { ... }
```

Or set a default schema in `app.module.ts`:

```typescript
TypeOrmModule.forRootAsync({
  useFactory: () => ({
    // ...
    schema: 'auth', // or omit to specify per-entity
  }),
})
```

## Field Naming Convention

All database fields use **English names**:
- `created_at` (not `creado_en`)
- `updated_at` (not `actualizado_en`)
- `first_name` (not `nombre`)
- `last_name` (not `apellido`)
- `coins_balance` (not `saldo_monedas`)
- `birth_date` (not `fecha_nacimiento`)
- `diagnosis` (not `diagnostico`)
- `ai_preferences` (not `preferencias_ia`)
- `onboarding_completed` (not `onboarding_completado`)
- `is_default` (not `es_default`)
- `model_name` (not `model_preference`)

Spanish is used for:
- Table names (can be English too, but we use descriptive English names)
- Column comments (documentation in Spanish is acceptable)

## Registering Migrations

To register a new migration:

```sql
SELECT public.register_migration('schema_name', version_number);
```

Example:
```sql
SELECT public.register_migration('projects', 2);
```

## View Executed Migrations

```sql
SELECT * FROM public.schema_migrations ORDER BY schema_name, version DESC;
```

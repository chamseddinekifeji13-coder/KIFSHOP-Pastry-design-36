# KIFSHOP Database Migrations

This directory contains SQL migration scripts for the KIFSHOP database.

## Quick Start

### Option 1: Using Supabase Console (Easiest)
1. Go to your Supabase project: https://app.supabase.com
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy the contents of `create-delivery-companies-table.sql`
5. Click "Run"

### Option 2: Using Python Script
```bash
# Install dependencies
pip install supabase

# Run migrations
python scripts/migrate.py
```

The script will automatically:
- Connect to your Supabase project
- Execute all migration files in order
- Report success/failure for each migration

### Option 3: Manual psql Command
```bash
# Export credentials
export SUPABASE_URL="your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Connect to database
psql "postgresql://postgres:[PASSWORD]@db.[INSTANCE].supabase.co:5432/postgres" < scripts/create-delivery-companies-table.sql
```

## Available Migrations

### 00-init-all-tables.sql
- Creates complete database schema
- Includes all table creation and index setup
- Safe to run multiple times (uses IF NOT EXISTS)

### create-delivery-companies-table.sql
- Creates delivery_companies table for managing delivery company information
- Includes RLS policies and indexes
- Standalone migration (can be run independently)

## What Gets Created

### delivery_companies Table
Stores delivery company information for each tenant:
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants table
- `name` - Company name
- `contact_phone` - Phone number
- `email` - Email address
- `website` - Website URL
- `notes` - Additional notes
- `is_active` - Boolean flag for active/inactive
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Indexes Created
- `idx_delivery_companies_tenant_id` - Fast tenant filtering
- `idx_delivery_companies_created_at` - Sort by creation date
- `idx_delivery_companies_is_active` - Filter by active status

### Row Level Security (RLS)
- Policy: `delivery_companies_authenticated`
- Allows all authenticated users to read and modify
- Application-level authorization enforces tenant isolation

## Troubleshooting

### Error: "relation 'delivery_companies' already exists"
This is normal - the scripts use `IF NOT EXISTS` to prevent duplicate creation.

### Error: "foreign key constraint 'fk_tenant_id' failed"
Ensure the `tenants` table exists first. Run the parent migration if needed.

### Error: "permission denied for schema public"
You may need higher database permissions. Use `SUPABASE_SERVICE_ROLE_KEY` instead of anon key.

## Verifying Migrations

After running migrations, verify the tables were created:

```sql
-- View all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check delivery_companies columns
\d delivery_companies

-- Verify RLS policies
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'delivery_companies';
```

## Rolling Back

To remove the delivery_companies table:

```sql
DROP TABLE IF EXISTS delivery_companies CASCADE;
```

## Need Help?

If migrations fail:
1. Check Supabase console logs for detailed errors
2. Verify your service role key has database permissions
3. Ensure all dependent tables exist first
4. Check RLS policies aren't blocking operations

For issues with the application, see the [API Routes Audit Report](../API_ROUTES_AUDIT.md)

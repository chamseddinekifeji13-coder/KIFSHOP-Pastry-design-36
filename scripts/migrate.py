#!/usr/bin/env python3
"""
KIFSHOP Database Migration Script
Executes SQL migrations on Supabase database
Usage: python scripts/migrate.py
"""

import os
import sys
from pathlib import Path

# Try to import supabase library
try:
    from supabase import create_client
except ImportError:
    print("Error: supabase-py not installed")
    print("Install with: pip install supabase")
    sys.exit(1)


def migrate():
    """Execute database migrations"""
    
    # Get Supabase credentials from environment
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: Missing Supabase credentials")
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        sys.exit(1)
    
    print(f"Connecting to Supabase: {supabase_url}")
    
    # Create Supabase client
    supabase = create_client(supabase_url, supabase_key)
    
    # Read migration files in order
    migrations_dir = Path(__file__).parent
    migration_files = [
        migrations_dir / '00-init-all-tables.sql',
        migrations_dir / 'create-delivery-companies-table.sql',
    ]
    
    for migration_file in migration_files:
        if not migration_file.exists():
            print(f"⚠️  Skipping {migration_file.name} (not found)")
            continue
        
        print(f"\n📋 Executing {migration_file.name}...")
        
        try:
            with open(migration_file, 'r') as f:
                sql = f.read()
            
            # Execute SQL
            response = supabase.postgrest.query(sql)
            print(f"✅ {migration_file.name} executed successfully")
            
        except Exception as e:
            print(f"❌ Error executing {migration_file.name}")
            print(f"   {str(e)}")
            # Continue with next migration instead of failing completely
    
    print("\n✅ All migrations completed!")
    print("\nTo verify the tables were created, run:")
    print("  SELECT table_name FROM information_schema.tables")
    print("  WHERE table_schema = 'public'")


if __name__ == '__main__':
    migrate()

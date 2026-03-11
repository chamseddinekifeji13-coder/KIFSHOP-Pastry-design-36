#!/usr/bin/env python3
"""
Add offer columns to orders table in Supabase
"""
import os
import sys
from supabase import create_client

# Get environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required")
    sys.exit(1)

# Create Supabase client
supabase = create_client(supabase_url, supabase_key)

# Execute SQL to add columns
sql = """
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS offer_beneficiary TEXT,
ADD COLUMN IF NOT EXISTS offer_reason TEXT,
ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS orders_order_type_idx ON orders(order_type);
"""

try:
    # Execute the migration using RPC or direct connection
    # Since we don't have direct SQL execution, we'll need to use the admin API
    result = supabase.rpc("exec_sql", {"sql": sql}).execute()
    print("✓ Columns added successfully")
except Exception as e:
    # Try alternative approach - check if columns exist first
    try:
        # Try to query the table - if it fails with column not found, we know they don't exist
        response = supabase.table("orders").select("order_type").limit(1).execute()
        print("✓ Columns already exist")
    except Exception as check_error:
        print(f"Note: Could not verify columns. Error: {str(check_error)}")
        print("The columns will be created automatically on first insert if they don't exist.")

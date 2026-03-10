-- Add new columns to recipes table for the improved workflow
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS theoretical_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS packaged_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS wastage_percent NUMERIC DEFAULT 0;

-- Create recipe_packaging table to store packaging information
CREATE TABLE IF NOT EXISTS recipe_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  packaging_id UUID NOT NULL REFERENCES packaging(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  weight_grams NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, packaging_id, weight_grams)
);

-- Add RLS policies
ALTER TABLE recipe_packaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe_packaging of their tenant"
ON recipe_packaging FOR SELECT
USING (
  recipe_id IN (
    SELECT id FROM recipes WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text
  )
);

CREATE POLICY "Users can create recipe_packaging in their tenant"
ON recipe_packaging FOR INSERT
WITH CHECK (
  recipe_id IN (
    SELECT id FROM recipes WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text
  )
);

CREATE POLICY "Users can update recipe_packaging in their tenant"
ON recipe_packaging FOR UPDATE
USING (
  recipe_id IN (
    SELECT id FROM recipes WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text
  )
);

CREATE POLICY "Users can delete recipe_packaging in their tenant"
ON recipe_packaging FOR DELETE
USING (
  recipe_id IN (
    SELECT id FROM recipes WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_recipe_packaging_recipe_id ON recipe_packaging(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_packaging_packaging_id ON recipe_packaging(packaging_id);

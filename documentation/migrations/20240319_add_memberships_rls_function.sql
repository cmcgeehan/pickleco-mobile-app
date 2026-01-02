-- Create function to set up RLS policies for memberships table
CREATE OR REPLACE FUNCTION setup_memberships_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Enable RLS on memberships table if not already enabled
    ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
    DROP POLICY IF EXISTS "Service role can create memberships" ON memberships;
    DROP POLICY IF EXISTS "Service role can update memberships" ON memberships;
    DROP POLICY IF EXISTS "Service role can delete memberships" ON memberships;

    -- Create policy for viewing memberships
    CREATE POLICY "Users can view their own memberships" ON memberships
        FOR SELECT USING (auth.uid() = user_id);

    -- Create policy for inserting memberships (service role)
    CREATE POLICY "Service role can create memberships" ON memberships
        FOR INSERT WITH CHECK (true);

    -- Create policy for updating memberships (service role)
    CREATE POLICY "Service role can update memberships" ON memberships
        FOR UPDATE USING (true);

    -- Create policy for deleting memberships (service role)
    CREATE POLICY "Service role can delete memberships" ON memberships
        FOR DELETE USING (true);
END;
$$; 
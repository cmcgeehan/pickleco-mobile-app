-- Enable RLS on memberships table
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

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
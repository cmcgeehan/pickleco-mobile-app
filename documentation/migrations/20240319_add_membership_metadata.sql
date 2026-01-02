-- Add metadata and stripe_subscription_id columns to memberships table
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT; 
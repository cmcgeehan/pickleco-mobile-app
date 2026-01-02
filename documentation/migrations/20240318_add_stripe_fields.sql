-- Add Stripe fields to membership_types
ALTER TABLE membership_types
ADD COLUMN stripe_product_id TEXT;

-- Add Stripe fields to profiles
ALTER TABLE profiles
ADD COLUMN stripe_customer_id TEXT;

-- Add Stripe fields to memberships
ALTER TABLE memberships
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN status TEXT DEFAULT 'pending'; 
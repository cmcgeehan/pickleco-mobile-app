-- Insert Early Bird membership type
INSERT INTO membership_types (name, cost_mxn, description)
VALUES ('Early Bird', 2500, 'Early Bird membership with special pricing');

-- Note: After running this migration, you'll need to:
-- 1. Create a product in Stripe for the Early Bird membership
-- 2. Update this row with the Stripe product ID:
-- UPDATE membership_types SET stripe_product_id = 'prod_xyz...' WHERE name = 'Early Bird'; 
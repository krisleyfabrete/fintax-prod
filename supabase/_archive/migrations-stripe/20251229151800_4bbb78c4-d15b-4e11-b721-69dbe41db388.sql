
-- Allow any authenticated user to read PIX configuration settings
CREATE POLICY "Anyone can view pix settings"
ON admin_settings
FOR SELECT
USING (key IN ('pix_key', 'pix_name', 'pix_city', 'plan_prices'));

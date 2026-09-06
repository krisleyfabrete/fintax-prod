-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

-- Create separate policies for each operation with proper with_check
CREATE POLICY "Admins can view all coupons" 
ON public.coupons 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert coupons" 
ON public.coupons 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coupons" 
ON public.coupons 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete coupons" 
ON public.coupons 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));
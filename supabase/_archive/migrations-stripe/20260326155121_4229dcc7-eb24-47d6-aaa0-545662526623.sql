CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Allow users to delete their own pending PIX payments
CREATE POLICY "Users can delete own pending pix payments"
ON public.pix_payments
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');
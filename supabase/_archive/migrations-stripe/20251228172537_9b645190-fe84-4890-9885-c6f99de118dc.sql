-- Create enum for PIX payment status
CREATE TYPE public.pix_payment_status AS ENUM ('pending', 'confirmed', 'rejected');

-- Create table for PIX payments
CREATE TABLE public.pix_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    plan TEXT NOT NULL,
    interval TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    coupon_code TEXT,
    pix_code TEXT NOT NULL,
    status pix_payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

-- Users can insert their own payments
CREATE POLICY "Users can insert own pix payments"
ON public.pix_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own payments
CREATE POLICY "Users can view own pix payments"
ON public.pix_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all pix payments"
ON public.pix_payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all payments
CREATE POLICY "Admins can update all pix payments"
ON public.pix_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_pix_payments_status ON public.pix_payments(status);
CREATE INDEX idx_pix_payments_user_id ON public.pix_payments(user_id);
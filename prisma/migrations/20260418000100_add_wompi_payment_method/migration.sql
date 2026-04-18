-- Add WOMPI as a valid payment method
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WOMPI';

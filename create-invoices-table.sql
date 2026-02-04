-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- draft, open, paid, uncollectible, void
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups by user_id
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
-- Create index for stripe_invoice_id
CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
-- Create index for subscription_id
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
-- Create index for status
CREATE INDEX idx_invoices_status ON invoices(status);

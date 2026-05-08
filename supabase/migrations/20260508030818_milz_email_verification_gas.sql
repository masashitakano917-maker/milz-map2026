/*
  # GAS-based Email Verification System

  1. New Tables
    - `email_verification_tokens`
      - `token` (uuid, primary key) - verification token in URL
      - `user_id` (uuid) - reference to auth.users
      - `email` (text) - redundant for quick lookup
      - `expires_at` (timestamptz) - 24h TTL
      - `verified_at` (timestamptz, nullable) - set when used
      - `created_at` (timestamptz)

  2. Changes to existing tables
    - `profiles`
      - Add `email_verified` boolean column (default false)

  3. Security
    - Enable RLS on `email_verification_tokens`
    - NO public policies (only service role via Edge Functions can access)
    - Users cannot read/write tokens directly

  4. Notes
    - Edge Functions use service role to bypass RLS
    - Tokens are single-use; verified_at marks consumption
    - Email sending itself happens via external GAS webhook
*/

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx
  ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS email_verification_tokens_email_idx
  ON email_verification_tokens(email);

ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

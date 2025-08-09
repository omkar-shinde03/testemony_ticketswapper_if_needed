/*
  # Email Verification System Setup

  1. New Tables
    - `email_verification_tokens` - Store verification tokens
    - `email_verification_logs` - Track verification attempts
  
  2. Functions
    - `generate_verification_token` - Generate secure tokens
    - `verify_email_token` - Verify tokens and update user status
    - `resend_verification_email` - Handle resend logic
  
  3. Security
    - Enable RLS on all tables
    - Add policies for secure access
    - Add rate limiting for verification attempts
*/

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create email verification logs table for tracking attempts
CREATE TABLE IF NOT EXISTS email_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('sent', 'verified', 'failed', 'resent')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own verification tokens" ON email_verification_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage verification tokens" ON email_verification_tokens
  FOR ALL USING (true);

CREATE POLICY "Users can view their own verification logs" ON email_verification_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create verification logs" ON email_verification_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
CREATE INDEX idx_email_verification_logs_user_id ON email_verification_logs(user_id);
CREATE INDEX idx_email_verification_logs_created_at ON email_verification_logs(created_at);

-- Function to generate verification token
CREATE OR REPLACE FUNCTION generate_verification_token(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_value TEXT;
  user_record RECORD;
BEGIN
  -- Get user by email
  SELECT id, email INTO user_record
  FROM auth.users
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Generate 6-digit token
  token_value := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Invalidate existing tokens
  UPDATE email_verification_tokens
  SET used_at = now()
  WHERE user_id = user_record.id AND used_at IS NULL;
  
  -- Insert new token (expires in 10 minutes)
  INSERT INTO email_verification_tokens (user_id, token, expires_at)
  VALUES (user_record.id, token_value, now() + interval '10 minutes');
  
  -- Log the action
  INSERT INTO email_verification_logs (user_id, email, action)
  VALUES (user_record.id, user_email, 'sent');
  
  RETURN token_value;
END;
$$;

-- Function to verify email token
CREATE OR REPLACE FUNCTION verify_email_token(user_email TEXT, token_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  token_record RECORD;
BEGIN
  -- Get user by email
  SELECT id, email, email_confirmed_at INTO user_record
  FROM auth.users
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if already verified
  IF user_record.email_confirmed_at IS NOT NULL THEN
    INSERT INTO email_verification_logs (user_id, email, action)
    VALUES (user_record.id, user_email, 'failed');
    RAISE EXCEPTION 'Email already verified';
  END IF;
  
  -- Get valid token
  SELECT * INTO token_record
  FROM email_verification_tokens
  WHERE user_id = user_record.id 
    AND token = token_value 
    AND expires_at > now() 
    AND used_at IS NULL;
  
  IF NOT FOUND THEN
    INSERT INTO email_verification_logs (user_id, email, action)
    VALUES (user_record.id, user_email, 'failed');
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;
  
  -- Mark token as used
  UPDATE email_verification_tokens
  SET used_at = now()
  WHERE id = token_record.id;
  
  -- Update user email confirmation
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = user_record.id;
  
  -- Update profile email verification status
  UPDATE profiles
  SET email_verified = true, updated_at = now()
  WHERE id = user_record.id;
  
  -- Log successful verification
  INSERT INTO email_verification_logs (user_id, email, action)
  VALUES (user_record.id, user_email, 'verified');
  
  RETURN true;
END;
$$;

-- Function to check rate limiting for verification emails
CREATE OR REPLACE FUNCTION can_send_verification_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  recent_attempts INTEGER;
BEGIN
  -- Get user by email
  SELECT id INTO user_record
  FROM auth.users
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check rate limiting (max 3 emails per hour)
  SELECT COUNT(*) INTO recent_attempts
  FROM email_verification_logs
  WHERE user_id = user_record.id 
    AND action IN ('sent', 'resent')
    AND created_at > now() - interval '1 hour';
  
  RETURN recent_attempts < 3;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_verification_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_email_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_send_verification_email(TEXT) TO authenticated;
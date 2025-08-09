import { supabase } from "@/integrations/supabase/client";

/**
 * Check if current user's email is verified
 * @returns {Promise<boolean>}
 */
export const isEmailVerified = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }

    // Check both auth.users.email_confirmed_at and profiles.email_verified
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', user.id)
      .single();

    // Return true if either auth confirmation or profile verification is true
    return !!(user.email_confirmed_at || profile?.email_verified);
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
  }
};

/**
 * Send verification email to current user
 * @param {boolean} isResend - Whether this is a resend request
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendVerificationEmail = async (isResend = false) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    if (user.email_confirmed_at) {
      throw new Error("Email is already verified");
    }

    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: {
        email: user.email,
        isResend
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: data.message,
      token: data.token // Only available in development
    };

  } catch (error) {
    console.error("Send verification email error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify email using token
 * @param {string} email - User email
 * @param {string} token - Verification token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyEmailToken = async (email, token) => {
  try {
    if (!email || !token) {
      throw new Error("Email and token are required");
    }

    const { data, error } = await supabase.functions.invoke('verify-email-token', {
      body: {
        email,
        token
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: data.verified,
      message: data.message
    };

  } catch (error) {
    console.error("Verify email token error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Resend verification email using Supabase auth
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resendVerificationEmail = async () => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup'
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "Verification email resent successfully"
    };

  } catch (error) {
    console.error("Resend verification email error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get verification status and logs for current user
 * @returns {Promise<{verified: boolean, logs: Array, error?: string}>}
 */
export const getVerificationStatus = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const verified = await isEmailVerified();

    // Get verification logs
    const { data: logs, error: logsError } = await supabase
      .from('email_verification_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error("Error fetching verification logs:", logsError);
    }

    return {
      verified,
      logs: logs || [],
      email: user.email,
      emailConfirmedAt: user.email_confirmed_at
    };

  } catch (error) {
    console.error("Get verification status error:", error);
    return {
      verified: false,
      logs: [],
      error: error.message
    };
  }
};

import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "omstemper1@gmail.com";
const ADMIN_PASSWORD = "redlily@3B";

/**
 * @param {string} email
 * @param {string} phone
 * @returns {Promise<{ exists: boolean; type: string | null }>}
 */
export const checkExistingAccount = async (email, phone) => {
  try {
    // Check for existing phone number in profiles table
    const { data: phoneData, error: phoneError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();
      
    if (phoneData && !phoneError) {
      return { exists: true, type: 'phone' };
    }

    // Check for existing email in profiles table
    // Since email is stored in auth.users, we'll check if there's a profile with this email
    const { data: emailData, error: emailError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();
      
    if (emailData && !emailError) {
      return { exists: true, type: 'email' };
    }

    // If no existing accounts found
    return { exists: false, type: null };
  } catch (error) {
    console.error("Error checking existing account:", error);
    return { exists: false, type: null };
  }
};

/**
 * @param {string} emailOrPhone
 * @param {string} password
 * @returns {Promise<{ isAdmin: boolean }>}
 */
export const handleUserLogin = async (emailOrPhone, password) => {
  let loginEmail = emailOrPhone;

  // Check if the input is a phone number
  const isPhoneNumber = /^[\+]?[0-9\s\-\(\)]+$/.test(emailOrPhone.trim());
  
  if (isPhoneNumber) {
    // Find user by phone number in profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', emailOrPhone.trim())
      .single();

    if (profileError || !profileData) {
      throw new Error("No account found with this phone number.");
    }

    // Since we can't get the email from user ID on client side,
    // we'll need to store email in profiles table or use a different approach
    // For now, we'll throw an error suggesting email login
    throw new Error("Please use your email address to log in instead of phone number.");
  }

  // Special handling for admin login
  if (loginEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (loginError) throw loginError;
    return { isAdmin: true };
  }

  // Regular user login
  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: password,
  });

  if (loginError) {
    // Provide more specific error messages
    if (loginError.message.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    }
    throw loginError;
  }
  
  return { isAdmin: false };
};

/**
 * @param {Object} signupData
 * @param {string} signupData.email
 * @param {string} signupData.password
 * @param {string} signupData.fullName
 * @param {string} signupData.phone
 * @param {boolean} signupData.isAdmin
 * @returns {Promise<boolean>}
 */
export const handleUserSignup = async (signupData) => {
  // Check if trying to create admin account with wrong email
  if (signupData.isAdmin && signupData.email !== ADMIN_EMAIL) {
    throw new Error("Admin accounts can only be created with the authorized email address.");
  }

  // Check for existing accounts
  const accountCheck = await checkExistingAccount(signupData.email, signupData.phone);
  
  if (accountCheck.exists) {
    const message = accountCheck.type === 'email' 
      ? "An account with this email already exists. Please log in instead."
      : "An account with this phone number already exists. Please log in instead.";
    
    throw new Error(message);
  }

  // For admin signup, use the fixed password
  const signupPassword = signupData.isAdmin ? ADMIN_PASSWORD : signupData.password;

  const { data: signupResult, error: signupError } = await supabase.auth.signUp({
    email: signupData.email,
    password: signupPassword,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: {
        full_name: signupData.fullName,
        phone: signupData.phone,
        user_type: signupData.isAdmin ? 'admin' : 'user'
      }
    }
  });

  // Handle different signup scenarios
  if (signupError) {
    // Handle rate limiting specifically
    if (signupError.message && signupError.message.includes('rate limit')) {
      throw new Error("Too many signup attempts. Please wait a moment and try again.");
    }
    
    // Handle existing user
    if (signupError.message && signupError.message.includes('already registered')) {
      throw new Error("An account with this email already exists. Please log in instead.");
    }
    
    throw signupError;
  }

  // Check if user already exists (Supabase returns user object even if they already exist)
  if (signupResult.user && !signupResult.user.email_confirmed_at && signupResult.user.created_at) {
    const createdAt = new Date(signupResult.user.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();
    
    // If user was created more than 1 minute ago, they likely already existed
    if (timeDiff > 60000) {
      throw new Error("An account with this email already exists. Please log in instead.");
    }
  }

  return signupData.isAdmin;
};

/**
 * Check if user's email is verified
 * @returns {Promise<boolean>}
 */
export const isEmailVerified = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email_confirmed_at !== null;
};

/**
 * Send email verification to current user
 * @returns {Promise<void>}
 */
export const sendEmailVerification = async () => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
  });
  
  if (error) throw error;
};

export { ADMIN_EMAIL, ADMIN_PASSWORD };

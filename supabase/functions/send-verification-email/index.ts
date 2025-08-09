import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  isResend?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email, isResend = false }: VerificationEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Check rate limiting
    const { data: canSend, error: rateLimitError } = await supabaseAdmin
      .rpc('can_send_verification_email', { user_email: email });

    if (rateLimitError) {
      throw new Error("Rate limit check failed");
    }

    if (!canSend) {
      throw new Error("Too many verification emails sent. Please wait before requesting another.");
    }

    // Generate verification token
    const { data: token, error: tokenError } = await supabaseAdmin
      .rpc('generate_verification_token', { user_email: email });

    if (tokenError) {
      throw new Error(`Token generation failed: ${tokenError.message}`);
    }

    // Get user details for personalization
    const { data: user, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .eq('email', email)
      .single();

    if (userError) {
      console.error("User fetch error:", userError);
    }

    const userName = user?.raw_user_meta_data?.full_name || email.split('@')[0];

    // Send email using the send-email function
    const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: email,
        template: 'verification',
        templateData: {
          name: userName,
          verificationCode: token,
          verificationUrl: `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/verify-email?token=${token}&email=${encodeURIComponent(email)}`,
          dashboardUrl: `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/dashboard`,
          isResend: isResend
        }
      }
    });

    if (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the request if email fails, just log it
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isResend ? "Verification email resent successfully" : "Verification email sent successfully",
        token: Deno.env.get('NODE_ENV') === 'development' ? token : undefined // Only return token in development
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Send verification email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
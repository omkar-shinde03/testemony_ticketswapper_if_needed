import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyTokenRequest {
  email: string;
  token: string;
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

    const { email, token }: VerifyTokenRequest = await req.json();

    if (!email || !token) {
      throw new Error("Email and token are required");
    }

    // Verify the token using our database function
    const { data: isValid, error: verifyError } = await supabaseAdmin
      .rpc('verify_email_token', { 
        user_email: email, 
        token_value: token 
      });

    if (verifyError) {
      throw new Error(verifyError.message);
    }

    if (!isValid) {
      throw new Error("Token verification failed");
    }

    // Get user details after verification
    const { data: user, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .eq('email', email)
      .single();

    if (userError) {
      console.error("User fetch error:", userError);
    }

    // Send welcome notification
    if (user) {
      await supabaseAdmin.functions.invoke('send-notification', {
        body: {
          userId: user.id,
          title: 'Email Verified Successfully!',
          message: 'Your email has been verified. You can now buy and sell tickets on the platform.',
          type: 'success',
          sendEmail: false
        }
      });

      // Send welcome email
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: email,
          template: 'welcome',
          templateData: {
            name: user.raw_user_meta_data?.full_name || email.split('@')[0],
            dashboardUrl: `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/dashboard`
          }
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email verified successfully",
        verified: true
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Email verification error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        verified: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
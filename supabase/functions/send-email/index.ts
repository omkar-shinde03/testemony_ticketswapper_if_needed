import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: 'verification' | 'ticket_confirmation' | 'kyc_approved' | 'kyc_rejected';
  templateData?: Record<string, any>;
}

const getEmailTemplate = (template: string, data: Record<string, any>) => {
  switch (template) {
    case 'verification':
      return {
        subject: 'Verify Your Email - Ticket Marketplace',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">TicketSwapper</h1>
              <h2 style="color: #374151; margin: 0;">Verify Your Email Address</h2>
            </div>
            <p>Hello ${data.name || 'User'},</p>
            <p>${data.isResend ? 'Here is your new verification code:' : 'Thank you for signing up! Here is your verification code:'}</p>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; font-family: monospace;">
                ${data.verificationCode}
              </div>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                This code expires in 10 minutes
              </p>
            </div>
            
            <p>Alternatively, you can click the button below to verify automatically:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Security Note:</strong> Never share this code with anyone. Our team will never ask for your verification code.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't create an account with us, please ignore this email.
            </p>
            <p>Best regards,<br>Ticket Marketplace Team</p>
          </div>
        `
      };
    
    case 'welcome':
      return {
        subject: 'Welcome to TicketSwapper!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">🎉 Welcome to TicketSwapper!</h1>
            </div>
            <p>Hello ${data.name},</p>
            <p>Welcome to India's most trusted bus ticket marketplace! Your email has been verified and your account is now active.</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">What you can do now:</h3>
              <ul style="color: #1e40af; margin: 10px 0;">
                <li>🎫 Browse and purchase verified bus tickets</li>
                <li>💰 List your own tickets for sale</li>
                <li>💬 Message other users securely</li>
                <li>🛡️ Complete KYC for enhanced features</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Start Using TicketSwapper
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Need help? Contact us at support@ticketswapper.com
            </p>
            <p>Happy travels!<br>The TicketSwapper Team</p>
          </div>
        `
      };
    
    case 'ticket_confirmation':
      return {
        subject: 'Ticket Purchase Confirmation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Ticket Purchase Confirmed!</h2>
            <p>Hello ${data.buyerName},</p>
            <p>Your ticket purchase has been confirmed. Here are the details:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Journey Details</h3>
              <p><strong>Route:</strong> ${data.fromLocation} → ${data.toLocation}</p>
              <p><strong>Date:</strong> ${data.departureDate}</p>
              <p><strong>Time:</strong> ${data.departureTime}</p>
              <p><strong>Bus Operator:</strong> ${data.busOperator}</p>
              <p><strong>Seat Number:</strong> ${data.seatNumber}</p>
              <p><strong>PNR:</strong> ${data.pnrNumber}</p>
              <p><strong>Amount Paid:</strong> ₹${data.amount}</p>
            </div>
            <p>The seller will contact you soon with further details.</p>
            <p>Best regards,<br>Ticket Marketplace Team</p>
          </div>
        `
      };
    
    case 'kyc_approved':
      return {
        subject: 'KYC Verification Approved',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">KYC Verification Approved!</h2>
            <p>Hello ${data.name},</p>
            <p>Congratulations! Your KYC verification has been approved.</p>
            <p>You can now:</p>
            <ul>
              <li>List tickets for sale</li>
              <li>Purchase tickets from other users</li>
              <li>Access all premium features</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            <p>Best regards,<br>Ticket Marketplace Team</p>
          </div>
        `
      };
    
    case 'kyc_rejected':
      return {
        subject: 'KYC Verification - Additional Information Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">KYC Verification - Action Required</h2>
            <p>Hello ${data.name},</p>
            <p>We need some additional information to complete your KYC verification.</p>
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>Reason for rejection:</h3>
              <p>${data.reason || 'Please resubmit your documents with clearer images.'}</p>
            </div>
            <p>Please resubmit your documents through your dashboard.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Resubmit Documents
              </a>
            </div>
            <p>Best regards,<br>Ticket Marketplace Team</p>
          </div>
        `
      };
    
    default:
      return { subject: 'Notification', html: data.html || data.text || '' };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const emailRequest: EmailRequest = await req.json()

    // Get email content
    let emailContent;
    if (emailRequest.template && emailRequest.templateData) {
      emailContent = getEmailTemplate(emailRequest.template, emailRequest.templateData);
    } else {
      emailContent = {
        subject: emailRequest.subject,
        html: emailRequest.html || emailRequest.text || ''
      };
    }

    // Log the email for debugging
    console.log('Email would be sent:', {
      to: emailRequest.to,
      subject: emailContent.subject,
      html: emailContent.html
    });

    // Store email in database for tracking
    await supabaseClient
      .from('email_logs')
      .insert({
        recipient: emailRequest.to,
        subject: emailContent.subject,
        template: emailRequest.template,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    // In production, you can integrate with email services:
    // Example with Resend, SendGrid, or other email providers
    /*
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@ticketmarketplace.com',
        to: emailRequest.to,
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });
    
    if (!emailResponse.ok) {
      throw new Error('Failed to send email');
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email queued successfully',
        emailContent // For debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Email function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
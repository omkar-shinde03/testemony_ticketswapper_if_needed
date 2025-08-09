import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyEmailToken, sendVerificationEmail, getVerificationStatus } from "@/utils/emailVerification";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const { toast } = useToast();

  const email = searchParams.get('email') || "";
  const tokenFromUrl = searchParams.get('token') || "";

  useEffect(() => {
    if (tokenFromUrl) {
      setVerificationCode(tokenFromUrl);
    }
    loadVerificationStatus();
  }, [tokenFromUrl]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const loadVerificationStatus = async () => {
    try {
      const status = await getVerificationStatus();
      setVerificationStatus(status);
      
      if (status.verified) {
        toast({
          title: "Email already verified",
          description: "Your email is already verified. Redirecting to dashboard...",
        });
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      console.error("Error loading verification status:", error);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please provide your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyEmailToken(email, verificationCode);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Email verified successfully!",
        description: "Your account has been activated. Redirecting to dashboard...",
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error("Verification error:", error);
      
      let errorMessage = "Invalid verification code. Please try again.";
      
      if (error.message.includes("expired")) {
        errorMessage = "Verification code has expired. Please request a new one.";
      } else if (error.message.includes("already verified")) {
        errorMessage = "This email has already been verified. Please try logging in.";
        setTimeout(() => navigate('/auth'), 2000);
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please provide your email address to resend verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    
    try {
      const result = await sendVerificationEmail(true);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Verification code sent",
        description: result.message,
      });

      setCountdown(60);
      setVerificationCode("");
      loadVerificationStatus();
    } catch (error) {
      console.error("Resend error:", error);
      toast({
        title: "Failed to resend code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (verificationStatus?.verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Email Already Verified</CardTitle>
            <CardDescription>
              Your email address has been verified successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            {email ? `Enter the code sent to ${email}` : "Enter your email and verification code"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rate limiting warning */}
          {verificationStatus?.logs?.length >= 2 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                You have {3 - verificationStatus.logs.length} verification attempts remaining this hour.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerifyCode} className="space-y-4">
            {!email && (
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    navigate(`/verify-email?email=${encodeURIComponent(newEmail)}`);
                  }}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                className="text-center text-lg tracking-widest"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) {
                    setVerificationCode(value);
                  }
                }}
                maxLength="6"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || verificationCode.length !== 6 || !email}
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            {countdown > 0 ? (
              <p className="text-sm text-gray-600">Resend code in {countdown}s</p>
            ) : (
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={isResending || !email || (verificationStatus?.logs?.length >= 3)}
                className="text-sm"
              >
                {isResending ? "Sending..." : "Resend verification code"}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="text-sm w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Button>
          </div>

          {/* Development debug info */}
          {import.meta.env.DEV && verificationStatus?.logs?.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-medium mb-2">Debug: Recent Attempts</h4>
              <div className="space-y-1">
                {verificationStatus.logs.slice(0, 3).map((log, index) => (
                  <div key={index} className="text-xs text-gray-600 flex justify-between">
                    <span>{log.action}</span>
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
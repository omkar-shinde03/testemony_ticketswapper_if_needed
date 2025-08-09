import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  sendVerificationEmail, 
  verifyEmailToken, 
  resendVerificationEmail,
  getVerificationStatus 
} from "@/utils/emailVerification";

const EmailVerification = ({ email, onVerified, onBack }) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isExpired, setIsExpired] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationLogs, setVerificationLogs] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setIsExpired(true);
    }
  }, [countdown]);

  const loadVerificationStatus = async () => {
    try {
      const status = await getVerificationStatus();
      setVerificationStatus(status);
      setVerificationLogs(status.logs || []);
      
      if (status.verified) {
        onVerified();
      }
    } catch (error) {
      console.error("Error loading verification status:", error);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (isExpired) {
      toast({
        title: "Code expired",
        description: "The verification code has expired. Please request a new one.",
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

      // Small delay to show the success message before redirecting
      setTimeout(() => {
        onVerified();
      }, 1000);
    } catch (error) {
      console.error("Verification error:", error);
      
      let errorMessage = "Invalid verification code. Please try again.";
      
      if (error.message) {
        if (error.message.includes("expired") || error.message.includes("Invalid or expired token")) {
          errorMessage = "Verification code has expired. Please request a new one.";
          setIsExpired(true);
        } else if (error.message.includes("invalid") || error.message.includes("Invalid")) {
          errorMessage = "Invalid verification code. Please check and try again.";
        } else if (error.message.includes("already been verified")) {
          errorMessage = "This email has already been verified. Please try logging in.";
        } else {
          errorMessage = error.message;
        }
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
      setIsExpired(false);
      setVerificationCode("");
      
      // Reload verification status
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Verify your email</h2>
        <p className="text-gray-600">
          We've sent a verification code to <br />
          <span className="font-medium">{email}</span>
        </p>
      </div>

      {/* Verification Status Alert */}
      {verificationStatus?.verified && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your email is already verified! You can proceed to the dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* Rate Limiting Alert */}
      {verificationLogs.length >= 3 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You've reached the maximum number of verification attempts for this hour. 
            Please wait before requesting another code.
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="Enter 6-digit code"
            className="text-center text-lg tracking-widest"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only allow digits
              if (value.length <= 6) {
                setVerificationCode(value);
              }
            }}
            maxLength="6"
            required
            disabled={verificationStatus?.verified}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || verificationCode.length !== 6 || isExpired || verificationStatus?.verified}
          size="lg"
        >
          {isLoading ? "Verifying..." : 
           verificationStatus?.verified ? "Already Verified" :
           isExpired ? "Code Expired" : "Verify Email"}
        </Button>
      </form>

      <div className="text-center space-y-4">
        <div className="text-sm text-gray-600">
          {isExpired ? (
            <span className="text-red-600 font-medium">Code expired! Please resend.</span>
          ) : (
            <>Didn't receive the code?{" "}</>
          )}
          {countdown > 0 ? (
            <span>Resend in {countdown}s</span>
          ) : (
            <button
              onClick={handleResendCode}
              disabled={isResending || verificationStatus?.verified || verificationLogs.length >= 3}
              className="text-blue-600 hover:underline font-medium"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-full"
          disabled={verificationStatus?.verified}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to signup
        </Button>
      </div>

      {/* Development Debug Info */}
      {import.meta.env.DEV && verificationLogs.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Verification Logs (Dev Only)</h4>
          <div className="space-y-1">
            {verificationLogs.slice(0, 5).map((log, index) => (
              <div key={index} className="text-xs text-gray-600 flex justify-between">
                <span>{log.action}</span>
                <span>{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailVerification;
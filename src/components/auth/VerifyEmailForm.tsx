import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, RefreshCw } from "lucide-react";
import { useAuth, useToast } from "../../hooks";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui";

export function VerifyEmailForm() {
  const navigate = useNavigate();
  const { user, verifyEmailCode, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError("");
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when complete
    if (newCode.every((digit) => digit) && index === 5) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (verificationCode: string) => {
    setIsLoading(true);
    setError("");
    
    try {
      const result = await verifyEmailCode(verificationCode);
      
      if (result.success) {
        toast.success("Email verified!", "Your account is now active");
        navigate("/dashboard");
      } else {
        setError(result.error || "Invalid code");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      toast.success("Code sent!", "Check your email for the new code");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      toast.error("Failed to resend", "Please try again later");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to{" "}
          <span className="font-medium text-text">{user?.email}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-center gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`h-14 w-12 rounded-lg border bg-surface text-center text-2xl font-bold text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                error ? "border-error" : "border-border"
              }`}
              disabled={isLoading}
            />
          ))}
        </div>
        
        {error && (
          <p className="mt-4 text-center text-sm text-error">{error}</p>
        )}
        
        <div className="mt-6 text-center">
          <p className="text-sm text-text-muted">
            Didn't receive the code?{" "}
            <button
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
            >
              {isResending && <RefreshCw className="h-3 w-3 animate-spin" />}
              Resend
            </button>
          </p>
        </div>
        
        <Button
          onClick={() => handleSubmit(code.join(""))}
          className="mt-6 w-full"
          isLoading={isLoading}
          disabled={code.some((digit) => !digit)}
        >
          Verify email
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, CheckCircle, Loader2, AlertCircle, LogIn } from "lucide-react";

export default function GuideLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle token validation on mount if token is present
  useEffect(() => {
    if (token) {
      validateTokenAndLogin(token);
    }
  }, [token]);

  const validateTokenAndLogin = async (magicToken: string) => {
    setIsValidatingToken(true);
    setError(null);

    try {
      // Mock API call - replace with actual tRPC mutation
      // const result = await validateMagicLink.mutateAsync({ token: magicToken });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock validation - in real implementation, this would validate the token
      // and set the session cookie/auth state
      const isValid = magicToken.length > 10; // Simple mock validation

      if (isValid) {
        // Set session/auth state here
        // redirect to guide dashboard
        router.push("/guide/assignments");
      } else {
        setError("Invalid or expired login link. Please request a new one.");
      }
    } catch (err) {
      setError("Failed to validate login link. Please try again.");
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Mock API call - replace with actual tRPC mutation
      // await requestMagicLink.mutateAsync({ email });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setRequestSent(true);
    } catch (err) {
      setError("Failed to send login link. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Token validation state
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Logging you in...
          </h2>
          <p className="text-gray-600">
            Please wait while we validate your login link.
          </p>
        </div>
      </div>
    );
  }

  // Success state after requesting access
  if (requestSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Check your email!
          </h2>
          <p className="text-gray-600 mb-4">
            We've sent a login link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Click the link in the email to access the guide portal. The link will
            expire in 15 minutes.
          </p>

          <button
            onClick={() => {
              setRequestSent(false);
              setEmail("");
            }}
            className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Need to use a different email?
          </button>
        </div>
      </div>
    );
  }

  // Default login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Guide Portal
          </h1>
          <p className="text-gray-600">
            Request a secure login link to access your assignments
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleRequestAccess} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="guide@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                disabled={isSubmitting}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Use the email address associated with your guide account
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending link...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Send Login Link
              </>
            )}
          </button>
        </form>

        {/* Info box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            How it works
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Enter your email and request a login link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Check your email for a secure login link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Click the link to access your assignments</span>
            </li>
          </ul>
        </div>

        {/* Support link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble?{" "}
            <a
              href="mailto:support@example.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

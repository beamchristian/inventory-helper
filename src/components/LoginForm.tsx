"use client";

import React, { useState, useTransition } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha"; // Import HCaptcha
import { loginwithCreds } from "@/actions/auth";
import AuthButton from "./AuthButton";

function LoginForm() {
  const [error, setError] = useState<string | undefined>();
  // NEW: Add state to hold the CAPTCHA token
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);

    // NEW: Check if the CAPTCHA was completed
    if (!captchaToken) {
      setError("Please complete the CAPTCHA before signing in.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginwithCreds(formData);

      if (result?.success) {
        // A full page refresh is a reliable way to update the session
        window.location.href = "/";
      } else if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className='flex items-center justify-center min-h-screen px-4'>
      <div className='w-full max-w-md p-8 space-y-6 bg-background-surface rounded-xl shadow-lg'>
        <h2 className='text-2xl font-bold text-center text-text-base'>
          Sign in to your account
        </h2>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Email and Password inputs remain the same */}
          <div>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-text-muted'
            >
              Email
            </label>
            <input
              type='email'
              placeholder='you@example.com'
              id='email'
              name='email'
              className='mt-1 block w-full px-3 py-2 bg-background border border-border-base rounded-md'
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-text-muted'
            >
              Password
            </label>
            <input
              type='password'
              placeholder='Password'
              name='password'
              id='password'
              className='mt-1 block w-full px-3 py-2 bg-background border border-border-base rounded-md'
              required
              disabled={isPending}
            />
          </div>

          <div className='flex justify-center'>
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
          <input type='hidden' name='captchaToken' value={captchaToken || ""} />

          {error && <p className='text-sm text-error'>{error}</p>}
          <AuthButton isPending={isPending} />
        </form>
      </div>
    </div>
  );
}

export default LoginForm;

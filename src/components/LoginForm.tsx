"use client";

import React, { useState, useTransition } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha"; // Import HCaptcha
import { loginwithCreds } from "@/actions/auth";
import AuthButton from "./AuthButton";
import { Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

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
    <div className='w-full max-w-sm'>
      <div className='mb-6 flex flex-col items-center text-center'>
        <span className='mb-4 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
          <Boxes className='size-5' />
        </span>
        <h1 className='text-xl font-semibold tracking-tight text-foreground'>
          Sign in to Inventory Helper
        </h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Enter your email and password to continue.
        </p>
      </div>
      <Card>
        <CardContent className='p-6'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <Label htmlFor='email'>Email</Label>
              <Input
                type='email'
                placeholder='you@example.com'
                id='email'
                name='email'
                autoComplete='email'
                required
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor='password'>Password</Label>
              <Input
                type='password'
                name='password'
                id='password'
                autoComplete='current-password'
                required
                disabled={isPending}
              />
            </div>

            <div className='flex justify-center overflow-hidden pt-1'>
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
            <input
              type='hidden'
              name='captchaToken'
              value={captchaToken || ""}
            />

            {error && (
              <p className='rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                {error}
              </p>
            )}
            <AuthButton isPending={isPending} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginForm;

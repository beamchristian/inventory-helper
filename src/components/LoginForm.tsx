"use client";

import React, { useState, useTransition } from "react";
// We don't even need the router here anymore for the redirect
import { loginwithCreds } from "@/actions/auth";
import AuthButton from "./AuthButton"; // Assuming this is your submit button

function LoginForm() {
  const [error, setError] = useState<string | undefined>();
  // useTransition is helpful to disable inputs while the async action is running
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginwithCreds(formData);

      if (result.success) {
        window.location.href = "/";
      } else {
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
              className='mt-1 block w-full px-3 py-2 bg-background border border-border-base rounded-md shadow-sm placeholder-text-muted text-text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
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
              className='mt-1 block w-full px-3 py-2 bg-background border border-border-base rounded-md shadow-sm placeholder-text-muted text-text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
              required
              disabled={isPending}
            />
          </div>

          {error && <p className='text-sm text-error'>{error}</p>}

          {/* You'll need to pass the pending state to your button */}
          <AuthButton isPending={isPending} />
        </form>
      </div>
    </div>
  );
}

export default LoginForm;

// You would also need a small change to AuthButton to accept the prop
// since useFormStatus won't work with this onSubmit pattern.
/*
// Example AuthButton.tsx
"use client";

export default function AuthButton({ isPending }: { isPending: boolean }) {
  return (
    <button
      type='submit'
      disabled={isPending}
      className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50'
    >
      {isPending ? "Signing In..." : "Sign In"}
    </button>
  );
}
*/

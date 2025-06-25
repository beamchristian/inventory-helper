"use client";

import React from "react";
import { useActionState } from "react"; // You must import this hook
import AuthButton from "./AuthButton";
import { loginwithCreds, ActionState } from "@/actions/auth"; // Import the state type too

function LoginForm() {
  // 1. Define the initial state for your form.
  const initialState: ActionState = { error: undefined };

  // 2. Use the hook. It takes your server action and the initial state.
  // It returns the current state and a new 'formAction' to pass to the form.
  const [state, formAction] = useActionState(loginwithCreds, initialState);

  return (
    // We'll wrap the form in a container that centers it on the page.
    // This gives a much cleaner look on desktop screens.
    <div className='flex items-center justify-center min-h-screen px-4'>
      <div className='w-full max-w-md p-8 space-y-6 bg-background-surface rounded-xl shadow-lg'>
        <h2 className='text-2xl font-bold text-center text-text-base'>
          Sign in to your account
        </h2>

        {/* 3. Pass 'formAction' (from the hook) to the action prop, NOT 'loginwithCreds' */}
        <form action={formAction} className='space-y-6'>
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
              name='email' // The `name` attribute is required for FormData
              className='mt-1 block w-full px-3 py-2 bg-background border border-border-base rounded-md shadow-sm placeholder-text-muted text-text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
              required
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
              name='password' // The `name` attribute is required
              id='password'
              className='mt-1 block w-full px-3 py-2 bg-background border border-border-base rounded-md shadow-sm placeholder-text-muted text-text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
              required
            />
          </div>

          {/* 4. You can now read the error from the 'state' object */}
          {state?.error && (
            <p className='text-sm text-error'>{state.error}</p>
          )}

          <AuthButton />
        </form>
      </div>
    </div>
  );
}

export default LoginForm;

// src/app/auth/sign-up/page.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false); // New state variable
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSignUpSuccess(false); // Reset on new attempt

    const { error } = await supabase.auth.signUp({
      email,
      password,
      // You can add redirectTo: 'http://localhost:3000/auth/callback' here if you want to use it for email confirmation flow
    });

    if (error) {
      setError(error.message);
    } else {
      setSignUpSuccess(true); // Indicate success, but not necessarily logged in
      // Optionally, if not using email confirmation or for immediate login if enabled
      // router.push('/');
    }
    setLoading(false);
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      <div className='bg-white p-8 rounded shadow-md w-full max-w-md'>
        <h1 className='text-2xl font-bold mb-6 text-center'>Sign Up</h1>
        {signUpSuccess ? ( // Display success message after sign up
          <div className='text-center text-green-600 mb-4'>
            <p className='font-semibold'>Sign up successful!</p>
            <p>Please check your email to confirm your account and log in.</p>
            <button
              onClick={() => router.push("/auth/sign-in")}
              className='mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignUp}>
            <div className='mb-4'>
              <label
                htmlFor='email'
                className='block text-gray-700 text-sm font-bold mb-2'
              >
                Email:
              </label>
              <input
                type='email'
                id='email'
                className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className='mb-6'>
              <label
                htmlFor='password'
                className='block text-gray-700 text-sm font-bold mb-2'
              >
                Password:
              </label>
              <input
                type='password'
                id='password'
                className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className='text-red-500 text-xs italic mb-4'>{error}</p>
            )}
            <div className='flex items-center justify-between'>
              <button
                type='submit'
                className='bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </button>
              <a
                href='/auth/sign-in'
                className='inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-800'
              >
                Already have an account? Sign In
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

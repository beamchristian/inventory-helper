import React from "react";
import { useFormStatus } from "react-dom";

function AuthButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      type='submit'
      className='w-full bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50'
    >
      {pending ? "Loading..." : "Sign In"}
    </button>
  );
}

export default AuthButton;

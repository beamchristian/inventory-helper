"use client";

function AuthButton({ isPending }: { isPending: boolean }) {
  return (
    <button
      // 3. Use the 'isPending' prop to set the disabled state.
      disabled={isPending}
      type='submit'
      className='w-full bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50'
    >
      {/* 4. Use the 'isPending' prop for the button text. */}
      {isPending ? "Signing In..." : "Sign In"}
    </button>
  );
}

export default AuthButton;

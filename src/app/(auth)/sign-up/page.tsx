// import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";

const Page = async () => {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className='w-full max-w-sm mx-auto space-y-6'>
      {/* Explicitly apply text color from theme */}
      <h1 className='text-2xl font-bold text-center mb-6 text-card-foreground'>
        Sign In
      </h1>{" "}
      {/* or text-foreground */}
      <div className='relative'>
        <div className='absolute inset-0 flex items-center mb-7'>
          {/* Apply border color from theme */}
          <span className='w-full border-t border-border' />
        </div>
        <div className='relative flex justify-center text-sm'>
          {/* Ensure bg-background is present for the "cut-out" effect */}
          <span className='px-2 mt-4 text-muted-foreground'>
            Enter Email Below
          </span>
        </div>
      </div>
      {/* Email/Password Sign Up */}
      {/* <form
        className='space-y-4'
        action={async (formData: FormData) => {
          "use server";
          const res = await signUp(formData);
          if (res.success) {
            redirect("/sign-in");
          }
        }}
      >
        <Input
          name='email'
          placeholder='Email'
          type='email'
          required
          autoComplete='email'
        />
        <Input
          name='password'
          placeholder='Password'
          type='password'
          required
          autoComplete='new-password'
        />
        <Button className='w-full' type='submit'>
          Sign Up
        </Button>
      </form> */}
      <div className='text-center'>
        <Button asChild variant='link'>
          <Link
            href='/auth
          /sign-in'
          >
            Already have an account? Sign in
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Page;

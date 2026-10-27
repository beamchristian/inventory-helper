import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

const SignInPage = async () => {
  const session = await auth();
  if (session) {
    // If the user is already signed in, redirect them to the homepage.
    redirect("/");
  }

  return (
    <div className='flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12'>
      <LoginForm />
    </div>
  );
};

export default SignInPage;

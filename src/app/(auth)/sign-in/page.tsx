import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "@/components/LoginForm";

const SignInPage = async () => {
  const session = await auth();
  if (session) {
    // If the user is already signed in, redirect them to the homepage.
    redirect("/");
  }

  return (
    <div className='w-full flex mt-20 justify-center'>
      <section className='flex flex-col w-[400px]'>
        <LoginForm />
      </section>
    </div>
  );
};

export default SignInPage;

"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function AuthButton({ isPending }: { isPending: boolean }) {
  return (
    <Button disabled={isPending} type='submit' className='w-full'>
      {isPending && <Loader2 className='animate-spin' />}
      {isPending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export default AuthButton;

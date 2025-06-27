"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth"; // Import the specific error type
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";

// Define the shape of the state your action will manage
export interface ActionState {
  error?: string;
}

export const login = async (provider: string) => {
  await signIn(provider, { redirectTo: "/" });
  revalidatePath("/");
};

export const logout = async () => {
  await signOut({ redirectTo: "/" });
  revalidatePath("/");
};

// The signature is updated to accept the previous state and the form data
export const loginwithCreds = async (
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> => {
  // Basic validation
  if (!formData.get("email") || !formData.get("password")) {
    return { error: "Email and password are required." };
  }

  try {
    // signIn will throw a RedirectError on success, which we want to allow.
    // It will also throw an AuthError on failure, which we handle.
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirectTo: "/",
    });
    // This part is normally not reached on success because signIn redirects.
    return {};
  } catch (error) {
    // The redirect error should be re-thrown to be handled by Next.js
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "An unexpected authentication error occurred." };
      }
    }
    // If the error is not an AuthError, it's unexpected, so we re-throw it
    // to be caught by the nearest error boundary.
    throw error;
  }
};

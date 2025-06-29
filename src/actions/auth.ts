"use server";

import { signIn, signOut } from "@/lib/auth"; // Assuming this points to your auth.ts
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

// 1. Update the state shape to include a success flag.
export interface ActionState {
  error?: string;
  success?: boolean;
}

// These actions can remain as they are if you use them elsewhere
export const login = async (provider: string) => {
  await signIn(provider, { redirectTo: "/" });
  revalidatePath("/");
};

export const logout = async () => {
  await signOut({ redirectTo: "/" });
  revalidatePath("/");
};

// 2. Update the loginwithCreds function signature and logic.
// It no longer needs prevState and will not handle redirection itself.
export const loginwithCreds = async (
  formData: FormData
): Promise<ActionState> => {
  try {
    // We pass the redirectTo: false option here. This is crucial.
    // It tells NextAuth to return the result of the login attempt
    // instead of throwing a redirect error.
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirect: false,
    });

    // If signIn completes without throwing an error, login was successful.
    return { success: true };
  } catch (error) {
    // We only handle authentication errors here.
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "An unexpected authentication error occurred." };
      }
    }
    // For any other type of error, we re-throw it.
    throw error;
  }
};

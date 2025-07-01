"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

export interface ActionState {
  error?: string;
  success?: boolean;
}

// These actions can remain as they are
export const login = async (provider: string) => {
  await signIn(provider, { redirectTo: "/" });
  revalidatePath("/");
};

export const logout = async () => {
  await signOut({ redirectTo: "/" });
  revalidatePath("/");
};

/**
 * Logs in a user with credentials after validating their CAPTCHA token.
 */
export const loginwithCreds = async (
  formData: FormData
): Promise<ActionState> => {
  // NEW: Extract the captcha token from the form data
  const captchaToken = formData.get("captchaToken") as string;

  if (!captchaToken) {
    return { error: "CAPTCHA not completed. Please try again." };
  }

  // --- NEW: Server-side CAPTCHA Validation ---
  try {
    const params = new URLSearchParams();
    params.append("secret", process.env.HCAPTCHA_SECRET_KEY!);
    params.append("response", captchaToken);

    const captchaResponse = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      body: params,
    });

    const captchaData = await captchaResponse.json();

    if (!captchaData.success) {
      console.error("CAPTCHA verification failed:", captchaData["error-codes"]);
      return { error: "Invalid CAPTCHA. Please try again." };
    }
  } catch (error) {
    console.error("Server-side CAPTCHA verification error:", error);
    return { error: "Could not verify CAPTCHA." };
  }
  // --- END: CAPTCHA Validation ---

  // If CAPTCHA is valid, proceed with NextAuth sign-in
  try {
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirect: false, // This is correct, it allows us to handle the result here
    });

    // If signIn completes without an error, the login was successful.
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "An unexpected authentication error occurred." };
      }
    }
    // For any other non-authentication error, re-throw it
    throw error;
  }
};

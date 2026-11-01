export const accessMessage =
  "This email does not have access to this private Afield app yet. Use an approved email, or ask the app owner to add this address before signing in or creating an account.";

export function authFailure(
  error: { code?: string; status?: number },
  action: string,
) {
  if (error.status === 429 || error.code?.includes("rate_limit"))
    return "Too many attempts. Please wait a few minutes before trying again.";
  switch (error.code) {
    case "invalid_credentials":
      return "The email or password is incorrect. Check both and try again. New to Afield? Choose Create personal account below. If you joined with Google, use Continue with Google, or choose Forgot password to set a password.";
    case "email_not_confirmed":
      return "Please confirm your email first. Open the verification link sent when you signed up, then return to sign in. Check your spam folder too.";
    case "user_already_exists":
    case "email_exists":
      return "An account already uses this email. Choose Sign in below, Continue with Google, or Forgot password.";
    case "weak_password":
      return "Choose a stronger password with at least 12 characters, then try again.";
    case "signup_disabled":
      return "New accounts are currently disabled. Ask the app owner to enable sign-up, or sign in with your existing account.";
    default:
      return action === "signup"
        ? "Your account could not be created right now. Please try again later. If you already have an account, choose Sign in or Forgot password below."
        : action === "reset"
          ? "The recovery email could not be sent. Please try again in a few minutes."
          : "Sign-in could not complete right now. Please try again. You can also use Continue with Google or Forgot password.";
  }
}

export function callbackMessage(reason: string | null) {
  if (!reason) return "";
  if (reason === "access_required") return accessMessage;
  if (reason === "access_denied")
    return "Google sign-in was cancelled or permission was declined. Choose Continue with Google to try again, or use email and password.";
  if (reason === "session_expired")
    return "The sign-in link expired or could not be matched to this browser. Start sign-in again here and finish in the same browser, using the same address (localhost or 127.0.0.1).";
  if (reason === "access_check_failed")
    return "You signed in, but Afield could not confirm your app access. Ask the app owner to check the account’s access settings, then try again.";
  return "Sign-in could not complete. Choose Continue with Google to try again, or use email and password. If this keeps happening, ask the app owner to check sign-in settings.";
}

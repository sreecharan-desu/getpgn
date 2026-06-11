import { toast as sonnerToast } from "sonner";

/** App-wide toast helpers — consistent, minimal, no sign-in noise. */
export const appToast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, description ? { description } : undefined),
  error: (message: string, description?: string) =>
    sonnerToast.error(message, description ? { description } : undefined),
  info: (message: string, description?: string) =>
    sonnerToast.info(message, description ? { description } : undefined),
  dismiss: () => sonnerToast.dismiss(),
};

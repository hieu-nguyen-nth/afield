export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retryable = false,
  ) {
    super(message);
  }
}
export function errorBody(e: unknown) {
  if (e instanceof AppError)
    return {
      error: { code: e.code, message: e.message, retryable: e.retryable },
    };
  return {
    error: {
      code: "internal_error",
      message: "The request could not be completed. Please try again.",
      retryable: true,
    },
  };
}

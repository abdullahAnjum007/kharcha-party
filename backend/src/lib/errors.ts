export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (message: string) => new AppError(404, 'NOT_FOUND', message);
export const forbidden = (message: string) => new AppError(403, 'FORBIDDEN', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
export const badRequest = (message: string) => new AppError(400, 'BAD_REQUEST', message);

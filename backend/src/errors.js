// Service-level errors mapped to HTTP responses by the app error handler.
export class HttpError extends Error {
  constructor(status, code, message = code, extra = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

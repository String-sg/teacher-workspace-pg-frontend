export class AppError extends Error {
  readonly resultCode: number;
  readonly httpStatus: number;

  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message);
    this.name = 'AppError';
    this.resultCode = resultCode;
    this.httpStatus = httpStatus;
  }
}

export class SessionExpiredError extends AppError {
  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message, resultCode, httpStatus);
    this.name = 'SessionExpiredError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message, resultCode, httpStatus);
    this.name = 'NotFoundError';
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'Request timed out.') {
    super(message, -999, 0);
    this.name = 'TimeoutError';
  }
}

export class CsrfError extends AppError {
  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message, resultCode, httpStatus);
    this.name = 'CsrfError';
  }
}

export class RedirectError extends AppError {
  readonly location: string | null;

  constructor(location: string | null) {
    super('Request redirected.', -4031, 302);
    this.name = 'RedirectError';
    this.location = location;
  }
}

export class ValidationError extends AppError {
  readonly fieldPath?: string;
  readonly subCode?: string;

  constructor(
    message: string,
    resultCode: number,
    httpStatus: number,
    extras?: { fieldPath?: string; subCode?: string },
  ) {
    super(message, resultCode, httpStatus);
    this.name = 'ValidationError';
    this.fieldPath = extras?.fieldPath;
    this.subCode = extras?.subCode;
  }
}

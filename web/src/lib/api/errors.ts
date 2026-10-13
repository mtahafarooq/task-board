export interface ApiErrorInit {
  statusCode: number;
  error: string;
  message: string | string[];
  path?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly messages: string[];
  readonly path: string;

  constructor(init: ApiErrorInit) {
    const messages = Array.isArray(init.message)
      ? init.message
      : [init.message];
    super(
      messages.join(", ") || `Request failed with status ${init.statusCode}`,
    );
    this.name = "ApiError";
    this.statusCode = init.statusCode;
    this.error = init.error;
    this.messages = messages;
    this.path = init.path ?? "";
  }
}

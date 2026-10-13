export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
}

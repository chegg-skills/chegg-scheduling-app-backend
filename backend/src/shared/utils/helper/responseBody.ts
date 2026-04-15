class ResponseBody<T = unknown, E = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: E;

  constructor(success: boolean, message: string, data?: T, error?: E) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }

  static successResponse<T>(message: string, data?: T) {
    return new ResponseBody<T, never>(true, message, data);
  }

  static errorResponse<E>(message: string, error?: E) {
    return new ResponseBody<never, E>(false, message, undefined, error);
  }
}

export default ResponseBody;

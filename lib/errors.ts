export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(400, message)
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, message)
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict") {
    super(409, message)
  }
}

export class GoneError extends ApiError {
  constructor(message = "Gone") {
    super(410, message)
  }
}

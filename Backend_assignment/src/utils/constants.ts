export const COLLECTIONS = {
  ORGANIZATIONS: "organizations"
};

export const MESSAGES = {
  ORG_EXISTS: "Organization already exists",
  ORG_NOT_FOUND: "Organization not found",
  INVALID_CREDENTIALS: "Invalid credentials",
  UNAUTHORIZED: "Unauthorized access",
  SERVER_ERROR: "Internal server error"
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

export const PORT = process.env.PORT || 3000;
export const JWT_SECRET = process.env.JWT_SECRET as string;

export const DB_NAME = process.env.MONGO_DB_NAME as string; 
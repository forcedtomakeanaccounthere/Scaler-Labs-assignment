const port = parseInt(process.env.PORT || "5000", 10);

export const appConfig = {
  port,
  backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || "http://localhost:8000",
  jwtSecret: process.env.JWT_SECRET || "redactiq_super_secret_jwt_key_2025",
};

const localDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const envOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...envOrigins, ...localDevOrigins])];

const isOriginAllowed = (origin) => !origin || allowedOrigins.includes(origin);

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
};

const socketCorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

module.exports = {
  corsOptions,
  socketCorsOptions,
};

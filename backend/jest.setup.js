// Set test database URL before any imports
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/seduclog_test';
process.env.JWT_SECRET = 'test_secret';
process.env.PORT = '0';
process.env.CLIENT_URL = 'http://localhost:5173';

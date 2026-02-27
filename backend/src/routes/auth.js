const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/authSchemas');

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true },
    });
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

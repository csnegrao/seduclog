import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export async function listUsers(req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      school: true,
      sector: true,
      phone: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      school: true,
      sector: true,
      phone: true,
      active: true,
      createdAt: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, email, password, role, school, sector, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email and password are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as Role || 'REQUESTER',
      school,
      sector,
      phone,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      school: true,
      sector: true,
      phone: true,
      active: true,
      createdAt: true,
    },
  });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { name, email, role, school, sector, phone, active, password } = req.body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (school !== undefined) data.school = school;
  if (sector !== undefined) data.sector = sector;
  if (phone !== undefined) data.phone = phone;
  if (active !== undefined) data.active = active;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        school: true,
        sector: true,
        phone: true,
        active: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ message: 'User deactivated' });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
}

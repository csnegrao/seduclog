import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@seduc.gov.br' },
    update: {},
    create: {
      name: 'Administrador SEDUC',
      email: 'admin@seduc.gov.br',
      passwordHash: adminHash,
      role: 'ADMIN',
      sector: 'TI',
    },
  });

  // Create warehouse operator
  const opHash = await bcrypt.hash('operador123', 12);
  await prisma.user.upsert({
    where: { email: 'operador@seduc.gov.br' },
    update: {},
    create: {
      name: 'Carlos Almoxarife',
      email: 'operador@seduc.gov.br',
      passwordHash: opHash,
      role: 'WAREHOUSE_OPERATOR',
      sector: 'Almoxarifado',
    },
  });

  // Create driver
  const driverHash = await bcrypt.hash('motorista123', 12);
  await prisma.user.upsert({
    where: { email: 'motorista@seduc.gov.br' },
    update: {},
    create: {
      name: 'José Motorista',
      email: 'motorista@seduc.gov.br',
      passwordHash: driverHash,
      role: 'DRIVER',
      phone: '(85) 99999-1234',
    },
  });

  // Create requester
  const reqHash = await bcrypt.hash('diretor123', 12);
  const requester = await prisma.user.upsert({
    where: { email: 'diretor@escola.gov.br' },
    update: {},
    create: {
      name: 'Maria Diretora',
      email: 'diretor@escola.gov.br',
      passwordHash: reqHash,
      role: 'REQUESTER',
      school: 'Escola Municipal João Paulo II',
    },
  });

  // Create manager
  const managerHash = await bcrypt.hash('gestor123', 12);
  await prisma.user.upsert({
    where: { email: 'gestor@seduc.gov.br' },
    update: {},
    create: {
      name: 'Ana Gestora',
      email: 'gestor@seduc.gov.br',
      passwordHash: managerHash,
      role: 'MANAGER',
      sector: 'Gestão',
    },
  });

  // Create materials
  const materials = [
    { name: 'Papel A4 (Resma)', unit: 'resma', category: 'Papelaria', currentStock: 150, minStock: 20, sku: 'PAP-A4-001' },
    { name: 'Caneta Esferográfica Azul', unit: 'caixa', category: 'Papelaria', currentStock: 45, minStock: 10, sku: 'CAN-AZ-001' },
    { name: 'Toner Impressora HP', unit: 'un', category: 'Informática', currentStock: 5, minStock: 3, sku: 'TON-HP-001' },
    { name: 'Álcool 70% Gel', unit: 'litro', category: 'Limpeza', currentStock: 80, minStock: 15, sku: 'ALC-70-001' },
    { name: 'Detergente Neutro', unit: 'litro', category: 'Limpeza', currentStock: 12, minStock: 10, sku: 'DET-NEU-001' },
    { name: 'Caderno Universitário', unit: 'un', category: 'Papelaria', currentStock: 200, minStock: 30, sku: 'CAD-UNI-001' },
    { name: 'Pincel Marcador Permanente', unit: 'caixa', category: 'Papelaria', currentStock: 3, minStock: 5, sku: 'PIN-MAR-001' },
    { name: 'Pilha AA', unit: 'pacote', category: 'Elétrico', currentStock: 25, minStock: 8, sku: 'PIL-AA-001' },
  ];

  for (const mat of materials) {
    const existing = await prisma.material.findFirst({ where: { sku: mat.sku } });
    if (!existing) {
      await prisma.material.create({ data: mat });
    }
  }

  // Create a sample request
  const mat1 = await prisma.material.findFirst({ where: { sku: 'PAP-A4-001' } });
  const mat2 = await prisma.material.findFirst({ where: { sku: 'CAN-AZ-001' } });

  if (mat1 && mat2) {
    const existing = await prisma.materialRequest.findFirst({ where: { requesterId: requester.id } });
    if (!existing) {
      await prisma.materialRequest.create({
        data: {
          requesterId: requester.id,
          priority: 'HIGH',
          destination: 'Escola Municipal João Paulo II - Rua das Flores, 100',
          notes: 'Material necessário para início do semestre letivo',
          items: {
            create: [
              { materialId: mat1.id, quantity: 10 },
              { materialId: mat2.id, quantity: 5 },
            ],
          },
        },
      });
    }
  }

  console.log('✅ Seed completed!');
  console.log('\n📋 Test credentials:');
  console.log('  Admin:     admin@seduc.gov.br     / admin123');
  console.log('  Operator:  operador@seduc.gov.br  / operador123');
  console.log('  Driver:    motorista@seduc.gov.br / motorista123');
  console.log('  Requester: diretor@escola.gov.br  / diretor123');
  console.log('  Manager:   gestor@seduc.gov.br    / gestor123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

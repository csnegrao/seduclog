import { PrismaClient, Role, RequestStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const passwordHash = await bcrypt.hash('seduclog123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@seduclog.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@seduclog.com',
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operador@seduclog.com' },
    update: {},
    create: {
      name: 'Carlos Operador',
      email: 'operador@seduclog.com',
      passwordHash,
      role: Role.WAREHOUSE_OPERATOR,
      active: true,
    },
  });

  const requester = await prisma.user.upsert({
    where: { email: 'solicitante@seduclog.com' },
    update: {},
    create: {
      name: 'Ana Solicitante',
      email: 'solicitante@seduclog.com',
      passwordHash,
      role: Role.REQUESTER,
      school: 'Escola Municipal João Paulo II',
      active: true,
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: 'motorista@seduclog.com' },
    update: {},
    create: {
      name: 'João Motorista',
      email: 'motorista@seduclog.com',
      passwordHash,
      role: Role.DRIVER,
      active: true,
    },
  });

  console.log('Users created:', { admin: admin.email, operator: operator.email, requester: requester.email, driver: driver.email });

  // Create materials
  const materials = await Promise.all([
    prisma.material.upsert({
      where: { sku: 'MAT-001' },
      update: {},
      create: {
        name: 'Papel A4 (Resma 500 fls)',
        description: 'Papel sulfite branco A4 75g/m²',
        unit: 'resma',
        category: 'Papelaria',
        currentStock: 150,
        minStock: 20,
        sku: 'MAT-001',
      },
    }),
    prisma.material.upsert({
      where: { sku: 'MAT-002' },
      update: {},
      create: {
        name: 'Caneta Esferográfica Azul',
        description: 'Caixa com 50 unidades',
        unit: 'caixa',
        category: 'Papelaria',
        currentStock: 80,
        minStock: 10,
        sku: 'MAT-002',
      },
    }),
    prisma.material.upsert({
      where: { sku: 'MAT-003' },
      update: {},
      create: {
        name: 'Toner Impressora HP',
        description: 'Cartucho de toner preto para impressoras HP LaserJet',
        unit: 'unidade',
        category: 'Informática',
        currentStock: 25,
        minStock: 5,
        sku: 'MAT-003',
      },
    }),
    prisma.material.upsert({
      where: { sku: 'MAT-004' },
      update: {},
      create: {
        name: 'Desinfetante 2L',
        description: 'Desinfetante para superfícies, fórmula concentrada',
        unit: 'galão',
        category: 'Limpeza',
        currentStock: 60,
        minStock: 15,
        sku: 'MAT-004',
      },
    }),
    prisma.material.upsert({
      where: { sku: 'MAT-005' },
      update: {},
      create: {
        name: 'Detergente Neutro 500ml',
        description: 'Detergente neutro para uso geral',
        unit: 'frasco',
        category: 'Limpeza',
        currentStock: 8,
        minStock: 20,
        sku: 'MAT-005',
      },
    }),
    prisma.material.upsert({
      where: { sku: 'MAT-006' },
      update: {},
      create: {
        name: 'Caderno Universitário 200 Páginas',
        description: 'Caderno espiral universitário capa dura',
        unit: 'unidade',
        category: 'Papelaria',
        currentStock: 200,
        minStock: 30,
        sku: 'MAT-006',
      },
    }),
  ]);

  console.log(`Materials created: ${materials.length}`);

  // Create a sample request
  const existingRequest = await prisma.materialRequest.findUnique({
    where: { protocol: 'REQ-2026-000001' },
  });

  if (!existingRequest) {
    const sampleRequest = await prisma.materialRequest.create({
      data: {
        protocol: 'REQ-2026-000001',
        requesterId: requester.id,
        status: RequestStatus.PENDING,
        desiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        justification: 'Necessidade de materiais para o início do ano letivo.',
        items: {
          create: [
            { materialId: materials[0].id, requestedQty: 10 },
            { materialId: materials[1].id, requestedQty: 2 },
          ],
        },
        history: {
          create: [
            {
              userId: requester.id,
              status: RequestStatus.PENDING,
              notes: 'Pedido criado.',
            },
          ],
        },
      },
    });
    console.log('Sample request created:', sampleRequest.protocol);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

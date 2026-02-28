import { Vehicle } from '../types';

// In-memory vehicle store — replace with a real database in production.
const vehicles: Vehicle[] = [
  { id: 'v1', plate: 'ABC-1234', model: 'Fiat Fiorino', capacity: '600 kg', available: true },
  { id: 'v2', plate: 'DEF-5678', model: 'VW Kombi', capacity: '800 kg', available: true },
  { id: 'v3', plate: 'GHI-9012', model: 'Ford Transit', capacity: '1400 kg', available: true },
  { id: 'v4', plate: 'JKL-3456', model: 'Renault Master', capacity: '1200 kg', available: true },
  { id: 'v5', plate: 'MNO-7890', model: 'Mercedes Sprinter', capacity: '1600 kg', available: true },
  { id: 'v6', plate: 'PQR-2345', model: 'Iveco Daily', capacity: '2000 kg', available: true },
  { id: 'v7', plate: 'STU-6789', model: 'Fiat Ducato', capacity: '1300 kg', available: true },
];

export function findAllVehicles(): Vehicle[] {
  return [...vehicles];
}

export function findVehicleById(id: string): Vehicle | undefined {
  return vehicles.find((v) => v.id === id);
}

export function findAvailableVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.available);
}

export function setVehicleAvailability(id: string, available: boolean): boolean {
  const vehicle = vehicles.find((v) => v.id === id);
  if (!vehicle) return false;
  vehicle.available = available;
  return true;
}

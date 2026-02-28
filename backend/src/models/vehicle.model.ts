import { Vehicle } from '../types';

// In-memory vehicle store — replace with a real database in production.
const vehicles: Vehicle[] = [
  { id: 'v1', plate: 'ABC-1234', model: 'Fiat Fiorino', capacity: '600 kg', available: true },
  { id: 'v2', plate: 'DEF-5678', model: 'VW Kombi', capacity: '800 kg', available: true },
  { id: 'v3', plate: 'GHI-9012', model: 'Ford Transit', capacity: '1400 kg', available: true },
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

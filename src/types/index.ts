// ============================================================
// DEFINICIONES DE TIPOS DE DATOS (TypeScript Interface Specs)
// SISTEMA DE TRANSPORTE SINDICAL
// ============================================================

export type UserRole = 'ADMIN' | 'SECRETARY' | 'DRIVER' | 'SOCIO';

export interface User {
  id: number;
  username: string;
  full_name: string;
  ci: string;
  phone: string;
  role: UserRole;
  office_id?: number;
  is_active: boolean;
  created_at?: string;
}

export interface Vehicle {
  id: number;
  plate: string;
  model: string;
  year: number;
  capacity: number; // Por defecto 18 asientos
  owner_id: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
}

export interface Route {
  id: number;
  name: string;
  origin: string;
  destination: string;
  estimated_minutes: number;
}

export interface Segment {
  id: number;
  route_id: number;
  origin: string;
  destination: string;
  order_index: number;
  price: number;
  distance_km: number;
}

export interface Trip {
  id: number;
  route_id: number;
  vehicle_id: number;
  driver_id: number;
  office_id: number;
  trip_date: string;
  departure_time: string;
  status: 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface Ticket {
  id: number;
  trip_id: number;
  seat_number: number;
  passenger_name: string;
  passenger_ci: string;
  origin_segment_id?: number;
  dest_segment_id?: number;
  price_paid: number;
  status: 'ACTIVE' | 'USED' | 'CANCELLED';
  sold_by: number;
}

export interface CashRegister {
  id: number;
  opened_by: number;
  opened_at: string;
  closed_at?: string;
  initial_amount: number;
  final_amount?: number;
  status: 'OPEN' | 'CLOSED';
}

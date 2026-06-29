// ============================================================
// DEFINICIONES DE TIPOS DE DATOS (TypeScript Interface Specs)
// SISTEMA DE TRANSPORTE SINDICAL
// IDIOMA: 100% ESPAÑOL
// ============================================================

export type RolUsuario = 'ADMINISTRADOR' | 'SECRETARIA' | 'CHOFER' | 'SOCIO';

export interface Usuario {
  id: number;
  nombre_usuario: string;
  nombre_completo: string;
  ci: string;
  telefono: string;
  rol: RolUsuario;
  oficina_id?: number;
  activo: boolean;
  creado_en?: string;
}

export interface Vehiculo {
  id: number;
  placa: string;
  modelo: string;
  gestion: number;
  capacidad: number; // Por defecto 18 asientos
  propietario_id: number;
  estado: 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO';
}

export interface Ruta {
  id: number;
  nombre: string;
  origen: string;
  destino: string;
  precio: number;
}

export interface Tramo {
  id: number;
  ruta_id: number;
  origen: string;
  destino: string;
  indice_orden: number;
  precio: number;
  distancia_km: number;
}

export interface Viaje {
  id: number;
  ruta_id: number;
  vehiculo_id: number;
  chofer_id: number;
  oficina_id: number;
  fecha_viaje: string;
  hora_salida: string;
  estado: 'PROGRAMADO' | 'ABORDANDO' | 'EN_RUTA' | 'COMPLETADO' | 'CANCELADO';
}

export interface Boleto {
  id: number;
  viaje_id: number;
  numero_asiento: number;
  nombre_pasajero: string;
  ci_pasajero: string;
  ruta_destino_id?: number;
  precio_pagado: number;
  estado: 'ACTIVO' | 'USADO' | 'CANCELADO';
  vendido_por: number;
}

export interface Encomienda {
  id: number;
  viaje_id: number;
  nombre_remitente: string;
  ci_remitente?: string;
  telefono_remitente?: string;
  nombre_destinatario: string;
  ci_destinatario?: string;
  telefono_destinatario?: string;
  descripcion: string;
  peso_kg: number;
  precio: number;
  estado: 'PENDIENTE' | 'EN_RUTA' | 'ENTREGADO' | 'DEVUELTO';
  codigo_qr?: string;
  registrado_por: number;
  entregado_en?: string;
}

export interface CajaDiaria {
  id: number;
  abierta_por: number;
  abierta_en: string;
  cerrada_en?: string;
  monto_inicial: number;
  monto_final?: number;
  estado: 'ABIERTO' | 'CERRADO';
}

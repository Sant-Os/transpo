# 📊 Diagrama de Flujos del Sistema de Transporte

Este documento detalla los flujos lógicos y de operación de la aplicación móvil de transporte para conductores, socios, secretarias y administradores. Los diagramas se encuentran modelados utilizando la sintaxis de **Mermaid**, la cual se renderiza de forma visual directamente en editores compatibles con Markdown (como VS Code, GitHub o plataformas compatibles).

---

## 1. 🔑 Flujo de Autenticación y Redirección por Rol

Controla el inicio de sesión del usuario, la verificación de credenciales en Supabase, el desencriptado de contraseñas y la redirección a la interfaz correspondiente según su nivel de privilegios.

```mermaid
graph TD
  A([Inicio de la App]) --> B{¿Hay sesión activa?}
  B -- Sí --> C[Cargar datos de usuario de Supabase]
  B -- No --> D[Mostrar Pantalla de Login]
  D --> E[Ingresar Usuario y Contraseña]
  E --> F[AuthService.login]
  F --> G{¿Credenciales válidas?}
  G -- No --> H[Mostrar error de credenciales] --> D
  G -- Sí --> C
  C --> I{Verificar Rol del Usuario}
  I -- ADMINISTRADOR --> J[AdminDashboardScreen]
  I -- SECRETARIA --> K{¿Tiene Caja Abierta hoy?}
  K -- No --> L[Mostrar modal 'Apertura de Caja'] --> M[Ingresar saldo inicial] --> N[Abrir caja en cajas_diarias] --> O[SecretaryPosScreen]
  K -- Sí --> O
  I -- CHOFER --> P[DriverDashboardScreen]
  I -- SOCIO --> Q[SocioDashboardScreen]
```

---

## 2. 📅 Flujo de Programación de Viajes (Despacho)

Muestra el flujo por el cual un Administrador o una Secretaria crea un nuevo viaje principal, incluyendo la validación del sentido de la ruta y la vinculación inteligente entre el Minibús (Vehículo) y el Conductor (Chofer).

```mermaid
graph TD
  A[Iniciar 'Programar Viaje'] --> B{¿Es Secretaria?}
  B -- Sí --> C[Filtrar rutas que inician en su oficina actual] --> D[Mostrar carrusel de rutas de origen]
  B -- No --> E[Mostrar catálogo completo de rutas del sistema]
  D & E --> F[Seleccionar Ruta Principal]
  F --> G[Seleccionar Vehículo o Chofer]
  G --> H{¿Seleccionó Vehículo?}
  H -- Sí --> I[Auto-seleccionar Chofer asignado al vehículo] --> J[Actualizar selección en UI]
  H -- No --> K[Auto-seleccionar Vehículo asignado al chofer] --> J
  J --> L[Seleccionar Hora de Salida en scroll horizontal]
  L --> M[Seleccionar Fecha en scroll horizontal]
  M --> N[Confirmar Programación]
  N --> O[Insertar registro en tabla 'viajes' con estado 'PROGRAMADO']
  O --> P([Actualizar lista de salidas en pantalla])
```

---

## 3. 🎫 Flujo de Venta y Reserva de Pasajes

Describe la selección de asientos múltiples, la diferenciación entre pasajes regulares y convenios corporativos, y el registro de ventas u operaciones de reserva.

```mermaid
graph TD
  A[Seleccionar Asientos en el Mapa] --> B{¿Asiento(s) ocupado(s)?}
  B -- Sí --> C[Mostrar advertencia de ocupado]
  B -- No --> D{¿Asiento(s) reservado(s)?}
  D -- Sí --> E[Ir al Flujo de Gestión de Reservas]
  D -- No --> F[Agregar asiento a lista 'seleccionados']
  F --> G[Seleccionar Destino]
  G --> H[Cargar automáticamente el Costo entero según tarifario]
  H --> I{¿Es convenio corporativo?}
  I -- Sí --> J[Seleccionar Empresa del Convenio]
  I -- No --> K[Ingresar C.I. y Nombre del Pasajero]
  K --> L{¿Vender o Reservar?}
  L -- Vender --> M[Insertar Boleto con estado 'OCUPADO'] --> N[Registrar entrada financiera INGRESO en finanzas] --> O[Mostrar recibo digital y opción de compartir WhatsApp]
  L -- Reservar --> P[Insertar Boleto con estado 'RESERVADO'] --> Q[Actualizar mapa de asientos a color Amarillo]
```

---

## 4. 🔄 Flujo de Gestión y Confirmación de Reservas

Describe cómo interactúa la secretaria al presionar un asiento reservado (en color amarillo/oro) para confirmar su venta final o liberar la plaza.

```mermaid
graph TD
  A[Presionar asiento con estado 'reservado'] --> B[Mostrar Modal de Opciones]
  B --> C{Seleccionar opción}
  C -- Confirmar Venta --> D[Prefilar formulario con datos de la reserva] --> E[Completar cobro/pago] --> F[Actualizar estado a 'OCUPADO' en Supabase] --> G[Registrar ingreso en tabla 'finanzas'] --> H[Emitir recibo y liberar selección]
  C -- Liberar Asiento --> I[Confirmar cancelación de reserva] --> J[Eliminar registro de boleto en Supabase] --> K[Asiento vuelve a estar 'Libre' en el mapa]
```

---

## 5. 🟢 Flujo del Control de Despacho (Tablero Kanban)

Detalla la transición de los estados de un viaje programado por las terminales desde su inicio hasta su arribo final.

```mermaid
graph TD
  A[Estado: PROGRAMADO] --> B[Pasajeros abordan el vehículo]
  B --> C[Secretaria cambia estado a 'ABORDANDO']
  C --> D[Minibús listo para salida en andén]
  D --> E[Secretaria o Admin presiona 'Despachar']
  E --> F[Modificar estado de viaje a 'EN_RUTA']
  F --> G[Registrar evento 'MARCA_SALIDA' en tabla 'eventos']
  G --> H[Chofer conduce el tramo]
  H --> I[Chofer presiona 'Finalizar Viaje' en su app al llegar]
  I --> J[Modificar estado de viaje a 'COMPLETADO']
```

---

## 6. 📦 Flujo de Registro de Encomiendas y Caja

Muestra las transacciones complementarias de la oficina: el registro de paquetes (generando su correspondiente código QR) y la declaración de egresos financieros cotidianos.

### Registro de Encomiendas
```mermaid
graph TD
  A[Ingresar datos de Encomienda] --> B[Generar sufijo y código QR único]
  B --> C[Registrar en tabla 'encomiendas' con estado 'PENDIENTE']
  C --> D[Insertar ingreso financiero en 'finanzas']
  D --> E([Mostrar código QR en pantalla y opción de entrega])
```

### Control de Caja y Gastos Diarios
```mermaid
graph TD
  A[Registrar Gasto de Oficina] --> B[Ingresar Concepto y Monto]
  B --> C[Insertar egreso financiero en 'finanzas' con tipo 'EGRESO']
  C --> D([Actualizar Balance e Ingreso/Egreso del Turno en UI])
```

export type Finca = {
  id: string
  user_id: string
  nombre: string
  ubicacion: string | null
  created_at: string
}

export type Lote = {
  id: string
  finca_id: string
  nombre: string
  descripcion: string | null
  created_at: string
}

export type Animal = {
  id: string
  finca_id: string
  lote_id: string | null
  codigo: string
  nombre: string | null
  raza: string | null
  sexo: 'macho' | 'hembra' | null
  fecha_nacimiento: string | null
  proposito: 'leche' | 'carne' | 'doble_proposito' | null
  estado: 'activo' | 'vendido' | 'muerto'
  peso_actual: number | null
  notas: string | null
  created_at: string
  lotes?: { nombre: string } | null
}

export type RegistroLeche = {
  id: string
  finca_id: string
  animal_id: string | null
  lote_id: string | null
  fecha: string
  litros: number
  precio_litro: number | null
  created_at: string
}

export type ConfigFinca = {
  id: string
  finca_id: string
  precio_litro_leche: number
  moneda: string
  updated_at: string
}

export type EventoAnimal = {
  id: string
  animal_id: string
  tipo: 'vacuna' | 'tratamiento' | 'parto' | 'servicio' | 'pesaje' | 'otro'
  descripcion: string
  fecha: string
  costo: number | null
  proxima_fecha: string | null
  created_at: string
}

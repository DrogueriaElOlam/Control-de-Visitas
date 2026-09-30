-- Tabla para productos de la tienda
CREATE TABLE IF NOT EXISTS public.productos_tienda (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  imagen_url TEXT,
  categoria TEXT,
  stock INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para contador de visitas
CREATE TABLE IF NOT EXISTS public.visitas_tienda (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  contador INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fecha)
);

-- Tabla para configuración de la tienda
CREATE TABLE IF NOT EXISTS public.config_tienda (
  id BIGSERIAL PRIMARY KEY,
  nombre_tienda TEXT DEFAULT 'Droguería El Olam',
  descripcion TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  logo_url TEXT,
  color_primario TEXT DEFAULT '#2563eb',
  color_secundario TEXT DEFAULT '#1e40af',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO public.config_tienda (nombre_tienda, descripcion, telefono, email, direccion)
VALUES ('Droguería El Olam', 'Tu tienda de confianza', '', '', '')
ON CONFLICT DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO public.productos_tienda (nombre, descripcion, precio, categoria, stock, orden) VALUES
('Paracetamol 500mg', 'Analgésico y antipirético de uso común', 25.00, 'Medicamentos', 100, 1),
('Ibuprofeno 400mg', 'Antiinflamatorio no esteroideo', 35.00, 'Medicamentos', 80, 2),
('Vitamina C 1000mg', 'Suplemento vitamínico', 45.00, 'Vitaminas', 60, 3),
('Alcohol en Gel 500ml', 'Desinfectante de manos', 30.00, 'Higiene', 120, 4),
('Mascarillas KN95', 'Protección respiratoria (caja x10)', 80.00, 'Protección', 50, 5),
('Termómetro Digital', 'Medición de temperatura corporal', 120.00, 'Equipos', 30, 6)
ON CONFLICT DO NOTHING;

-- Función para incrementar contador de visitas
CREATE OR REPLACE FUNCTION incrementar_visitas()
RETURNS void AS $$
BEGIN
  INSERT INTO public.visitas_tienda (fecha, contador)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (fecha)
  DO UPDATE SET contador = public.visitas_tienda.contador + 1;
END;
$$ LANGUAGE plpgsql;

-- Deshabilitar RLS para permitir acceso público
ALTER TABLE public.productos_tienda DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas_tienda DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_tienda DISABLE ROW LEVEL SECURITY;

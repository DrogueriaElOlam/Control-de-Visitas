-- ==============================================================================
-- DROGUERÍA EL OLAM: TABLA DE SEGUIMIENTO GPS EN TIEMPO REAL Y RECORRIDOS DIARIOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_gps_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id TEXT,
    vendor_name TEXT NOT NULL,
    route TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    battery_level INTEGER,
    is_mocked BOOLEAN DEFAULT false,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento para búsqueda rápida por fecha y vendedor
CREATE INDEX IF NOT EXISTS idx_tracking_date ON public.vendor_gps_tracking(tracking_date);
CREATE INDEX IF NOT EXISTS idx_tracking_vendor_date ON public.vendor_gps_tracking(vendor_name, tracking_date);
CREATE INDEX IF NOT EXISTS idx_tracking_created_at ON public.vendor_gps_tracking(created_at);

-- Habilitar Row Level Security (RLS) con políticas permisivas para la app
ALTER TABLE public.vendor_gps_tracking ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendor_gps_tracking' AND policyname = 'Permitir insercion publica de tracking'
    ) THEN
        CREATE POLICY "Permitir insercion publica de tracking" 
        ON public.vendor_gps_tracking FOR INSERT 
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendor_gps_tracking' AND policyname = 'Permitir lectura publica de tracking'
    ) THEN
        CREATE POLICY "Permitir lectura publica de tracking" 
        ON public.vendor_gps_tracking FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Habilitar transmisión en vivo en Supabase Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'vendor_gps_tracking'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_gps_tracking;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Crear tabla para almacenar suscripciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    device_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subscription)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active);

-- Función para actualizar last_used_at
CREATE OR REPLACE FUNCTION update_push_subscription_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_push_last_used ON public.push_subscriptions;
CREATE TRIGGER trigger_update_push_last_used
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscription_last_used();

-- Políticas RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Función para enviar notificación push
CREATE OR REPLACE FUNCTION public.send_push_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_url TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
    v_subscription RECORD;
    v_payload JSONB;
BEGIN
    -- Verificar si el usuario tiene suscripciones activas
    IF NOT EXISTS (
        SELECT 1 FROM public.push_subscriptions 
        WHERE user_id = p_user_id AND is_active = TRUE
    ) THEN
        RETURN;
    END IF;

    -- Preparar payload
    v_payload := jsonb_build_object(
        'user_id', p_user_id,
        'title', p_title,
        'body', p_body,
        'url', p_url,
        'data', p_data,
        'timestamp', extract(epoch from now())
    );

    -- Insertar en una tabla de cola (queue) para procesamiento asíncrono
    -- La Edge Function se ejecutará periódicamente o por trigger
    INSERT INTO public.push_notification_queue (
        user_id,
        payload,
        created_at
    ) VALUES (
        p_user_id,
        v_payload,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabla de cola para notificaciones push
CREATE TABLE IF NOT EXISTS public.push_notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para la cola
CREATE INDEX IF NOT EXISTS idx_push_queue_user_id ON public.push_notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_push_queue_processed ON public.push_notification_queue(processed);
CREATE INDEX IF NOT EXISTS idx_push_queue_created ON public.push_notification_queue(created_at);

-- Políticas RLS para la cola
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items" ON public.push_notification_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Función auxiliar para limpiar suscripciones expiradas
CREATE OR REPLACE FUNCTION public.deactivate_push_subscription(p_subscription_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.push_subscriptions 
    SET is_active = FALSE 
    WHERE id = p_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

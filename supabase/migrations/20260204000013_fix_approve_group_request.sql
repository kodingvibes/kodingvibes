-- =====================================================
-- CORREGIR approve_group_request PARA QUE USE SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.approve_group_request(request_id UUID, admin_id UUID)
RETURNS void AS $$
DECLARE
    req_record RECORD;
    new_group_id UUID;
BEGIN
    -- Verificar admin sin RLS (usando SECURITY DEFINER)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Solo administradores pueden aprobar solicitudes';
    END IF;

    SELECT * INTO req_record FROM group_creation_requests WHERE id = request_id;
    
    IF req_record IS NULL THEN
        RAISE EXCEPTION 'Solicitud no encontrada';
    END IF;

    IF req_record.status != 'pending' THEN
        RAISE EXCEPTION 'La solicitud ya ha sido procesada';
    END IF;

    INSERT INTO groups (name, slug, description, is_public, is_active, created_by, color, post_creation_type)
    VALUES (req_record.name, req_record.slug, req_record.description, req_record.is_public, true, req_record.requested_by, '#6366f1', 'anyone')
    RETURNING id INTO new_group_id;

    INSERT INTO group_members (group_id, user_id, role)
    VALUES (new_group_id, req_record.requested_by, 'admin');

    UPDATE group_creation_requests 
    SET status = 'approved', reviewed_by = admin_id, reviewed_at = NOW()
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_group_request(request_id UUID, admin_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Verificar admin sin RLS (usando SECURITY DEFINER)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Solo administradores pueden rechazar solicitudes';
    END IF;

    UPDATE group_creation_requests 
    SET status = 'rejected', reviewed_by = admin_id, reviewed_at = NOW(), rejection_reason = reason
    WHERE id = request_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

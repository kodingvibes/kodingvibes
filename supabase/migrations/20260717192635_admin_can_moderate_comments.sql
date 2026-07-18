-- Permitir a admins globales moderar (soft-delete) cualquier comentario
-- y permitir a los autores eliminar sus propios comentarios.

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can soft delete own comments" ON public.comments;

-- Política unificada: el autor puede actualizar/soft-deltear su propio comentario,
-- o un admin global puede moderar cualquier comentario.
CREATE POLICY "Users can update own comments or admins can update any comment"
  ON public.comments
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

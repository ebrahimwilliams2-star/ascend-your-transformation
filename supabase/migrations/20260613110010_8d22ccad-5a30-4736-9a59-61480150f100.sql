
REVOKE EXECUTE ON FUNCTION public.create_squad(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_squad_by_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_squad_join_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_squad(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_squad_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_squad_join_code(uuid) TO authenticated;

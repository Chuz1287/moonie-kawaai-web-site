alter table public.products
  add column if not exists "Altura" text,
  add column if not exists "Descripcion" text,
  add column if not exists marca text,
  add column if not exists precio_tik_tok numeric(12, 2),
  add column if not exists precio_ml numeric(12, 2),
  add column if not exists titulo_publicaciones text;

notify pgrst, 'reload schema';
https://res.cloudinary.com/moonie-kawaii-img/image/upload/v1794267048/moonie-kawaii/products/Anime/Bunny/FIG-BUNNY-05/Cover.png
https://res.cloudinary.com/moonie-kawaii-img/image/upload/w_300,h_300,c_fill,g_auto,q_auto,f_webp/moonie-kawaii/products/Anime/Buuny/FIG-BUNNY-05/Cover.webp
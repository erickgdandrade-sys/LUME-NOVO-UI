const LADO = 256;

/** Recorta a foto no centro, em quadrado, e reduz para guardar leve. */
export async function prepararFoto(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const tela = document.createElement("canvas");
  tela.width = LADO;
  tela.height = LADO;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.drawImage(
    bitmap,
    (bitmap.width - lado) / 2,
    (bitmap.height - lado) / 2,
    lado,
    lado,
    0,
    0,
    LADO,
    LADO,
  );
  for (const qualidade of [0.85, 0.7, 0.55]) {
    const jpg = tela.toDataURL("image/jpeg", qualidade);
    if (jpg.length <= 110_000) return jpg;
  }
  throw new Error("foto grande demais");
}

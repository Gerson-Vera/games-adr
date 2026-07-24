export function fakeUUID(id: string | number) {
  const base = String(id).padStart(6, '0'); // rellena hasta tener 6 dígitos
  // Formato visual tipo UUID corto (ejemplo: "00a1b2-c3")
  return `${base.slice(0, 4)}-${base.slice(4, 6)}`;
}

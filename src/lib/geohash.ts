const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Codifica coordenadas em geohash.
 * Precisão 6 (padrão) => célula de ~1,2 km x 0,6 km; precisão 7 => ~150 m.
 * Usamos 6 para agrupar buscas de usuários próximos (~500 m de raio efetivo)
 * numa única chave de cache compartilhada.
 */
export function geohashEncode(latitude: number, longitude: number, precision = 6): string {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let hash = "";
  let bits = 0;
  let bit = 0;
  let evenBit = true;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (longitude >= mid) {
        bit = (bit << 1) + 1;
        lngMin = mid;
      } else {
        bit = bit << 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        bit = (bit << 1) + 1;
        latMin = mid;
      } else {
        bit = bit << 1;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    bits += 1;
    if (bits === 5) {
      hash += BASE32[bit];
      bits = 0;
      bit = 0;
    }
  }

  return hash;
}

/** Centro da célula do geohash — usado como origem canônica da busca. */
export function geohashCenter(hash: string): { latitude: number; longitude: number } {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let evenBit = true;

  for (const char of hash) {
    const index = BASE32.indexOf(char);
    if (index < 0) break;
    for (let n = 4; n >= 0; n -= 1) {
      const bitValue = (index >> n) & 1;
      if (evenBit) {
        const mid = (lngMin + lngMax) / 2;
        if (bitValue === 1) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitValue === 1) latMin = mid;
        else latMax = mid;
      }
      evenBit = !evenBit;
    }
  }

  return { latitude: (latMin + latMax) / 2, longitude: (lngMin + lngMax) / 2 };
}

import { NextResponse } from 'next/server';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function normalizeAddress(query: string): string[] {
  const variants: string[] = [query];
  
  const numMatch = query.match(/^(\d+)\s+(\d+)$/);
  if (numMatch) {
    const n1 = numMatch[1];
    const n2 = numMatch[2];
    variants.push(`Calle ${n1} ${n2}`);
    variants.push(`${n2} ${n1}`);
    variants.push(`Calle ${n2} ${n1}`);
    variants.push(`${n1} ${n2}, Buenos Aires`);
    variants.push(`Calle ${n1} ${n2}, Buenos Aires`);
  }
  
  return variants;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  const cacheKey = query.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const searchVariants = normalizeAddress(query);
    
    for (const searchQuery of searchVariants) {
      const locations = [
        `${searchQuery}, Buenos Aires, Argentina`,
        `${searchQuery}, Argentina`,
      ];

      for (const location of locations) {
        const encodedQuery = encodeURIComponent(location);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ar&limit=8&addressdetails=1&language=es`;
        
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'MicrocreditosStefanov/1.0',
              'Accept': 'application/json',
            },
          });

          if (res.ok) {
            const data = await res.json();
            
            if (Array.isArray(data) && data.length > 0) {
              const filtered = data.filter((item: any) => {
                const addr = item.address;
                return addr && (addr.state === 'Buenos Aires' || addr.state === 'Ciudad Autónoma de Buenos Aires');
              });

              const results = filtered.length > 0 ? filtered : data.slice(0, 8);
              
              cache.set(cacheKey, { data: results, timestamp: Date.now() });
              return NextResponse.json(results);
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error('Error in geocode:', error);
    return NextResponse.json([]);
  }
}
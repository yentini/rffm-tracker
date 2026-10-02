import {
  ActaPartido,
  ActaResponse,
  CalendarioResponse,
  ClubsResponse,
  Competition,
  CompetitionsResponse,
  GameType,
  GameTypesResponse,
  Group,
  GroupsResponse,
  HealthResponse,
  ListaPartidosResponse,
  Partido,
  Season,
  SeasonsResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fallback fixtures en caso de backend desconectado durante desarrollo
 */
const MOCK_PARTIDOS: Partido[] = [
  {
    id: 'mock-01',
    competicion: 'Tercera Federación - Grupo 7',
    jornada: 8,
    fecha: new Date().toISOString(),
    estado: 'EN_JUEGO',
    minuto: 74,
    local: {
      id: 'mos',
      nombre: 'CD Colonia Moscardó',
      abreviatura: 'MOS',
    },
    visitante: {
      id: 'poz',
      nombre: 'CF Pozuelo de Alarcón',
      abreviatura: 'POZ',
    },
    goles_local: 2,
    goles_visitante: 1,
  },
  {
    id: 'mock-02',
    competicion: 'Tercera Federación - Grupo 7',
    jornada: 8,
    fecha: new Date().toISOString(),
    estado: 'NO_INICIADO',
    local: {
      id: 'alc',
      nombre: 'AD Alcorcón B',
      abreviatura: 'ALC',
    },
    visitante: {
      id: 'roz',
      nombre: 'Las Rozas CF',
      abreviatura: 'ROZ',
    },
  },
  {
    id: 'mock-03',
    competicion: 'Preferente Madrid - Grupo 1',
    jornada: 6,
    fecha: new Date(Date.now() - 3600000 * 2).toISOString(),
    estado: 'FINALIZADO',
    minuto: 90,
    local: {
      id: 'ray',
      nombre: 'Rayo Vallecano C',
      abreviatura: 'RAY',
    },
    visitante: {
      id: 'car',
      nombre: 'RCD Carabanchel',
      abreviatura: 'CAR',
    },
    goles_local: 3,
    goles_visitante: 3,
  },
];

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${BASE_URL}/health`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
}

export async function fetchPartidos(competicionId?: string, jornada?: number): Promise<Partido[]> {
  const url = new URL(`${BASE_URL}/api/partidos`);
  if (competicionId) url.searchParams.set('competicion_id', competicionId);
  if (jornada) url.searchParams.set('jornada', jornada.toString());

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data: ListaPartidosResponse = await response.json();
    return data.partidos;
  } catch (error) {
    console.warn('[API Client] No se pudo conectar con el backend, usando fallback local:', error);
    return MOCK_PARTIDOS;
  }
}

export async function fetchSeasons(): Promise<Season[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/seasons`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data: SeasonsResponse = await response.json();
    return data.seasons;
  } catch (error) {
    console.warn('[API Client] Error al obtener temporadas:', error);
    return [
      { cod_temporada: '22', nombre: '2026-2027' },
      { cod_temporada: '21', nombre: '2025-2026' },
      { cod_temporada: '20', nombre: '2024-2025' },
    ];
  }
}

export async function fetchGameTypes(): Promise<GameType[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/game-types`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data: GameTypesResponse = await response.json();
    return data.game_types;
  } catch (error) {
    console.warn('[API Client] Error al obtener tipos de juego:', error);
    return [
      { codigo_tipo_juego: '1', nombre: 'Fútbol-11' },
      { codigo_tipo_juego: '2', nombre: 'Fútbol-7' },
      { codigo_tipo_juego: '3', nombre: 'Fútbol Sala' },
    ];
  }
}

export async function fetchCompetitions(temporada: string, tipojuego: string): Promise<Competition[]> {
  if (!temporada || !tipojuego) return [];

  const url = new URL(`${BASE_URL}/api/competitions`);
  url.searchParams.set('temporada', temporada);
  url.searchParams.set('tipojuego', tipojuego);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data: CompetitionsResponse = await response.json();
    return data.competitions;
  } catch (error) {
    console.warn('[API Client] Error al obtener competiciones:', error);
    return [
      {
        codigo: '26737923',
        nombre: 'DIVISION DE HONOR ALEVIN F-7',
        tipo_competicion: '2',
        codigo_tipo_juego: tipojuego,
        tipo_juego: 'Futbol-7',
        nombre_categoria: 'DIVISION DE HONOR ALEV-F7',
      },
      {
        codigo: '26738066',
        nombre: 'PRIMERA DIVISION AUTONOMICA ALEVIN F-7',
        tipo_competicion: '2',
        codigo_tipo_juego: tipojuego,
        tipo_juego: 'Futbol-7',
        nombre_categoria: 'PRIMERA DIVISION AUTONOMICA ALEV.F-7',
      },
    ];
  }
}

export async function fetchGroups(competicion: string): Promise<Group[]> {
  if (!competicion) return [];

  const url = new URL(`${BASE_URL}/api/groups`);
  url.searchParams.set('competicion', competicion);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data: GroupsResponse = await response.json();
    return data.groups;
  } catch (error) {
    console.warn('[API Client] Error al obtener grupos:', error);
    return [
      {
        codigo: '26737829',
        nombre: 'Grupo 1',
        total_jornadas: '30',
        total_equipos: '16',
        nombre_delegacion: 'CENTRAL R.F.F.M.',
      },
      {
        codigo: '26737830',
        nombre: 'Grupo 2',
        total_jornadas: '30',
        total_equipos: '16',
        nombre_delegacion: 'CENTRAL R.F.F.M.',
      },
    ];
  }
}

export async function fetchCalendario(
  temporada: string,
  tipojuego: string,
  competicion: string,
  grupo: string
): Promise<CalendarioResponse> {
  const url = new URL(`${BASE_URL}/api/calendario`);
  url.searchParams.set('temporada', temporada);
  url.searchParams.set('tipojuego', tipojuego);
  url.searchParams.set('competicion', competicion);
  url.searchParams.set('grupo', grupo);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('[API Client] Error al obtener calendario:', error);
    return {
      temporada,
      tipojuego,
      competicion,
      grupo,
      current_round: 1,
      total_jornadas: 1,
      rounds: [
        {
          codjornada: '1',
          nombre_jornada: 'Jornada 1',
          numero_jornada: 1,
          partidos: [
            {
              codacta: 'mock-acta-1',
              equipo_local: 'CD Colonia Moscardó',
              equipo_visitante: 'CF Pozuelo de Alarcón',
              goles_local: '2',
              goles_visitante: '1',
              campo: 'Román Valero (HA)',
              fecha: '26-09-2026',
              hora: '11:30',
            },
          ],
        },
      ],
    };
  }
}

export async function fetchActaPartido(
  temporada: string,
  competicion: string,
  grupo: string,
  codacta: string
): Promise<ActaPartido> {
  const url = new URL(`${BASE_URL}/api/acta-partido`);
  url.searchParams.set('temporada', temporada);
  url.searchParams.set('competicion', competicion);
  url.searchParams.set('grupo', grupo);
  url.searchParams.set('codacta', codacta);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data: ActaResponse = await response.json();
    return data.game;
  } catch (error) {
    console.warn('[API Client] Error al obtener acta del partido vía backend, probando directo o fallback:', error);
    // Intentar directamente con la URL oficial de Next.js si el backend intermediario fallase
    try {
      const directUrl = `https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/acta-partido/${codacta}.json?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&codacta=${codacta}`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const directData = await directRes.json();
        return directData?.pageProps?.game || { codacta };
      }
    } catch {
      // Ignorar fallback secundario
    }
    throw error;
  }
}

/**
 * Consulta el listado oficial y paginado de clubes de la RFFM con soporte de búsqueda.
 */
export async function fetchClubs(
  page: number = 1,
  search?: string,
  codclub?: string
): Promise<ClubsResponse> {
  const url = new URL(`${BASE_URL}/api/clubs`);
  url.searchParams.set('p', page.toString());
  if (search && search.trim()) {
    url.searchParams.set('search', search.trim());
  }
  if (codclub && codclub.trim()) {
    url.searchParams.set('codclub', codclub.trim());
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('[API Client] Error al obtener clubes vía backend, probando directo de RFFM:', error);
    try {
      const qSearch = search && search.trim() ? encodeURIComponent(search.trim()) : '';
      const qCod = codclub && codclub.trim() ? encodeURIComponent(codclub.trim()) : '';
      const directUrl = `https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/competicion/clubes.json?p=${page}&search=${qSearch}&codclub=${qCod}`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const directData = await directRes.json();
        const clubsRaw = directData?.pageProps?.clubs || {};
        return {
          pagination: {
            pagina_actual: parseInt(clubsRaw.pagina_actual || page.toString(), 10),
            total_paginas: parseInt(clubsRaw.total_paginas || '1', 10),
            total_registros: parseInt(clubsRaw.total_registros || '0', 10),
            pagina_anterior: clubsRaw.pagina_anterior ? parseInt(clubsRaw.pagina_anterior, 10) : null,
            pagina_siguiente: clubsRaw.pagina_siguiente ? parseInt(clubsRaw.pagina_siguiente, 10) : null,
          },
          clubs: (clubsRaw.clubes || []).map((c: any) => ({
            codigo_club: String(c.codigo_club || ''),
            nombre: String(c.nombre || ''),
            clave_acceso: c.clave_acceso,
            escudo: c.escudo?.startsWith('http') ? c.escudo : c.escudo ? `https://appweb.rffm.es${c.escudo.startsWith('/') ? '' : '/'}${c.escudo}` : null,
            localidad: c.localidad,
            provincia: c.provincia,
            total_equipos: c.total_equipos != null ? String(c.total_equipos) : null,
          })),
        };
      }
    } catch {
      // Ignorar fallback
    }
    throw error;
  }
}


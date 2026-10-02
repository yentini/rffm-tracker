import React, { useState, useMemo } from 'react';
import { ClubDetail, TeamDetail } from '../types';
import { fetchTeamDetail } from '../services/api';
import { TeamDetailModal } from './TeamDetailModal';
import {
  X,
  Shield,
  MapPin,
  Globe,
  Phone,
  Mail,
  ExternalLink,
  Users,
  Search,
  AlertCircle,
  Loader2,
  Shirt,
  Twitter,
  Instagram,
  Facebook,
  Building2,
  ChevronRight,
} from 'lucide-react';

interface ClubDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubDetail: ClubDetail | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const matchesCategory = (rawCategory: string, filterId: string): boolean => {
  if (filterId === 'todos') return true;
  const cat = normalizeText(rawCategory);

  switch (filterId) {
    case 'senior':
      // Categorías Senior / Aficionado / Competiciones de ámbito nacional o autonómico
      return (
        (cat.includes('aficionado') ||
          cat.includes('federacion') ||
          cat.includes('senior')) &&
        !cat.includes('juvenil') &&
        !cat.includes('cadete') &&
        !cat.includes('infantil') &&
        !cat.includes('alevin') &&
        !cat.includes('benjamin') &&
        !cat.includes('prebenjamin') &&
        !cat.includes('debutante')
      );
    case 'juvenil':
      return cat.includes('juvenil');
    case 'cadete':
      return cat.includes('cadete');
    case 'infantil':
      return cat.includes('infantil');
    case 'alevin':
      return cat.includes('alevin');
    case 'benjamin':
      return cat.includes('benjamin') || cat.includes('prebenjamin') || cat.includes('debutante');
    case 'femenino':
      return cat.includes('femenin');
    default:
      return cat.includes(filterId);
  }
};

export const ClubDetailModal: React.FC<ClubDetailModalProps> = ({
  isOpen,
  onClose,
  clubDetail,
  isLoading,
  error,
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState<'equipos' | 'datos'>('equipos');
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Estados para el modal de detalle del equipo
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(null);
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [isTeamDetailLoading, setIsTeamDetailLoading] = useState<boolean>(false);
  const [teamDetailError, setTeamDetailError] = useState<string | null>(null);

  const handleOpenTeam = async (codigoEquipo: string) => {
    setSelectedTeamCode(codigoEquipo);
    setIsTeamDetailLoading(true);
    setTeamDetailError(null);
    try {
      const detail = await fetchTeamDetail(codigoEquipo);
      setTeamDetail(detail);
    } catch (err) {
      console.error('Error al cargar ficha de equipo:', err);
      setTeamDetailError('No se pudo cargar la plantilla y técnicos del equipo desde la RFFM.');
    } finally {
      setIsTeamDetailLoading(false);
    }
  };

  const handleCloseTeam = () => {
    setSelectedTeamCode(null);
    setTeamDetail(null);
    setTeamDetailError(null);
  };

  // Filtrado de equipos por texto y categoría con función compartida
  const filteredTeams = useMemo(() => {
    if (!clubDetail?.equipos) return [];
    let list = clubDetail.equipos;

    if (teamSearch.trim()) {
      const q = normalizeText(teamSearch.trim());
      list = list.filter(
        (t) =>
          normalizeText(t.nombre_equipo).includes(q) ||
          normalizeText(t.categoria).includes(q) ||
          t.codigo_equipo.includes(q)
      );
    }

    if (selectedCategory !== 'todos') {
      list = list.filter((t) => matchesCategory(t.categoria, selectedCategory));
    }

    return list;
  }, [clubDetail?.equipos, teamSearch, selectedCategory]);

  // Lista de filtros de categoría comunes sincronizada con matchesCategory
  const categoriesList = useMemo(() => {
    if (!clubDetail?.equipos) return [];
    const filterDefs = [
      { id: 'todos', label: 'Todos' },
      { id: 'senior', label: 'Senior / Afic.' },
      { id: 'juvenil', label: 'Juvenil' },
      { id: 'cadete', label: 'Cadete' },
      { id: 'infantil', label: 'Infantil' },
      { id: 'alevin', label: 'Alevín' },
      { id: 'benjamin', label: 'Benjamín' },
      { id: 'femenino', label: 'Femenino' },
    ];

    return filterDefs
      .map((def) => {
        const count =
          def.id === 'todos'
            ? clubDetail.equipos.length
            : clubDetail.equipos.filter((t) => matchesCategory(t.categoria, def.id)).length;
        return {
          id: def.id,
          label: def.label,
          count,
        };
      })
      .filter((c) => c.id === 'todos' || c.count > 0);
  }, [clubDetail?.equipos]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Club */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all z-10"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          {isLoading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 bg-slate-800 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-800 rounded-lg w-2/3" />
                <div className="h-3.5 bg-slate-800/60 rounded-md w-1/3" />
              </div>
            </div>
          ) : clubDetail ? (
            <div className="flex items-center gap-4 pr-10">
              <div className="w-14 h-14 bg-slate-800/80 rounded-2xl p-2 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-lg shadow-black/50">
                {clubDetail.escudo ? (
                  <img
                    src={clubDetail.escudo}
                    alt={clubDetail.nombre_club}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                    {clubDetail.nombre_club}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 font-bold">
                    Cód: {clubDetail.codigo}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                  {clubDetail.localidad && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{clubDetail.localidad}</span>
                    </span>
                  )}
                  {clubDetail.equipos && (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{clubDetail.equipos.length} equipos</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Navegación por Pestañas */}
          {clubDetail && !isLoading && (
            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => setActiveTab('equipos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'equipos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Equipos ({clubDetail.equipos?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('datos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'datos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Ficha del Club</span>
              </button>
            </div>
          )}
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs">Cargando información y equipos del club...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3 my-4">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-xs text-red-300 font-medium">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Reintentar consulta
                </button>
              )}
            </div>
          ) : clubDetail ? (
            activeTab === 'equipos' ? (
              <div className="space-y-3.5">
                {/* Buscador de equipos */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Buscar equipo por nombre o categoría (ej. Juvenil, Alevín, A)..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                  {teamSearch && (
                    <button
                      onClick={() => setTeamSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtros rápidos de categoría */}
                {categoriesList.length > 2 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    {categoriesList.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all border ${
                          selectedCategory === cat.id
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {cat.label} ({cat.count})
                      </button>
                    ))}
                  </div>
                )}

                {/* Listado de equipos */}
                {filteredTeams.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                    <Users className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">
                      No se encontraron equipos que coincidan con el filtro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTeams.map((equipo) => {
                      const isCompeting = equipo.en_competicion === '1';
                      return (
                        <div
                          key={equipo.codigo_equipo}
                          onClick={() => handleOpenTeam(equipo.codigo_equipo)}
                          className="bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all hover:bg-slate-950/90 cursor-pointer group shadow-sm active:scale-[0.99]"
                          title="Pulsar para ver plantilla, técnicos y campo"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors tracking-tight truncate">
                                {equipo.nombre_equipo}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                #{equipo.codigo_equipo}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-blue-300 font-medium truncate max-w-[280px]">
                                {equipo.categoria}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isCompeting
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isCompeting ? 'En competición' : 'No compite'}
                            </span>
                            <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all">
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Pestaña: Ficha del Club y Datos de Contacto */
              <div className="space-y-4 text-xs">
                {/* Datos generales */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800/80 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Datos Institucionales</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                    {clubDetail.presidente && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">Presidente</span>
                        <span className="font-semibold text-white">{clubDetail.presidente}</span>
                      </div>
                    )}

                    {clubDetail.cif && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">CIF</span>
                        <span className="font-mono text-white">{clubDetail.cif}</span>
                      </div>
                    )}

                    {clubDetail.delegacion && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">Delegación RFFM</span>
                        <span className="text-white">{clubDetail.delegacion}</span>
                      </div>
                    )}

                    {clubDetail.comarca && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">Comarca</span>
                        <span className="text-white">{clubDetail.comarca}</span>
                      </div>
                    )}

                    {clubDetail.domicilio && (
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Sede Oficial / Domicilio</span>
                        <span className="text-white">
                          {clubDetail.domicilio}
                          {clubDetail.codigo_postal ? ` (${clubDetail.codigo_postal})` : ''}
                          {clubDetail.localidad ? ` - ${clubDetail.localidad}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contacto y Canales Oficiales */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800/80 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Contacto y Comunicación</span>
                  </h3>

                  <div className="space-y-2.5">
                    {clubDetail.portal_web && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                        <a
                          href={
                            clubDetail.portal_web.startsWith('http')
                              ? clubDetail.portal_web
                              : `https://${clubDetail.portal_web}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 font-medium truncate"
                        >
                          <span>{clubDetail.portal_web}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}

                    {clubDetail.email && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <a
                          href={`mailto:${clubDetail.email}`}
                          className="text-blue-400 hover:text-blue-300 underline font-medium truncate"
                        >
                          {clubDetail.email}
                        </a>
                      </div>
                    )}

                    {clubDetail.telefonos && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{clubDetail.telefonos}</span>
                      </div>
                    )}

                    {/* Redes sociales */}
                    <div className="flex items-center gap-3 pt-2">
                      {clubDetail.twitter && (
                        <a
                          href={`https://twitter.com/${clubDetail.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sky-400 hover:border-sky-500/50 transition-all font-medium"
                        >
                          <Twitter className="w-3.5 h-3.5" />
                          <span>@{clubDetail.twitter.replace('@', '')}</span>
                        </a>
                      )}

                      {clubDetail.instagram && (
                        <a
                          href={`https://instagram.com/${clubDetail.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-pink-400 hover:border-pink-500/50 transition-all font-medium"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          <span>{clubDetail.instagram}</span>
                        </a>
                      )}

                      {clubDetail.facebook && (
                        <a
                          href={clubDetail.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400 hover:border-blue-500/50 transition-all font-medium"
                        >
                          <Facebook className="w-3.5 h-3.5" />
                          <span>Facebook</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Equipaciones */}
                {clubDetail.equipaciones && clubDetail.equipaciones.length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800/80 flex items-center gap-2">
                      <Shirt className="w-3.5 h-3.5 text-blue-400" />
                      <span>Equipación Oficial</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {clubDetail.equipaciones.map((eq, i) => (
                        <div
                          key={i}
                          className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5"
                        >
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">
                            Uniforme {i + 1}
                          </span>
                          {eq.camiseta && (
                            <p className="text-[11px] text-white">
                              <strong className="text-slate-400">Camiseta:</strong> {eq.camiseta}
                            </p>
                          )}
                          {eq.pantalon && (
                            <p className="text-[11px] text-white">
                              <strong className="text-slate-400">Pantalón:</strong> {eq.pantalon}
                            </p>
                          )}
                          {eq.medias && (
                            <p className="text-[11px] text-white">
                              <strong className="text-slate-400">Medias:</strong> {eq.medias}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Modal secundario con los detalles del equipo, cuerpo técnico y plantilla */}
      <TeamDetailModal
        isOpen={Boolean(selectedTeamCode)}
        onClose={handleCloseTeam}
        teamDetail={teamDetail}
        isLoading={isTeamDetailLoading}
        error={teamDetailError}
        onRetry={selectedTeamCode ? () => handleOpenTeam(selectedTeamCode) : undefined}
      />
    </div>
  );
};

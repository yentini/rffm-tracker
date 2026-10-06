import React, { useState } from 'react';
import { GoleadoresTable } from './GoleadoresTable';
import { PlayerDetailModal } from './PlayerDetailModal';
import { fetchPlayerDetail } from '../services/api';
import { PlayerDetail } from '../types';
import { X, Flame } from 'lucide-react';

interface GoleadoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  competicion: string;
  grupo: string;
  temporada?: string;
  nombreCompeticion?: string;
  nombreGrupo?: string;
  onSelectPlayer?: (codjugador: string) => void;
}

export const GoleadoresModal: React.FC<GoleadoresModalProps> = ({
  isOpen,
  onClose,
  competicion,
  grupo,
  temporada,
  nombreCompeticion,
  nombreGrupo,
  onSelectPlayer,
}) => {
  const [selectedPlayerCode, setSelectedPlayerCode] = useState<string | null>(null);
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState<boolean>(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const handleInternalSelectPlayer = async (codjugador: string) => {
    if (onSelectPlayer) {
      onSelectPlayer(codjugador);
      return;
    }
    setSelectedPlayerCode(codjugador);
    setIsPlayerLoading(true);
    setPlayerError(null);
    try {
      const pData = await fetchPlayerDetail(codjugador);
      setPlayerDetail(pData);
    } catch (err: any) {
      console.error('Error al cargar jugador:', err);
      setPlayerError(err.message || 'No se pudo cargar la ficha del jugador.');
    } finally {
      setIsPlayerLoading(false);
    }
  };

  const handleClosePlayer = () => {
    setSelectedPlayerCode(null);
    setPlayerDetail(null);
    setPlayerError(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/90 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del Modal */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 relative flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 pr-8">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 truncate">
                  <span>Máximos Goleadores</span>
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  {nombreCompeticion || 'Competición'} • <span className="text-amber-400 font-semibold">{nombreGrupo || 'Grupo'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido scrolleable con GoleadoresTable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <GoleadoresTable
              competicion={competicion}
              grupo={grupo}
              temporada={temporada}
              nombreCompeticionFallback={nombreCompeticion}
              nombreGrupoFallback={nombreGrupo}
              onSelectPlayer={handleInternalSelectPlayer}
            />
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Jugador si se abre desde este modal */}
      <PlayerDetailModal
        isOpen={!!selectedPlayerCode}
        onClose={handleClosePlayer}
        playerDetail={playerDetail}
        isLoading={isPlayerLoading}
        error={playerError}
        onRetry={() => selectedPlayerCode && handleInternalSelectPlayer(selectedPlayerCode)}
      />
    </>
  );
};

import { useState } from 'react';
import { Layers, Check } from 'lucide-react';
import type { MapLayerType } from '@/lib/mapTiles';
import { cn } from '@/lib/utils';

interface LayerSwitcherProps {
  activeLayer: MapLayerType;
  onLayerChange: (layer: MapLayerType) => void;
}

const LAYER_LABELS: Record<MapLayerType, string> = {
  street: 'Street',
  satellite: 'Satellite',
  hybrid: 'Hybrid',
};

const LAYER_ORDER: MapLayerType[] = ['street', 'satellite', 'hybrid'];

export function LayerSwitcher({ activeLayer, onLayerChange }: LayerSwitcherProps) {
  const [expanded, setExpanded] = useState(false);

  const handleSelect = (layer: MapLayerType) => {
    onLayerChange(layer);
    setExpanded(false);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-lg border shadow-lg transition-colors',
          expanded
            ? 'bg-accent text-black border-accent'
            : 'bg-[#1a1d23]/90 backdrop-blur-sm text-gray-100 border-gray-700/50 hover:bg-[#252a31]'
        )}
        aria-label="Switch map layer"
      >
        <Layers className="w-5 h-5" />
      </button>

      {expanded && (
        <div className="flex flex-col py-1 rounded-lg bg-[#1a1d23]/95 backdrop-blur-md border border-gray-700/50 shadow-lg overflow-hidden">
          {LAYER_ORDER.map((layer) => (
            <button
              key={layer}
              onClick={() => handleSelect(layer)}
              className={cn(
                'flex items-center justify-between gap-6 px-4 py-2.5 text-[13px] transition-colors',
                activeLayer === layer
                  ? 'text-accent font-medium bg-accent/10'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              {LAYER_LABELS[layer]}
              {activeLayer === layer && <Check className="w-4 h-4 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

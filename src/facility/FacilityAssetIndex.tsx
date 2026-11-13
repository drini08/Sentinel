import type { FacilityAsset } from "./types";

export function visualKindForAsset(asset: FacilityAsset): "reservoir" | "industrial" {
  return asset.asset_type === "reservoir" ? "reservoir" : "industrial";
}

export function FacilityAssetIndex({
  assets,
  selectedId,
  onSelect,
}: {
  assets: FacilityAsset[];
  selectedId: string | null;
  onSelect(assetId: string): void;
}) {
  return (
    <div className="sr-only" aria-label="Facility asset selector">
      {assets.map((asset) => (
        <button
          type="button"
          key={asset.id}
          aria-pressed={selectedId === asset.id}
          onClick={() => onSelect(asset.id)}
        >
          Select {asset.name}
        </button>
      ))}
    </div>
  );
}

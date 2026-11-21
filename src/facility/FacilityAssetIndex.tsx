import type { FacilityAsset } from "./types";

export function visualKindForAsset(asset: FacilityAsset): "reservoir" | "industrial" {
  return asset.asset_type === "reservoir" ? "reservoir" : "industrial";
}

export function FacilityAssetIndex({
  assets,
  selectedId,
  onSelect,
  visible = false,
  alertAssetId = null,
}: {
  assets: FacilityAsset[];
  selectedId: string | null;
  onSelect(assetId: string): void;
  visible?: boolean;
  alertAssetId?: string | null;
}) {
  return (
    <div className={visible ? "facility-asset-list" : "sr-only"} role="group" aria-label="Facility asset selector">
      {assets.map((asset) => (
        <button
          type="button"
          key={asset.id}
          aria-label={`Select ${asset.name}`}
          aria-pressed={selectedId === asset.id}
          onClick={() => onSelect(asset.id)}
        >
          <span>{asset.name}</span>
          {visible && (
            <small className={asset.id === alertAssetId ? "facility-asset-alert" : undefined}>
              {asset.id === alertAssetId ? "Security alert" : asset.status}
            </small>
          )}
        </button>
      ))}
    </div>
  );
}

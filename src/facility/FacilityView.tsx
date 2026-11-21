import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { Box, List } from "lucide-react";
import { FacilityAssetIndex } from "./FacilityAssetIndex";
import type { FacilitySnapshot } from "./types";
import "./facility-view.css";

const FacilityScene = lazy(() => import("./FacilityScene").then(({ FacilityScene }) => ({ default: FacilityScene })));

type FacilityViewProps = {
  snapshot: FacilitySnapshot;
  selectedId: string | null;
  alertAssetId: string | null;
  reducedMotion: boolean;
  onSelect(assetId: string | null): void;
};

class SceneBoundary extends Component<{ children: ReactNode; onUnavailable(): void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onUnavailable();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function FacilityView(props: FacilityViewProps) {
  const [showThreeDimensions, setShowThreeDimensions] = useState(false);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const showFallback = useCallback(() => {
    setSceneUnavailable(true);
    setShowThreeDimensions(false);
  }, []);
  const assetList = <FacilityAssetIndex
    visible
    assets={props.snapshot.assets}
    selectedId={props.selectedId}
    alertAssetId={props.alertAssetId}
    onSelect={props.onSelect}
  />;

  return (
    <>
      <div className="facility-view-toolbar">
        <button
          type="button"
          className="facility-view-toggle"
          onClick={() => {
            setSceneUnavailable(false);
            setShowThreeDimensions(!showThreeDimensions);
          }}
        >
          {showThreeDimensions ? <><List size={15} />Show asset list</> : <><Box size={15} />Open 3D view</>}
        </button>
        {sceneUnavailable && <span role="status">3D view unavailable. You can still inspect assets.</span>}
      </div>
      {showThreeDimensions ? (
        <SceneBoundary onUnavailable={showFallback}>
          <Suspense fallback={<><div className="facility-view-loading" role="status">Loading 3D view…</div>{assetList}</>}>
            <FacilityScene {...props} onUnavailable={showFallback} />
          </Suspense>
        </SceneBoundary>
      ) : assetList}
    </>
  );
}

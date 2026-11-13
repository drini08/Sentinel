import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FacilityAssetIndex, visualKindForAsset } from "./FacilityAssetIndex";
import type { FacilityAsset } from "./types";

const assets: FacilityAsset[] = [
  {
    id: "reservoir-a",
    name: "Reservoir A",
    asset_type: "reservoir",
    status: "operational",
    security_status: "secure",
    position: [4.2, 1.2, -4],
    metrics: { level_percent: 72 },
    supported_commands: ["isolate"],
  },
  {
    id: "pump-station",
    name: "High-Lift Pump Station",
    asset_type: "pump_station",
    status: "operational",
    security_status: "secure",
    position: [9, 0.8, 0.5],
    metrics: { active_pumps: 2 },
    supported_commands: ["start", "stop"],
  },
];

it("provides a keyboard-accessible selector for every rendered asset", () => {
  const onSelect = vi.fn();
  render(<FacilityAssetIndex assets={assets} selectedId={null} onSelect={onSelect} />);

  expect(screen.getAllByRole("button")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Select Reservoir A" }));

  expect(onSelect).toHaveBeenCalledWith("reservoir-a");
});

it("maps water storage and industrial equipment to distinct visual kinds", () => {
  expect(visualKindForAsset(assets[0])).toBe("reservoir");
  expect(visualKindForAsset(assets[1])).toBe("industrial");
});

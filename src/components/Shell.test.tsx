import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it } from "vitest";
import { Shell } from "./Shell";

it("applies the compact application scale to every route", () => {
  const { container } = render(
    <MemoryRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<div>Route content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  expect(container.firstElementChild).toHaveClass("app-scale");
  expect(container.firstElementChild).toHaveClass("theme-hybrid");
});

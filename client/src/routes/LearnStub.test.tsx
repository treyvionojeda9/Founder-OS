import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LearnStub } from "./LearnStub";

afterEach(() => {
  cleanup();
});

describe("learning desk", () => {
  it("lands a study desk with books, a lamp, and an empty notebook", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LearnStub doorId="reading-room" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "AI University — coming later" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Desk lamp, lit" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Stacked books" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Open notebook" })).toBeInTheDocument();
    expect(document.querySelector(".desk-top")).toBeTruthy();
    expect(document.querySelector(".floor-plane")).toBeTruthy();
    expect(document.querySelector(".paper-glow")).toBeNull();
    expect(document.body.textContent).not.toMatch(/checker/i);
  });
});

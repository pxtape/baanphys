import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhysicsText } from "@/components/PhysicsText";

describe("PhysicsText", () => {
  it("renders plain Thai text with KaTeX and does not interpret user text as HTML", () => {
    const { container } = render(<PhysicsText value={'แรงลัพธ์คือ $F=ma$\n\n<script>alert("x")</script>'}/>);

    expect(screen.getByText(/แรงลัพธ์คือ/)).toBeInTheDocument();
    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.textContent).toContain('<script>alert("x")</script>');
  });
});

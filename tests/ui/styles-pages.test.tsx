import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StylesPage from "../../app/styles/page";
import StyleDetailPage, {
  generateMetadata,
  generateStaticParams
} from "../../app/styles/[slug]/page";
import { DANCE_STYLE_GROUPS, DANCE_STYLES } from "../../lib/dance-types";
import { getDanceStyleGuides } from "../../lib/style-guides";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  }
}));

describe("dance style pages", () => {
  it("renders every named style once in its canonical family", () => {
    render(<StylesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Dance style guide" })).toBeInTheDocument();
    for (const group of DANCE_STYLE_GROUPS) {
      expect(screen.getByRole("heading", { level: 2, name: group.label })).toBeInTheDocument();
    }

    const styleLinks = screen.getAllByRole("link", { name: /Learn about / });
    expect(styleLinks).toHaveLength(DANCE_STYLES.length - 1);
    expect(styleLinks.map((link) => link.getAttribute("href"))).toContain("/styles/argentine-tango");
  });

  it("renders a complete, accessible style guide and exact calendar CTA", async () => {
    const page = await StyleDetailPage({ params: Promise.resolve({ slug: "argentine-tango" }) });
    const { container } = render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Argentine Tango" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "What to expect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Access and difficulty" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Further reading" })).toBeInTheDocument();
    expect(screen.getByText("Technique").closest("li")).toHaveTextContent("High");
    expect(screen.getByRole("link", { name: "Find Argentine Tango classes" })).toHaveAttribute(
      "href",
      "/?style=Argentine%20Tango"
    );

    const structuredData = container.querySelector('script[type="application/ld+json"]');
    expect(structuredData).not.toBeNull();
    expect(structuredData?.textContent).toContain('"@type":"Article"');
    expect(structuredData?.textContent).toContain('"@type":"BreadcrumbList"');
  });

  it("pre-generates every guide and returns canonical social metadata", async () => {
    expect(generateStaticParams()).toHaveLength(getDanceStyleGuides().length);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "tap" }) });
    expect(metadata.alternates?.canonical).toBe("/styles/tap");
    expect(metadata.openGraph).toMatchObject({ url: "/styles/tap" });
    expect(metadata.twitter).toBeDefined();
  });

  it("returns the standard not-found response for unknown slugs", async () => {
    await expect(StyleDetailPage({ params: Promise.resolve({ slug: "unknown" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

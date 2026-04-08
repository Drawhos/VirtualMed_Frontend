import { describe, it, expect } from "vitest";
import {
  cn,
  normalizeSpaces,
  getStatusBadgeVariant,
  getStatusBadgeName,
} from "@/lib/utils";
import { AppointmentStatus } from "@/constants/appointmentStatus";

describe("Utils - cn()", () => {
  it("should merge multiple class values", () => {
    const result = cn("px-2", "py-1");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("px-2", isActive && "bg-blue-500");
    expect(result).toContain("px-2");
  });

  it("should resolve tailwind class conflicts", () => {
    const result = cn("px-2", "px-4");
    expect(result).toContain("px-4");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(typeof result).toBe("string");
  });

  it("should handle array of classes", () => {
    const result = cn(["px-2", "py-1"]);
    expect(result).toBeDefined();
  });

  it("should filter out falsy values", () => {
    const result = cn("px-2", false && "bg-red-500", null, "py-1");
    expect(result).toContain("px-2");
    expect(result).toContain("py-1");
  });
});

describe("Utils - normalizeSpaces()", () => {
  it("should trim leading and trailing spaces", () => {
    const result = normalizeSpaces("  hello  ");
    expect(result).toBe("hello");
  });

  it("should replace multiple spaces with single space", () => {
    const result = normalizeSpaces("hello    world");
    expect(result).toBe("hello world");
  });

  it("should handle mixed whitespace characters", () => {
    const result = normalizeSpaces("hello  \t  world");
    expect(result).toBe("hello world");
  });

  it("should handle single spaces correctly", () => {
    const result = normalizeSpaces("hello world");
    expect(result).toBe("hello world");
  });

  it("should return empty string for whitespace only", () => {
    const result = normalizeSpaces("   ");
    expect(result).toBe("");
  });

  it("should handle empty string", () => {
    const result = normalizeSpaces("");
    expect(result).toBe("");
  });

  it("should handle strings with newlines and tabs", () => {
    const result = normalizeSpaces("hello\n\n  world\t\ttest");
    expect(result).toBe("hello world test");
  });
});

describe("Utils - getStatusBadgeVariant()", () => {
  it("should return 'outline' for SCHEDULED status", () => {
    const result = getStatusBadgeVariant(AppointmentStatus.SCHEDULED);
    expect(result).toBe("outline");
  });

  it("should return 'secondary' for CONFIRMED status", () => {
    const result = getStatusBadgeVariant(AppointmentStatus.CONFIRMED);
    expect(result).toBe("secondary");
  });

  it("should return 'default' for INPROGRESS status", () => {
    const result = getStatusBadgeVariant(AppointmentStatus.INPROGRESS);
    expect(result).toBe("default");
  });

  it("should return 'secondary' for COMPLETED status", () => {
    const result = getStatusBadgeVariant(AppointmentStatus.COMPLETED);
    expect(result).toBe("secondary");
  });

  it("should return 'destructive' for CANCELLED status", () => {
    const result = getStatusBadgeVariant(AppointmentStatus.CANCELLED);
    expect(result).toBe("destructive");
  });

  it("should return 'outline' for unknown status", () => {
    const result = getStatusBadgeVariant("UNKNOWN_STATUS");
    expect(result).toBe("outline");
  });

  it("should handle empty string", () => {
    const result = getStatusBadgeVariant("");
    expect(result).toBe("outline");
  });

  it("should return correct variant type", () => {
    const result = getStatusBadgeVariant(AppointmentStatus.SCHEDULED);
    expect(["default", "secondary", "destructive", "outline"]).toContain(
      result
    );
  });
});

describe("Utils - getStatusBadgeName()", () => {
  it("should return 'Programado' for SCHEDULED status", () => {
    const result = getStatusBadgeName(AppointmentStatus.SCHEDULED);
    expect(result).toBe("Programado");
  });

  it("should return 'Confirmado' for CONFIRMED status", () => {
    const result = getStatusBadgeName(AppointmentStatus.CONFIRMED);
    expect(result).toBe("Confirmado");
  });

  it("should return 'En curso' for INPROGRESS status", () => {
    const result = getStatusBadgeName(AppointmentStatus.INPROGRESS);
    expect(result).toBe("En curso");
  });

  it("should return 'Completado' for COMPLETED status", () => {
    const result = getStatusBadgeName(AppointmentStatus.COMPLETED);
    expect(result).toBe("Completado");
  });

  it("should return 'Cancelado' for CANCELLED status", () => {
    const result = getStatusBadgeName(AppointmentStatus.CANCELLED);
    expect(result).toBe("Cancelado");
  });

  it("should return the status value for unknown status", () => {
    const unknownStatus = "CUSTOM_STATUS";
    const result = getStatusBadgeName(unknownStatus);
    expect(result).toBe(unknownStatus);
  });

  it("should handle empty string", () => {
    const result = getStatusBadgeName("");
    expect(result).toBe("");
  });

  it("should be case-sensitive", () => {
    const result = getStatusBadgeName("scheduled");
    expect(result).toBe("scheduled");
  });

  it("should always return a string", () => {
    const result = getStatusBadgeName(AppointmentStatus.CONFIRMED);
    expect(typeof result).toBe("string");
  });
});

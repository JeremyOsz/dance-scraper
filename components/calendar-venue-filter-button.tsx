"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

type CalendarVenueFilterButtonProps = Omit<ButtonProps, "asChild" | "onClick" | "type"> & {
  venue: string;
};

export function CalendarVenueFilterButton({
  venue,
  children,
  ...props
}: CalendarVenueFilterButtonProps) {
  const router = useRouter();

  return (
    <Button
      {...props}
      type="button"
      onClick={() => {
        router.push(`/?mode=calendar&venue=${encodeURIComponent(venue)}` as Route);
      }}
    >
      {children}
    </Button>
  );
}

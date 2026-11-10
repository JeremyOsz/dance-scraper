"use client";

import { track } from "@vercel/analytics";
import { captureAppEvent, type AnalyticsProperties } from "@/lib/analytics";
import React, { type ComponentPropsWithoutRef } from "react";
import type { OutboundRedirectKind } from "@/lib/outbound-redirect";

type Props = ComponentPropsWithoutRef<"a"> & {
  href: string;
  analyticsKind: OutboundRedirectKind;
  destHost: string;
  analyticsProperties?: AnalyticsProperties;
};

export const TrackedOutboundLink = React.forwardRef<HTMLAnchorElement, Props>(
  function TrackedOutboundLink({ href, analyticsKind, destHost, analyticsProperties, children, onClick, ...rest }, ref) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noreferrer"
        {...rest}
        onClick={(event) => {
          track("outbound_click", {
            kind: analyticsKind,
            dest_host: destHost || "unknown"
          });
          captureAppEvent("outbound_click", {
            ...analyticsProperties,
            kind: analyticsKind,
            dest_host: destHost || "unknown"
          });
          onClick?.(event);
        }}
      >
        {children}
      </a>
    );
  }
);
TrackedOutboundLink.displayName = "TrackedOutboundLink";

"use client";

import { track } from "@vercel/analytics";
import React, { type ComponentPropsWithoutRef } from "react";
import type { OutboundRedirectKind } from "@/lib/outbound-redirect";

type Props = ComponentPropsWithoutRef<"a"> & {
  href: string;
  analyticsKind: OutboundRedirectKind;
  destHost: string;
};

export const TrackedOutboundLink = React.forwardRef<HTMLAnchorElement, Props>(
  function TrackedOutboundLink({ href, analyticsKind, destHost, children, onClick, ...rest }, ref) {
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
          onClick?.(event);
        }}
      >
        {children}
      </a>
    );
  }
);
TrackedOutboundLink.displayName = "TrackedOutboundLink";

import * as React from "react";
import { NavLink as RRNavLink, type NavLinkProps as RRNavLinkProps } from "react-router-dom";

type Props = Omit<RRNavLinkProps, "className"> & {
  className?: string;
};

/**
 * StreamBias safe NavLink wrapper:
 * - NEVER calls preventDefault
 * - Uses react-router-dom NavLink directly (client-side navigation)
 * - Preserves your existing className usage
 */
export const NavLink = React.forwardRef<HTMLAnchorElement, Props>(({ className, onClick, ...props }, ref) => {
  return (
    <RRNavLink
      ref={ref}
      {...props}
      className={className}
      onClick={(e) => {
        // allow consumer onClick (e.g. close mobile drawer)
        onClick?.(e);

        // DO NOT preventDefault. DO NOT stopPropagation.
        // Let react-router handle navigation normally.
      }}
    />
  );
});

NavLink.displayName = "NavLink";

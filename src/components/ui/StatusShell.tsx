"use client";

import { LogoMessageShell } from "./LogoMessageShell";

interface StatusShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  showBack?: boolean;
}

/** @deprecated Prefer LogoMessageShell — kept for existing call sites. */
export function StatusShell(props: StatusShellProps) {
  const { children, ...rest } = props;
  return (
    <LogoMessageShell
      {...rest}
      actions={
        <>
          {children}
          {props.actions}
        </>
      }
    />
  );
}

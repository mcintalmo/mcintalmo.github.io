"use client";

import { useMaybeRoomContext, useMaybeSessionContext } from "@livekit/components-react";
import type { VariantProps } from "class-variance-authority";
import { PhoneOffIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button, type buttonVariants } from "../ui/button";
import { cn } from "../ui/utils";

export interface AgentDisconnectButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "destructive" | "ghost" | "link";
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function AgentDisconnectButton({
  icon,
  size = "default",
  variant = "destructive",
  children,
  onClick,
  ...props
}: AgentDisconnectButtonProps) {
  const session = useMaybeSessionContext();
  const room = useMaybeRoomContext();
  const end =
    session?.end ??
    (() => {
      room?.disconnect();
    });
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (typeof end === "function") {
      end();
    }
  };

  return (
    <Button size={size} variant={variant} onClick={handleClick} {...props}>
      {icon ?? <PhoneOffIcon />}
      {children ?? (
        <span className={cn(size?.includes("icon") && "sr-only")}>END CALL</span>
      )}
    </Button>
  );
}

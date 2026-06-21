import { cva, type VariantProps } from "class-variance-authority";
import { Track } from "livekit-client";
import {
  LoaderIcon,
  MicIcon,
  MicOffIcon,
  MonitorOffIcon,
  MonitorUpIcon,
  VideoIcon,
  VideoOffIcon,
} from "lucide-react";
import { type ComponentProps, Fragment, useMemo, useState } from "react";
import { Toggle } from "../ui/toggle";
import { cn } from "../ui/utils";

export const agentTrackToggleVariants = cva(["size-9"], {
  variants: {
    size: {
      default: "h-9 px-2 min-w-9",
      sm: "h-8 px-1.5 min-w-8",
      lg: "h-10 px-2.5 min-w-10",
    },
    variant: {
      default: [
        "data-[state=off]:bg-destructive/10 data-[state=off]:text-destructive",
        "data-[state=off]:hover:bg-destructive/15",
        "data-[state=off]:focus-visible:ring-destructive/30",
        "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        "data-[state=on]:hover:bg-foreground/10",
      ],
      outline: [
        "data-[state=off]:bg-destructive/10 data-[state=off]:text-destructive data-[state=off]:border-destructive/20",
        "data-[state=off]:hover:bg-destructive/15 data-[state=off]:hover:text-destructive",
        "data-[state=off]:focus:text-destructive",
        "data-[state=off]:focus-visible:border-destructive data-[state=off]:focus-visible:ring-destructive/30",
        "data-[state=on]:hover:bg-foreground/10 data-[state=on]:hover:border-foreground/12",
        "dark:data-[state=on]:hover:bg-foreground/10",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function getSourceIcon(source: Track.Source, enabled: boolean, pending = false) {
  if (pending) {
    return LoaderIcon;
  }

  switch (source) {
    case Track.Source.Microphone:
      return enabled ? MicIcon : MicOffIcon;
    case Track.Source.Camera:
      return enabled ? VideoIcon : VideoOffIcon;
    case Track.Source.ScreenShare:
      return enabled ? MonitorUpIcon : MonitorOffIcon;
    default:
      return Fragment;
  }
}

export type AgentTrackToggleProps = VariantProps<typeof agentTrackToggleVariants> &
  ComponentProps<"button"> & {
    size?: "sm" | "default" | "lg";
    variant?: "default" | "outline";
    source: "camera" | "microphone" | "screen_share";
    pending?: boolean;
    pressed?: boolean;
    defaultPressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
  };

export function AgentTrackToggle({
  size = "default",
  variant = "default",
  source,
  pending = false,
  pressed,
  defaultPressed = false,
  className,
  onPressedChange,
  ...props
}: AgentTrackToggleProps) {
  const [uncontrolledPressed, setUncontrolledPressed] = useState(
    defaultPressed ?? false,
  );
  const isControlled = pressed !== undefined;
  const resolvedPressed = useMemo(
    () => (isControlled ? pressed : uncontrolledPressed) ?? false,
    [isControlled, pressed, uncontrolledPressed],
  );
  const IconComponent = getSourceIcon(source as Track.Source, resolvedPressed, pending);
  const handlePressedChange = (nextPressed: boolean) => {
    if (!isControlled) {
      setUncontrolledPressed(nextPressed);
    }
    onPressedChange?.(nextPressed);
  };

  return (
    <Toggle
      size={size}
      variant={variant}
      pressed={isControlled ? pressed : undefined}
      defaultPressed={isControlled ? undefined : defaultPressed}
      aria-label={`Toggle ${source}`}
      onPressedChange={handlePressedChange}
      className={cn(
        agentTrackToggleVariants({
          size,
          variant: variant ?? "default",
          className,
        }),
      )}
      {...props}
    >
      <IconComponent className={cn(pending && "animate-spin")} />
      {props.children}
    </Toggle>
  );
}

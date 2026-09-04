import * as React from "react";
import {
  controlSize,
  fieldBase,
  type ControlSize,
} from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  inputSize?: ControlSize;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", inputSize = "md", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-field-control=""
        className={cn("flex", fieldBase, controlSize[inputSize], className)}
        {...props}
      />
    );
  },
);

import { ComponentProps, ReactNode } from "react";
import { Button } from "@shared/ui";
import { IconNames } from "@shared/ui/Icon/data";

type ButtonProps = ComponentProps<typeof Button>;

export type OptionBase = {
  id: string;
  title: string;
  icon: IconNames | ReactNode;
};

export type LinkOption = OptionBase & { to: string };
export type ButtonOption = OptionBase & { onClick: ButtonProps['onClick'] };

export type DropdownOption = LinkOption | ButtonOption;

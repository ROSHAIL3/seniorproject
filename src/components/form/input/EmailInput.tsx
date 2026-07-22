import Input, { type InputProps } from "./InputField";
import { MailIcon } from "@/icons";

export type EmailInputProps = Omit<InputProps, "type" | "startIcon" | "startIconDivider">;

export default function EmailInput(props: EmailInputProps) {
  return <Input {...props} type="email" startIcon={<MailIcon className="size-[18px] shrink-0" />} startIconDivider />;
}

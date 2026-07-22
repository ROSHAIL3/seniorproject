"use client";

import { cn } from "@/app/(landing)/lib/utils";
import ContactIllustration from "@/app/(landing)/assets/illustrations/contact.svg";
import Button from "./Button";
import InputRadio from "./InputRadio";
import InputText from "./InputText";

type ContactProps = {
  className?: string;
};

export default function Contact({ className }: ContactProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Form submission logic can be added here
  };

  return (
    <div
      className={cn(
        "flex items-center px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto scroll-mt-[40px]",
        className
      )}
      id="contact"
    >
      <div className="bg-[#f3f3f3] flex gap-[28px] pb-[80px] pt-[60px] max-xl:py-[50px] max-sm:py-[30px] pl-[100px] max-xl:pl-[60px] max-lg:px-[40px] max-sm:px-[30px] relative rounded-[45px] shrink-0 w-full overflow-hidden">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-[39px] w-full relative flex-1 z-10"
          id="contact-form"
          method="POST"
        >
          {/* Radio Buttons */}
          <div
            className="flex flex-wrap gap-x-[36px] gap-y-[20px] items-start leading-0 relative"
            data-name="Radio buttons"
          >
            <InputRadio
              name="formType"
              value="say-hi"
              label="Say Hi"
              dataName="Say hi"
              defaultChecked={true}
            />
            <InputRadio
              name="formType"
              value="get-quote"
              label="Get a Quote"
              dataName="Get a quote"
            />
          </div>

          {/* Form Fields */}
          <div
            className="flex flex-col gap-[26px] pt-[2px] relative"
            data-name="Fields"
          >
            <InputText
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              label="Name"
              placeholder="Name"
            />
            <InputText
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              label="Email*"
              placeholder="Email"
              required
            />
            <InputText
              id="message"
              name="message"
              type="textarea"
              label="Message*"
              placeholder="Message"
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center py-[19px]"
            data-name="Button"
          >
            Send Message
          </Button>
        </form>

        {/* Illustration */}
        <div className="relative flex-1 max-lg:hidden" data-name="Illustration">
          <div className="absolute top-[2px] right-0 -bottom-[18px] w-full max-w-[367px] flex items-start justify-start">
            <ContactIllustration
              className="block max-w-[200%] h-full w-auto absolute top-0 left-0 bottom-0"
              width={692}
              height={649}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

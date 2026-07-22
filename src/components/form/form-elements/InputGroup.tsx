"use client";
import React from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import EmailInput from "../input/EmailInput";
import PhoneInput from "../group-input/PhoneInput";

export default function InputGroup() {
  const handlePhoneNumberChange = (phoneNumber: string) => {
    console.log("Updated phone number:", phoneNumber);
  };
  return (
    <ComponentCard title="Input Group">
      <div className="space-y-6">
        <div>
          <Label>Email</Label>
          <EmailInput placeholder="info@gmail.com" />
        </div>
        <div>
          <Label>Phone</Label>
          <PhoneInput
            defaultCountry="US"
            placeholder="Phone number"
            onChange={handlePhoneNumberChange}
          />
        </div>
      </div>
    </ComponentCard>
  );
}

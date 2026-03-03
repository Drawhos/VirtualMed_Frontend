"use client";

import React from "react";
import PatientRegistrationForm from "@/components/PatientRegistrationForm";

export default function Page() {
  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-semibold mb-4 text-center">
        Crea tu cuenta
      </h1>
      <h3 className="text-m font-semibold mb-4 text-left text-gray-500">
        Únete a VirtualMed y accede a atención médica de calidad desde la comodidad de tu hogar
      </h3>
      <PatientRegistrationForm />
    </div>
  );
}

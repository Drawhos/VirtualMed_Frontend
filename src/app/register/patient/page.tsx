"use client";

import React from "react";
import PatientRegistrationForm from "@/components/PatientRegistrationForm";

export default function Page() {
  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-black text-primary">
        VirtualMed
      </h3>
      <h1 className="text-4xl font-black text-slate-800">
        Crea tu cuenta
      </h1>
      <h3 className="text-slate-500 mt-2">
        Únete a VirtualMed y accede a atención médica de calidad desde la comodidad de tu hogar
      </h3>
      <br />
      <PatientRegistrationForm />
    </div>
  );
}

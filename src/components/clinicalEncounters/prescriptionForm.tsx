import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const encounterId = searchParams.get('encounterId');

export function PrescriptionForm() {
    return (<div className="bg-white p-6 pt-16">
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Crear Prescripción para Encuentro {encounterId}</h2>
            {/* Aquí iría el formulario de prescripción */}
        </div>
    </div>);
}
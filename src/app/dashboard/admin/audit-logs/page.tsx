export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Logs Auditoría</h1>
        <p className="text-sm text-gray-600">Revisión de eventos críticos y trazabilidad del sistema.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">No hay registros disponibles por el momento.</p>
      </div>
    </div>
  );
}

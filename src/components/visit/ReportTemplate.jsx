
import React from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDateAsLocal = (dateStr) => {
    if (!dateStr) return '-';
    // Handle both YYYY-MM-DD and ISO strings safely
    try {
        const rawDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [year, month, day] = rawDate.split('-').map(Number);
        // Create date at noon local time to avoid timezone shifts
        // month is 0-indexed in JS Date
        return format(new Date(year, month - 1, day, 12, 0, 0), "d 'de' MMMM, yyyy", { locale: ptBR });
    } catch (e) {
        return dateStr; // Fallback
    }
};

export function ReportTemplate({ data, isPdfGeneration = false }) {
    const { visit, client, primaryLocation, fullReportStructure, photos, technicianUser } = data;

    // Use technician attached to visit, or fallback to Created By, or current user if needed
    const techName = technicianUser?.name || visit.technician_email || 'Técnico Responsável';
    const techSignature = technicianUser?.signature_url;

    return (
        <div className={`bg-white text-slate-900 font-sans text-sm leading-tight ${isPdfGeneration ? 'p-0' : 'p-8 max-w-[210mm] mx-auto min-h-[297mm]'}`}>

            {/* Header */}
            <header className="border-b-2 border-blue-600 pb-4 mb-6 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white p-3 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31" /><path d="M14 2v7.31" /><path d="M8.5 2h7" /><path d="M14 9.3a6.36 6.36 0 0 1 0 11.91A6.36 6.36 0 0 1 14 9.3Z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Relatório Técnico</h1>
                        <p className="text-blue-600 font-medium">Análise de Qualidade de Água</p>
                    </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                    <p className="font-bold text-slate-800 text-base">WGA Brasil</p>
                    <p>www.wgabrasil.com.br</p>
                    <p>contato@wgabrasil.com.br</p>
                </div>
            </header>

            {/* Info Block */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 grid grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold text-blue-800 mb-2 uppercase text-xs">Cliente</h3>
                    <p className="font-bold text-lg">{client?.name}</p>
                    <p>{client?.address}</p>
                    <p>{primaryLocation?.city}/{primaryLocation?.state}</p>
                    {client?.contact_name && <p className="mt-1 text-xs text-slate-500">A/C: {client.contact_name}</p>}
                </div>
                <div className="text-right">
                    <h3 className="font-bold text-blue-800 mb-2 uppercase text-xs">Dados da Visita</h3>
                    <p><span className="font-semibold">Data:</span> {formatDateAsLocal(visit?.visit_date)}</p>
                    <p><span className="font-semibold">Local:</span> {primaryLocation?.name}</p>
                    <p className="break-all"><span className="font-semibold">Técnico:</span> {techName}</p>
                    <p><span className="font-semibold">ID:</span> #{visit?.id?.slice(0, 8)}</p>
                </div>
            </div>

            {/* Results Table */}
            <section className="mb-8">
                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-1 mb-4">Resultados Analíticos</h2>

                {fullReportStructure?.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-4">Nenhum resultado registrado.</p>
                ) : (
                    <div className="space-y-6">
                        {fullReportStructure.map((loc, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-500 font-semibold uppercase text-xs tracking-wider">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                    {loc.location.name}
                                </div>

                                {loc.equipments.map((eq, eqIdx) => (
                                    <div key={eqIdx} className="bg-white border border-slate-200 rounded-sm overflow-hidden text-xs">
                                        <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center gap-2 font-bold text-blue-900 border-l-4 border-l-blue-600">
                                            <div className="h-3 w-3 bg-blue-600 rounded-sm"></div> {/* Equipment Icon Placeholder */}
                                            {eq.equipment.name}
                                        </div>
                                        <table className="w-full">
                                            <thead className="bg-slate-50 text-slate-500 font-semibold text-left">
                                                <tr>
                                                    <th className="px-4 py-2 w-1/3">Parâmetro</th>
                                                    <th className="px-4 py-2 text-center w-1/4">Faixa (VMP)</th>
                                                    <th className="px-4 py-2 text-center w-1/6">Unid.</th>
                                                    <th className="px-4 py-2 text-right w-1/4">Result.</th>
                                                    <th className="px-4 py-2 text-center w-8">St</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {eq.tests.map((test, tIdx) => (
                                                    <tr key={tIdx} className={tIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                                        <td className="px-4 py-1.5 font-medium text-slate-700">{test.name}</td>
                                                        <td className="px-4 py-1.5 text-center font-mono text-slate-500 bg-slate-50/50">{test.min_value} - {test.max_value}</td>
                                                        <td className="px-4 py-1.5 text-center text-slate-500">{test.unit}</td>
                                                        <td className="px-4 py-1.5 text-right font-mono font-bold text-slate-800">
                                                            {test.result ? test.result.measured_value : '-'}
                                                        </td>
                                                        <td className="px-4 py-1.5 text-center">
                                                            {test.result?.status_light === 'red' && <div className="w-2 h-2 rounded-full bg-red-500 mx-auto" />}
                                                            {test.result?.status_light === 'green' && <div className="w-2 h-2 rounded-full bg-green-500 mx-auto" />}
                                                            {test.result?.status_light === 'yellow' && <div className="w-2 h-2 rounded-full bg-yellow-400 mx-auto" />}
                                                            {!test.result && <div className="w-2 h-2 rounded-full bg-slate-200 mx-auto" />}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Observations / Technical Opinion */}
            <section className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-1 mb-4">Parecer Técnico</h2>
                <div className="bg-slate-50 p-4 rounded border border-slate-200 min-h-[100px] text-justify whitespace-pre-wrap">
                    {visit.observations || "Nenhuma observação registrada."}
                </div>
            </section>

            {/* Photos Gallery */}
            {photos && photos.length > 0 && (
                <section className="mb-8 break-inside-avoidPage">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-1 mb-4">Registro Fotográfico</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {photos.map(p => (
                            <div key={p.id} className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden relative">
                                {/* Create a proxy-friendly image element */}
                                <img
                                    src={p.photo_url}
                                    className="w-full h-full object-cover"
                                    alt="Evidência"
                                    crossOrigin="anonymous" // Essential for html2canvas
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Signatures */}
            <section className="mt-12 pt-8 border-t border-slate-200 break-inside-avoid">
                <div className="grid grid-cols-2 gap-12 text-center">
                    {/* Technician Signature */}
                    <div className="flex flex-col items-center">
                        <div className="h-20 mb-2 flex items-end justify-center w-full">
                            {techSignature ? (
                                <img src={techSignature} className="max-h-full mb-1" alt="Assinatura Técnico" crossOrigin="anonymous" />
                            ) : (
                                <div className="w-32 h-0.5 bg-slate-300"></div>
                            )}
                        </div>
                        <div className="border-t border-slate-300 w-full pt-1">
                            <p className="font-bold text-xs uppercase">{techName}</p>
                            <p className="text-[10px] text-slate-500">Técnico WGA Brasil</p>
                        </div>
                    </div>

                    {/* Client Signature */}
                    <div className="flex flex-col items-center">
                        <div className="h-20 mb-2 flex items-end justify-center w-full">
                            {visit.client_signature_url ? (
                                <img src={visit.client_signature_url} className="max-h-full mb-1" alt="Assinatura Cliente" crossOrigin="anonymous" />
                            ) : (
                                <div className="text-xs text-slate-300 italic mb-2">Não assinado</div>
                            )}
                        </div>
                        <div className="border-t border-slate-300 w-full pt-1">
                            {client?.contact_name ? (
                                <p className="font-bold text-xs uppercase">{client.contact_name}</p>
                            ) : (
                                <p className="font-bold text-xs uppercase">Cliente</p>
                            )}
                            <p className="text-[10px] text-slate-500">Responsável no Local</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer disclaimer */}
            <footer className="mt-8 text-[10px] text-slate-400 text-center border-t border-slate-100 pt-4">
                Este relatório foi gerado eletronicamente e possui validade jurídica.
                WGA Brasil - Soluções em Tratamento de Água.
            </footer>
        </div>
    );
}

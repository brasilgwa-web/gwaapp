
import React from 'react';
import { Button } from "@/components/ui/button";
import { Printer, FlaskConical, MapPin, Beaker } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ReportTemplate({ data, onPrint, isPdfGeneration }) {

    // Safety check for null data
    if (!data || !data.visit) return null;

    const { visit, client, primaryLocation, fullReportStructure, photos, technicianUser } = data;

    // Display Name Logic
    const techName = technicianUser?.full_name || (visit?.technician_email !== 'current_user' ? visit?.technician_email : 'Técnico Responsável');

    return (
        <div className={`bg-white min-h-[297mm] ${isPdfGeneration ? '' : 'p-4 md:p-[15mm] mx-auto max-w-[210mm] shadow-lg print:shadow-none print:w-[210mm] print:max-w-none print:min-h-0 print:m-0 print:overflow-visible'}`}>
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>

            {/* Action Bar - Hidden on Print/PDF Gen */}
            {!isPdfGeneration && (
                <div className="w-full mb-6 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                    <Button variant="outline" onClick={() => window.history.back()}>Voltar</Button>
                    <div className="flex gap-2">
                        <Button onClick={onPrint || (() => window.print())} className="bg-blue-600 w-full md:w-auto">
                            <Printer className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
                        </Button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="border-b-2 border-blue-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-3 rounded-lg print:border print:border-blue-600">
                        <FlaskConical className="w-8 h-8 text-white print:text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">Relatório Técnico</h1>
                        <p className="text-sm text-slate-500">Análise de Qualidade de Água</p>
                    </div>
                </div>
                <div className="text-left md:text-right text-sm text-slate-600">
                    <p className="font-bold text-lg text-slate-900">WGA Brasil</p>
                    <p>www.wgabrasil.com.br</p>
                    <p>contato@wgabrasil.com.br</p>
                </div>
            </header>

            {/* Info Block */}
            <div className="grid grid-cols-2 gap-8 mb-8 text-sm border rounded-lg p-4 bg-slate-50 print:bg-white print:border-slate-300">
                <div>
                    <h3 className="font-bold text-blue-800 mb-2 uppercase text-xs">Cliente</h3>
                    <p className="font-semibold text-lg">{client?.name}</p>
                    <p className="break-words">{client?.address}</p>
                    <p>{client?.city_state}</p>
                    <p className="mt-1 text-slate-500">A/C: {client?.contact_name}</p>
                </div>
                <div className="text-right">
                    <h3 className="font-bold text-blue-800 mb-2 uppercase text-xs">Dados da Visita</h3>
                    <p><span className="font-semibold">Data:</span> {visit?.visit_date ? format(new Date(visit.visit_date.length === 10 ? visit.visit_date + 'T12:00:00' : visit.visit_date), "d 'de' MMMM, yyyy", { locale: ptBR }) : '-'}</p>
                    <p><span className="font-semibold">Local:</span> {primaryLocation?.name}</p>
                    <p className="break-all"><span className="font-semibold">Técnico:</span> {techName}</p>
                    <p><span className="font-semibold">ID:</span> #{visit?.id?.slice(0, 8)}</p>
                </div>
            </div>

            {/* Results Table */}
            <div className="mb-8 space-y-6">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">Resultados Analíticos</h2>

                {fullReportStructure?.map(({ location, equipments }) => (
                    <div key={location.id} className="mb-8">
                        <div className="flex items-center gap-2 mb-4 text-slate-600 uppercase text-xs font-bold tracking-wider border-b border-slate-200 pb-1 break-after-avoid">
                            <MapPin className="w-4 h-4" />
                            {location.name}
                        </div>

                        {equipments.map(({ equipment, tests }) => (
                            <div key={equipment.id} className="mb-6 ml-2 break-inside-avoid">
                                <div className="flex items-center gap-2 mb-2 pl-2 border-l-4 border-blue-600 bg-blue-50 py-1 break-after-avoid print:bg-slate-100">
                                    <Beaker className="w-4 h-4 text-blue-700" />
                                    <h3 className="font-bold text-blue-700 uppercase text-sm">{equipment.name}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left table-fixed min-w-[500px] md:min-w-0">
                                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="p-2 w-[35%]">Parâmetro</th>
                                                <th className="p-2 text-center w-[25%]">Faixa (VMP)</th>
                                                <th className="p-2 text-center w-[15%]">Unid.</th>
                                                <th className="p-2 text-right w-[15%]">Result.</th>
                                                <th className="p-2 text-center w-[10%]">St</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {tests.map((t, i) => (
                                                <tr key={i}>
                                                    <td className="p-2 font-medium text-slate-800 break-words">
                                                        {t.name}
                                                        {t.observation && <div className="text-[10px] text-slate-400 font-normal leading-tight">{t.observation}</div>}
                                                    </td>
                                                    <td className="p-2 text-center text-slate-500 text-xs font-mono bg-slate-50/50 whitespace-nowrap">
                                                        {t.min_value} - {t.max_value}
                                                    </td>
                                                    <td className="p-2 text-center text-slate-500 text-xs">
                                                        {t.unit}
                                                    </td>
                                                    <td className="p-2 text-right font-bold font-mono print:text-black">
                                                        {(t.result?.measured_value !== undefined && t.result?.measured_value !== null && t.result?.measured_value !== '') ? t.result.measured_value : '-'}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {t.result ? (
                                                            <span className={`inline-block w-3 h-3 rounded-full ${t.result.status_light === 'red' ? 'bg-red-500' :
                                                                t.result.status_light === 'yellow' ? 'bg-yellow-400' :
                                                                    'bg-green-500'
                                                                } print:border print:border-slate-400 shadow-sm`}></span>
                                                        ) : (
                                                            <span className="inline-block w-3 h-3 rounded-full bg-slate-200"></span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                {(!fullReportStructure || fullReportStructure.length === 0) && <p className="text-slate-500 italic">Sem equipamentos ou medições configuradas.</p>}
            </div>

            {/* Observations / AI Analysis */}
            <div className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Parecer Técnico</h2>
                <div className="bg-slate-50 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-line print:bg-white print:border text-justify">
                    {visit?.observations || "Nenhuma observação registrada."}
                </div>
            </div>

            {/* Photos Gallery */}
            {photos && photos.length > 0 && (
                <div className="mb-8 break-inside-avoid">
                    <h2 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Registro Fotográfico</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {photos.map(p => (
                            <div key={p.id} className="space-y-1">
                                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border">
                                    <img src={p.photo_url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="Evidência" />
                                </div>
                                {p.description && <p className="text-xs text-slate-500 text-center">{p.description}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Signatures */}
            <div className="mt-12 pt-8 break-inside-avoid">
                <div className="grid grid-cols-2 gap-12">
                    <div className="text-center">
                        <div className="border-b border-slate-400 mb-2 h-16 flex items-end justify-center">
                            {technicianUser?.signature_url ? (
                                <img src={technicianUser.signature_url} crossOrigin="anonymous" className="max-h-full mb-1" alt="Assinatura Técnico" />
                            ) : (
                                <span className="text-slate-400 italic text-xs mb-2">Assinado digitalmente</span>
                            )}
                        </div>
                        <p className="font-bold text-sm uppercase">{techName}</p>
                        <p className="text-xs text-slate-500">Técnico WGA Brasil</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-slate-400 mb-2 h-16 flex items-end justify-center">
                            {visit?.client_signature_url ? (
                                <img src={visit.client_signature_url} crossOrigin="anonymous" className="max-h-full mb-1" alt="Assinatura Cliente" />
                            ) : (
                                <span className="text-slate-300 text-xs mb-2">Não assinado</span>
                            )}
                        </div>
                        <p className="font-bold text-sm uppercase">{client?.contact_name || 'Cliente'}</p>
                        <p className="text-xs text-slate-500">Responsável no Local</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-4 border-t text-center text-xs text-slate-400 print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white">
                <p>Relatório gerado em {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })} • WGA Brasil App</p>
            </footer>
        </div>
    );
}

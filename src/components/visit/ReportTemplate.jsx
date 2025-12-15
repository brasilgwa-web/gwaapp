
import React from 'react';
import { formatDateAsLocal } from '@/lib/utils';
import { format } from "date-fns";

export function ReportTemplate({ data, isPdfGeneration = false }) {
    const { visit, client, primaryLocation, fullReportStructure, photos, technicianUser } = data;

    // Technician and Visit Metadata
    const techName = technicianUser?.name || visit.technician_email || 'Técnico Responsável';
    const techSignature = technicianUser?.signature_url;

    // Custom formatted dates
    const visitDate = visit.visit_date ? new Date(visit.visit_date.includes('T') ? visit.visit_date.split('T')[0] : visit.visit_date) : new Date();
    // Fix timezone offset manually for display if needed, but 'formatDateAsLocal' handles it.
    // For the custom report number: E-YY-MM-XXXX
    const reportNumber = visit.report_number || `E-${format(visitDate, 'yy-MM')}-${visit.id.slice(0, 4).toUpperCase()}`;

    return (
        <div className={`bg-white text-slate-900 font-sans text-sm leading-tight ${isPdfGeneration ? 'p-0' : 'p-8 max-w-[210mm] mx-auto min-h-[297mm]'}`}>

            {/* Header */}
            <header className="border-b-2 border-blue-600 pb-4 mb-6 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    {/* Logo WGA */}
                    <div className="bg-blue-600 text-white p-3 rounded-lg w-12 h-12 flex items-center justify-center font-bold text-xl">
                        W
                    </div>

                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900 leading-none">Relatório de Visita Técnica</h1>
                        <p className="text-blue-600 font-medium text-sm">Tratamento de Águas Industriais</p>
                    </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                    <p className="font-bold text-slate-800 text-sm">WGA Brasil</p>
                    <p>Relatório Nº: <span className="text-slate-900 font-mono font-bold">{reportNumber}</span></p>
                    <p>{formatDateAsLocal(visit.visit_date)}</p>
                </div>
            </header>

            {/* Client & Visit Info Grid */}
            <section className="bg-slate-50 p-4 rounded-sm border border-slate-200 mb-6 text-xs">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div className="col-span-1">
                        <span className="font-bold text-slate-700 uppercase block mb-0.5">Cliente</span>
                        <div className="font-medium text-slate-900 text-sm">{client?.name}</div>
                        <div className="text-slate-500">{client?.address}</div>
                        <div className="text-slate-500">{primaryLocation?.city} - {primaryLocation?.state}</div>
                    </div>
                    <div className="col-span-1 text-right">
                        <span className="font-bold text-slate-700 uppercase block mb-0.5">Detalhes do Serviço</span>
                        <div className="grid grid-cols-2 gap-2 text-left ml-auto w-fit">
                            <div className="text-slate-500 text-right">Técnico:</div>
                            <div className="font-medium">{techName}</div>
                            <div className="text-slate-500 text-right">Código Cliente:</div>
                            <div className="font-medium">{client?.client_code || '-'}</div>
                            {visit.service_start_time && (
                                <>
                                    <div className="text-slate-500 text-right">Chegada:</div>
                                    <div className="font-medium">{visit.service_start_time.substring(0, 5)}</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* 1. Resultados Analíticos (Readings) */}
            <section className="mb-8">
                <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-4 flex items-center gap-2">
                    <span className="bg-blue-600 w-1 h-4 block rounded-sm"></span>
                    Resultados Analíticos
                </h2>

                {fullReportStructure?.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-4">Nenhum resultado registrado.</p>
                ) : (
                    <div className="space-y-6">
                        {fullReportStructure.map((loc, idx) => (
                            <div key={idx} className="space-y-4 break-inside-avoid">
                                <div className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-100 pb-1">
                                    Local: {loc.location.name}
                                </div>

                                {loc.equipments.map((eq, eqIdx) => (
                                    <div key={eqIdx} className="mb-4">
                                        {/* Equipment Header with Sample Info */}
                                        <div className="bg-blue-50/50 px-3 py-2 border border-blue-100 rounded-t-sm flex justify-between items-center text-xs">
                                            <div className="font-bold text-blue-900 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                {eq.equipment.name}
                                            </div>
                                            <div className="flex gap-4 text-slate-600">
                                                {eq.sample?.collection_time && <span><span className="font-semibold">Coleta:</span> {eq.sample.collection_time.substring(0, 5)}h</span>}
                                                {eq.sample?.complementary_info && <span><span className="font-semibold">Obs:</span> {eq.sample.complementary_info}</span>}
                                            </div>
                                        </div>

                                        {/* Readings Table */}
                                        <table className="w-full text-xs border-x border-b border-slate-200">
                                            <thead className="bg-slate-50 text-slate-500 font-semibold text-left">
                                                <tr>
                                                    <th className="px-3 py-1.5 w-[30%]">Parâmetro</th>
                                                    <th className="px-3 py-1.5 text-center w-[15%]">Unidade</th>
                                                    <th className="px-3 py-1.5 text-center w-[20%]">Faixa Controle</th>
                                                    <th className="px-3 py-1.5 text-center w-[15%]">Resultado</th>
                                                    <th className="px-3 py-1.5 text-right w-[20%]">Metodologia</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {eq.tests.map((test, tIdx) => (
                                                    <tr key={tIdx} className={tIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                                        <td className="px-3 py-1 font-medium text-slate-700">{test.name}</td>
                                                        <td className="px-3 py-1 text-center text-slate-500">{test.unit || '-'}</td>
                                                        <td className="px-3 py-1 text-center font-mono text-slate-500">{test.min_value} - {test.max_value}</td>
                                                        <td className="px-3 py-1 text-center font-bold">
                                                            {test.result ? (
                                                                <span className={test.result.status_light === 'red' ? 'text-red-600' : test.result.status_light === 'green' ? 'text-green-600' : 'text-yellow-600'}>
                                                                    {test.result.measured_value}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-3 py-1 text-right text-[9px] text-slate-400 truncate max-w-[100px]" title={test.methodology}>
                                                            {test.methodology || '-'}
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

            {/* 2. Quadro de Dosagens e Estoques (Dosage Board) - V1.1 */}
            <section className="mb-8 break-inside-avoid">
                <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-4 flex items-center gap-2">
                    <span className="bg-green-600 w-1 h-4 block rounded-sm"></span>
                    Quadro de Dosagens e Estoques
                </h2>

                {fullReportStructure?.some(l => l.equipments.some(e => e.dosages.some(d => d.record?.current_stock || d.record?.dosage_applied))) ? (
                    <div className="space-y-6">
                        {fullReportStructure.map((loc, idx) => (
                            <div key={idx} className="space-y-4">
                                {loc.equipments.map((eq, eqIdx) => {
                                    // Filter only products that have data or are relevant
                                    const activeDosages = eq.dosages.filter(d => d.record?.current_stock != null || d.record?.dosage_applied != null || d.product);
                                    if (activeDosages.length === 0) return null;

                                    return (
                                        <div key={eqIdx} className="bg-white border border-slate-200 rounded-sm overflow-hidden text-xs mb-2">
                                            <div className="bg-green-50 px-3 py-2 border-b border-green-100 font-bold text-green-900 border-l-4 border-l-green-600">
                                                {loc.location.name} - {eq.equipment.name}
                                            </div>
                                            <table className="w-full">
                                                <thead className="bg-slate-50 text-slate-500 font-semibold text-left">
                                                    <tr>
                                                        <th className="px-3 py-1.5 w-1/3">Produto Químico</th>
                                                        <th className="px-3 py-1.5 text-center">Unidade</th>
                                                        <th className="px-3 py-1.5 text-center">Estoque Local (Kg/L)</th>
                                                        <th className="px-3 py-1.5 text-center">Dosagem Aplicada</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {activeDosages.map((item, dIdx) => (
                                                        <tr key={dIdx} className="hover:bg-slate-50">
                                                            <td className="px-3 py-1.5 font-medium text-slate-700">{item.product.name}</td>
                                                            <td className="px-3 py-1.5 text-center text-slate-500">{item.product.unit}</td>
                                                            <td className="px-3 py-1.5 text-center font-bold text-slate-700">{item.record?.current_stock ?? '-'}</td>
                                                            <td className="px-3 py-1.5 text-center font-bold text-slate-700">{item.record?.dosage_applied ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 italic text-center py-2 text-xs">Nenhum registro de dosagem.</p>
                )}
            </section>

            {/* 3. Descargas e Drenagens - V1.1 */}
            {visit.discharges_drainages && (
                <section className="mb-6 break-inside-avoid">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Descargas e Drenagens</h2>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify">
                        {visit.discharges_drainages}
                    </div>
                </section>
            )}

            {/* 4. Analise Técnica (Observações) */}
            <section className="mb-6 break-inside-avoid">
                <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Análise Técnica</h2>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify whitespace-pre-wrap min-h-[60px]">
                    {visit.observations || "Sem observações técnicas."}
                </div>
            </section>

            {/* 5. Observações Gerais - V1.1 */}
            <section className="mb-8 break-inside-avoid">
                <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Observações Gerais</h2>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify whitespace-pre-wrap min-h-[60px]">
                    {visit.general_observations || "Sem observações gerais."}
                </div>
            </section>

            {/* 6. Photos Gallery */}
            {photos && photos.length > 0 && (
                <section className="mb-8 break-inside-avoidPage">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-4">Registro Fotográfico</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {photos.map(p => (
                            <div key={p.id} className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden relative">
                                <img
                                    src={p.photo_url}
                                    className="w-full h-full object-cover"
                                    alt="Evidência"
                                    crossOrigin="anonymous"
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Signatures */}
            <section className="mt-12 pt-8 border-t border-slate-200 break-inside-avoid">
                <div className="grid grid-cols-2 gap-12 text-center">
                    {/* Technician */}
                    <div className="flex flex-col items-center">
                        <div className="h-16 mb-2 flex items-end justify-center w-full">
                            {techSignature ? (
                                <img src={techSignature} className="max-h-full" alt="Assinatura Técnico" crossOrigin="anonymous" />
                            ) : (<div className="w-32 h-px bg-slate-300"></div>)}
                        </div>
                        <div className="border-t border-slate-300 w-full pt-1">
                            <p className="font-bold text-xs uppercase">{techName}</p>
                            <p className="text-[9px] text-slate-500">Técnico Responsável - WGA Brasil</p>
                        </div>
                    </div>

                    {/* Client */}
                    <div className="flex flex-col items-center">
                        <div className="h-16 mb-2 flex items-end justify-center w-full">
                            {visit.client_signature_url ? (
                                <img src={visit.client_signature_url} className="max-h-full" alt="Assinatura Cliente" crossOrigin="anonymous" />
                            ) : (<div className="text-[10px] text-slate-300 italic">Não assinado</div>)}
                        </div>
                        <div className="border-t border-slate-300 w-full pt-1">
                            <p className="font-bold text-xs uppercase">{client?.contact_name || 'Cliente'}</p>
                            <p className="text-[9px] text-slate-500">Responsável no Local</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-8 text-[9px] text-slate-400 text-center border-t border-slate-100 pt-2">
                <p>Este relatório possui validade técnica e foi gerado eletronicamente pelo Sistema WGA.</p>
                <p>WGA Brasil Tratamento de Águas - CNPJ: XX.XXX.XXX/0001-XX</p>
            </footer>
        </div>
    );
}

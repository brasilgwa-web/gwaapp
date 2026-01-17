
import React from 'react';
import { formatDateAsLocal } from '@/lib/utils';
import { format } from "date-fns";

// Helper para converter markdown básico em HTML
function renderMarkdown(text) {
    if (!text) return null;

    // Converter **bold** em <strong> (aceita qualquer caractere exceto quebra de linha)
    let html = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Converter *italic* em <em> (apenas texto simples)
        .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
        // Converter - list items em bullets (no início de linha)
        .replace(/^- (.+)$/gm, '• $1')
        // Preservar quebras de linha
        .replace(/\n/g, '<br />');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function CoverPage({ settings }) {
    const bgColor = settings?.cover_background_color || '#1e40af';
    const coverContent = settings?.cover_content;

    // Altura fixa de uma página A4 (297mm) menos margens (10mm superior + 25mm inferior = 35mm)
    // Resultado: 262mm de altura útil
    return (
        <div
            className={`w-full h-[296mm] max-h-[296mm] text-white flex flex-col p-8 relative shrink-0 mx-auto max-w-[210mm] print:max-w-none print:w-full print:mx-0 print:!bg-transparent`}
            style={{ backgroundColor: bgColor, overflow: 'hidden', marginBottom: 0, pageBreakAfter: 'always' }}
        >
            {/* Header / Logo */}
            <div className="border-b border-white/30 pb-3 mb-6">
                {settings?.logo_url ? (
                    <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                    />
                ) : (
                    <>
                        <div className="text-2xl font-bold tracking-wider">WGA BRASIL</div>
                        <div className="text-xs tracking-[0.3em] uppercase ml-1 opacity-80">Serviços</div>
                    </>
                )}
            </div>

            {/* Cover Content - Rendered as HTML with preserved formatting */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .cover-content * {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .cover-content p {
                    margin: 0 !important;
                    line-height: 1.4 !important;
                }
                .cover-content p:empty {
                    min-height: 1.4em !important;
                    display: block !important;
                }
                .cover-content h1 {
                    margin: 0 !important;
                    font-size: 1.75em !important;
                    font-weight: bold !important;
                    line-height: 1.2 !important;
                }
                .cover-content h2 {
                    margin: 0 !important;
                    font-size: 1.4em !important;
                    font-weight: bold !important;
                    line-height: 1.3 !important;
                }
                .cover-content h3 {
                    margin: 0 !important;
                    font-size: 1.2em !important;
                    font-weight: bold !important;
                    line-height: 1.4 !important;
                }
                .cover-content ul, .cover-content ol {
                    margin: 0 !important;
                    padding-left: 2em !important;
                }
                .cover-content li {
                    margin: 0 !important;
                    line-height: 1.4 !important;
                }
                .cover-content strong {
                    font-weight: bold !important;
                }
                .cover-content em {
                    font-style: italic !important;
                }
                .cover-content a {
                    text-decoration: underline !important;
                }
                .cover-content hr {
                    margin: 0.5em 0 !important;
                    border: none !important;
                    border-top: 1px solid rgba(255, 255, 255, 0.3) !important;
                }
                .cover-content br {
                    display: block !important;
                    content: "" !important;
                }
            ` }} />
            <div
                className="flex-1 cover-content"
                dangerouslySetInnerHTML={{ __html: coverContent }}
            />

            {/* Decorative Lines/Grid - Hidden */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 border-[12px] border-transparent">
                <div className="w-full h-full border border-white"></div>
                <div className="absolute top-4 left-4 right-4 h-px bg-white"></div>
                <div className="absolute bottom-4 left-4 right-4 h-px bg-white"></div>
                <div className="absolute top-4 bottom-4 left-4 w-px bg-white"></div>
                <div className="absolute top-4 bottom-4 right-4 w-px bg-white"></div>
            </div>
        </div>
    );
}

export function ReportTemplate({ data, isPdfGeneration = false }) {
    const { visit, client, primaryLocation, fullReportStructure, photos, technicianUser, reportSettings } = data;

    // Technician and Visit Metadata
    const techName = technicianUser?.full_name || visit.technician_email || 'Técnico Responsável';
    const techSignature = technicianUser?.signature_url;

    // Custom formatted dates
    const visitDate = visit.visit_date ? new Date(visit.visit_date.includes('T') ? visit.visit_date.split('T')[0] : visit.visit_date) : new Date();

    // Report number: Use saved number from visit, or generate from settings
    // Format: YYMM-NNNNNN (e.g., 2601-000001) - sem traço entre ano e mês
    const reportNumber = visit.report_number ||
        `${format(visitDate, 'yyMM')}-${String(reportSettings?.current_report_number || 1).padStart(6, '0')}`;

    // Logo from settings or default
    const logoUrl = reportSettings?.logo_url;

    // Footer text from settings or default
    const footerText = reportSettings?.footer_text || 'WGA Brasil Tratamento de Águas\nEste relatório possui validade técnica e foi gerado eletronicamente pelo Sistema WGA.';


    const includeCover = reportSettings?.cover_enabled !== false;

    return (
        <>
            {/* Dynamic Print Styles for Full Bleed Cover */}
            {includeCover && (
                <style>{`
                    @media print {
                        body {
                            background-color: ${reportSettings?.cover_background_color || '#1e40af'} !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                `}</style>
            )}

            {includeCover && <CoverPage settings={reportSettings} />}

            <div className={`bg-white text-slate-900 font-sans text-[11px] leading-tight relative z-10 print:w-full print:max-w-none print:min-h-screen ${isPdfGeneration ? 'w-full max-w-[210mm] p-[10mm] pb-[25mm]' : 'p-6 md:p-12 max-w-[210mm] mx-auto min-h-[297mm]'}`}>

                {/* Header - Logo à direita */}
                <header className="mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-lg font-medium text-slate-700 border-b-2 border-blue-600 pb-1 inline-block">
                                Laboratório de Serviços Analíticos
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                            ) : (
                                <>
                                    <div className="text-blue-600 font-bold text-xl">WGA</div>
                                    <span className="text-slate-700 font-medium">Brasil</span>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Client Info Grid - Dados do cliente + Número do Relatório */}
                <section className="border-t border-slate-300 pt-3 mb-6">
                    <div className="flex justify-between items-start">
                        {/* Dados do Cliente à Esquerda */}
                        <div className="space-y-1 text-[11px]">
                            <div className="flex">
                                <span className="text-slate-500 w-28">Código do Cliente</span>
                                <span className="font-medium text-slate-900">{client?.client_code || '-'}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-500 w-28">Cliente</span>
                                <span className="font-medium text-slate-900">{client?.name}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-500 w-28">Endereço</span>
                                <span className="font-medium text-slate-900">{client?.address || '-'}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-500 w-28"></span>
                                <span className="font-medium text-slate-900">{client?.city_state || (primaryLocation ? `${primaryLocation.city} - ${primaryLocation.state}` : '-')}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-500 w-28">e-Mail</span>
                                <span className="font-medium text-slate-900">{client?.email || '-'}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-500 w-28">Responsável</span>
                                <span className="font-medium text-slate-900">{client?.contact_name || '-'}</span>
                            </div>
                        </div>

                        {/* Número do Relatório à Direita */}
                        <div className="border border-slate-400 px-3 py-2 text-right">
                            <div className="text-[10px] text-slate-500">Relatório Nº</div>
                            <div className="font-bold text-lg text-slate-900">{reportNumber}</div>
                            <div className="text-[10px] text-slate-500">{formatDateAsLocal(visit.visit_date)}</div>
                        </div>
                    </div>
                </section>

                {/* Detalhes do Serviço */}
                <section className="bg-slate-50 p-3 rounded-sm border border-slate-200 mb-6 text-[10px]">
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <span className="text-slate-500 block">Técnico</span>
                            <span className="font-medium">{techName}</span>
                        </div>
                        {visit.arrival_time && (
                            <div>
                                <span className="text-slate-500 block">Chegada</span>
                                <span className="font-medium">{visit.arrival_time}</span>
                            </div>
                        )}
                        {visit.departure_time && (
                            <div>
                                <span className="text-slate-500 block">Saída</span>
                                <span className="font-medium">{visit.departure_time}</span>
                            </div>
                        )}
                        {visit.arrival_time && visit.departure_time && (
                            <div>
                                <span className="text-slate-500 block">Tempo Dedicado</span>
                                <span className="font-medium text-blue-600">
                                    {(() => {
                                        const [startH, startM] = visit.arrival_time.split(':').map(Number);
                                        const [endH, endM] = visit.departure_time.split(':').map(Number);
                                        const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                                        if (totalMinutes <= 0) return '-';
                                        const hours = Math.floor(totalMinutes / 60);
                                        const minutes = totalMinutes % 60;
                                        return `${hours}h ${minutes}min`;
                                    })()}
                                </span>
                            </div>
                        )}
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
                                                    {eq.sample?.complementary_info && <span><span className="font-semibold">Análises comp. em laboratório:</span> {eq.sample.complementary_info}</span>}
                                                </div>
                                            </div>

                                            {/* Readings Table */}
                                            <div className="overflow-hidden">
                                                <table className="w-full text-[10px] border-x border-b border-slate-200">
                                                    <thead className="bg-slate-50 text-slate-500 font-semibold text-left">
                                                        <tr>
                                                            <th className="px-2 py-1.5">Parâmetro</th>
                                                            <th className="px-2 py-1.5 text-center">Und.</th>
                                                            <th className="px-2 py-1.5 text-center">VMP</th>
                                                            <th className="px-2 py-1.5 text-center">LD</th>
                                                            <th className="px-2 py-1.5 text-center">LQ</th>
                                                            <th className="px-2 py-1.5 text-center">Incerteza</th>
                                                            <th className="px-2 py-1.5 text-center">Resultado</th>
                                                            <th className="px-2 py-1.5 text-right">Metodologia</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {eq.tests.map((test, tIdx) => (
                                                            <tr key={tIdx} className={tIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                                                <td className="px-2 py-1 font-medium text-slate-700">{test.name}</td>
                                                                <td className="px-2 py-1 text-center text-slate-500">{test.unit || '-'}</td>
                                                                <td className="px-2 py-1 text-center font-mono text-slate-500 text-[10px]">{test.min_value} - {test.max_value}</td>
                                                                <td className="px-2 py-1 text-center text-slate-400">{test.ld || '-'}</td>
                                                                <td className="px-2 py-1 text-center text-slate-400">{test.lq || '-'}</td>
                                                                <td className="px-2 py-1 text-center text-slate-400 text-[10px]">{test.method_uncertainty || '-'}</td>
                                                                <td className="px-2 py-1 text-center font-bold">
                                                                    {test.result ? (
                                                                        <span className={test.result.status_light === 'red' ? 'text-red-600' : test.result.status_light === 'green' ? 'text-green-600' : 'text-yellow-600'}>
                                                                            {test.result.measured_value}
                                                                        </span>
                                                                    ) : '-'}
                                                                </td>
                                                                <td className="px-2 py-1 text-right text-[9px] text-slate-400 truncate max-w-[80px]" title={test.methodology}>
                                                                    {test.methodology || '-'}
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
                        </div>
                    )}
                </section>

                {/* 2. Quadro de Dosagens e Estoques (Dosage Board) - V1.1 */}
                <section className="mb-8 break-inside-avoid">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-4 flex items-center gap-2">
                        <span className="bg-green-600 w-1 h-4 block rounded-sm"></span>
                        Quadro de Dosagens e Estoques
                    </h2>

                    {fullReportStructure?.some(l => l.equipments.some(e => e.dosages?.some(d => d.product))) ? (
                        <div className="space-y-6">
                            {fullReportStructure.map((loc, idx) => (
                                <div key={idx} className="space-y-4">
                                    {loc.equipments.map((eq, eqIdx) => {
                                        // Show ALL configured products for this equipment (not just modified ones)
                                        const activeDosages = eq.dosages.filter(d => d.product);
                                        if (activeDosages.length === 0) return null;

                                        return (
                                            <div key={eqIdx} className="bg-white border border-slate-200 rounded-sm overflow-hidden text-xs mb-2">
                                                <div className="bg-green-50 px-3 py-2 border-b border-green-100 font-bold text-green-900 border-l-4 border-l-green-600">
                                                    {loc.location.name} - {eq.equipment.name}
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[400px]">
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
                                                                    <td className="px-3 py-1.5">
                                                                        <div className="font-medium text-slate-700">{item.product.name}</div>
                                                                        {item.complementary_info && (
                                                                            <div className="text-[10px] text-blue-600 mt-0.5">{item.complementary_info}</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-center text-slate-500">{item.product.unit}</td>
                                                                    <td className="px-3 py-1.5 text-center font-bold text-slate-700">{item.record?.current_stock ?? '-'}</td>
                                                                    <td className="px-3 py-1.5 text-center font-bold text-slate-700">{item.record?.dosage_applied ?? '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
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
                {
                    visit.discharges_drainages && (
                        <section className="mb-6 break-inside-avoid">
                            <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Descargas e Drenagens</h2>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify">
                                {visit.discharges_drainages}
                            </div>
                        </section>
                    )
                }

                {/* 4. Analise Técnica (Observações) */}
                <section className="mb-6 break-inside-avoid">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Análise Técnica</h2>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify min-h-[60px]">
                        {visit.observations ? renderMarkdown(visit.observations) : "Sem observações técnicas."}
                    </div>
                </section>

                {/* 5. Observações Gerais - V1.1 */}
                <section className="mb-8 break-inside-avoid">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Observações Gerais</h2>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify min-h-[60px]">
                        {visit.general_observations ? renderMarkdown(visit.general_observations) : "Sem observações gerais."}
                    </div>
                </section>

                {/* 6. Photos Gallery */}
                {
                    photos && photos.length > 0 && (
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
                    )
                }

                {/* Signatures */}
                <section className="mt-12 pt-8 border-t border-slate-200 break-inside-avoid">
                    <div className="flex justify-between items-start gap-12 text-center">

                        {/* Left: Technical Signatures (Stacked) */}
                        <div className="flex-1 flex flex-col items-center space-y-8">

                            {/* 1. Technician */}
                            <div className="flex flex-col items-center w-full">
                                <div className="h-16 mb-2 flex items-end justify-center w-full">
                                    {techSignature ? (
                                        <img src={techSignature} className="max-h-full" alt="Assinatura Técnico" crossOrigin="anonymous" />
                                    ) : (<div className="w-32 h-px bg-slate-300"></div>)}
                                </div>
                                <div className="border-t border-slate-300 w-full pt-1 max-w-[200px]">
                                    <p className="font-bold text-xs uppercase">{techName}</p>
                                    <p className="text-[9px] text-slate-500">Vistoriador Técnico</p>
                                    {technicianUser?.crq && (
                                        <p className="text-[9px] text-slate-600 font-medium">{technicianUser.crq}</p>
                                    )}
                                </div>
                            </div>

                            {/* 2. Selected Technical Responsible (if any) */}
                            {data.selectedTechnicalResponsible && (
                                <div className="flex flex-col items-center w-full">
                                    <div className="h-16 mb-2 flex items-end justify-center w-full">
                                        {data.selectedTechnicalResponsible.signature_url ? (
                                            <img src={data.selectedTechnicalResponsible.signature_url} className="max-h-full" alt="Assinatura Responsável" crossOrigin="anonymous" />
                                        ) : (<div className="w-32 h-px bg-slate-300"></div>)}
                                    </div>
                                    <div className="border-t border-slate-300 w-full pt-1 max-w-[200px]">
                                        <p className="font-bold text-xs uppercase">{data.selectedTechnicalResponsible.name}</p>
                                        <p className="text-[9px] text-slate-500">Responsável Técnico - WGA Brasil</p>
                                        <p className="text-[9px] text-slate-600 font-medium">{data.selectedTechnicalResponsible.crq}</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Right: Client Signature */}
                        <div className="flex-1 flex flex-col items-center">
                            <div className="h-16 mb-2 flex items-end justify-center w-full">
                                {visit.client_signature_url ? (
                                    <img src={visit.client_signature_url} className="max-h-full" alt="Assinatura Cliente" crossOrigin="anonymous" />
                                ) : (<div className="text-[10px] text-slate-300 italic">Não assinado</div>)}
                            </div>
                            <div className="border-t border-slate-300 w-full pt-1 max-w-[200px]">
                                <p className="font-bold text-xs uppercase">{client?.contact_name || 'Cliente'}</p>
                                <p className="text-[9px] text-slate-500">Responsável no Local</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="mt-8 text-[9px] text-slate-400 text-center border-t border-slate-100 pt-2 whitespace-pre-wrap">
                    {footerText}
                </footer>
            </div >
        </>
    );
}

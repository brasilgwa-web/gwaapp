
import React from 'react';
import { formatDateAsLocal } from '@/lib/utils';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

// Default HTML for Comments/Orientations block (fallback when no custom text is saved)
const DEFAULT_COMMENTS_HTML = `
<p><strong>Observações Gerais</strong></p>
<p>Neste momento, este relatório apresenta exclusivamente os resultados analíticos obtidos.</p>
<p>Análises complementares que não fazem parte do escopo contratado devem ser solicitadas ao setores técnico-comercial da WGA Brasil para o envio do orçamento e aprovação.</p>
<p>Recomenda-se seguir as orientações repassadas durante as visitas técnicas presenciais da equipe da WGA Brasil.</p>
<p><strong>Destacamos a importância de:</strong></p>
<ul>
<li>Verificar atentamente os parâmetros sinalizados no sistema de farol (verde, amarelo e vermelho), dando prioridade às ações corretivas nos indicadores em amarelo (atenção) e vermelho (crítico);</li>
<li>Manter a aplicação dos produtos conforme as dosagens recomendadas pela engenharia da WGA Brasil;</li>
<li>Realizar as purgas operacionais de acordo com o plano de operação definido;</li>
<li>Manusear e armazenar os produtos químicos, especialmente os produtos NALCO, com todos os cuidados de segurança previstos nas fichas de informações de segurança dos produtos (SDS);</li>
<li>Manter o acompanhamento dos parâmetros operacionais e enviar periodicamente os dados à WGA Brasil para controle e atualização de recomendações.</li>
</ul>
<hr/>
<p><strong>NOTAS IMPORTANTES</strong></p>
<ul>
<li>Antes de efetuar qualquer operação com Produtos NALCO (transferência/transporte/reposição), ler atentamente a FDS (FICHA DE SEGURANÇA DE PRODUTOS QUÍMICOS) dos mesmos;</li>
<li>1. Não descartar resíduos em áreas inapropriadas, certificar que as bombonas vazias sejam enviadas para local específico para descarte;</li>
<li>2. Não reutilize embalagens químicas, a reação com produtos incompatíveis podem acarretar acidentes;</li>
<li>3. Ao checar sistemas de dosagens, certifique-se o funcionamento das bombas dosadoras, caso seja necessário, efetue a remoção de ar nas linhas pelo respiro da bomba;</li>
<li>4. Registre quaisquer ocorrência pertinente à operação e entre em contato pelos canais de comunicação informados.</li>
</ul>
<p><strong>CARACTERISTICA DA AMOSTRA ANÁLISE VISUAL:</strong> Quando reportado a presença de resíduos não filtráveis recomenda-se que os procedimentos de trabalho sejam confirmados.</p>
<p><strong>TRASAR:</strong> É uma leitura de fluorescência obtida proporcionalmente à concentração do produto na amostra lida.</p>
<hr/>
<p>Em caso de dúvidas, entrar em contato com nosso serviço de atendimento a Clientes através de nosso telefone: (11) 9.6348.9922 e/ou E-mails: atendimento@wgabrasil.com.br; laboratorio1@wgabrasil.com.br</p>
<hr/>
<p><strong>Metodologia Analítica:</strong></p>
<ul>
<li>Procedimento para coletas: PR. 8.5.2 Revisão 02 (IDENTIFICAÇÃO, RASTREABILIDADE, COLETA E PRESERVAÇÃO DO PRODUTO).</li>
<li>As análises foram executadas dentro do prazo de validade de cada parâmetro segundo guia de coleta de preservação de amostras.</li>
<li>NR: Não referido; ND= Não detectado; LMD= Limite Mínimo de Detecção; LAP= Laboratório de Apoio; * = A/C: Análise em Campo; IE = Índice de Incerteza Analítica Expandida;</li>
</ul>
<p><strong>"OS RESULTADOS REFEREM-SE EXCLUSIVAMENTE À AMOSTRA ANALISADA, COMO RECEBIDA".</strong></p>
<p>As amostras analisadas ficam em retenção por 15 dias, após este período são descartadas, salvo aquelas que são analisadas diariamente.</p>
<hr/>
<p>A WGA BRASIL garante a qualidade de seus produtos e serviços analíticos, não se responsabilizando pelo uso inadequado dos produtos e orientações.</p>
<p><strong>A INTEGRIDADE DOS RESULTADOS REPORTADOS NESTE RELATÓRIO DE ENSAIO É GARANTIDA, MANTIDA E CONTROLADA NA DATA BASE DO SISTEMA DE ADMINISTRAÇÃO DE LAUDOS.</strong></p>
<p><em>"Este Relatório de Ensaio somente pode ser reproduzido na sua totalidade e sem alterações"</em></p>
<p><em>"A reprodução parcial requer aprovação escrita do Laboratório."</em></p>
`;

function CoverPage({ settings }) {
    const bgColor = settings?.cover_background_color || '#1e40af';
    const coverContent = settings?.cover_content;
    const coverImageUrl = settings?.cover_image_url;

    // If custom cover image exists, render it as full-page
    if (coverImageUrl) {
        return (
            <div
                className="w-full h-[296mm] max-h-[296mm] flex items-center justify-center shrink-0 mx-auto max-w-[210mm] print:max-w-none print:w-full print:mx-0"
                style={{ overflow: 'hidden', marginBottom: 0, pageBreakAfter: 'always', backgroundColor: '#fff' }}
            >
                <img
                    src={coverImageUrl}
                    alt="Capa do Relatório"
                    className="w-full h-full object-contain"
                    style={{ maxWidth: '210mm', maxHeight: '296mm' }}
                />
            </div>
        );
    }

    // Fallback to editor content
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

export function ReportTemplate({ data }) {
    const { visit, client, primaryLocation, fullReportStructure, photos, technicianUser, reportSettings, clientContact } = data;


    // Technician and Visit Metadata
    const techName = technicianUser?.full_name || visit.technician_email || 'Técnico Responsável';
    const techSignature = technicianUser?.signature_url;

    // Custom formatted dates
    // Parse visit date always in GMT-3 (Brazil), regardless of user device timezone
    const visitDate = visit.visit_date
        ? new Date(`${visit.visit_date.split('T')[0]}T12:00:00-03:00`)
        : new Date();

    // Report number
    const reportNumber = visit.report_number ||
        `${format(visitDate, 'yyMM')}-${String(reportSettings?.current_report_number || 1).padStart(6, '0')}`;

    // Logos
    const logoUrl = reportSettings?.logo_url;
    const logo2Url = reportSettings?.logo2_url;

    // Footer text
    const footerText = reportSettings?.footer_text || 'WGA Brasil Tratamento de Águas\nEste relatório possui validade técnica e foi gerado eletronicamente pelo Sistema WGA.';

    const includeCover = reportSettings?.cover_enabled !== false;

    return (
        <>
            {includeCover && <CoverPage settings={reportSettings} />}

            <div className="bg-white text-slate-900 font-sans text-[11px] leading-tight relative z-10 p-5 max-w-[210mm] mx-auto min-h-[297mm]">

                {/* Header */}
                <header className="mb-6">
                    <div className="flex justify-between items-center h-20 gap-4"> {/* Added gap, kept items-center for middle alignment */}
                        <div className="w-2/3"> {/* Give Title more space (66%) */}
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">
                                {reportSettings?.report_title || 'Relatório de Atendimento Técnico em Campo'}
                            </h1>
                        </div>
                        <div className="flex items-center justify-end gap-4 w-1/3"> {/* Limit Logos to 33% */}
                            {logoUrl && (
                                <div className="h-14 flex items-center justify-center"> {/* Slightly reduced height container */}
                                    <img src={logoUrl} alt="Logo 1" className="h-full w-auto object-contain max-w-[140px]" />
                                </div>
                            )}
                            {logo2Url && (
                                <div className="h-14 flex items-center justify-center">
                                    <img src={logo2Url} alt="Logo 2" className="h-full w-auto object-contain max-w-[140px]" />
                                </div>
                            )}
                            {!logoUrl && !logo2Url && (
                                <div className="text-right">
                                    <div className="text-blue-600 font-bold text-2xl">WGA</div>
                                    <span className="text-slate-700 font-medium">Brasil</span>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Client Info Grid */}
                <section className="border-t border-slate-300 pt-3 mb-6">
                    <div className="flex justify-between items-start">
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

                        <div className="border border-slate-300 px-6 py-4 text-center min-w-[180px]">
                            <div className="text-xs text-slate-500 mb-1">Relatório Nº</div>
                            <div className="text-2xl font-bold text-slate-900 tracking-tight">{reportNumber}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{format(visitDate, "d 'de' MMMM, yyyy", { locale: ptBR })}</div>
                        </div>
                    </div>
                </section>

                {/* Tecnico e Horarios */}
                <section className="bg-slate-50 border border-slate-200 rounded-sm p-3 mb-6 flex text-xs">
                    <div className="flex-1">
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Técnico</span>
                        <span className="font-bold text-slate-800">{techName}</span>
                    </div>
                    <div className="flex-1 border-l border-slate-200 pl-4">
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Chegada</span>
                        <span className="font-bold text-slate-800">{visit.arrival_time ? visit.arrival_time.substring(0, 5) : '-'}</span>
                    </div>
                    <div className="flex-1 border-l border-slate-200 pl-4">
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Saída</span>
                        <span className="font-bold text-slate-800">{visit.departure_time ? visit.departure_time.substring(0, 5) : '-'}</span>
                    </div>
                    <div className="flex-1 border-l border-slate-200 pl-4">
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Tempo Dedicado</span>
                        <span className="font-bold text-slate-800">
                            {visit.arrival_time && visit.departure_time ? (() => {
                                const [h1, m1] = visit.arrival_time.split(':').map(Number);
                                const [h2, m2] = visit.departure_time.split(':').map(Number);
                                const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                                const hours = Math.floor(diff / 60);
                                const minutes = diff % 60;
                                return `${hours}h ${minutes}m`;
                            })() : '-'}
                        </span>
                    </div>
                </section>

                {/* 1. Resultados Analíticos */}
                <section className="mb-8">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-4 flex items-center gap-2">
                        <span className="bg-blue-600 w-1 h-4 block rounded-sm"></span>
                        Resultados Analíticos
                    </h2>

                    {fullReportStructure?.length === 0 ? (
                        <p className="text-slate-500 italic text-center py-4">Nenhum resultado registrado.</p>
                    ) : (
                        <div className="space-y-6">
                            {fullReportStructure.map((loc, idx) => {
                                // Filter equipments that have at least one valid test result
                                // OR have sample metadata (collection_time or complementary_info) filled
                                const activeEquipments = loc.equipments.filter(eq =>
                                    eq.tests?.some(t => t.result?.measured_value !== null && t.result?.measured_value !== undefined && t.result?.measured_value !== '') ||
                                    eq.sample?.collection_time ||
                                    eq.sample?.complementary_info
                                );

                                if (activeEquipments.length === 0) return null;

                                return (
                                    <div key={idx} className="space-y-4">
                                        <div className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-100 pb-1">
                                            Local: {loc.location.name}
                                        </div>

                                        {activeEquipments.map((eq, eqIdx) => {
                                            // Filter tests for this equipment
                                            const activeTests = eq.tests.filter(t => t.result?.measured_value !== null && t.result?.measured_value !== undefined && t.result?.measured_value !== '');

                                            return (
                                                <div key={eqIdx} className="mb-4">
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

                                                    {activeTests.length > 0 && (
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
                                                                    {activeTests.map((test, tIdx) => (
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
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    <div className="mt-4 text-[9px] text-slate-500 border-t border-slate-100 pt-2">
                        <span className="font-semibold text-slate-700">Legenda:</span> VMP - Valor Máximo Permitido | LQ - Limite de Quantificação | LD - Limite Mínimo Detectável | Incerteza: Percentual de Incerteza Expandida
                    </div>
                </section>

                {/* 2. Quadro de Dosagens */}
                <section className="mb-8">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-4 flex items-center gap-2">
                        <span className="bg-green-600 w-1 h-4 block rounded-sm"></span>
                        Quadro de Dosagens e Estoques
                    </h2>

                    {fullReportStructure?.some(l => l.equipments.some(e => e.dosages?.some(d => d.product))) ? (
                        <div className="space-y-6">
                            {fullReportStructure.map((loc, idx) => (
                                <div key={idx} className="space-y-4">
                                    {loc.equipments.map((eq, eqIdx) => {
                                        const activeDosages = eq.dosages.filter(d => d.product && d.record?.dosage_applied !== null && d.record?.dosage_applied !== undefined && d.record?.dosage_applied !== '');
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

                {/* 3. Descargas e Drenagens */}
                {visit.discharges_drainages && (
                    <section className="mb-6">
                        <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Descargas e Drenagens</h2>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify">
                            {visit.discharges_drainages}
                        </div>
                    </section>
                )}

                {/* 4. Analise Técnica */}
                <section className="mb-6">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Análise Técnica</h2>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify min-h-[60px]">
                        {visit.observations ? renderMarkdown(visit.observations) : "Sem observações técnicas."}
                    </div>
                </section>

                {/* 5. Observações Gerais */}
                <section className="mb-8">
                    <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Observações Gerais</h2>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-justify min-h-[60px]">
                        {visit.general_observations ? renderMarkdown(visit.general_observations) : "Sem observações gerais."}
                    </div>
                </section>

                {/* 6. Photos Gallery */}
                {photos && photos.length > 0 && (
                    <section className="mb-8">
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

                {/* 7. Comentários/Orientações */}
                {fullReportStructure?.length > 0 && reportSettings?.comments_orientations_enabled !== false && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-4">Comentários/Orientações</h2>
                        <div
                            className="bg-slate-50 p-4 rounded border border-slate-200 text-[10px] text-justify leading-relaxed report-comments-html"
                            dangerouslySetInnerHTML={{
                                __html: reportSettings?.comments_orientations_text || DEFAULT_COMMENTS_HTML
                            }}
                        />
                    </section>
                )}

                {/* Signatures */}
                <section className="mt-12 pt-8 border-t border-slate-200">
                    <div className="flex justify-between items-start gap-12 text-center">
                        <div className="flex-1 flex flex-col items-center space-y-8">
                            {/* Technician */}
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

                            {/* Technical Responsible */}
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

                        {/* Client Signature */}
                        <div className="flex-1 flex flex-col items-center">
                            <div className="h-16 mb-2 flex items-end justify-center w-full">
                                {visit.client_signature_url ? (
                                    <img src={visit.client_signature_url} className="max-h-full" alt="Assinatura Cliente" crossOrigin="anonymous" />
                                ) : (<div className="text-[10px] text-slate-300 italic">Não assinado</div>)}
                            </div>
                            <div className="border-t border-slate-300 w-full pt-1 max-w-[200px]">
                                <p className="font-bold text-xs uppercase">{clientContact?.name || client?.contact_name || 'Cliente'}</p>
                                <p className="text-[9px] text-slate-500">Responsável no Local</p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* Web Footer */}
                <footer className="mt-12 text-[9px] text-slate-400 text-center border-t border-slate-100 pt-6 whitespace-pre-wrap">
                    {footerText}
                </footer>
            </div >
        </>
    );
}


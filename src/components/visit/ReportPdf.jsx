
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Register Font
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 700 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 400, fontStyle: 'italic' }, // Italic registration
    ]
});

// Styles
const styles = StyleSheet.create({
    page: {
        paddingTop: 100, // Adjusted for horizontal header + spacing
        paddingBottom: 40,
        paddingHorizontal: 20,
        fontFamily: 'Inter',
        fontSize: 9,
        color: '#1e293b',
    },
    // ...
    header: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        height: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1', // slate-300
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: '#0f172a', // slate-900 (darker)
        flex: 1,
        marginRight: 20,
        // Removed textTransform: 'uppercase' to match screenshot
    },
    headerLogos: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 40,
        flexShrink: 0,
        maxWidth: '35%', // Limit container width
    },
    headerLogoImage: {
        height: 40,
        width: 80, // Reduced from 120
        objectFit: 'contain',
        // marginLeft removed to use explicit spacer
    },

    // ...
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        textAlign: 'center',
        fontSize: 8,
        color: '#94a3b8', // slate-400
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9', // slate-100
        paddingTop: 8,
    },
    pageNumber: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        fontSize: 8,
        color: '#94a3b8',
    },
    // Sections
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#1e293b', // slate-800
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0', // slate-200
        marginBottom: 8,
        paddingBottom: 2,
        flexDirection: 'row',
        alignItems: 'center',
        // gap removed
    },
    sectionIndicator: {
        width: 4,
        height: 12,
        borderRadius: 2,
        marginRight: 6, // Increased spacing
    },
    // Client Grid
    clientGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingTop: 10,
    },
    clientInfoColumn: {
        flex: 1,
        paddingRight: 20,
    },
    clientRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    clientLabel: {
        width: 100, // Increased width
        fontSize: 9,
        color: '#64748b', // slate-500
    },
    clientValue: {
        flex: 1,
        fontSize: 9,
        fontWeight: 600, // bolder
        color: '#0f172a', // slate-900
    },
    reportNumberBox: {
        borderWidth: 1,
        borderColor: '#94a3b8', // darker border
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140,
        height: 60,
    },
    reportNumberLabel: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 2,
    },
    reportNumberValue: {
        fontSize: 18, // Larger
        fontWeight: 700,
        color: '#0f172a', // slate-900
    },
    reportDate: {
        fontSize: 8,
        color: '#94a3b8', // slate-400
        marginTop: 2,
    },
    // Visit Times Box
    timesBox: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc', // slate-50
        borderWidth: 1,
        borderColor: '#e2e8f0', // slate-200
        padding: 10,
        borderRadius: 4,
        marginBottom: 15,
    },
    timeCol: {
        flex: 1,
        borderLeftWidth: 1,
        borderLeftColor: '#e2e8f0',
        paddingLeft: 12,
    },
    firstTimeCol: {
        flex: 1,
        borderLeftWidth: 0,
        paddingLeft: 0,
    },
    timeLabel: {
        fontSize: 7,
        color: '#64748b', // slate-500
        textTransform: 'uppercase',
        fontWeight: 600,
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 10,
        fontWeight: 700,
        color: '#1e293b', // slate-800
    },
    // Tables
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e2e8f0', // slate-200
        marginBottom: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc', // slate-50
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9', // slate-100
        backgroundColor: '#ffffff',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc', // slate-50/30 approx
    },
    tableCell: {
        padding: 4,
        fontSize: 8,
        textAlign: 'center',
        borderRightWidth: 0,
    },
    tableCellLeft: {
        textAlign: 'left',
    },
    // Analysis
    equipmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#eff6ff', // blue-50
        borderColor: '#dbeafe', // blue-100
        borderWidth: 1,
        padding: 6,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
        marginTop: 10,
    },
    equipmentTitle: {
        color: '#1e3a8a', // blue-900
        fontWeight: 700,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3b82f6', // blue-500
        marginRight: 4,
    },
    // Text blocks
    textBlock: {
        backgroundColor: '#f8fafc',
        padding: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        textAlign: 'justify',
        fontSize: 9,
        lineHeight: 1.4,
    },
    // Photos
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        // gap removed
    },
    photoContainer: {
        width: '48%',
        aspectRatio: 1.77, // 16:9
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10, // Replacement for vertical gap
        marginRight: '2%', // Replacement for horizontal gap (approx)
    },
    photoImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    // Cover Page
    coverPage: {
        backgroundColor: '#1e40af',
        padding: 0,
        margin: 0,
    },
    coverImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    coverEditorPage: {
        padding: 32,
        flexDirection: 'column',
    },
    coverLogoSection: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.3)',
        paddingBottom: 12,
        marginBottom: 24,
    },
    coverLogoText: {
        fontSize: 22,
        fontWeight: 700,
        color: '#ffffff',
        letterSpacing: 2,
    },
    coverLogoSubText: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 4,
        textTransform: 'uppercase',
    },
    coverLogoImage: {
        height: 48,
        width: 160,
        objectFit: 'contain',
    },
    coverContent: {
        flex: 1,
        color: '#ffffff',
    },
    coverH1: {
        fontSize: 28,
        fontWeight: 700,
        color: '#ffffff',
        marginBottom: 8,
        lineHeight: 1.2,
    },
    coverH2: {
        fontSize: 20,
        fontWeight: 700,
        color: '#ffffff',
        marginBottom: 6,
        lineHeight: 1.3,
    },
    coverH3: {
        fontSize: 16,
        fontWeight: 700,
        color: '#ffffff',
        marginBottom: 4,
        lineHeight: 1.4,
    },
    coverP: {
        fontSize: 12,
        color: '#ffffff',
        marginBottom: 4,
        lineHeight: 1.4,
    },
    coverStrong: {
        fontWeight: 700,
    },
    // Signatures
    signaturesSection: {
        marginTop: 30,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    signatureBlock: {
        alignItems: 'center',
        width: '45%',
        marginBottom: 24,
    },
    signatureImage: {
        height: 50,
        marginBottom: 4,
        objectFit: 'contain',
    },
    signatureLine: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1', // slate-300
        paddingTop: 4,
        alignItems: 'center',
    },
    signatureName: {
        fontWeight: 700,
        fontSize: 9,
        textTransform: 'uppercase',
    },
    signatureRole: {
        fontSize: 8,
        color: '#64748b',
    },
});

// Helper for Markdown to Text nodes (Simple approach for now)
const MarkdownText = ({ text }) => {
    if (!text) return null;
    // Basic cleanup - remove ** and *
    const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
    return <Text>{cleanText}</Text>;
};

// Simple HTML-to-PDF parser for cover content from the rich text editor
const renderCoverHtml = (html) => {
    if (!html) return null;

    // Strip style attributes to avoid noise
    const clean = html.replace(/ style="[^"]*"/gi, '');

    // Split by block-level tags
    const blocks = clean.split(/(?=<(?:h[1-6]|p|ul|ol|hr|br)[ >])/i);

    return blocks.map((block, i) => {
        const h1Match = block.match(/^<h1[^>]*>(.*?)<\/h1>/is);
        const h2Match = block.match(/^<h2[^>]*>(.*?)<\/h2>/is);
        const h3Match = block.match(/^<h3[^>]*>(.*?)<\/h3>/is);
        const pMatch = block.match(/^<p[^>]*>(.*?)<\/p>/is);
        const hrMatch = block.match(/^<hr/i);
        const brMatch = block.match(/^<br/i);

        const stripInline = (s) => s
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
            .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .trim();

        if (h1Match) return <Text key={i} style={styles.coverH1}>{stripInline(h1Match[1])}</Text>;
        if (h2Match) return <Text key={i} style={styles.coverH2}>{stripInline(h2Match[1])}</Text>;
        if (h3Match) return <Text key={i} style={styles.coverH3}>{stripInline(h3Match[1])}</Text>;
        if (hrMatch) return <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', marginVertical: 6 }} />;
        if (brMatch) return <View key={i} style={{ height: 6 }} />;
        if (pMatch) {
            const text = stripInline(pMatch[1]);
            if (!text) return <View key={i} style={{ height: 8 }} />;
            return <Text key={i} style={styles.coverP}>{text}</Text>;
        }
        return null;
    });
};

// Default HTML for Comments/Orientations (PDF fallback)
const DEFAULT_COMMENTS_HTML_PDF = `
<p><strong>Observações Gerais</strong></p>
<p>Neste momento, este relatório apresenta exclusivamente os resultados analíticos obtidos.</p>
<p>Recomenda-se seguir as orientações repassadas durante as visitas técnicas presenciais da equipe da WGA Brasil.</p>
<p><strong>Destacamos a importância de:</strong></p>
<ul>
<li>Verificar atentamente os parâmetros sinalizados no sistema de farol (verde, amarelo e vermelho);</li>
<li>Manter a aplicação dos produtos conforme as dosagens recomendadas pela engenharia da WGA Brasil;</li>
<li>Realizar as purgas operacionais de acordo com o plano de operação definido;</li>
<li>Manusear e armazenar os produtos químicos com todos os cuidados de segurança previstos nas fichas de informações de segurança dos produtos (SDS);</li>
</ul>
<hr/>
<p><strong>NOTAS IMPORTANTES</strong></p>
<p>Antes de efetuar qualquer operação com Produtos NALCO, ler atentamente a FDS (FICHA DE SEGURANÇA DE PRODUTOS QUÍMICOS) dos mesmos.</p>
<hr/>
<p><strong>Metodologia Analítica:</strong></p>
<ul>
<li>Procedimento para coletas: PR. 8.5.2 Revisão 02.</li>
<li>NR: Não referido; ND= Não detectado; LMD= Limite Mínimo de Detecção;</li>
</ul>
<p><strong>"OS RESULTADOS REFEREM-SE EXCLUSIVAMENTE À AMOSTRA ANALISADA, COMO RECEBIDA".</strong></p>
`;

// HTML-to-PDF parser for comments/orientations content (similar to renderCoverHtml but styled for body text)
const renderCommentsHtml = (html) => {
    if (!html) return null;

    // Strip style attributes
    const clean = html.replace(/ style="[^"]*"/gi, '');

    // Split by block-level tags
    const blocks = clean.split(/(?=<(?:h[1-6]|p|ul|ol|hr|br)[ >])/i);

    const stripInline = (s) => s
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
        .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .trim();

    // Check if text has <strong> wrapper
    const hasBold = (s) => /<strong[^>]*>/.test(s);
    const hasItalic = (s) => /<em[^>]*>/.test(s);

    return blocks.map((block, i) => {
        const h1Match = block.match(/^<h1[^>]*>(.*?)<\/h1>/is);
        const h2Match = block.match(/^<h2[^>]*>(.*?)<\/h2>/is);
        const h3Match = block.match(/^<h3[^>]*>(.*?)<\/h3>/is);
        const pMatch = block.match(/^<p[^>]*>(.*?)<\/p>/is);
        const hrMatch = block.match(/^<hr/i);
        const brMatch = block.match(/^<br/i);
        const ulMatch = block.match(/^<ul[^>]*>(.*?)<\/ul>/is);
        const olMatch = block.match(/^<ol[^>]*>(.*?)<\/ol>/is);

        if (h1Match) return <Text key={i} style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, marginTop: 6 }}>{stripInline(h1Match[1])}</Text>;
        if (h2Match) return <Text key={i} style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, marginTop: 6 }}>{stripInline(h2Match[1])}</Text>;
        if (h3Match) return <Text key={i} style={{ fontWeight: 600, fontSize: 9, marginBottom: 3, marginTop: 4 }}>{stripInline(h3Match[1])}</Text>;
        if (hrMatch) return <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginVertical: 6 }} />;
        if (brMatch) return <View key={i} style={{ height: 4 }} />;

        if (ulMatch || olMatch) {
            const listContent = ulMatch ? ulMatch[1] : olMatch[1];
            const items = listContent.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
            return (
                <View key={i} style={{ marginLeft: 10, marginBottom: 4 }}>
                    {items.map((item, j) => {
                        const content = item.match(/<li[^>]*>(.*?)<\/li>/is);
                        if (!content) return null;
                        const text = stripInline(content[1]);
                        const bold = hasBold(content[1]);
                        return (
                            <View key={j} style={{ flexDirection: 'row', marginBottom: 2 }}>
                                <Text style={{ width: 10 }}>{ulMatch ? '•' : `${j + 1}.`}</Text>
                                <Text style={{ flex: 1, fontWeight: bold ? 700 : 400 }}>{text}</Text>
                            </View>
                        );
                    })}
                </View>
            );
        }

        if (pMatch) {
            const rawContent = pMatch[1];
            const text = stripInline(rawContent);
            if (!text) return <View key={i} style={{ height: 4 }} />;
            const bold = hasBold(rawContent);
            const italic = hasItalic(rawContent);
            return <Text key={i} style={{ marginBottom: 3, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal' }}>{text}</Text>;
        }
        return null;
    }).filter(Boolean);
};

const ReportPdf = ({ data, settings }) => {
    const { visit, client, fullReportStructure, photos, primaryLocation, technicianUser, clientContact } = data;
    // Fallback for reportNumber
    const reportNumber = data.reportNumber || visit.report_number || 'PENDENTE';


    // Resolve Technician Info
    const techName = data.techName || technicianUser?.name || 'Técnico WGA';
    const techSignature = data.techSignature || technicianUser?.signature_url;

    const footerText = settings?.footer_text || 'WGA Brasil Tratamento de Águas - Este relatório possui validade técnica.';
    const logoUrl = settings?.logo_url;
    const logo2Url = settings?.logo2_url;
    const coverImageUrl = settings?.cover_image_url;
    const coverContent = settings?.cover_content;
    const coverBgColor = settings?.cover_background_color || '#1e40af';
    const includeCover = settings?.cover_enabled !== false && !!(coverImageUrl || coverContent);

    // Parse visit date always in GMT-3 (Brazil), regardless of user device timezone
    const visitDate = visit.visit_date
        ? new Date(`${visit.visit_date.split('T')[0]}T12:00:00-03:00`)
        : new Date();

    const renderHeader = () => (
        <View style={styles.header} fixed>
            <Text style={styles.headerTitle}>
                {settings?.report_title || 'Relatório de Atendimento Técnico em Campo'}
            </Text>
            <View style={styles.headerLogos}>
                {/* Only show logos if valid URL string */}
                {settings?.logo_url && typeof settings.logo_url === 'string' && settings.logo_url.startsWith('http') && (
                    <Image src={settings.logo_url} style={styles.headerLogoImage} />
                )}
                {/* Spacer if both logos exist */}
                {settings?.logo_url && settings?.logo2_url && (
                    <View style={{ width: 15 }} />
                )}
                {settings?.logo2_url && typeof settings.logo2_url === 'string' && settings.logo2_url.startsWith('http') && (
                    <Image src={settings.logo2_url} style={styles.headerLogoImage} />
                )}
                {/* Fallback for logos if neither are provided or valid */}
                {(!settings?.logo_url || !(typeof settings.logo_url === 'string' && settings.logo_url.startsWith('http'))) &&
                    (!settings?.logo2_url || !(typeof settings.logo2_url === 'string' && settings.logo2_url.startsWith('http'))) && (
                        <View>
                            <Text style={{ color: '#2563eb', fontWeight: 700, fontSize: 16 }}>WGA</Text>
                            <Text style={{ color: '#334155', fontSize: 12 }}>Brasil</Text>
                        </View>
                    )}
            </View>
        </View>
    );

    const renderFooter = () => (
        <View style={styles.footer} fixed>
            <Text>{footerText}</Text>
            <Text render={({ pageNumber, totalPages }) =>
                `Página ${includeCover ? pageNumber - 1 : pageNumber} de ${includeCover ? totalPages - 1 : totalPages}`
            } style={styles.pageNumber} />
        </View>
    );

    return (
        <Document>
            {/* Cover Page */}
            {includeCover && (
                coverImageUrl ? (
                    <Page size="A4" style={styles.coverPage}>
                        <Image src={coverImageUrl} style={styles.coverImage} />
                    </Page>
                ) : (
                    <Page size="A4" style={[styles.coverEditorPage, { backgroundColor: coverBgColor }]}>
                        {/* Logo */}
                        <View style={styles.coverLogoSection}>
                            {settings?.logo_url && typeof settings.logo_url === 'string' && settings.logo_url.startsWith('http') ? (
                                <Image src={settings.logo_url} style={styles.coverLogoImage} />
                            ) : (
                                <View>
                                    <Text style={styles.coverLogoText}>WGA BRASIL</Text>
                                    <Text style={styles.coverLogoSubText}>Serviços</Text>
                                </View>
                            )}
                        </View>
                        {/* Content from editor */}
                        <View style={styles.coverContent}>
                            {renderCoverHtml(coverContent)}
                        </View>
                    </Page>
                )
            )}

            {/* Content Pages */}
            <Page size="A4" style={styles.page} wrap>
                {renderHeader()}

                {/* --- CLIENT INFO --- */}
                <View style={styles.clientGrid}>
                    <View style={styles.clientInfoColumn}>
                        <View style={styles.clientRow}>
                            <Text style={styles.clientLabel}>Código do Cliente</Text>
                            <Text style={styles.clientValue}>{client?.client_code || '-'}</Text>
                        </View>
                        <View style={styles.clientRow}>
                            <Text style={styles.clientLabel}>Cliente</Text>
                            <Text style={styles.clientValue}>{client?.name}</Text>
                        </View>
                        <View style={styles.clientRow}>
                            <Text style={styles.clientLabel}>Endereço</Text>
                            <Text style={styles.clientValue}>{client?.address || '-'}</Text>
                        </View>
                        <View style={styles.clientRow}>
                            <Text style={styles.clientLabel}></Text>
                            <Text style={styles.clientValue}>{client?.city_state || (primaryLocation ? `${primaryLocation.city} - ${primaryLocation.state}` : '-')}</Text>
                        </View>
                        <View style={styles.clientRow}>
                            <Text style={styles.clientLabel}>e-Mail</Text>
                            <Text style={styles.clientValue}>{client?.email || '-'}</Text>
                        </View>
                        <View style={styles.clientRow}>
                            <Text style={styles.clientLabel}>Responsável</Text>
                            <Text style={styles.clientValue}>{client?.contact_name || '-'}</Text>
                        </View>
                    </View>
                    <View style={styles.reportNumberBox}>
                        <Text style={styles.reportNumberLabel}>Relatório Nº</Text>
                        <Text style={styles.reportNumberValue}>{reportNumber}</Text>
                        <Text style={styles.reportDate}>{format(visitDate, "d 'de' MMMM, yyyy", { locale: ptBR })}</Text>
                    </View>
                </View>

                {/* --- TIMES --- */}
                <View style={styles.timesBox}>
                    <View style={styles.firstTimeCol}>
                        <Text style={styles.timeLabel}>Técnico</Text>
                        <Text style={styles.timeValue}>{techName}</Text>
                    </View>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Chegada</Text>
                        <Text style={styles.timeValue}>{visit.arrival_time ? visit.arrival_time.substring(0, 5) : '-'}</Text>
                    </View>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Saída</Text>
                        <Text style={styles.timeValue}>{visit.departure_time ? visit.departure_time.substring(0, 5) : '-'}</Text>
                    </View>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Tempo Dedicado</Text>
                        <Text style={styles.timeValue}>
                            {visit.arrival_time && visit.departure_time ? (() => {
                                const [h1, m1] = visit.arrival_time.split(':').map(Number);
                                const [h2, m2] = visit.departure_time.split(':').map(Number);
                                const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                                const hours = Math.floor(diff / 60);
                                const minutes = diff % 60;
                                return `${hours}h ${minutes}m`;
                            })() : '-'}
                        </Text>
                    </View>
                </View>

                {/* --- ANALYTICAL RESULTS --- */}
                <View style={styles.section}>
                    <View style={styles.sectionTitle}>
                        <View style={{ ...styles.sectionIndicator, backgroundColor: '#2563eb' }} />
                        <Text>Resultados Analíticos</Text>
                    </View>

                    {fullReportStructure?.length === 0 ? (
                        <Text style={{ ...styles.text, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }}>Nenhum resultado registrado.</Text>
                    ) : (
                        fullReportStructure.map((loc, idx) => {
                            // Filter equipments that have at least one valid test result
                            // OR have sample metadata (collection_time or complementary_info) filled
                            const activeEquipments = loc.equipments.filter(eq =>
                                eq.tests?.some(t => t.result?.measured_value !== null && t.result?.measured_value !== undefined && t.result?.measured_value !== '') ||
                                eq.sample?.collection_time ||
                                eq.sample?.complementary_info
                            );

                            if (activeEquipments.length === 0) return null;

                            return (
                                <View key={idx} style={{ marginBottom: 10 }}>
                                    <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, color: '#334155' }}>
                                        Local: {loc.location.name}
                                    </Text>

                                    {activeEquipments.map((eq, eqIdx) => {
                                        const validTests = eq.tests.filter(test => {
                                            const val = test.result?.measured_value;
                                            return val !== null && val !== undefined && val !== '';
                                        });

                                        return (
                                            <View key={eqIdx} style={{ marginBottom: 8 }}>
                                                {/* Eq Header */}
                                                <View style={styles.equipmentHeader}>
                                                    <View style={styles.equipmentTitle}>
                                                        <View style={styles.dot} />
                                                        <Text>{eq.equipment.name}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                                        {eq.sample?.collection_time && <Text style={{ color: '#475569', fontSize: 8 }}>Coleta: {eq.sample.collection_time.substring(0, 5)}h</Text>}
                                                        {eq.sample?.complementary_info && <Text style={{ color: '#475569', fontSize: 8 }}>Anál. Compl.: {eq.sample.complementary_info}</Text>}
                                                    </View>
                                                </View>

                                                {/* Table - only if there are valid tests */}
                                                {validTests.length > 0 && (
                                                    <View style={styles.table}>
                                                        <View style={styles.tableHeader}>
                                                            <Text style={{ ...styles.tableCell, ...styles.tableCellLeft, flex: 2 }}>Parâmetro</Text>
                                                            <Text style={{ ...styles.tableCell, flex: 0.5 }}>Und.</Text>
                                                            <Text style={{ ...styles.tableCell, flex: 1 }}>VMP</Text>
                                                            <Text style={{ ...styles.tableCell, flex: 0.5 }}>LD</Text>
                                                            <Text style={{ ...styles.tableCell, flex: 0.5 }}>LQ</Text>
                                                            <Text style={{ ...styles.tableCell, flex: 0.8 }}>Incerteza</Text>
                                                            <Text style={{ ...styles.tableCell, flex: 1 }}>Resultado</Text>
                                                            <Text style={{ ...styles.tableCell, flex: 1 }}>Metodologia</Text>
                                                        </View>
                                                        {validTests.map((test, tIdx) => (
                                                            <View key={tIdx} style={tIdx % 2 === 0 ? styles.tableRow : { ...styles.tableRow, ...styles.tableRowAlt }}>
                                                                <Text style={{ ...styles.tableCell, ...styles.tableCellLeft, flex: 2, color: '#334155', fontWeight: 500 }}>{test.name}</Text>
                                                                <Text style={{ ...styles.tableCell, flex: 0.5, color: '#64748b' }}>{test.unit || '-'}</Text>
                                                                <Text style={{ ...styles.tableCell, flex: 1, fontFamily: 'Courier', fontSize: 8, color: '#64748b' }}>{test.min_value} - {test.max_value}</Text>
                                                                <Text style={{ ...styles.tableCell, flex: 0.5, color: '#94a3b8' }}>{test.ld || '-'}</Text>
                                                                <Text style={{ ...styles.tableCell, flex: 0.5, color: '#94a3b8' }}>{test.lq || '-'}</Text>
                                                                <Text style={{ ...styles.tableCell, flex: 0.8, color: '#94a3b8' }}>{test.method_uncertainty || '-'}</Text>
                                                                <Text style={{
                                                                    ...styles.tableCell,
                                                                    flex: 1,
                                                                    fontWeight: 700,
                                                                    color: test.result?.status_light === 'red' ? '#dc2626' : test.result?.status_light === 'green' ? '#16a34a' : '#ca8a04'
                                                                }}>
                                                                    {test.result ? test.result.measured_value : '-'}
                                                                </Text>
                                                                <Text style={{ ...styles.tableCell, flex: 1, color: '#94a3b8', fontSize: 7 }}>{test.methodology || '-'}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })
                    )}
                    <Text style={{ fontSize: 7, color: '#64748b', marginTop: 4 }}>
                        Legenda: VMP - Valor Máximo Permitido | LQ - Limite de Quantificação | LD - Limite Mínimo Detectável | Incerteza: Percentual de Incerteza Expandida
                    </Text>
                </View>

                {/* --- TREND CHARTS (as images) --- */}
                {data.chartImages?.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitle}>
                            <View style={{ ...styles.sectionIndicator, backgroundColor: '#0891b2' }} />
                            <Text>Gráficos de Tendência</Text>
                        </View>
                        {data.chartImages.map((imgBase64, idx) => (
                            <View key={idx} style={{ marginBottom: 10 }}>
                                <Image
                                    src={imgBase64}
                                    style={{ width: '100%', height: 'auto', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 2 }}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* --- DOSAGES --- */}
                <View style={styles.section}>
                    <View style={styles.sectionTitle}>
                        <View style={{ ...styles.sectionIndicator, backgroundColor: '#16a34a' }} />
                        <Text>Quadro de Dosagens e Estoques</Text>
                    </View>

                    {fullReportStructure?.some(l => l.equipments.some(e => e.dosages?.some(d => d.product))) ? (
                        fullReportStructure.map((loc, idx) => (
                            <View key={idx}>
                                {loc.equipments.map((eq, eqIdx) => {
                                    const activeDosages = eq.dosages.filter(d => d.product && d.record?.dosage_applied !== null && d.record?.dosage_applied !== undefined && d.record?.dosage_applied !== '');
                                    if (activeDosages.length === 0) return null;
                                    return (
                                        <View key={eqIdx} style={{ marginBottom: 10 }}>
                                            <View style={{ backgroundColor: '#f0fdf4', padding: 4, borderLeftWidth: 4, borderLeftColor: '#16a34a', borderBottomWidth: 1, borderBottomColor: '#dcfce7', marginBottom: 0 }}>
                                                <Text style={{ fontSize: 9, fontWeight: 700, color: '#14532d' }}>{loc.location.name} - {eq.equipment.name}</Text>
                                            </View>
                                            <View style={styles.table}>
                                                <View style={styles.tableHeader}>
                                                    <Text style={{ ...styles.tableCell, ...styles.tableCellLeft, flex: 2 }}>Produto Químico</Text>
                                                    <Text style={{ ...styles.tableCell, flex: 0.8 }}>Unidade</Text>
                                                    <Text style={{ ...styles.tableCell, flex: 1 }}>Estoque Local</Text>
                                                    <Text style={{ ...styles.tableCell, flex: 1 }}>Dosagem Aplicada</Text>
                                                </View>
                                                {activeDosages.map((item, dIdx) => (
                                                    <View key={dIdx} style={styles.tableRow}>
                                                        <View style={{ ...styles.tableCell, ...styles.tableCellLeft, flex: 2 }}>
                                                            <Text style={{ color: '#334155', fontWeight: 500 }}>{item.product.name}</Text>
                                                            {item.complementary_info && <Text style={{ color: '#2563eb', fontSize: 7 }}>{item.complementary_info}</Text>}
                                                        </View>
                                                        <Text style={{ ...styles.tableCell, flex: 0.8, color: '#64748b' }}>{item.product.unit}</Text>
                                                        <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700, color: '#334155' }}>{item.record?.current_stock ?? '-'}</Text>
                                                        <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700, color: '#334155' }}>{item.record?.dosage_applied ?? '-'}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    ) : (
                        <Text style={{ ...styles.text, fontStyle: 'italic', textAlign: 'center' }}>Nenhum registro de dosagem.</Text>
                    )}
                </View>

                {/* --- DISCHARGES --- */}
                {visit.discharges_drainages && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitle}>
                            <Text>Descargas e Drenagens</Text>
                        </View>
                        <View style={styles.textBlock}>
                            <Text>{visit.discharges_drainages}</Text>
                        </View>
                    </View>
                )}

                {/* --- TECH ANALYSIS --- */}
                <View style={styles.section}>
                    <View style={styles.sectionTitle}>
                        <Text>Análise Técnica</Text>
                    </View>
                    <View style={{ ...styles.textBlock, minHeight: 60 }}>
                        <MarkdownText text={visit.observations || "Sem observações técnicas."} />
                    </View>
                </View>

                {/* --- GENERAL OBS --- */}
                <View style={styles.section}>
                    <View style={styles.sectionTitle}>
                        <Text>Observações Gerais</Text>
                    </View>
                    <View style={{ ...styles.textBlock, minHeight: 60 }}>
                        <MarkdownText text={visit.general_observations || "Sem observações gerais."} />
                    </View>
                </View>

                {/* --- PHOTOS --- */}
                {photos && photos.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitle}>
                            <Text>Registro Fotográfico</Text>
                        </View>
                        <View style={styles.photoGrid}>
                            {photos.map(p => (
                                <View key={p.id} style={styles.photoContainer}>
                                    <Image src={p.photo_url} style={styles.photoImage} />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* --- COMMENTS / ORIENTATIONS (Dynamic HTML from Settings) --- */}
                {fullReportStructure?.length > 0 && settings?.comments_orientations_enabled !== false && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitle}>
                            <Text>Comentários/Orientações</Text>
                        </View>
                        <View style={styles.textBlock}>
                            {renderCommentsHtml(settings?.comments_orientations_text || DEFAULT_COMMENTS_HTML_PDF)}
                        </View>
                    </View>
                )}

                {/* --- SIGNATURES --- */}
                <View style={styles.signaturesSection}>
                    {/* Tech (Top Left) */}
                    <View style={styles.signatureBlock}>
                        {techSignature && <Image src={techSignature} style={styles.signatureImage} />}
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureName}>{techName}</Text>
                            <Text style={styles.signatureRole}>Vistoriador Técnico</Text>
                            {technicianUser?.crq && <Text style={styles.signatureRole}>{technicianUser.crq}</Text>}
                        </View>
                    </View>

                    {/* Client (Top Right) */}
                    <View style={styles.signatureBlock}>
                        {visit.client_signature_url ? (
                            <Image src={visit.client_signature_url} style={styles.signatureImage} />
                        ) : (
                            <Text style={{ fontSize: 10, fontStyle: 'italic', marginBottom: 30, color: '#94a3b8' }}>Não assinado</Text>
                        )}
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureName}>{clientContact?.name || client?.contact_name || 'Cliente'}</Text>
                            <Text style={styles.signatureRole}>Responsável no Local</Text>
                        </View>

                    </View>

                    {/* Technical Responsible (Bottom Left) */}
                    {data.selectedTechnicalResponsible && (
                        <View style={styles.signatureBlock}>
                            {data.selectedTechnicalResponsible.signature_url && <Image src={data.selectedTechnicalResponsible.signature_url} style={styles.signatureImage} />}
                            <View style={styles.signatureLine}>
                                <Text style={styles.signatureName}>{data.selectedTechnicalResponsible.name}</Text>
                                <Text style={styles.signatureRole}>Responsável Técnico - WGA Brasil</Text>
                                <Text style={styles.signatureRole}>{data.selectedTechnicalResponsible.crq}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {renderFooter()}
            </Page>
        </Document>
    );
};

export default ReportPdf;

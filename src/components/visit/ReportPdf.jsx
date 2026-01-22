import React from 'react';
import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
    Image,
    Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ================= FONT ================= */
Font.register({
    family: 'Inter',
    fonts: [
        {
            src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff',
            fontWeight: 400,
        },
        {
            src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff',
            fontWeight: 700,
        },
    ],
});

/* ================= STYLES ================= */
const styles = StyleSheet.create({
    page: {
        paddingTop: 90,
        paddingBottom: 60,
        paddingHorizontal: 40,
        fontFamily: 'Inter',
        fontSize: 8,
        color: '#000',
    },

    header: {
        position: 'absolute',
        top: 20,
        left: 40,
        right: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    headerTitle: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
    },

    subTitle: {
        fontSize: 8,
        color: '#475569',
    },

    footer: {
        position: 'absolute',
        bottom: 20,
        left: 40,
        right: 40,
        fontSize: 7,
        color: '#475569',
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 4,
        textAlign: 'center',
    },

    section: {
        marginBottom: 14,
    },

    sectionTitle: {
        fontSize: 9,
        fontWeight: 700,
        marginBottom: 4,
        textTransform: 'uppercase',
    },

    infoBox: {
        borderWidth: 1,
        borderColor: '#000',
        padding: 6,
    },

    row: {
        flexDirection: 'row',
        marginBottom: 2,
    },

    label: {
        width: 120,
        fontSize: 8,
        color: '#475569',
    },

    value: {
        fontSize: 8,
    },

    table: {
        borderWidth: 1,
        borderColor: '#000',
    },

    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        backgroundColor: '#f1f5f9',
    },

    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#cbd5e1',
    },

    cell: {
        padding: 3,
        fontSize: 7.5,
    },

    textBlock: {
        borderWidth: 1,
        borderColor: '#000',
        padding: 6,
        fontSize: 7.5,
        lineHeight: 1.3,
    },

    signatureBlock: {
        marginTop: 40,
    },
});

/* ================= HELPERS ================= */
const InfoRow = ({ label, value }) => (
    <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || '-'}</Text>
    </View>
);

/* ================= COMPONENT ================= */
const ReportPdf = ({ data, settings }) => {
    const {
        visit,
        client,
        reportNumber,
        fullReportStructure,
        technicianUser,
        selectedTechnicalResponsible,
    } = data;

    const logoUrl = settings?.logo_url;
    const footerText =
        settings?.footer_text ||
        'A integridade dos resultados reportados neste relatório é garantida.';

    const visitDate = visit?.visit_date
        ? new Date(visit.visit_date)
        : new Date();

    const renderHeader = () => (
        <View style={styles.header} fixed>
            <View>
                <Text style={styles.headerTitle}>
                    Relatório de Ensaio Analítico
                </Text>
                <Text style={styles.subTitle}>
                    Laboratório de Serviços Analíticos
                </Text>
            </View>
            {logoUrl && <Image src={logoUrl} style={{ height: 28 }} />}
        </View>
    );

    const renderFooter = () => (
        <View style={styles.footer} fixed>
            <Text>{footerText}</Text>
            <Text
                render={({ pageNumber, totalPages }) =>
                    `Página ${pageNumber} de ${totalPages}`
                }
            />
        </View>
    );

    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>
                {renderHeader()}

                {/* CLIENT INFO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Identificação</Text>
                    <View style={styles.infoBox}>
                        <InfoRow label="Cliente" value={client?.name} />
                        <InfoRow label="Endereço" value={client?.address} />
                        <InfoRow label="Responsável" value={client?.contact_name} />
                        <InfoRow label="Código do Cliente" value={client?.client_code} />
                        <InfoRow label="Relatório Nº" value={reportNumber} />
                        <InfoRow
                            label="Data da Coleta"
                            value={format(visitDate, 'dd/MM/yyyy', { locale: ptBR })}
                        />
                    </View>
                </View>

                {/* RESULTS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Resultado do Ensaio Analítico
                    </Text>

                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={{ ...styles.cell, flex: 2 }}>Item Analítico</Text>
                            <Text style={{ ...styles.cell, flex: 1 }}>Valor</Text>
                            <Text style={{ ...styles.cell, flex: 0.8 }}>Unid.</Text>
                            <Text style={{ ...styles.cell, flex: 0.8 }}>Dil.</Text>
                            <Text style={{ ...styles.cell, flex: 1 }}>VMP</Text>
                            <Text style={{ ...styles.cell, flex: 0.8 }}>LD</Text>
                            <Text style={{ ...styles.cell, flex: 0.8 }}>LQ</Text>
                            <Text style={{ ...styles.cell, flex: 1 }}>Incerteza</Text>
                            <Text style={{ ...styles.cell, flex: 1 }}>Data</Text>
                        </View>

                        {fullReportStructure?.flatMap(loc =>
                            loc.equipments.flatMap(eq =>
                                eq.tests.map((test, idx) => (
                                    <View key={idx} style={styles.tableRow}>
                                        <Text style={{ ...styles.cell, flex: 2 }}>
                                            {test.name}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 1 }}>
                                            {test.result?.measured_value || '-'}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 0.8 }}>
                                            {test.unit || '-'}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 0.8 }}>
                                            {test.dilution || '1'}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 1 }}>
                                            {test.min_value} - {test.max_value}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 0.8 }}>
                                            {test.ld || '-'}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 0.8 }}>
                                            {test.lq || '-'}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 1 }}>
                                            {test.method_uncertainty || '-'}
                                        </Text>
                                        <Text style={{ ...styles.cell, flex: 1 }}>
                                            {format(visitDate, 'dd/MM/yyyy')}
                                        </Text>
                                    </View>
                                ))
                            )
                        )}
                    </View>
                </View>

                {/* OBSERVATIONS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Observações Gerais</Text>
                    <View style={styles.textBlock}>
                        <Text>
                            Neste momento, este relatório apresenta exclusivamente os
                            resultados analíticos obtidos. Recomenda-se seguir as
                            orientações repassadas durante as visitas técnicas presenciais
                            da equipe técnica.
                        </Text>
                    </View>
                </View>

                {/* SIGNATURE */}
                <View style={styles.signatureBlock}>
                    <Text>______________________________________________</Text>
                    <Text style={{ fontSize: 9, fontWeight: 700 }}>
                        {selectedTechnicalResponsible?.name ||
                            technicianUser?.name ||
                            'Responsável Técnico'}
                    </Text>
                    <Text style={{ fontSize: 8 }}>
                        Signatário Responsável pela Liberação
                    </Text>
                </View>

                {renderFooter()}
            </Page>
        </Document>
    );
};

export default ReportPdf;

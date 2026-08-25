import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Register Font
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 700 },
    ]
});

const styles = StyleSheet.create({
    page: {
        paddingTop: 80,
        paddingBottom: 60,
        paddingHorizontal: 30,
        fontFamily: 'Inter',
        fontSize: 10,
        color: '#1e293b',
    },
    header: {
        position: 'absolute',
        top: 20,
        left: 30,
        right: 30,
        height: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#2563eb', // blue-600
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: '#1e40af', // blue-800
        textTransform: 'uppercase',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#64748b',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    authKey: {
        fontWeight: 700,
        color: '#0f172a'
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: '#f1f5f9',
        padding: 6,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#2563eb',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderColor: '#e2e8f0',
    },
    gridItem: {
        width: '50%',
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: '#e2e8f0',
        padding: 6,
    },
    gridItemFull: {
        width: '100%',
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: '#e2e8f0',
        padding: 6,
    },
    label: {
        fontSize: 8,
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    value: {
        fontSize: 10,
        fontWeight: 600,
        color: '#0f172a',
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#2563eb',
        color: '#ffffff',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc',
    },
    tableCell: {
        padding: 6,
        fontSize: 9,
    },
    signatureSection: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    signatureBox: {
        alignItems: 'center',
        width: '40%',
    },
    signatureLine: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#000',
        marginTop: 40,
        paddingTop: 5,
        alignItems: 'center',
    }
});

const LabReportPdf = ({ data }) => {
    const { sample, results, client, testDefinitions } = data;
    
    // Generate an Auth Key if it doesn't exist
    const authKey = sample?.auth_key || Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const getParamName = (id) => {
        const td = testDefinitions?.find(t => t.id === id);
        return td ? td.name : 'Desconhecido';
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header} fixed>
                    <Text style={styles.headerTitle}>Laudo Analítico - {sample?.sample_code}</Text>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>WGA BRASIL</Text>
                </View>

                {/* Dados do Cliente */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Identificação do Cliente</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItemFull}>
                            <Text style={styles.label}>Cliente / Razão Social</Text>
                            <Text style={styles.value}>{client?.name || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Código</Text>
                            <Text style={styles.value}>{client?.client_code || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Endereço</Text>
                            <Text style={styles.value}>{client?.address || '-'}, {client?.city_state || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Dados da Amostra */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Dados da Amostra (Cadeia de Custódia)</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Ponto de Coleta / Equipamento</Text>
                            <Text style={styles.value}>{sample?.equipment || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Matriz</Text>
                            <Text style={styles.value}>{sample?.matrix || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Data da Coleta (Campo)</Text>
                            <Text style={styles.value}>{sample?.collected_at ? format(new Date(sample?.collected_at), 'dd/MM/yyyy HH:mm') : '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Data de Recebimento (Lab)</Text>
                            <Text style={styles.value}>{sample?.received_at ? format(new Date(sample?.received_at), 'dd/MM/yyyy HH:mm') : '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Condições Climáticas</Text>
                            <Text style={styles.value}>{sample?.rain_occurrence ? 'Chuva' : 'Sem chuvas'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Temperatura na Coleta</Text>
                            <Text style={styles.value}>{sample?.temperature ? \`\${sample.temperature} ºC\` : '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Integridade no Recebimento</Text>
                            <Text style={styles.value}>{sample?.receipt_integrity || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Lote Analítico</Text>
                            <Text style={styles.value}>{sample?.batch || sample?.sample_code}</Text>
                        </View>
                    </View>
                </View>

                {/* Resultados */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Resultados Analíticos</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={{ ...styles.tableCell, flex: 2, fontWeight: 700 }}>Parâmetro Analisado</Text>
                            <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700, textAlign: 'center' }}>Leitura</Text>
                            <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700, textAlign: 'center' }}>F. Correção</Text>
                            <Text style={{ ...styles.tableCell, flex: 1.5, fontWeight: 700, textAlign: 'center' }}>Resultado Final</Text>
                        </View>
                        {results?.map((r, i) => (
                            <View key={i} style={i % 2 === 0 ? styles.tableRow : { ...styles.tableRow, ...styles.tableRowAlt }}>
                                <Text style={{ ...styles.tableCell, flex: 2, fontWeight: 600 }}>{getParamName(r.test_definition_id)}</Text>
                                <Text style={{ ...styles.tableCell, flex: 1, textAlign: 'center', color: '#64748b' }}>{r.reading}</Text>
                                <Text style={{ ...styles.tableCell, flex: 1, textAlign: 'center', color: '#64748b' }}>{r.correction_factor}</Text>
                                <Text style={{ ...styles.tableCell, flex: 1.5, textAlign: 'center', fontWeight: 700, color: '#1e40af' }}>{r.calculated_result}</Text>
                            </View>
                        ))}
                    </View>
                    
                    <View style={{ marginTop: 15 }}>
                        <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>Comentários / Observações:</Text>
                        {results?.filter(r => r.comments).map((r, i) => (
                            <Text key={i} style={{ fontSize: 8, color: '#475569', marginBottom: 2 }}>- {getParamName(r.test_definition_id)}: {r.comments}</Text>
                        ))}
                    </View>
                </View>

                {/* Assinaturas */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine}>
                            <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{sample?.collection_signature_name || 'Técnico de Campo'}</Text>
                            <Text style={{ fontSize: 8, color: '#64748b' }}>Responsável pela Coleta</Text>
                        </View>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine}>
                            <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Analista de Laboratório</Text>
                            <Text style={{ fontSize: 8, color: '#64748b' }}>CRQ / Responsável Técnico</Text>
                        </View>
                    </View>
                </View>

                {/* Rodapé e Chave de Segurança */}
                <View style={styles.footer} fixed>
                    <Text>WGA Brasil - Laudo Analítico Válido</Text>
                    <Text>Chave de Autenticação: <Text style={styles.authKey}>{authKey}</Text></Text>
                    <Text render={({ pageNumber, totalPages }) => \`Página \${pageNumber} de \${totalPages}\`} />
                </View>
            </Page>
        </Document>
    );
};

export default LabReportPdf;

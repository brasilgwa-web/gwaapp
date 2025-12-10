
import React from 'react';
import { useParams } from 'react-router-dom';
import { useReportData } from '@/hooks/useReportData';
import { ReportTemplate } from '@/components/visit/ReportTemplate';

export default function ReportView() {
    const { id } = useParams();
    const { data, isLoading, error } = useReportData(id);

    if (isLoading) return <div className="flex items-center justify-center h-screen flex-col gap-4"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p>Gerando Relatório...</p></div>;
    if (error) return <div className="p-8 text-center text-red-500">Erro ao gerar relatório: {error.message}</div>;
    if (!data) return <div className="p-8 text-center">Relatório não disponível.</div>;

    return <ReportTemplate data={data} />;
}
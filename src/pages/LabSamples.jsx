import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Microscope, Plus } from "lucide-react";

export default function LabSamples() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Microscope className="w-6 h-6 text-blue-600" />
                    Amostras e Laudos
                </h1>
                <p className="text-slate-500">Módulo exclusivo de laboratório para registro de amostras e integração de laudos.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Amostras Recentes</CardTitle>
                        <CardDescription>Gerencie as amostras recebidas e em análise.</CardDescription>
                    </div>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar Amostra
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-slate-50">
                        <Microscope className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">Módulo em Desenvolvimento</h3>
                        <p className="text-sm text-slate-500 max-w-md mt-2">
                            A estrutura do módulo de laboratório foi criada. 
                            Estamos aguardando o refinamento dos campos necessários para o cadastro da amostra e o formato de integração dos laudos.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

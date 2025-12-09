import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

export default function SignaturePad({ onSave, savedUrl }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawing, setHasDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        
        const setCanvasSize = () => {
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                // Only resize if dimensions actually changed to avoid unnecessary clears
                if (canvas.width !== container.offsetWidth || canvas.height !== container.offsetHeight) {
                    canvas.width = container.offsetWidth;
                    canvas.height = container.offsetHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#000000';
                }
            }
        };

        // Initial sizing
        setCanvasSize();

        // Observer for visibility/resize changes (handles tabs)
        const resizeObserver = new ResizeObserver(() => {
            setCanvasSize();
        });
        
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, [savedUrl]); // Re-run when switching modes

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        setHasDrawing(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoordinates = (e, canvas) => {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawing(false);
        onSave(null); 
    };

    const handleSave = () => {
        if (!hasDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div className="space-y-2">
            <div ref={containerRef} className="border-2 border-dashed border-slate-300 rounded-lg bg-white touch-none relative h-48 w-full">
                 {savedUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-50 rounded-lg">
                        <img src={savedUrl} alt="Assinatura" className="max-h-full max-w-full object-contain" />
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="absolute top-2 right-2"
                            onClick={clear}
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full cursor-crosshair block rounded-lg"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                )}
                {!savedUrl && !hasDrawing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400">
                        Assine aqui
                    </div>
                )}
            </div>
            
            {!savedUrl && (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={clear} size="sm">
                        <Eraser className="w-4 h-4 mr-2" /> Limpar
                    </Button>
                    <Button onClick={handleSave} disabled={!hasDrawing} size="sm" className="bg-blue-600">
                        <Check className="w-4 h-4 mr-2" /> Confirmar Assinatura
                    </Button>
                </div>
            )}
        </div>
    );
}
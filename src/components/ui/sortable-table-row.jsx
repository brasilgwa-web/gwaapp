import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export function SortableTableRow({ id, children, ...props }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            data-swapy-item={id}
            className={`${props.className || ''} ${isDragging ? 'bg-blue-50 opacity-80 shadow-inner' : ''}`}
            {...props}
        >
            <TableCell className="w-[50px]">
                <button
                    type="button"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                    style={{ touchAction: 'none' }}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="w-4 h-4" />
                </button>
            </TableCell>
            {children}
        </TableRow>
    );
}

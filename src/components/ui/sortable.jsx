import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SortableItem({ id, children, className = '' }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`relative group ${className}`}>
            {children}
            {/* Drag Handle - shows on hover or always visible depending on preference. 
                Using absolute positioning to place it. Adapting based on layout. 
                Here we insert it as a child, assuming children layout allows it.
            */}
        </div>
    );
}

// Helper specific to our "Card" based list items (Equipment / Observations) where we want the handle explicitly placed
export function SortableListHandle({ attributes, listeners }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
            {...attributes}
            {...listeners}
        >
            <GripVertical className="w-5 h-5" />
        </Button>
    );
}

// Version where the whole item is NOT draggable, only the handle.
// This is safer for forms inside the item.
export function SortableItemWithHandle({ id, children, className = '' }) {
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
        <div ref={setNodeRef} style={style} className={`${className} ${isDragging ? 'opacity-80 shadow-lg ring-2 ring-blue-500/20' : ''}`}>
            {/* Pass attributes and listeners to a child "Handle" component via props or context if needed, 
                 but simpler: children function pattern or just cloneElement? 
                 Actually, for our Equipment/Observation lists, we inject the handle inside the component.
                 So we need to export the hook values or wrap smartly.
             */}
            {/* 
                Strategy: This component just wraps the `div` and positioning. 
                It exposes a Render Prop or we assume the `DragHandle` is passed as a prop?
                Better: The parent uses `useSortable` directly? 
                No, to avoid code duplication, let's make this component accept a "render" prop 
                OR simply wrap the content and we provide a simple "SortableHandle" export.
             */}
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { dragHandleProps: { ...attributes, ...listeners } });
                }
                return child;
            })}
        </div>
    );
}

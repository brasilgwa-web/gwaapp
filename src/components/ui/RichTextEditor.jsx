import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Link as LinkIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    Undo,
    Redo,
    Palette
} from 'lucide-react';
import { Button } from './button';

const TEXT_COLORS = [
    { name: 'Preto', value: '#000000' },
    { name: 'Cinza Escuro', value: '#374151' },
    { name: 'Cinza', value: '#6b7280' },
    { name: 'Vermelho', value: '#dc2626' },
    { name: 'Laranja', value: '#ea580c' },
    { name: 'Amarelo', value: '#ca8a04' },
    { name: 'Verde', value: '#059669' },
    { name: 'Azul', value: '#2563eb' },
    { name: 'Roxo', value: '#7c3aed' },
    { name: 'Rosa', value: '#db2777' },
    { name: 'Branco', value: '#ffffff' },
];

const ColorPicker = ({ editor }) => {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPicker]);

    const currentColor = editor.getAttributes('textStyle').color || '#000000';

    return (
        <div className="relative" ref={pickerRef}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPicker(!showPicker)}
                className="relative"
            >
                <Palette className="w-4 h-4" />
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
                    style={{ backgroundColor: currentColor }}
                />
            </Button>

            {showPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50">
                    <div className="text-xs font-medium text-slate-700 mb-2">Cor do Texto</div>
                    <div className="grid grid-cols-4 gap-2 w-40">
                        {TEXT_COLORS.map((color) => (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().setColor(color.value).run();
                                    setShowPicker(false);
                                }}
                                className={`h-8 w-8 rounded border-2 transition-all hover:scale-110 ${currentColor === color.value
                                        ? 'border-blue-500 ring-2 ring-blue-200'
                                        : 'border-slate-300'
                                    }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            editor.chain().focus().unsetColor().run();
                            setShowPicker(false);
                        }}
                        className="w-full mt-2 text-xs text-slate-600 hover:text-slate-900 py-1 px-2 rounded hover:bg-slate-100"
                    >
                        Remover cor
                    </button>
                </div>
            )}
        </div>
    );
};

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null;
    }

    const addLink = () => {
        const url = window.prompt('URL do link:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    return (
        <div className="border border-slate-200 rounded-t-md bg-slate-50 p-2 flex flex-wrap gap-1">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'bg-slate-200' : ''}
            >
                <Bold className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'bg-slate-200' : ''}
            >
                <Italic className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-slate-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'bg-slate-200' : ''}
            >
                <Heading1 className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}
            >
                <Heading2 className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={editor.isActive('heading', { level: 3 }) ? 'bg-slate-200' : ''}
            >
                <Heading3 className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-slate-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'bg-slate-200' : ''}
            >
                <List className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'bg-slate-200' : ''}
            >
                <ListOrdered className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-slate-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200' : ''}
            >
                <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200' : ''}
            >
                <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200' : ''}
            >
                <AlignRight className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-slate-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addLink}
                className={editor.isActive('link') ? 'bg-slate-200' : ''}
            >
                <LinkIcon className="w-4 h-4" />
            </Button>

            <ColorPicker editor={editor} />

            <div className="w-px h-6 bg-slate-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
            >
                <Undo className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
            >
                <Redo className="w-4 h-4" />
            </Button>
        </div>
    );
};

export default function RichTextEditor({ value = '', onChange, placeholder = 'Digite aqui...', minHeight = '150px' }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content: value || '<p></p>',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange?.(html);
        },
    });

    // Update editor content when value prop changes externally
    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '<p></p>');
        }
    }, [value, editor]);

    return (
        <div className="border border-slate-200 rounded-md overflow-hidden">
            <MenuBar editor={editor} />
            <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none p-3 focus:outline-none"
                style={{ minHeight }}
            />
        </div>
    );
}

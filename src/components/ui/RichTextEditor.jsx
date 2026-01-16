import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
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
    Palette,
    Type,
    TextCursorInput
} from 'lucide-react';
import { Button } from './button';

const FONT_FAMILIES = [
    { name: 'Padrão', value: '' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Comic Sans', value: 'Comic Sans MS, cursive' },
];

const FONT_SIZES = [
    { name: 'Pequeno', value: '12px' },
    { name: 'Normal', value: '16px' },
    { name: 'Médio', value: '20px' },
    { name: 'Grande', value: '24px' },
    { name: 'Muito Grande', value: '32px' },
];

const FontFamilySelector = ({ editor }) => {
    const currentFont = editor.getAttributes('textStyle').fontFamily || '';

    return (
        <select
            value={currentFont}
            onChange={(e) => {
                if (e.target.value === '') {
                    editor.chain().focus().unsetFontFamily().run();
                } else {
                    editor.chain().focus().setFontFamily(e.target.value).run();
                }
            }}
            className="h-8 px-2 text-xs border border-slate-300 rounded bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.name}
                </option>
            ))}
        </select>
    );
};

const FontSizeSelector = ({ editor }) => {
    const handleSizeChange = (size) => {
        editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    };

    return (
        <select
            onChange={(e) => handleSizeChange(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-300 rounded bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="">Tamanho</option>
            {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                    {size.name}
                </option>
            ))}
        </select>
    );
};

const ColorPicker = ({ editor }) => {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef(null);
    const colorInputRef = useRef(null);

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

    const handleColorChange = (e) => {
        const color = e.target.value;
        editor.chain().focus().setColor(color).run();
    };

    const handleButtonClick = () => {
        // Trigger the native color picker
        colorInputRef.current?.click();
    };

    return (
        <div className="relative" ref={pickerRef}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleButtonClick}
                className="relative"
            >
                <Palette className="w-4 h-4" />
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
                    style={{ backgroundColor: currentColor }}
                />
            </Button>

            {/* Hidden native color input */}
            <input
                ref={colorInputRef}
                type="color"
                value={currentColor}
                onChange={handleColorChange}
                className="absolute opacity-0 pointer-events-none"
            />
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

            <FontFamilySelector editor={editor} />
            <FontSizeSelector editor={editor} />

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
            StarterKit.configure({
                hardBreak: {
                    keepMarks: true,
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        fontSize: {
                            default: null,
                            parseHTML: element => element.style.fontSize,
                            renderHTML: attributes => {
                                if (!attributes.fontSize) {
                                    return {};
                                }
                                return { style: `font-size: ${attributes.fontSize}` };
                            },
                        },
                    };
                },
            }),
            FontFamily,
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

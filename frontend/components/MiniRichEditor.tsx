import React, { useRef, useEffect, useCallback } from 'react';

interface MiniRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

const TEXT_COLORS = [
  { name: 'Texto', value: '#1e293b' },
  { name: 'Rojo', value: '#dc2626' },
  { name: 'Naranja', value: '#ea580c' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Azul', value: '#2563eb' },
  { name: 'Violeta', value: '#7c3aed' },
  { name: 'Rosa', value: '#db2777' },
  { name: 'Gris', value: '#64748b' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Amarillo', value: '#fef08a' },
  { name: 'Verde claro', value: '#bbf7d0' },
  { name: 'Azul claro', value: '#bfdbfe' },
  { name: 'Rosa claro', value: '#fbcfe8' },
];

const MiniRichEditor: React.FC<MiniRichEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escriba aquí...',
  minHeight = '180px',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === '' || value === '<p><br></p>' || value === '<p></p>') {
      el.innerHTML = '';
      return;
    }
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html);
  }, [onChange]);

  const saveSelection = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !el) return;
    try {
      const anchor = sel.anchorNode;
      const focus = sel.focusNode;
      if (anchor && focus && el.contains(anchor) && el.contains(focus)) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    } catch (_) {
      savedRangeRef.current = null;
    }
  }, []);

  const restoreAndExec = useCallback((command: string, valueArg?: string) => {
    const el = editorRef.current;
    if (!el) return;

    el.focus();

    if (savedRangeRef.current) {
      try {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
        }
      } catch (_) {}
      savedRangeRef.current = null;
    }

    requestAnimationFrame(() => {
      if (command === 'backColor' && (!valueArg || valueArg === 'transparent')) {
        document.execCommand('removeFormat', false);
      } else {
        document.execCommand(command, false, valueArg || undefined);
      }
      handleInput();
    });
  }, [handleInput]);

  const exec = useCallback((command: string, valueArg?: string) => {
    restoreAndExec(command, valueArg);
  }, [restoreAndExec]);

  const onToolbarCapture = useCallback(() => {
    saveSelection();
  }, [saveSelection]);

  const onButtonMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
  }, [saveSelection]);

  return (
    <div className={`rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm ${className}`}>
      <div
        className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 border-b border-slate-200"
        onMouseDownCapture={onToolbarCapture}
      >
        <button
          type="button"
          onMouseDown={onButtonMouseDown}
          onClick={() => exec('bold')}
          className="min-w-[32px] h-8 px-2 rounded-lg hover:bg-slate-200 font-bold text-sm"
          title="Negrita"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={onButtonMouseDown}
          onClick={() => exec('italic')}
          className="min-w-[32px] h-8 px-2 rounded-lg hover:bg-slate-200 italic text-sm"
          title="Cursiva"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={onButtonMouseDown}
          onClick={() => exec('underline')}
          className="min-w-[32px] h-8 px-2 rounded-lg hover:bg-slate-200 underline text-sm"
          title="Subrayado"
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={onButtonMouseDown}
          onClick={() => exec('strikeThrough')}
          className="min-w-[32px] h-8 px-2 rounded-lg hover:bg-slate-200 line-through text-sm"
          title="Tachado"
        >
          S
        </button>
        <span className="w-px h-6 bg-slate-300 mx-0.5" aria-hidden />
        <span className="text-xs font-medium text-slate-600">Color:</span>
        <select
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs cursor-pointer"
          title="Color de texto"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) restoreAndExec('foreColor', v);
            e.target.value = '';
          }}
        >
          <option value="">—</option>
          {TEXT_COLORS.filter((c) => c.value !== '#1e293b').map((c) => (
            <option key={c.value} value={c.value}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="text-xs font-medium text-slate-600">Resaltar:</span>
        <select
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs cursor-pointer"
          title="Resaltar"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) {
              restoreAndExec('backColor', v);
            } else {
              restoreAndExec('backColor', 'transparent');
            }
            e.target.value = '';
          }}
        >
          <option value="">—</option>
          {HIGHLIGHT_COLORS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.name}
            </option>
          ))}
        </select>
        <span className="w-px h-6 bg-slate-300 mx-0.5" aria-hidden />
        <button
          type="button"
          onMouseDown={onButtonMouseDown}
          onClick={() => exec('insertUnorderedList')}
          className="h-8 px-2.5 rounded-lg hover:bg-slate-200 text-sm"
          title="Lista con viñetas"
        >
          • Lista
        </button>
        <button
          type="button"
          onMouseDown={onButtonMouseDown}
          onClick={() => exec('insertOrderedList')}
          className="h-8 px-2.5 rounded-lg hover:bg-slate-200 text-sm"
          title="Lista numerada"
        >
          1. Lista
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        className="p-4 outline-none text-sm font-medium min-h-[180px] prose prose-slate prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0"
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default MiniRichEditor;

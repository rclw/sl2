import { Handle, Position } from 'reactflow';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './ui-components';

interface ProofNodeData {
  label: string;
  expression: string;
  leftAnnotation?: string;
  rightAnnotation?: string;
  rule?: string;
  hasIncomingEdges?: boolean;
  onChange?: (val: string) => void;
  onLeftAnnotationChange?: (val: string) => void;
  onRightAnnotationChange?: (val: string) => void;
  onRuleChange?: (val: string) => void;
  onDelete?: () => void;
}

export function ProofNode({ data, selected }: { data: ProofNodeData, selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingLeft, setIsEditingLeft] = useState(false);
  const [isEditingRight, setIsEditingRight] = useState(false);

  return (
    <div
      className={`
        px-4 py-2 bg-white rounded-md border-2 min-w-[180px] transition-all duration-200 group
        ${selected ? 'border-primary shadow-lg scale-105' : 'border-transparent shadow-sm hover:shadow-md'}
      `}
    >
      {/* Target handle for premises (inputs) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-2 !h-2 !-top-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Delete Button */}
      <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="icon"
          variant="destructive"
          className="h-6 w-6 rounded-full shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete?.();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-start gap-2 justify-center">
        {/* Left Annotation */}
        <div className="min-w-[1.25rem] text-right border border-dashed border-black/50 min-h-[1.25rem] flex items-center justify-end px-1 rounded-sm shrink-0 relative top-[1px]">
          {isEditingLeft ? (
            <input
              autoFocus
              className="p-0 text-right outline-none bg-transparent font-mono text-[10px]"
              style={{ width: `${Math.max((data.leftAnnotation || '').length, 2)}ch` }}
              value={data.leftAnnotation || ''}
              onChange={(e) => data.onLeftAnnotationChange?.(e.target.value)}
              onBlur={() => setIsEditingLeft(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingLeft(false)}
            />
          ) : (
            <div
              className="text-[10px] text-foreground cursor-text min-h-[12px] opacity-100 hover:opacity-100 w-full"
              onDoubleClick={() => setIsEditingLeft(true)}
            >
              <Latex>{data.leftAnnotation ? `$${data.leftAnnotation}$` : ''}</Latex>
            </div>
          )}
        </div>

        {/* Center: Line and Expression */}
        <div className="flex flex-col items-center">
          {/* Spacer/Line container matching annotation height for alignment */}
          <div className={`h-[1.25rem] w-full flex items-center ${!data.hasIncomingEdges && !data.leftAnnotation && !data.rightAnnotation ? 'opacity-0 pointer-events-none' : ''}`}>
            <div className="h-px bg-foreground/80 w-full relative" />
          </div>

          {/* Expression */}
          <div className={`text-center font-serif text-lg text-foreground min-h-[1.5rem] py-1 px-3`}>
            {isEditing ? (
              <input
                autoFocus
                className="min-w-[40px] text-center border-b border-primary outline-none bg-transparent font-mono text-sm"
                style={{ width: `${Math.max((data.expression || '').length, 3)}ch` }}
                value={data.expression}
                onChange={(e) => data.onChange?.(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              />
            ) : (
              <div className="cursor-text whitespace-nowrap" title="Double click to edit" onDoubleClick={() => setIsEditing(true)}>
                <Latex>{data.expression ? `$${data.expression}$` : '$\\dots$'}</Latex>
              </div>
            )}
          </div>
        </div>

        {/* Right Annotation */}
        <div className="min-w-[1.25rem] text-left border border-dashed border-black/50 min-h-[1.25rem] flex items-center justify-start px-1 rounded-sm shrink-0 relative top-[1px]">
          {isEditingRight ? (
            <input
              autoFocus
              className="p-0 text-left outline-none bg-transparent font-mono text-[10px]"
              style={{ width: `${Math.max((data.rightAnnotation || '').length, 2)}ch` }}
              value={data.rightAnnotation || ''}
              onChange={(e) => data.onRightAnnotationChange?.(e.target.value)}
              onBlur={() => setIsEditingRight(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingRight(false)}
            />
          ) : (
            <div
              className="text-[10px] text-foreground cursor-text min-h-[12px] opacity-100 hover:opacity-100 w-full"
              onDoubleClick={() => setIsEditingRight(true)}
            >
              <Latex>{data.rightAnnotation ? `$${data.rightAnnotation}$` : ''}</Latex>
            </div>
          )}
        </div>
      </div>

      {/* Source handle for conclusion (output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-2 !h-2 !-bottom-1.5"
      />
    </div>
  );
}

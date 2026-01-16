import { Node, Edge } from 'reactflow';

export function convertToDerivation(nodes: Node[], edges: Edge[]): string {
  // Build node map
  const nodesMap: Record<string, any> = {};
  for (const n of nodes) {
    nodesMap[n.id] = {
      ...n.data,
      leftnote: n.data.leftAnnotation || '',
      rightnote: n.data.rightAnnotation || '',
    };
  }

  // Build child relationships from edges (premise -> conclusion)
  const childMap: Record<string, string[]> = {};
  const premises = new Set<string>();
  
  for (const e of edges) {
    const prm = e.source;
    const ccl = e.target;
    if (prm && ccl) {
      if (!childMap[ccl]) {
        childMap[ccl] = [];
      }
      childMap[ccl].push(prm);
      premises.add(prm);
    }
  }

  // Determine root as node with no incoming edges
  const allIds = new Set(Object.keys(nodesMap));
  const rootCandidates = Array.from(allIds).filter(id => !premises.has(id));
  
  if (rootCandidates.length !== 1) {
    throw new Error(`Fuck off! There are ${rootCandidates.length} conclusions, what can I do?`);
  }

  const rootId = rootCandidates[0];

  // Generate LaTeX tree
  const lines: string[] = [];

  function printTree(nodeId: string, indent: number = 1): void {
    const indentStr = '  '.repeat(indent);
    const node = nodesMap[nodeId];
    
    if (!node) {
      return;
    }

    const expr = node.expression || '';
    const notes = [node.leftnote || '', node.rightnote || ''];

    // Generate vlin with appropriate number of 'i's
    const numChildren = Math.max((childMap[nodeId] || []).length, 1);
    const vlin = `vl${'i'.repeat(numChildren)}n`;

    
    // Print children
    const children = childMap[nodeId] || [];
    if (children.length === 0) {
      if (notes[0] || notes[1]) {
        // Print leaf with notes
        lines.push(`${indentStr}\\vlin{${notes[0]}}{${notes[1]}}{${expr}}{\\vlhy{}}`);
      } else {
        // Print leaf without notes
        lines.push(`${indentStr}\\vlhy{${expr}`);
      }
    } else {
      // Print node
      lines.push(`${indentStr}\\${vlin}{${notes[0]}}{${notes[1]}}{${expr}}`);
      for (const child of children) {
        lines.push(`${indentStr}{`);
        printTree(child, indent + 1);
        lines.push(`${indentStr}}`);
      }
    }
  }

  lines.push('\\vlderivation{');
  printTree(rootId);
  lines.push('}');

  return lines.join('\n');
}

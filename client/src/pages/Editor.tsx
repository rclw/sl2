import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  SelectionMode,
  getOutgoers,
} from 'reactflow';
import { useProof } from '@/hooks/use-proofs';
import { ProofNode } from '@/components/ProofNode';
import { Button, Input } from '@/components/ui-components';
import { Download, Plus, Layout, Settings2, FileJson, HelpCircle, Undo2, Redo2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { convertToDerivation } from '@/lib/treeparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

export default function Editor() {
  const { data: proofData, isLoading } = useProof(1);
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading proof environment...</p>
        </div>
      </div>
    );
  }

  if (!proofData) {
    return <div className="p-8">Proof not found</div>;
  }

  return (
    <ReactFlowProvider>
      <EditorCanvas proof={proofData} />
    </ReactFlowProvider>
  );
}

function EditorCanvas({ proof }: { proof: any }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clipboard, setClipboard] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const [showDerivationExport, setShowDerivationExport] = useState(false);
  const [derivationOutput, setDerivationOutput] = useState('');
  const reactFlowInstance = useReactFlow();
  const { toast } = useToast();
  const GLOBAL_FIT_VIEW_OPTIONS = {
    padding: 0.2, // 20% margin around the nodes
    maxZoom: 1,   // Prevents small trees from becoming huge
    duration: 400, // Optional: adds a smooth transition animation
  };
  // Undo/Redo Logic
  // Updated saveToHistory with 50-item limit and cleanup
  const saveToHistory = useCallback((nds: Node[], eds: Edge[]) => {
    setHistory((prev) => {
      // 1. Remove any "future" states if we were in the middle of an undo chain
      const slicedHistory = prev.slice(0, historyIndex + 1);
      
      // 2. Deep clone to prevent reference issues
      const newState = { 
        nodes: JSON.parse(JSON.stringify(nds)), 
        edges: JSON.parse(JSON.stringify(eds)) 
      };

      // 3. Maintain 50 item limit
      const updatedHistory = [...slicedHistory, newState];
      if (updatedHistory.length > 50) {
        updatedHistory.shift();
        // Adjust index because we removed the first element
        setHistoryIndex(prevIdx => prevIdx); 
      } else {
        setHistoryIndex(updatedHistory.length - 1);
      }
      
      return updatedHistory;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Handle changes and save to history
  const onNodesChangeWithHistory = useCallback((changes: any) => {
    onNodesChange(changes);
    // Debounce or filter changes to avoid excessive history
    if (changes.some((c: any) => c.type === 'position' || c.type === 'remove' || c.type === 'add')) {
       // Ideally we'd capture state after changes apply
    }
  }, [onNodesChange]);

  const onEdgesChangeWithHistory = useCallback((changes: any) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);


  // Node Types definition (memoized)
  const nodeTypes = useMemo(() => ({ proofNode: ProofNode }), []);

  // Update node data handler
  const onNodeDataChange = useCallback((id: string, key: string, val: string) => {
    setNodes((nds) => {
      const nextNodes = nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, [key]: val } };
        }
        return node;
      });
      // Capture history on data change (debounced in real app)
      saveToHistory(nextNodes, edges);
      return nextNodes;
    });
  }, [setNodes, edges, saveToHistory]);

  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => {
      const nextNodes = nds.filter((node) => node.id !== id);
      setEdges((eds) => {
        const nextEdges = eds.filter((edge) => edge.source !== id && edge.target !== id);
        saveToHistory(nextNodes, nextEdges);
        return nextEdges;
      });
      return nextNodes;
    });
  }, [setNodes, setEdges, saveToHistory]);

  // Copy and Paste
  const copyNodes = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => 
      selectedNodes.some(n => n.id === edge.source) && 
      selectedNodes.some(n => n.id === edge.target)
    );
    if (selectedNodes.length > 0) {
      setClipboard({ nodes: JSON.parse(JSON.stringify(selectedNodes)), edges: JSON.parse(JSON.stringify(selectedEdges)) });
      toast({ title: "Copied", description: `${selectedNodes.length} nodes copied to clipboard.` });
    }
  }, [nodes, edges, toast]);

  const cutNodes = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => 
      selectedNodes.some(n => n.id === edge.source) && 
      selectedNodes.some(n => n.id === edge.target)
    );
    if (selectedNodes.length > 0) {
      setClipboard({ nodes: JSON.parse(JSON.stringify(selectedNodes)), edges: JSON.parse(JSON.stringify(selectedEdges)) });
      const nextNodes = nodes.filter((node) => !node.selected);
      const nextEdges = edges.filter((edge) => 
        !selectedNodes.some(n => n.id === edge.source) || 
        !selectedNodes.some(n => n.id === edge.target)
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      saveToHistory(nextNodes, nextEdges);
      toast({ title: "Cut", description: `${selectedNodes.length} nodes cut to clipboard.` });
    }
  }, [nodes, edges, setNodes, setEdges, toast, saveToHistory]);

  const pasteNodes = useCallback(() => {
    if (!clipboard) return;

    const shift = { x: 50, y: 50 };
    const newIdMap: Record<string, string> = {};
    
    const newNodes = clipboard.nodes.map((node) => {
      const newId = `copy-${Date.now()}-${node.id}`;
      newIdMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + shift.x, y: node.position.y + shift.y },
        selected: true,
        data: {
          ...node.data,
          onChange: (val: string) => onNodeDataChange(newId, 'expression', val),
          onRuleChange: (val: string) => onNodeDataChange(newId, 'rule', val),
          onLeftAnnotationChange: (val: string) => onNodeDataChange(newId, 'leftAnnotation', val),
          onRightAnnotationChange: (val: string) => onNodeDataChange(newId, 'rightAnnotation', val),
          onDelete: () => onDeleteNode(newId),
        }
      };
    });

    const newEdges = clipboard.edges.map((edge) => ({
      ...edge,
      id: `edge-copy-${Date.now()}-${edge.id}`,
      source: newIdMap[edge.source],
      target: newIdMap[edge.target],
    }));

    const nextNodes = nodes.map(n => ({ ...n, selected: false })).concat(newNodes);
    const nextEdges = edges.concat(newEdges);
    setNodes(nextNodes);
    setEdges(nextEdges);
    saveToHistory(nextNodes, nextEdges);
    toast({ title: "Pasted", description: `${newNodes.length} nodes pasted.` });
  }, [clipboard, onNodeDataChange, onDeleteNode, setNodes, setEdges, toast, nodes, edges, saveToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 'c') copyNodes();
        if (e.key === 'x') cutNodes();
        if (e.key === 'v') pasteNodes();
        if (e.key === 'z') {
          if (e.shiftKey) redo();
          else undo();
        }
        if (e.key === 'y') redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyNodes, cutNodes, pasteNodes, undo, redo]);

  // Initialize from saved data
  useEffect(() => {
    if (proof.content && (proof.content as any).nodes) {
      const content = proof.content as any;
      const initialNds = content.nodes || [];
      const initialEds = content.edges || [];
      setNodes(initialNds);
      setEdges(initialEds);
      setHistory([{ nodes: JSON.parse(JSON.stringify(initialNds)), edges: JSON.parse(JSON.stringify(initialEds)) }]);
      setHistoryIndex(0);
    } //else {
    //   setNodes(initialNodes);
    //   setHistory([{ nodes: JSON.parse(JSON.stringify(initialNodes)), edges: [] }]);
    //   setHistoryIndex(0);
    // 
  }, [proof, setNodes, setEdges]);

  // Inject handlers into nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onChange: (val: string) => onNodeDataChange(node.id, 'expression', val),
          onRuleChange: (val: string) => onNodeDataChange(node.id, 'rule', val),
          onLeftAnnotationChange: (val: string) => onNodeDataChange(node.id, 'leftAnnotation', val),
          onRightAnnotationChange: (val: string) => onNodeDataChange(node.id, 'rightAnnotation', val),
          onDelete: () => onDeleteNode(node.id),
        },
      }))
    );
  }, [onNodeDataChange, onDeleteNode, setNodes]);

  const isValidConnection = useCallback((connection: Connection) => {
    // Prevent self-loops
    if (connection.source === connection.target) {
      return false;
    }

    // Prevent node from being source of more than one edge
    if (edges.some((edge) => edge.source === connection.source)) {
      return false;
    }

    // Check for cycles
    const hasCycle = (node: Node, visited = new Set<string>()): boolean => {
      if (visited.has(node.id)) return false;
      visited.add(node.id);
      
      for (const outgoer of getOutgoers(node, nodes, edges)) {
        if (outgoer.id === connection.source) return true;
        if (hasCycle(outgoer, visited)) return true;
      }
      return false;
    };

    const target = nodes.find((node) => node.id === connection.target);
    if (!target) return true;
    
    return !hasCycle(target);
  }, [nodes, edges]);

  const onConnect = useCallback((params: Connection) => {
    if (isValidConnection(params)) {
      setEdges((eds) => {
        const nextEdges = addEdge(params, eds);
        saveToHistory(nodes, nextEdges);
        return nextEdges;
      });
    } else {
      // Determine which error message to show
      if (params.source === params.target) {
        toast({ variant: "destructive", title: "Invalid connection", description: "A node cannot connect to itself." });
      } else if (edges.some((edge) => edge.source === params.source)) {
        toast({ variant: "destructive", title: "Invalid connection", description: "A node can only be the source of one edge." });
      } else {
        toast({ variant: "destructive", title: "Invalid connection", description: "This connection would create a cycle." });
      }
    }
  }, [setEdges, nodes, saveToHistory, isValidConnection, toast, edges]);

  const addNode = () => {
    const id = `${nodes.length + Date.now()}`;
    const newNode = {
      id,
      type: 'proofNode',
      position: { 
        x: -reactFlowInstance.getViewport().x + 100 + Math.random() * 50, 
        y: -reactFlowInstance.getViewport().y + 100 + Math.random() * 50 
      },
      data: { 
        expression: '', 
        rule: '',
        leftAnnotation: '',
        rightAnnotation: '',
        onChange: (val: string) => onNodeDataChange(id, 'expression', val),
        onRuleChange: (val: string) => onNodeDataChange(id, 'rule', val),
        onLeftAnnotationChange: (val: string) => onNodeDataChange(id, 'leftAnnotation', val),
        onRightAnnotationChange: (val: string) => onNodeDataChange(id, 'rightAnnotation', val),
        onDelete: () => onDeleteNode(id),
      },
    };
    const nextNodes = nodes.concat(newNode);
    setNodes(nextNodes);
    saveToHistory(nextNodes, edges);
  };

  const exportGraph = () => {
    try {
      const output = convertToDerivation(nodes, edges);
      setDerivationOutput(output);
      setShowDerivationExport(true);
      toast({ title: "Converted", description: "Proof tree converted to Virginia Lake Code." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Export failed", description: error.message });
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Header Toolbar */}
      <header className="h-16 border-b flex items-center px-6 justify-between bg-white z-20 shrink-0">
        <div className="flex items-center gap-4">
          {/* <div className="h-6 w-px bg-border mx-2" /> */}
          <div className="font-serif text-lg px-0 bg-transparent font-medium">
            <Latex>{'$\\mathbf{SL}_2$'}</Latex>
          </div>
          <div className="h-6 w-px bg-border mx-2" />
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={undo} disabled={historyIndex <= 0}>
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={exportGraph}>
            <FileJson className="w-4 h-4 mr-2" />
            Export Tree
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            panOnDrag={true}
            selectionOnDrag={false}
            selectionMode={SelectionMode.Partial}
            panOnScroll
            fitView
            fitViewOptions={GLOBAL_FIT_VIEW_OPTIONS}
            minZoom={0.5}
            maxZoom={2}
            attributionPosition="bottom-right"
            onNodeDragStop={() => saveToHistory(nodes, edges)}
          >
            <Background color="#000" gap={20} size={1} style={{ opacity: 0.05 }} />
            <Controls className="!bg-white !border-border !shadow-sm" />
            
            <Panel position="top-left" className="m-4">
              <div className="bg-white/90 backdrop-blur border border-border p-2 rounded-lg shadow-sm flex flex-col gap-2">
                <Button size="sm" variant="ghost" onClick={addNode} className="justify-start">
                  <Plus className="w-4 h-4 mr-2" /> Add Step
                </Button>
                <Button size="sm" variant="ghost" onClick={() => reactFlowInstance.fitView(GLOBAL_FIT_VIEW_OPTIONS)} className="justify-start">
                  <Layout className="w-4 h-4 mr-2" /> Fit View
                </Button>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Sidebar */}
        <div 
          className={`h-full border-l bg-white transition-all duration-300 ease-in-out z-10 overflow-hidden ${isSidebarOpen ? 'w-80' : 'w-0'}`}
        >
          <ScrollArea className="h-full w-80">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <Settings2 className="w-5 h-5 mr-2 text-primary" />
                  Guide
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)}>Close</Button>
              </div>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Editing Nodes</h3>
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-3 rounded-md border text-sm">
                      <p className="font-medium text-foreground mb-1">Formulas (LaTeX)</p>
                      <p className="text-muted-foreground leading-relaxed">Double-click the center of a node to edit the main formula.</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md border text-sm">
                      <p className="font-medium text-foreground mb-1">Annotations</p>
                      <p className="text-muted-foreground leading-relaxed">Double-click the left or right sides of a node to add rule names or labels.</p>
                    </div>
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Navigation</h3>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between p-2 border rounded bg-background">
                      <span className="text-muted-foreground">Pan View</span>
                      <span className="font-medium">Left Drag</span>
                    </div>
                    <div className="flex justify-between p-2 border rounded bg-background">
                      <span className="text-muted-foreground">Select Multiple</span>
                      <span className="font-medium">Shift + Drag</span>
                    </div>
                    <div className="flex justify-between p-2 border rounded bg-background">
                      <span className="text-muted-foreground">Zoom</span>
                      <span className="font-medium">Scroll / Pinch</span>
                    </div>
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Shortcuts</h3>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between items-center p-1.5 border-b">
                      <span>Undo</span>
                      <kbd className="bg-muted px-1.5 py-0.5 rounded border shadow-sm">Ctrl + Z</kbd>
                    </div>
                    <div className="flex justify-between items-center p-1.5 border-b">
                      <span>Redo</span>
                      <kbd className="bg-muted px-1.5 py-0.5 rounded border shadow-sm">Ctrl + Y</kbd>
                    </div>
                    <div className="flex justify-between items-center p-1.5 border-b">
                      <span>Copy</span>
                      <kbd className="bg-muted px-1.5 py-0.5 rounded border shadow-sm">Ctrl + C</kbd>
                    </div>
                    <div className="flex justify-between items-center p-1.5 border-b">
                      <span>Paste</span>
                      <kbd className="bg-muted px-1.5 py-0.5 rounded border shadow-sm">Ctrl + V</kbd>
                    </div>
                  </div>
                </section>

                <div className="mt-8 pt-6 border-t">
                   <p className="text-[10px] text-center text-muted-foreground italic">
                     Logic Logic Logic
                   </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Derivation Export Dialog */}
      <Dialog open={showDerivationExport} onOpenChange={setShowDerivationExport}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Virginia Lake Code </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 border rounded p-4 bg-muted/30">
            <pre className="font-mono text-sm whitespace-pre-wrap break-words pr-4">
              {derivationOutput}
            </pre>
          </ScrollArea>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(derivationOutput);
                toast({ title: "Copied", description: "Virginia Lake code copied to clipboard." });
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button variant="outline" onClick={() => setShowDerivationExport(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


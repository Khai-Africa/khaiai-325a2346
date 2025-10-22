import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Eraser, Square, Circle, Type, Download, Trash2, Undo, Redo, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const Canvas = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen');
  const [color, setColor] = useState('#8b5cf6');
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = Math.min(600, window.innerHeight - 200);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const newStep = historyStep - 1;
      ctx.putImageData(history[newStep], 0, 0);
      setHistoryStep(newStep);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const newStep = historyStep + 1;
      ctx.putImageData(history[newStep], 0, 0);
      setHistoryStep(newStep);
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !startPos) return;

    const coords = getCoordinates(e);

    ctx.globalCompositeOperation = 'source-over';

    if (tool === 'rectangle') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      const width = coords.x - startPos.x;
      const height = coords.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (tool === 'circle') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      const radius = Math.sqrt(
        Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2)
      );
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `${brushSize * 8}px sans-serif`;
        ctx.fillText(text, startPos.x, startPos.y);
      }
    }

    setIsDrawing(false);
    setStartPos(null);
    saveToHistory();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    toast.success('Canvas cleared');
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'canvas-drawing.png';
    link.href = url;
    link.click();
    toast.success('Canvas downloaded');
  };

  const toolButtons = [
    { tool: 'pen' as const, icon: Pencil, label: 'Pen' },
    { tool: 'eraser' as const, icon: Eraser, label: 'Eraser' },
    { tool: 'rectangle' as const, icon: Square, label: 'Rectangle' },
    { tool: 'circle' as const, icon: Circle, label: 'Circle' },
    { tool: 'text' as const, icon: Type, label: 'Text' },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Canvas</h1>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden hover:bg-muted"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-4">
          {/* Toolbar */}
          <Card className={`p-4 space-y-4 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <div>
              <Label className="text-sm font-medium mb-2 block">Tools</Label>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                {toolButtons.map(({ tool: t, icon: Icon, label }) => (
                  <Button
                    key={t}
                    variant={tool === t ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setTool(t)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Color</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Brush Size: {brushSize}px
              </Label>
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            <div className="pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={historyStep <= 0}
                  className="w-full"
                >
                  <Undo className="w-4 h-4 mr-1" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={redo}
                  disabled={historyStep >= history.length - 1}
                  className="w-full"
                >
                  <Redo className="w-4 h-4 mr-1" />
                  Redo
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={downloadCanvas}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </Card>

          {/* Canvas */}
          <Card className="p-0 overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Canvas;

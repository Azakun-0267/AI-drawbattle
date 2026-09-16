import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Eraser,
  Pen,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Wand2,
  PaintBucket,
} from 'lucide-react';
import { sound } from '../utils/sound';

interface DrawScreenProps {
  onBack: () => void;
  onMonsterCreated: (canvas: HTMLCanvasElement, imageSrc: string) => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red / Flame
  '#f97316', // Orange
  '#eab308', // Yellow / Lightning
  '#22c55e', // Green / Leaf
  '#06b6d4', // Cyan
  '#3b82f6', // Blue / Water
  '#8b5cf6', // Purple / Dark
  '#ec4899', // Pink
  '#78350f', // Earth / Brown
  '#ffffff', // White
  '#1e293b', // Deep Slate
  '#000000', // Pure Black
];

export const DrawScreen: React.FC<DrawScreenProps> = ({ onBack, onMonsterCreated }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState<string>('#ef4444');
  const [lineWidth, setLineWidth] = useState<number>(14);
  const [opacity, setOpacity] = useState<number>(100);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isFill, setIsFill] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawnSomething, setHasDrawnSomething] = useState<boolean>(false);

  // Undo / Redo History
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [, setHistoryVersion] = useState<number>(0);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // High-resolution canvas size (1000 x 600)
    canvas.width = 1000;
    canvas.height = 600;

    // Transparent canvas (so only user strokes appear in 3D)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save initial blank state
    const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [initialState];
    historyIndexRef.current = 0;
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Discard redo stack
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
    setHistoryVersion((v) => v + 1);
    setHasDrawnSomething(true);
  }, []);

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
        sound.playClick();
        setHistoryVersion((v) => v + 1);
      }
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
        sound.playClick();
        setHistoryVersion((v) => v + 1);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
    sound.playClick();
  };

  // Drawing event handlers
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  // v3.1: 透明度は本物のalpha合成。薄い色を重ねると下の色と混ざり、新しい色を作れる。
  const getFlatPaintColor = () => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    const a = Math.max(0, Math.min(1, opacity / 100));
    return { css: `rgba(${r}, ${g}, ${b}, ${a})`, rgba: [r, g, b, Math.round(a * 255)] as number[] };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (isFill) {
      const canvas=canvasRef.current, ctx=canvas?.getContext('2d',{willReadFrequently:true}); if(!canvas||!ctx)return;
      const img=ctx.getImageData(0,0,canvas.width,canvas.height), data=img.data, x=Math.max(0,Math.min(canvas.width-1,Math.floor(coords.x))), y=Math.max(0,Math.min(canvas.height-1,Math.floor(coords.y))), start=(y*canvas.width+x)*4;
      const target=[data[start],data[start+1],data[start+2],data[start+3]]; const fill=getFlatPaintColor().rgba;
      if(target.every((v,i)=>v===fill[i]))return; const seen=new Uint8Array(canvas.width*canvas.height), stack=[x,y], tol=34;
      const targetIsEmpty=target[3] <= 24;
      const match=(i:number)=> targetIsEmpty ? data[i+3] <= 48 : (Math.abs(data[i]-target[0])<=tol&&Math.abs(data[i+1]-target[1])<=tol&&Math.abs(data[i+2]-target[2])<=tol&&Math.abs(data[i+3]-target[3])<=tol);
      while(stack.length){const cy=stack.pop()!,cx=stack.pop()!,pi=cy*canvas.width+cx;if(cx<0||cy<0||cx>=canvas.width||cy>=canvas.height||seen[pi])continue;seen[pi]=1;const i=pi*4;if(!match(i))continue;data[i]=fill[0];data[i+1]=fill[1];data[i+2]=fill[2];data[i+3]=fill[3];stack.push(cx+1,cy,cx-1,cy,cx,cy+1,cx,cy-1)}
      ctx.putImageData(img,0,0);saveHistory();sound.playClick();return;
    }
    setIsDrawing(true);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, lineWidth / 2, 0, Math.PI * 2);
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = getFlatPaintColor().css;
      ctx.globalAlpha = 1;
    }
    ctx.fill();
    ctx.restore();
    sound.playDraw();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCanvasCoords(e);

    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getFlatPaintColor().css;
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentCoords.x, currentCoords.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = currentCoords;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      saveHistory();
    }
  };

  // Load a quick inspiration sketch (so user can test immediately if desired)
  const loadQuickInspiration = (theme: 'fire' | 'dragon' | 'water' | 'spark') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (theme === 'fire') {
      // Draw a fiery beast
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(500, 320, 140, 0, Math.PI * 2);
      ctx.fill();

      // Fire spikes
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(420, 200); ctx.lineTo(380, 80); ctx.lineTo(470, 180);
      ctx.moveTo(500, 180); ctx.lineTo(500, 60); ctx.lineTo(540, 180);
      ctx.moveTo(560, 200); ctx.lineTo(620, 80); ctx.lineTo(530, 180);
      ctx.fill();

      // Big eyes
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(450, 300, 26, 0, Math.PI * 2);
      ctx.arc(550, 300, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(456, 300, 12, 0, Math.PI * 2);
      ctx.arc(556, 300, 12, 0, Math.PI * 2);
      ctx.fill();

      // Fierce mouth
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(460, 370);
      ctx.lineTo(500, 390);
      ctx.lineTo(540, 370);
      ctx.stroke();
    } else if (theme === 'water') {
      // Oceanic slime / dolphin beast
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(350, 420);
      ctx.quadraticCurveTo(300, 200, 500, 160);
      ctx.quadraticCurveTo(700, 200, 650, 420);
      ctx.quadraticCurveTo(500, 460, 350, 420);
      ctx.fill();

      // Fins
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(320, 320); ctx.lineTo(220, 360); ctx.lineTo(340, 400);
      ctx.moveTo(680, 320); ctx.lineTo(780, 360); ctx.lineTo(660, 400);
      ctx.fill();

      // Cute eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(440, 290, 28, 0, Math.PI * 2);
      ctx.arc(560, 290, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(445, 290, 14, 0, Math.PI * 2);
      ctx.arc(565, 290, 14, 0, Math.PI * 2);
      ctx.fill();

      // Sparkles
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(440, 284, 5, 0, Math.PI * 2);
      ctx.arc(560, 284, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme === 'spark') {
      // Thunder cat
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(500, 330, 120, 0, Math.PI * 2);
      ctx.fill();

      // Lightning ears
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(420, 240); ctx.lineTo(370, 110); ctx.lineTo(460, 200);
      ctx.moveTo(580, 240); ctx.lineTo(630, 110); ctx.lineTo(540, 200);
      ctx.fill();

      // Lightning cheeks
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(410, 350, 18, 0, Math.PI * 2);
      ctx.arc(590, 350, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(460, 310, 12, 0, Math.PI * 2);
      ctx.arc(540, 310, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Dragon beast
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(500, 320, 130, 160, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(370, 280); ctx.lineTo(240, 200); ctx.lineTo(360, 380);
      ctx.moveTo(630, 280); ctx.lineTo(760, 200); ctx.lineTo(640, 380);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(460, 260, 20, 0, Math.PI * 2);
      ctx.arc(540, 260, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(460, 260, 8, 0, Math.PI * 2);
      ctx.arc(540, 260, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    saveHistory();
    sound.playClick();
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `my_monster_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    sound.playClick();
  };

  const handleProceed = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    sound.playClick();
    const imageSrc = canvas.toDataURL('image/png');
    onMonsterCreated(canvas, imageSrc);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* Top Bar */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-20">
        <button
          id="draw-back-btn"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>タイトルへ</span>
        </button>

        <div className="text-center">
          <h2 className="text-base font-black text-amber-300">モンスター作成キャンバス</h2>
          <p className="text-[11px] text-slate-400">
            あなたの描いた絵がそのまま3Dフィールドに登場します
          </p>
        </div>

        <button
          id="proceed-to-analysis-btn"
          onClick={handleProceed}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-md shadow-rose-500/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI分析へ進む</span>
        </button>
      </header>

      {/* Main Drawing Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Canvas Card with Checkerboard Transparency Grid */}
        <div className="relative w-full max-w-4xl aspect-[5/3] bg-white rounded-2xl shadow-2xl border-4 border-slate-700 overflow-hidden flex items-center justify-center">
          {/* Subtle checkerboard pattern to visualize transparency */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
              backgroundSize: `24px 24px`,
              backgroundPosition: `0 0, 0 12px, 12px -12px, -12px 0px`,
            }}
          />

          <canvas
            ref={canvasRef}
            id="monster-drawing-canvas"
            className="w-full h-full cursor-crosshair relative z-10 touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {!hasDrawnSomething && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 z-0">
              <Pen className="w-10 h-10 mb-2 opacity-40 text-slate-500 animate-bounce" />
              <p className="text-sm font-semibold text-slate-500">ここにモンスターを描いてください</p>
              <p className="text-xs text-slate-400 mt-1">下の簡単お手本スタンプをクリックして描くこともできます</p>
            </div>
          )}
        </div>

        {/* Quick Inspiration Sketches */}
        <div className="w-full max-w-4xl mt-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-300">簡単スケッチ（クリックですぐ召喚）:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadQuickInspiration('fire')}
              className="px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-700/50 text-orange-300 hover:bg-orange-900 text-xs font-semibold cursor-pointer"
            >
              🔥 炎の魔獣
            </button>
            <button
              onClick={() => loadQuickInspiration('water')}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 hover:bg-cyan-900 text-xs font-semibold cursor-pointer"
            >
              💧 水晶スライム
            </button>
            <button
              onClick={() => loadQuickInspiration('spark')}
              className="px-2.5 py-1 rounded-lg bg-yellow-950/60 border border-yellow-700/50 text-yellow-300 hover:bg-yellow-900 text-xs font-semibold cursor-pointer"
            >
              ⚡ 雷電キャット
            </button>
            <button
              onClick={() => loadQuickInspiration('dragon')}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold cursor-pointer"
            >
              🌿 森林ドラゴン
            </button>
          </div>
        </div>
      </main>

      {/* Drawing Toolbar at Bottom */}
      <footer className="w-full bg-slate-900 border-t border-slate-800 px-6 py-3 z-20">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Color Tools */}
          <div className="flex items-center gap-2">
            {/* Native Color Picker */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-400 font-semibold">色:</label>
              <input
                id="color-picker"
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setIsEraser(false); setIsFill(false);
                }}
                className="w-8 h-8 rounded-lg border-2 border-slate-600 cursor-pointer bg-transparent"
                title="カスタムカラー選択"
              />
            </div>

            {/* Quick Color Palette */}
            <div className="flex items-center gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setIsEraser(false); setIsFill(false);
                  }}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    color === c && !isEraser ? 'scale-125 border-white shadow-md' : 'border-slate-600 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Pen Size Slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">太さ:</span>
            <input
              id="brush-size-slider"
              type="range"
              min="1"
              max="50"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24 accent-amber-400 cursor-pointer"
            />
            <div
              className="rounded-full bg-slate-200 border border-slate-500"
              style={{ width: `${Math.max(6, Math.min(24, lineWidth))}px`, height: `${Math.max(6, Math.min(24, lineWidth))}px` }}
              title={`太さ: ${lineWidth}px`}
            />
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">うすさ:</span>
            <input
              id="brush-opacity-slider"
              type="range"
              min="5"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-20 accent-cyan-400 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-300 w-8">{opacity}%</span>
          </div>

          {/* Action Buttons: Eraser, Undo, Redo, Clear, Save */}
          <div className="flex items-center gap-2">
            <button
              id="tool-pen-btn"
              onClick={() => { setIsEraser(false); setIsFill(false); }}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                !isEraser && !isFill ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="ペン"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>ペン</span>
            </button>

            <button
              id="tool-fill-btn"
              onClick={() => { setIsFill(true); setIsEraser(false); sound.playClick(); }}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${isFill ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              title="塗りつぶし"
            >
              <PaintBucket className="w-3.5 h-3.5" /><span>塗りつぶし</span>
            </button>

            <button
              id="tool-eraser-btn"
              onClick={() => { setIsEraser(true); setIsFill(false); }}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                isEraser ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="消しゴム"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>消しゴム</span>
            </button>

            <button
              id="tool-undo-btn"
              onClick={undo}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="元に戻す (Undo)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              id="tool-redo-btn"
              onClick={redo}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="やり直す (Redo)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              id="tool-clear-btn"
              onClick={clearCanvas}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 cursor-pointer"
              title="全消去"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              id="tool-download-btn"
              onClick={downloadImage}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="絵をPNG保存"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

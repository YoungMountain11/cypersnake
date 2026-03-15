/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Play, 
  RotateCcw, 
  Zap, 
  Shield, 
  Clock, 
  Star,
  Gamepad2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 150;

type Point = { x: number; y: number };
type PowerUpType = 'SPEED' | 'SHIELD' | 'SLOW' | 'RAINBOW';

interface PowerUp {
  pos: Point;
  type: PowerUpType;
  expiresAt: number;
}

export default function App() {
  // --- State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [activeEffects, setActiveEffects] = useState<PowerUpType[]>([]);
  const [speed, setSpeed] = useState(BASE_SPEED);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef(INITIAL_DIRECTION);

  // --- Audio/Visual Effects ---
  const playSound = (type: 'eat' | 'powerup' | 'death') => {
    // In a real app, we'd play actual sounds. Here we'll just trigger visual feedback.
    console.log(`Sound triggered: ${type}`);
  };

  // --- Helper Functions ---
  const getRandomPoint = useCallback((): Point => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const spawnFood = useCallback(() => {
    let newFood = getRandomPoint();
    while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      newFood = getRandomPoint();
    }
    setFood(newFood);
  }, [snake, getRandomPoint]);

  const spawnPowerUp = useCallback(() => {
    if (Math.random() > 0.15) return; // 15% chance to spawn powerup on food eat
    
    const types: PowerUpType[] = ['SPEED', 'SHIELD', 'SLOW', 'RAINBOW'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let newPos = getRandomPoint();
    while (
      snake.some(s => s.x === newPos.x && s.y === newPos.y) ||
      (food.x === newPos.x && food.y === newPos.y)
    ) {
      newPos = getRandomPoint();
    }

    setPowerUp({
      pos: newPos,
      type,
      expiresAt: Date.now() + 8000, // Powerup stays on board for 8s
    });
  }, [snake, food, getRandomPoint]);

  const gameOver = useCallback(() => {
    setGameState('GAMEOVER');
    playSound('death');
    if (score > highScore) setHighScore(score);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
  }, [score, highScore]);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + directionRef.current.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + directionRef.current.y + GRID_SIZE) % GRID_SIZE,
      };

      // Collision with self (unless shield is active)
      if (
        !activeEffects.includes('SHIELD') &&
        prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        gameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + (activeEffects.includes('SPEED') ? 20 : 10));
        playSound('eat');
        spawnFood();
        spawnPowerUp();
      } else {
        newSnake.pop();
      }

      // Check PowerUp
      if (powerUp && newHead.x === powerUp.pos.x && newHead.y === powerUp.pos.y) {
        setActiveEffects(prev => [...prev, powerUp.type]);
        playSound('powerup');
        setPowerUp(null);
        
        // Effect duration logic
        setTimeout(() => {
          setActiveEffects(prev => prev.filter(e => e !== powerUp.type));
        }, 5000);
      }

      return newSnake;
    });
  }, [food, powerUp, activeEffects, gameOver, spawnFood, spawnPowerUp]);

  // --- Game Loop ---
  useEffect(() => {
    if (gameState === 'PLAYING') {
      let currentSpeed = BASE_SPEED;
      if (activeEffects.includes('SPEED')) currentSpeed = BASE_SPEED * 0.6;
      if (activeEffects.includes('SLOW')) currentSpeed = BASE_SPEED * 1.5;
      
      setSpeed(currentSpeed);
      gameLoopRef.current = setInterval(moveSnake, currentSpeed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, moveSnake, activeEffects]);

  // --- Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (directionRef.current.y !== 1) directionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (directionRef.current.y !== -1) directionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (directionRef.current.x !== 1) directionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (directionRef.current.x !== -1) directionRef.current = { x: 1, y: 0 };
          break;
      }
      setDirection(directionRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameState('PLAYING');
    setActiveEffects([]);
    spawnFood();
  };

  // --- Render Helpers ---
  const getPowerUpIcon = (type: PowerUpType) => {
    switch (type) {
      case 'SPEED': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'SHIELD': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'SLOW': return <Clock className="w-4 h-4 text-purple-400" />;
      case 'RAINBOW': return <Star className="w-4 h-4 text-pink-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="z-10 mb-8 text-center">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        >
          CyberSnake
        </motion.h1>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/60 font-mono mt-2">Neon Quest 2077</p>
      </div>

      {/* Game Container */}
      <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
        
        {/* Stats Panel */}
        <div className="flex flex-col gap-4 w-full lg:w-48">
          <div className="bg-black/40 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Score</div>
            <div className="text-3xl font-mono font-bold text-cyan-400">{score.toString().padStart(4, '0')}</div>
          </div>
          <div className="bg-black/40 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Best</div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <div className="text-xl font-mono font-bold text-white/80">{highScore.toString().padStart(4, '0')}</div>
            </div>
          </div>
          
          {/* Active Effects */}
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {activeEffects.map((effect, i) => (
                <motion.div
                  key={`${effect}-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="bg-white/5 border border-white/10 p-2 rounded-lg flex items-center gap-2"
                >
                  {getPowerUpIcon(effect)}
                  <span className="text-[10px] font-bold uppercase">{effect}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* The Board - Flat 2D Canvas */}
        <div className="relative">
          <div 
            className="relative bg-black/60 border-4 border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]"
            style={{ 
              width: 'min(85vw, 500px)', 
              height: 'min(85vw, 500px)',
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-20 grid-rows-20 pointer-events-none opacity-10">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-cyan-500" />
              ))}
            </div>

            {/* Food - 3D Effect with Shadow */}
            <div
              className="absolute"
              style={{
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                left: `${(food.x * 100) / GRID_SIZE}%`,
                top: `${(food.y * 100) / GRID_SIZE}%`,
                zIndex: 5
              }}
            >
              {/* Shadow underneath */}
              <motion.div 
                animate={{ scale: [1, 0.8, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 bg-black/60 blur-sm rounded-full translate-y-1 scale-75"
              />
              {/* Floating 3D sphere-like food */}
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-300 via-pink-500 to-pink-800 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_0_15px_#f472b6]"
              />
            </div>

            {/* Power Up - 3D Effect */}
            {powerUp && (
              <div
                className="absolute"
                style={{
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  left: `${(powerUp.pos.x * 100) / GRID_SIZE}%`,
                  top: `${(powerUp.pos.y * 100) / GRID_SIZE}%`,
                  zIndex: 6
                }}
              >
                <motion.div 
                  animate={{ scale: [1, 0.8, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-black/60 blur-sm rounded-lg translate-y-1 scale-75"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360, y: [0, -4, 0] }}
                  transition={{ y: { repeat: Infinity, duration: 1.5 } }}
                  className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 rounded-lg backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.3),0_0_15px_rgba(255,255,255,0.3)]"
                >
                  {getPowerUpIcon(powerUp.type)}
                </motion.div>
              </div>
            )}

            {/* Snake - 3D Block Effect */}
            {snake.map((segment, i) => {
              const isHead = i === 0;
              const isRainbow = activeEffects.includes('RAINBOW');
              const baseColor = isHead ? '#22d3ee' : isRainbow ? `hsl(${(i * 20) % 360}, 70%, 60%)` : '#a855f7';
              
              return (
                <motion.div
                  key={`${segment.x}-${segment.y}-${i}`}
                  className="absolute"
                  style={{
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    left: `${(segment.x * 100) / GRID_SIZE}%`,
                    top: `${(segment.y * 100) / GRID_SIZE}%`,
                    zIndex: 10 - i,
                  }}
                >
                  {/* Segment Shadow */}
                  <div className="absolute inset-0 bg-black/40 blur-[2px] translate-y-1 translate-x-1 rounded-sm" />
                  
                  {/* 3D Block Body */}
                  <div 
                    className="absolute inset-0 rounded-sm border-t border-l border-white/30 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4)]"
                    style={{
                      backgroundColor: baseColor,
                      boxShadow: `0 0 ${isHead ? '15px' : '5px'} ${baseColor}, inset -2px -2px 4px rgba(0,0,0,0.4)`,
                    }}
                  >
                    {/* Head Eyes */}
                    {isHead && (
                      <div className="absolute inset-0 flex items-center justify-around px-1">
                        <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                        <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Overlays */}
            <AnimatePresence>
              {gameState === 'START' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                  <Gamepad2 className="w-16 h-16 text-cyan-400 mb-4 animate-bounce" />
                  <h2 className="text-2xl font-black italic uppercase mb-6">Ready to Run?</h2>
                  <button 
                    onClick={startGame}
                    className="group relative px-8 py-3 bg-cyan-500 text-black font-black uppercase italic tracking-widest rounded-full hover:bg-cyan-400 transition-all active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Play className="w-5 h-5 fill-current" /> Start Game
                    </span>
                    <div className="absolute inset-0 bg-cyan-400 blur-lg opacity-0 group-hover:opacity-50 transition-opacity rounded-full" />
                  </button>
                  <p className="mt-8 text-[10px] text-white/40 uppercase tracking-widest">Use Arrow Keys to Move</p>
                </motion.div>
              )}

              {gameState === 'GAMEOVER' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-md"
                >
                  <h2 className="text-4xl font-black italic uppercase text-red-500 mb-2">System Crash</h2>
                  <p className="text-white/60 uppercase tracking-widest text-xs mb-8">Final Score: {score}</p>
                  <button 
                    onClick={startGame}
                    className="group relative px-8 py-3 bg-white text-black font-black uppercase italic tracking-widest rounded-full hover:bg-cyan-400 transition-all active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" /> Reboot
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="lg:hidden grid grid-cols-3 gap-2 mt-4">
          <div />
          <button 
            className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:bg-cyan-500/20"
            onPointerDown={() => directionRef.current.y !== 1 && (directionRef.current = { x: 0, y: -1 })}
          >
            <ChevronUp className="w-8 h-8" />
          </button>
          <div />
          <button 
            className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:bg-cyan-500/20"
            onPointerDown={() => directionRef.current.x !== 1 && (directionRef.current = { x: -1, y: 0 })}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button 
            className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:bg-cyan-500/20"
            onPointerDown={() => directionRef.current.y !== -1 && (directionRef.current = { x: 0, y: 1 })}
          >
            <ChevronDown className="w-8 h-8" />
          </button>
          <button 
            className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:bg-cyan-500/20"
            onPointerDown={() => directionRef.current.x !== -1 && (directionRef.current = { x: 1, y: 0 })}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {/* Info Panel */}
        <div className="hidden lg:flex flex-col gap-4 w-48">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
            <h3 className="text-[10px] uppercase tracking-widest text-cyan-400 mb-3 font-bold">Power Ups</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] uppercase font-medium">Turbo Boost</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] uppercase font-medium">Ghost Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] uppercase font-medium">Time Warp</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-pink-400" />
                <span className="text-[10px] uppercase font-medium">Rainbow Trail</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-[10px] text-white/20 uppercase tracking-[0.4em] font-mono">
        Protocol: Snake_v2.0.77 // Authorized for: Daughter_Unit_01
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';

const TetrisGame = () => {
  // Game constants
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const CELL_SIZE = 32;
  
  // Tetromino shapes
  const SHAPES = [
    {
      shape: [
        [1, 1, 1, 1]
      ],
      color: '#00f5ff'
    },
    {
      shape: [
        [1, 1],
        [1, 1]
      ],
      color: '#ffff00'
    },
    {
      shape: [
        [0, 1, 0],
        [1, 1, 1]
      ],
      color: '#8000ff'
    },
    {
      shape: [
        [1, 0, 0],
        [1, 1, 1]
      ],
      color: '#ff8000'
    },
    {
      shape: [
        [0, 0, 1],
        [1, 1, 1]
      ],
      color: '#0000ff'
    },
    {
      shape: [
        [1, 1, 0],
        [0, 1, 1]
      ],
      color: '#00ff00'
    },
    {
      shape: [
        [0, 1, 1],
        [1, 1, 0]
      ],
      color: '#ff0000'
    }
  ];

  // Game state
  const [board, setBoard] = useState(() => 
    Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0))
  );
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [score, setScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const dropTimeRef = useRef(0);
  const dropIntervalRef = useRef(1000);

  // Firebase simulation (since we can't use real Firebase in artifacts)
  const saveScore = useCallback(async (name, score) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newScore = { name, score, timestamp: Date.now() };
    const existingScores = JSON.parse(localStorage.getItem('tetris-leaderboard') || '[]');
    existingScores.push(newScore);
    existingScores.sort((a, b) => b.score - a.score);
    localStorage.setItem('tetris-leaderboard', JSON.stringify(existingScores.slice(0, 10)));
    
    setLeaderboard(existingScores.slice(0, 10));
    setLoading(false);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const scores = JSON.parse(localStorage.getItem('tetris-leaderboard') || '[]');
    setLeaderboard(scores);
    setLoading(false);
  }, []);

  // Generate random piece
  const generatePiece = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    return JSON.parse(JSON.stringify(SHAPES[randomIndex]));
  }, []);

  // Check collision
  const isCollision = useCallback((shape, x, y, testBoard = board) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] && (
          x + col < 0 || 
          x + col >= BOARD_WIDTH || 
          y + row >= BOARD_HEIGHT || 
          (y + row >= 0 && testBoard[y + row][x + col])
        )) {
          return true;
        }
      }
    }
    return false;
  }, [board]);

  // Clear completed lines
  const clearLines = useCallback((newBoard) => {
    let linesCleared = 0;
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (newBoard[row].every(cell => cell !== 0)) {
        newBoard.splice(row, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        row++; // Check the same row again
      }
    }
    return linesCleared;
  }, []);

  // Place piece on board
  const placePiece = useCallback(() => {
    const newBoard = board.map(row => [...row]);
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          if (currentY + row >= 0) {
            newBoard[currentY + row][currentX + col] = currentPiece.color;
          }
        }
      }
    }
    
    const linesCleared = clearLines(newBoard);
    const points = linesCleared * 100;
    
    setBoard(newBoard);
    setScore(prev => prev + points);
    setCurrentPiece(nextPiece);
    setNextPiece(generatePiece());
    setCurrentX(Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPiece.shape[0].length / 2));
    setCurrentY(0);
    
    // Check if game is over
    if (isCollision(nextPiece.shape, Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPiece.shape[0].length / 2), 0, newBoard)) {
      setGameRunning(false);
      setGameOver(true);
    }
  }, [board, currentPiece, nextPiece, currentX, currentY, clearLines, generatePiece, isCollision]);

  // Drop piece
  const dropPiece = useCallback(() => {
    if (!isCollision(currentPiece.shape, currentX, currentY + 1)) {
      setCurrentY(prev => prev + 1);
    } else {
      placePiece();
    }
  }, [currentPiece, currentX, currentY, isCollision, placePiece]);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    if (!currentPiece) return;
    
    const rotated = currentPiece.shape[0].map((_, index) =>
      currentPiece.shape.map(row => row[index]).reverse()
    );
    
    if (!isCollision(rotated, currentX, currentY)) {
      setCurrentPiece(prev => ({ ...prev, shape: rotated }));
    }
  }, [currentPiece, currentX, currentY, isCollision]);

  // Move piece
  const movePiece = useCallback((dx, dy) => {
    if (!currentPiece) return false;
    
    if (!isCollision(currentPiece.shape, currentX + dx, currentY + dy)) {
      setCurrentX(prev => prev + dx);
      setCurrentY(prev => prev + dy);
      return true;
    }
    return false;
  }, [currentPiece, currentX, currentY, isCollision]);

  // Hard drop
  const hardDrop = useCallback(() => {
    while (movePiece(0, 1)) {
      // Keep dropping
    }
  }, [movePiece]);

  // Game loop
  useEffect(() => {
    if (!gameRunning) return;

    const gameLoop = () => {
      const now = Date.now();
      if (now - dropTimeRef.current > dropIntervalRef.current) {
        dropPiece();
        dropTimeRef.current = now;
      }
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameRunning, dropPiece]);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gameRunning) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece(1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece(0, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotatePiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    const handleNameSubmit = (e) => {
      if (e.key === 'Enter' && showNameInput) {
        submitScore();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleNameSubmit);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleNameSubmit);
    };
  }, [gameRunning, showNameInput, movePiece, rotatePiece, hardDrop]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        if (board[row][col]) {
          ctx.fillStyle = board[row][col];
          ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
          
          // Add shine effect
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, 4);
        }
      }
    }

    // Draw current piece
    if (currentPiece) {
      ctx.fillStyle = currentPiece.color;
      for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
          if (currentPiece.shape[row][col]) {
            const x = (currentX + col) * CELL_SIZE;
            const y = (currentY + row) * CELL_SIZE;
            ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
            
            // Add shine effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x, y, CELL_SIZE - 1, 4);
            ctx.fillStyle = currentPiece.color;
          }
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_WIDTH; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= BOARD_HEIGHT; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }
  }, [board, currentPiece, currentX, currentY]);

  // Initialize game
  const initGame = useCallback(() => {
    setBoard(Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0)));
    setScore(0);
    setGameRunning(true);
    setGameOver(false);
    setShowNameInput(false);
    dropTimeRef.current = 0;
    dropIntervalRef.current = 1000;
    
    const firstPiece = generatePiece();
    const secondPiece = generatePiece();
    
    setCurrentPiece(firstPiece);
    setNextPiece(secondPiece);
    setCurrentX(Math.floor(BOARD_WIDTH / 2) - Math.floor(firstPiece.shape[0].length / 2));
    setCurrentY(0);
    
    loadLeaderboard();
  }, [generatePiece, loadLeaderboard]);

  // Start game on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Handle game over
  useEffect(() => {
    if (gameOver) {
      setShowNameInput(true);
    }
  }, [gameOver]);

  // Submit score
  const submitScore = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name!');
      return;
    }
    
    await saveScore(playerName.trim(), score);
    setShowNameInput(false);
    setPlayerName('');
  };

  // Skip score submission
  const skipScore = () => {
    setShowNameInput(false);
    setPlayerName('');
  };

  // Restart game
  const restartGame = () => {
    initGame();
  };

  // Next piece preview component
  const NextPiecePreview = ({ piece }) => {
    if (!piece) return null;
    
    const maxSize = Math.max(piece.shape.length, piece.shape[0]?.length || 0);
    const cellSize = 20;
    const canvasSize = maxSize * cellSize;
    
    return (
      <div className="w-20 h-20 bg-black rounded-lg flex items-center justify-center">
        <div 
          className="grid gap-0" 
          style={{
            gridTemplateColumns: `repeat(${piece.shape[0]?.length || 0}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${piece.shape.length}, ${cellSize}px)`
          }}
        >
          {piece.shape.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="border-0"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell ? piece.color : 'transparent'
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 text-white font-sans">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
          {/* Left Sidebar */}
          <div className="flex flex-col gap-6 w-full lg:w-64">
            {/* Next Piece */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">Next Piece</h3>
              <div className="flex justify-center">
                <NextPiecePreview piece={nextPiece} />
              </div>
            </div>

            {/* Score */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">Score</h3>
              <div className="text-3xl font-bold text-center text-white mb-2">{score}</div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 max-h-80 overflow-y-auto">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
                Leaderboard
                {loading && <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2"></span>}
              </h3>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-2 rounded-lg text-sm ${
                        index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                        index === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                        index === 2 ? 'bg-orange-500/20 border border-orange-500/30' :
                        'bg-white/5'
                      }`}
                    >
                      <span className="font-medium">{index + 1}. {entry.name}</span>
                      <span className="font-bold">{entry.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-white/60">No scores yet</div>
              )}
            </div>
          </div>

          {/* Game Board */}
          <div className="relative bg-black/80 rounded-xl p-6 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={320}
              height={640}
              className="border-2 border-white rounded-lg bg-black block"
            />
            
            {/* Game Over Modal */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/95 flex items-center justify-center rounded-xl">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center border border-white/20 max-w-sm w-full mx-4">
                  <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                  <p className="text-xl mb-6">Final Score: <span className="font-bold text-yellow-400">{score}</span></p>
                  <button
                    onClick={restartGame}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}

            {/* Name Input Modal */}
            {showNameInput && (
              <div className="absolute inset-0 bg-black/95 flex items-center justify-center rounded-xl">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center border border-white/20 max-w-sm w-full mx-4">
                  <h2 className="text-2xl font-bold mb-4 text-green-400">Save Your Score!</h2>
                  <p className="text-lg mb-6">Score: <span className="font-bold text-yellow-400">{score}</span></p>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={20}
                    className="w-full p-3 mb-4 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/50"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={submitScore}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-4 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Submit'}
                    </button>
                    <button
                      onClick={skipScore}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-4 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Controls */}
          <div className="w-full lg:w-64">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">Controls</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">←/→:</span>
                  <span>Move left/right</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">↓:</span>
                  <span>Move down faster</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">↑:</span>
                  <span>Rotate piece</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Space:</span>
                  <span>Drop piece</span>
                </div>
                <div className="text-center mt-4 p-2 bg-white/5 rounded-lg">
                  <span className="font-semibold text-yellow-400">Goal:</span> Clear rows to score!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-black/50 py-4 text-center text-lg text-yellow-400 border-t border-white/20 mt-8">
        Made with <span className="text-red-400 animate-pulse">❤️</span> by ABHAY MV
      </footer>
    </div>
  );
};

export default TetrisGame;
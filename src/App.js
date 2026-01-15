import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Zap, Heart, Volume2, VolumeX } from 'lucide-react';

const CodeShooter = () => {
  const [gameState, setGameState] = useState('menu');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(50);
  const [enemies, setEnemies] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 80 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const MAX_LEVEL = 5;
  const GAME_PASSWORD = 'RobBestPSM';
  const canvasRef = useRef(null);
  const enemiesRef = useRef([]);
  const projectilesRef = useRef([]);
  const isFiringRef = useRef(false);
  const lastPlayerShotRef = useRef(0);
  const levelAdvanceLockedRef = useRef(false);
  const gameLoopRef = useRef(null);
  const audioRef = useRef({});

  useEffect(() => {
    audioRef.current.bgMusic = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_6d1b96c4de.mp3');
    audioRef.current.bgMusic.loop = true;
    audioRef.current.bgMusic.volume = 0.3;
    audioRef.current.victoryMusic = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_13555b4ac0.mp3');
    audioRef.current.victoryMusic.volume = 0.5;
    audioRef.current.gameOverMusic = new Audio('https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3');
    audioRef.current.gameOverMusic.volume = 0.4;
    audioRef.current.sfx = [];

    return () => {
      Object.values(audioRef.current).forEach(audio => {
        if (audio && audio.pause) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    projectilesRef.current = projectiles;
  }, [projectiles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== 'Space') return;
      if (gameState !== 'playing') return;
      e.preventDefault();
      isFiringRef.current = true;
    };

    const handleKeyUp = (e) => {
      if (e.code !== 'Space') return;
      isFiringRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const playSound = (type) => {
    if (!soundEnabled) return;
    let soundUrl;
    switch(type) {
      case 'shoot': soundUrl = 'https://cdn.pixabay.com/audio/2022/03/15/audio_02ca0d99e0.mp3'; break;
      case 'hit': soundUrl = 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3'; break;
      case 'enemyShoot': soundUrl = 'https://cdn.pixabay.com/audio/2022/03/24/audio_bbf23b3ccf.mp3'; break;
      case 'damage': soundUrl = 'https://cdn.pixabay.com/audio/2022/03/10/audio_d9fdde006b.mp3'; break;
      case 'levelUp': soundUrl = 'https://cdn.pixabay.com/audio/2021/08/04/audio_6312eb5b52.mp3'; break;
      default: return;
    }
    const sound = new Audio(soundUrl);
    sound.volume = 0.3;
    audioRef.current.sfx?.push(sound);
    sound.addEventListener('ended', () => {
      audioRef.current.sfx = (audioRef.current.sfx || []).filter(sfx => sfx !== sound);
    });
    sound.play().catch(e => console.log('Sound play failed:', e));
  };

  useEffect(() => {
    if (!audioRef.current.bgMusic) return;
    if (gameState === 'playing' && soundEnabled) {
      audioRef.current.bgMusic.play().catch(e => console.log('Music play failed:', e));
    } else {
      audioRef.current.bgMusic.pause();
      audioRef.current.bgMusic.currentTime = 0;
    }
    if (gameState === 'victory' && soundEnabled) {
      audioRef.current.victoryMusic.play().catch(e => console.log('Victory music failed:', e));
    }
    if (gameState === 'gameOver' && soundEnabled) {
      audioRef.current.gameOverMusic.play().catch(e => console.log('Game over music failed:', e));
    }
  }, [gameState, soundEnabled]);

  const characters = [
    { id: 1, name: "Rob", color: "#3b82f6", speed: 6, fireRate: 200, imageUrl: "/images/rob.png", emoji: "👨‍💼" },
    { id: 2, name: "Shruthi", color: "#8b5cf6", speed: 8, fireRate: 250, imageUrl: "/images/shruthi.png", emoji: "👩‍💻" },
    { id: 3, name: "Faith", color: "#10b981", speed: 9, fireRate: 300, imageUrl: "/images/faith.png", emoji: "👩‍🔬" },
    { id: 4, name: "Hasti", color: "#f59e0b", speed: 5, fireRate: 80, imageUrl: "/images/hasti.png", emoji: "👩‍🎨" },
    { id: 5, name: "Hannah", color: "#ec4899", speed: 7, fireRate: 150, imageUrl: "/images/hannah.png", emoji: "👩‍🚀" }
  ];

  const enemyFaces = [
    { name: "Sohaib", imageUrl: "/images/sohaib.png", emoji: "😎", health: 2, speed: 1.5 },
    { name: "Joe", imageUrl: "/images/joe.png", emoji: "🤓", health: 2, speed: 2 }
  ];

  const codeSnippets = ["Skill ID", "Client ID", "Ticket", "LOE", "Spanish", "NEED IT ASAP", "SOP"];

  useEffect(() => {
    if (gameState === 'playing') {
      startLevel(level);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, level]);

  const startLevel = (lvl) => {
    levelAdvanceLockedRef.current = false;
    const isBossLevel = lvl === MAX_LEVEL;
    const enemyCount = isBossLevel ? 2 : Math.min(2 + lvl, 6);
    const newEnemies = [];

    for (let i = 0; i < enemyCount; i++) {
      const faceData = enemyFaces[Math.floor(Math.random() * enemyFaces.length)];
      const behaviorType = Math.random();
      const baseHealth = lvl === 1 ? faceData.health : faceData.health + 1;
      const scaledHealth = isBossLevel ? baseHealth * 2 : baseHealth;
      
      newEnemies.push({
        id: Date.now() + i + Math.random(),
        x: Math.random() * 80 + 10,
        y: Math.random() * 20 + 5,
        ...faceData,
        health: scaledHealth,
        maxHealth: scaledHealth,
        vx: behaviorType < 0.3 ? 0 : (Math.random() - 0.5) * faceData.speed,
        vy: behaviorType < 0.3 ? 0 : (Math.random() * 0.5 + 0.2),
        lastShot: Date.now(),
        isBoss: isBossLevel,
        behavior: behaviorType < 0.3 ? 'stationary' : (behaviorType < 0.6 ? 'zigzag' : 'aggressive')
      });
    }
    
    enemiesRef.current = newEnemies;
    setEnemies(newEnemies);
    setProjectiles([]);
    gameLoop();
  };

  const gameLoop = () => {
    updateGame();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const updateGame = () => {
    let workingProjectiles = [...projectilesRef.current];
    
    if (gameState === 'playing' && selectedCharacter && isFiringRef.current) {
      const now = Date.now();
      if (now - lastPlayerShotRef.current >= selectedCharacter.fireRate) {
        lastPlayerShotRef.current = now;
        playSound('shoot');
        workingProjectiles.push(...createPlayerProjectiles());
      }
    }

    const movedEnemies = enemiesRef.current.map(enemy => {
      let newX = enemy.x;
      let newY = enemy.y;
      let newVx = enemy.vx;
      let newVy = enemy.vy;

      if (enemy.behavior === 'stationary') {
        // stationary
      } else if (enemy.behavior === 'zigzag') {
        newX = enemy.x + enemy.vx * 0.15;
        newY = enemy.y + Math.sin(Date.now() / 500) * 0.8;
        if (newX < 5 || newX > 95) newVx *= -1;
      } else if (enemy.behavior === 'aggressive') {
        newX = enemy.x + enemy.vx * 0.2;
        newY = enemy.y + enemy.vy * 0.2;
        if (newX < 5 || newX > 95) newVx *= -1;
      }

      if (newY < 0) newY = 0;
      if (newY > 95) newY = 95;

      const shootChance = (enemy.isBoss ? 0.08 : 0.04) + level * 0.005;
      if (Date.now() - enemy.lastShot > 1000 && Math.random() < shootChance) {
        workingProjectiles.push({
          id: Date.now() + Math.random(),
          x: enemy.x,
          y: enemy.y,
          code: "bug 🐛",
          friendly: false,
          active: true,
          targetX: playerPos.x,
          targetY: playerPos.y
        });
        return { ...enemy, x: newX, y: newY, vx: newVx, vy: newVy, lastShot: Date.now() };
      }

      return { ...enemy, x: newX, y: newY, vx: newVx, vy: newVy };
    });

    // Move projectiles with homing behavior for player shots
    const movedProjectiles = workingProjectiles.map(proj => {
      if (proj.friendly && enemiesRef.current.length > 0) {
        // Find closest enemy
        let closest = null;
        let minDist = Infinity;
        
        for (const enemy of enemiesRef.current) {
          if (enemy.health <= 0) continue;
          const dist = Math.sqrt(Math.pow(enemy.x - proj.x, 2) + Math.pow(enemy.y - proj.y, 2));
          if (dist < minDist) {
            minDist = dist;
            closest = enemy;
          }
        }
        
        if (closest) {
          // Move towards closest enemy
          const angle = Math.atan2(closest.y - proj.y, closest.x - proj.x);
          const speed = 2.5;
          return {
            ...proj,
            x: proj.x + Math.cos(angle) * speed,
            y: proj.y + Math.sin(angle) * speed
          };
        }
      }
      
      // Regular movement for enemy projectiles
      return {
        ...proj,
        y: proj.friendly ? proj.y - 2 : proj.y + 1.8
      };
    }).filter(proj => proj.y > -5 && proj.y < 105 && proj.x > -5 && proj.x < 105);

    let scoreDelta = 0;
    let playerDamage = 0;
    const nextEnemies = movedEnemies.map(enemy => ({ ...enemy }));

    const nextProjectiles = movedProjectiles.map(proj => {
      if (proj.active === false) return proj;

      if (!proj.friendly) {
        const dist = Math.sqrt(Math.pow(playerPos.x - proj.x, 2) + Math.pow(playerPos.y - proj.y, 2));
        if (dist < 5) {
          playerDamage += 40;
          playSound('damage');
          return { ...proj, active: false };
        }
        return proj;
      }

      let closest = null;
      for (const enemy of nextEnemies) {
        if (enemy.health <= 0) continue;
        const dist = Math.sqrt(Math.pow(enemy.x - proj.x, 2) + Math.pow(enemy.y - proj.y, 2));
        const hitRadius = enemy.isBoss ? 10 : 6;
        if (dist < hitRadius && (!closest || dist < closest.dist)) {
          closest = { enemy, dist };
        }
      }

      if (closest) {
        closest.enemy.health -= 1;
        scoreDelta += closest.enemy.isBoss ? 500 : 150;
        playSound('hit');
        return { ...proj, active: false };
      }

      return proj;
    }).filter(p => p.active !== false);

    const nextEnemiesAlive = nextEnemies.filter(e => e.health > 0);

    if (scoreDelta > 0) {
      setScore(s => s + scoreDelta);
    }

    setProjectiles(nextProjectiles);
    setEnemies(nextEnemiesAlive);
    projectilesRef.current = nextProjectiles;
    enemiesRef.current = nextEnemiesAlive;

    if (nextEnemiesAlive.length === 0 && gameState === 'playing' && !levelAdvanceLockedRef.current) {
      levelAdvanceLockedRef.current = true;
      setTimeout(() => {
        if (level < MAX_LEVEL) {
          playSound('levelUp');
          setLevel(l => l + 1);
        } else {
          setGameState('victory');
        }
      }, 800);
    }

    setPlayerHealth(h => {
      const updated = Math.max(0, h - playerDamage);
      if (updated <= 0 && gameState === 'playing') {
        setGameState('gameOver');
      }
      return updated;
    });
  };

  const handleMouseMove = (e) => {
    if (gameState !== 'playing' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayerPos({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
  };

  const createPlayerProjectiles = () => {
    const code = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    return [{
      id: Date.now() + Math.random(),
      x: playerPos.x,
      y: playerPos.y,
      code,
      friendly: true,
      active: true
    }];
  };

  useEffect(() => {
    if (gameState === 'playing') {
      canvasRef.current?.focus();
    }
  }, [gameState]);

  const resetGame = () => {
    levelAdvanceLockedRef.current = false;
    setLevel(1);
    setScore(0);
    setPlayerHealth(100);
    setEnemies([]);
    setProjectiles([]);
    setGameState('characterSelect');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (soundEnabled) {
      Object.values(audioRef.current).forEach(audio => {
        if (audio && audio.pause) audio.pause();
      });
      (audioRef.current.sfx || []).forEach(sfx => {
        if (sfx && sfx.pause) {
          sfx.pause();
          sfx.currentTime = 0;
        }
      });
      audioRef.current.sfx = [];
    }
  };

  const CharacterAvatar = ({ character, size = 96 }) => {
    if (character?.imageUrl) {
      return (
        <img 
          src={character.imageUrl} 
          alt={character.name}
          style={{ width: `${size}px`, height: `${size}px` }}
          className="rounded-full object-cover border-4 border-white mx-auto"
        />
      );
    }
    return <div className="text-6xl">{character?.emoji}</div>;
  };

  const EnemyAvatar = ({ enemy, size = 80 }) => {
    const displaySize = enemy.isBoss ? size * 1.5 : size;
    if (enemy.imageUrl) {
      return (
        <div className="relative">
          <img 
            src={enemy.imageUrl} 
            alt={enemy.name}
            style={{ width: `${displaySize}px`, height: `${displaySize}px` }}
            className={`rounded-full object-cover border-4 ${enemy.isBoss ? 'border-yellow-500 animate-pulse' : 'border-red-500'} mx-auto`}
          />
          {enemy.isBoss && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-yellow-400 font-bold text-xs whitespace-nowrap">
              👑 BOSS 👑
            </div>
          )}
        </div>
      );
    }
    return <div className={enemy.isBoss ? "text-8xl animate-pulse" : "text-6xl"}>{enemy.emoji}</div>;
  };

  if (!isUnlocked) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-black bg-opacity-60 p-8 rounded-xl text-center text-white w-full max-w-md">
          <h1 className="text-4xl font-bold mb-3">The SR Game</h1>
          <p className="text-blue-200 mb-6">Enter the password to play</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput === GAME_PASSWORD) {
              setIsUnlocked(true);
              setPasswordError('');
            } else {
              setPasswordError('Incorrect password.');
            }
          }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder="Password"
              className="w-full px-4 py-3 rounded bg-slate-800 text-white border border-slate-600 focus:outline-none focus:border-blue-400"
            />
            {passwordError && <div className="text-red-300 text-sm mt-2">{passwordError}</div>}
            <button type="submit" className="mt-5 w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold transition">
              UNLOCK
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4 animate-pulse">The SR Game 💻</h1>
          <p className="text-2xl text-blue-200 mb-4">Poly Showdown</p>
          <p className="text-lg text-blue-300 mb-8">Defeat Sohaib & Joe with your impeccable client management and troubleshooting skills!</p>
          <button onClick={() => setGameState('characterSelect')} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-bold transition">
            START GAME
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'characterSelect') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-8">Choose Your Hero</h2>
          <div className="grid grid-cols-5 gap-4 mb-8 max-w-5xl">
            {characters.map(char => (
              <div
                key={char.id}
                onClick={() => setSelectedCharacter(char)}
                className={`cursor-pointer p-6 rounded-lg transition transform hover:scale-110 ${selectedCharacter?.id === char.id ? 'ring-4 ring-yellow-400' : ''}`}
                style={{ backgroundColor: char.color }}
              >
                <div className="flex justify-center mb-2">
                  <CharacterAvatar character={char} />
                </div>
                <div className="text-white font-bold text-lg">{char.name}</div>
                <div className="text-xs text-white mt-2">
                  Speed: {char.speed}/10<br/>Fire Rate: {10 - Math.floor(char.fireRate/50)}/10
                </div>
              </div>
            ))}
          </div>
          {selectedCharacter && (
            <button onClick={() => setGameState('playing')} className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-bold transition animate-pulse">
              DEPLOY TO PRODUCTION! 🚀
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'victory') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-32 h-32 text-white mx-auto mb-4 animate-bounce" />
          <h1 className="text-6xl font-bold text-white mb-4">CONGRATS!</h1>
          <p className="text-3xl text-white mb-4 font-bold">SAFERIDE SPANISH DUE IN 1 MONTH</p>
          <p className="text-2xl text-white mb-2">Sohaib & Joe have been debugged! 🎉</p>
          <p className="text-3xl text-white font-bold mb-8">Final Score: {score}</p>
          <button onClick={resetGame} className="bg-white text-orange-500 px-8 py-4 rounded-lg text-xl font-bold hover:bg-gray-100 transition">
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-red-500 mb-4">MERGE CONFLICT!</h1>
          <p className="text-2xl text-white mb-2">Your code couldn't handle the bugs 🐛</p>
          <p className="text-3xl text-white font-bold mb-8">Score: {score}</p>
          <button onClick={resetGame} className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-lg text-xl font-bold transition">
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  const backgroundElements = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.3 + 0.1
  }));

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {backgroundElements.map((el, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400 animate-pulse"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.size}px`,
            height: `${el.size}px`,
            opacity: el.opacity
          }}
        />
      ))}
      
      <div className="absolute top-4 left-4 text-white z-10">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">Level {level}/{MAX_LEVEL}</span>
            {level === MAX_LEVEL && <span className="text-yellow-400 text-xs">BOSS LEVEL</span>}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span>Score: {score}</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <div className="w-32 h-4 bg-gray-700 rounded">
              <div className="h-full bg-green-500 rounded transition-all" style={{ width: `${playerHealth}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 text-white z-10">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg text-center mb-2">
          <CharacterAvatar character={selectedCharacter} size={80} />
          <div className="font-bold mt-2">{selectedCharacter?.name}</div>
        </div>
        <button onClick={toggleSound} className="w-full bg-black bg-opacity-50 p-3 rounded-lg hover:bg-opacity-70 transition">
          {soundEnabled ? <Volume2 className="w-6 h-6 mx-auto" /> : <VolumeX className="w-6 h-6 mx-auto" />}
        </button>
      </div>

      <div
        ref={canvasRef}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseDown={(e) => e.preventDefault()}
        className="absolute inset-0 cursor-crosshair outline-none select-none"
      >
        {enemies.map(enemy => (
          <div
            key={enemy.id}
            className="absolute transition-all duration-100"
            style={{
              left: `${enemy.x}%`,
              top: `${enemy.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <EnemyAvatar enemy={enemy} />
              <div className="text-sm text-white font-bold text-center bg-black bg-opacity-50 px-2 py-1 rounded">
                {enemy.name}
              </div>
              <div className="w-20 h-2 bg-gray-700 rounded mt-1 mx-auto">
                <div className="h-full bg-red-500 rounded transition-all" style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}

        {projectiles.map(proj => (
          <div
            key={proj.id}
            className="absolute font-bold pointer-events-none"
            style={{
              left: `${proj.x}%`,
              top: `${proj.y}%`,
              color: proj.friendly ? '#22c55e' : '#ef4444',
              transform: 'translate(-50%, -50%)',
              fontSize: '24px',
              textShadow: proj.friendly ? '0 0 15px #22c55e, 0 0 30px #22c55e' : '0 0 15px #ef4444, 0 0 30px #ef4444',
              fontWeight: 'bold',
              filter: 'brightness(1.5)'
            }}
          >
            {proj.code}
          </div>
        ))}

        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.05s linear'
          }}
        >
          <CharacterAvatar character={selectedCharacter} size={96} />
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-lg bg-black bg-opacity-70 px-6 py-3 rounded font-bold">
        Move mouse to aim • Hold SPACE to shoot!
      </div>
    </div>
  );
};

export default CodeShooter;
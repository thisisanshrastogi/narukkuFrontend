"use client";
import React, { useState, useEffect } from 'react';
import {
    Ticket, Dices, Trophy, ShieldCheck, Cpu,
    Workflow, CheckCircle2, ChevronRight, ChevronLeft,
    Presentation, Coins, Clock, Link, Zap, Network, Layers, Database
} from 'lucide-react';

// Expanded Slide Data
const SLIDES = [
    {
        id: 'overview',
        title: 'System Overview',
        icon: <Presentation className="w-5 h-5 md:w-6 md:h-6" />,
        badge: 'Introduction',
        content: () => (
            <div className="flex flex-col gap-6 md:gap-8">
                <h3 className="font-serif font-bold tracking-wider text-2xl md:text-3xl text-[var(--text-primary)] leading-tight">
                    A decentralized lottery <br /> built on Solana
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="neu-inset rounded-2xl p-5 md:p-6 flex flex-col gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-2xl neu-inset-shallow text-[var(--accent-primary)]">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">The Asset</div>
                        <div className="font-body text-sm md:text-base text-[var(--text-primary)] leading-relaxed">
                            Users buy tickets mapped 1:1 as unique NFTs. Unlike Web2 databases where balances are just numbers in a server, these tickets are fully self-custodied cryptographic assets in the user's wallet.
                        </div>
                    </div>
                    <div className="neu-inset rounded-2xl p-5 md:p-6 flex flex-col gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-2xl neu-inset-shallow text-[var(--accent-primary)]">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">The Reward</div>
                        <div className="font-body text-sm md:text-base text-[var(--text-primary)] leading-relaxed">
                            Ticket sales flow directly into a Program Derived Address (PDA) holding the SOL pot. No human admin has the private keys to drain this pot; it is strictly governed by the smart contract logic.
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'solana-arch',
        title: 'Solana Architecture',
        icon: <Network className="w-5 h-5 md:w-6 md:h-6" />,
        badge: 'The Engine',
        content: () => (
            <div className="flex flex-col gap-6">
                <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    Unlike Ethereum, where smart contracts store their own state, Solana completely separates logic from data. This enables Sealevel (Solana's parallel transaction processing engine) to process thousands of transactions concurrently.
                </p>
                <div className="flex flex-col gap-4">
                    <div className="neu-inset rounded-3xl p-6 border border-[rgba(255,255,255,0.02)]">
                        <div className="flex items-center gap-3 mb-3 text-[var(--accent-primary)]">
                            <Cpu className="w-5 h-5" />
                            <h4 className="font-bold tracking-wider text-lg text-[var(--text-primary)]">Programs (Stateless Logic)</h4>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            Our core Lottery Program is marked as "read-only executable." It contains the rules (how to buy, how to select winners) but holds absolutely zero data. It acts purely as a processing engine.
                        </p>
                    </div>
                    <div className="neu-inset rounded-3xl p-6 border border-[rgba(255,255,255,0.02)]">
                        <div className="flex items-center gap-3 mb-3 text-[var(--status-info)]">
                            <Database className="w-5 h-5" />
                            <h4 className="font-bold tracking-wider text-lg text-[var(--text-primary)]">Accounts (State Storage)</h4>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            Data is stored in Accounts. When you interact with our program, you pass in the specific Accounts you want it to read or write to. For the lottery, we use PDAs (Program Derived Addresses) to store the pot balance and global state without needing a private key.
                        </p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'nft-structure',
        title: 'Tickets as NFTs',
        icon: <Layers className="w-5 h-5 md:w-6 md:h-6" />,
        badge: 'Asset Layer',
        content: () => (
            <div className="flex flex-col gap-6">
                <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    On Solana, an NFT is not a single monolith. It is constructed using the Metaplex standard, which pieces together three distinct accounts to form what we recognize as an NFT.
                </p>
                <div className="grid grid-cols-1 gap-4">
                    <div className="neu-inset rounded-2xl p-5 flex flex-col gap-2 border-l-4 border-[var(--accent-primary)]">
                        <div className="flex justify-between items-center">
                            <div className="font-bold text-sm text-[var(--text-primary)]">1. The Mint Account (Base Layer)</div>
                            <span className="text-[10px] uppercase text-[var(--accent-primary)]">Supply Controller</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">Creates the actual token instance. To make it non-fungible (unique), the supply is strictly capped at 1, and the decimals are set to 0. It defines the "what."</div>
                    </div>
                    <div className="neu-inset rounded-2xl p-5 flex flex-col gap-2 border-l-4 border-[var(--status-info)]">
                        <div className="flex justify-between items-center">
                            <div className="font-bold text-sm text-[var(--text-primary)]">2. The Token Account (Ownership Layer)</div>
                            <span className="text-[10px] uppercase text-[var(--status-info)]">Wallet Link</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">This acts as a ledger entry. It connects a user's wallet address to the Mint Account, cryptographically proving: "User X holds a balance of 1 for Mint Y."</div>
                    </div>
                    <div className="neu-inset rounded-2xl p-5 flex flex-col gap-2 border-l-4 border-[var(--status-success)]">
                        <div className="flex justify-between items-center">
                            <div className="font-bold text-sm text-[var(--text-primary)]">3. The Metadata Account (Context Layer)</div>
                            <span className="text-[10px] uppercase text-[var(--status-success)]">Metaplex PDA</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">Derived via the Metaplex Token Metadata program. It stores the human-readable data: the string name ("Ticket #42"), the symbol, and a URI link pointing to Arweave/IPFS where the actual image lives.</div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'purchase-flow',
        title: 'Cross-Program Interactions',
        icon: <Workflow className="w-5 h-5 md:w-6 md:h-6" />,
        badge: 'Execution',
        content: () => (
            <div className="flex flex-col gap-6">
                <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    When a user buys a ticket, our program doesn't do everything itself. It issues Cross-Program Invocations (CPIs) to other native Solana programs atomically.
                </p>
                <div className="flex flex-col gap-4 relative before:absolute before:inset-y-0 before:left-5 before:w-[2px] before:bg-[rgba(255,255,255,0.05)] md:before:left-6">
                    {[
                        { title: 'System Program (Transfer)', desc: 'CPI to the core System Program to move SOL from the user\'s wallet to the Lottery PDA pot.', icon: <Coins /> },
                        { title: 'Token Program (Minting)', desc: 'CPI to the SPL Token Program to initialize a new Mint account and Token account for the user.', icon: <Ticket /> },
                        { title: 'Metaplex (Metadata)', desc: 'CPI to the Metaplex Metadata program to create the Metadata PDA and verify the ticket under our Lottery Collection.', icon: <Link /> }
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-4 md:gap-6 relative z-10">
                            <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full neu-raised text-[var(--accent-primary)] bg-[var(--surface)] border-2 border-[var(--bg)] flex-shrink-0">
                                {React.cloneElement(step.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4 md:w-5 md:h-5' })}
                            </div>
                            <div className="neu-inset flex-1 rounded-2xl p-4 md:p-5">
                                <div className="font-bold text-sm md:text-base text-[var(--text-primary)] mb-1">{step.title}</div>
                                <div className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">{step.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 'oracle',
        title: 'The Oracle Problem',
        icon: <Dices className="w-5 h-5 md:w-6 md:h-6" />,
        badge: 'Fairness Layer',
        content: () => (
            <div className="flex flex-col gap-6 items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full neu-inset text-[var(--accent-primary)] mb-2 relative">
                    <Zap className="w-8 h-8 md:w-10 md:h-10 absolute z-10" />
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[var(--accent-primary)]"></div>
                </div>
                <h3 className="font-serif font-bold tracking-wider text-xl md:text-2xl text-[var(--text-primary)]">
                    Why we need Switchboard VRF
                </h3>
                <p className="font-body text-sm md:text-base text-[var(--text-secondary)] text-left leading-relaxed">
                    Blockchains are 100% deterministic state machines. Every node must reach the exact same state given the same inputs. Because of this, generating true randomness natively is impossible.
                    <br /><br />
                    If we used something native like <span className="font-mono text-[var(--accent-primary)] text-xs">block_timestamp</span> or <span className="font-mono text-[var(--accent-primary)] text-xs">recent_slothashes</span>, a malicious validator building the block could slightly delay submission or manipulate transaction ordering to guarantee they win the lottery.
                </p>
                <div className="flex flex-col w-full gap-3 mt-2 text-left">
                    <div className="neu-raised rounded-2xl p-4 border border-[rgba(255,255,255,0.02)]">
                        <div className="font-bold text-sm text-[var(--text-primary)] mb-1">Off-Chain Generation (TEEs)</div>
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">Switchboard uses Trusted Execution Environments (hardware-secured enclaves) off-chain to generate the random numbers, keeping the generation process blind even to the node operator.</div>
                    </div>
                    <div className="neu-raised rounded-2xl p-4 border border-[rgba(255,255,255,0.02)]">
                        <div className="font-bold text-sm text-[var(--text-primary)] mb-1">Cryptographic Verification</div>
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">The random hash is accompanied by a cryptographic proof. When pushed back on-chain, our smart contract verifies this proof to guarantee the number was generated fairly and without tampering.</div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'winner',
        title: 'Winner Resolution',
        icon: <Trophy className="w-5 h-5 md:w-6 md:h-6" />,
        badge: 'Execution',
        content: () => (
            <div className="flex flex-col gap-6">
                <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    Once the oracle successfully settles the verifiable randomness on-chain, the authority triggers the selection process to translate a massive hex hash into a winning ticket ID.
                </p>
                <div className="neu-inset rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-center z-10 w-full">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)] mb-4">The Selection Math</div>

                        <div className="flex flex-col gap-2 font-mono text-sm md:text-base text-[var(--accent-primary)] bg-[var(--bg)] px-6 py-5 rounded-2xl border border-[rgba(57,242,193,0.2)] shadow-[0_0_20px_rgba(57,242,193,0.1)] overflow-x-auto">
                            <span className="text-white opacity-50 text-xs text-left">// Switchboard provides a 32-byte array (u256 equivalent)</span>
                            <div className="text-left whitespace-nowrap">
                                <span className="text-[var(--status-info)]">let</span> winner_index = random_hash % total_tickets;
                            </div>
                        </div>

                        <p className="mt-6 text-sm text-[var(--text-secondary)] text-left leading-relaxed">
                            <strong>Why modulo?</strong> It's gas-efficient and ensures the result perfectly wraps within the bounds of tickets sold. If 5,000 tickets are sold, any massive random number modulo 5000 will result in an absolute fair value between <span className="font-mono text-[var(--accent-primary)]">0</span> and <span className="font-mono text-[var(--accent-primary)]">4999</span>.
                        </p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'security',
        title: 'Security Posture',
        icon: <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />,
        badge: 'Protection',
        content: () => (
            <div className="flex flex-col gap-4">
                {[
                    { title: 'PDA Signatures', desc: 'The contract pot uses a Program Derived Address. Because a PDA is derived mathematically off the program ID, it sits off the ed25519 curve. This means no private key exists for it; funds can ONLY be moved by the logic hardcoded into the program.' },
                    { title: 'Metaplex Collections', desc: 'To prevent fake tickets from claiming the prize, the claim instruction forces Metaplex to verify the NFT belongs to the specific Verified Collection minted during the lottery initialization.' },
                    { title: 'Reentrancy & Locking', desc: 'Once the winner is resolved, a global state boolean (winner_chosen) is flipped. This permanently locks the contract from re-rolling the dice or double-paying the winner.' }
                ].map((item, i) => (
                    <div key={i} className="neu-raised rounded-2xl p-5 border border-[rgba(255,255,255,0.02)]">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                            <div className="font-bold text-sm md:text-base text-[var(--text-primary)]">{item.title}</div>
                        </div>
                        <div className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</div>
                    </div>
                ))}
            </div>
        )
    }
];

export default function NarukkuPresentation() {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlide]);

    const nextSlide = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const ActiveSlide = SLIDES[currentSlide];

    return (
        <>
            <style>{`
        :root {
          --bg: #0F1316;
          --surface: #1B2126;
          --accent-primary: #39F2C1;
          --text-primary: #EEF2F3;
          --text-secondary: #9AA4AD;
          --status-success: #39D98A;
          --status-info: #4DA3FF;
          
          --shadow-raised-light: rgba(255, 255, 255, 0.04);
          --shadow-raised-dark: rgba(0, 0, 0, 0.8);
          --shadow-inset-light: rgba(255, 255, 255, 0.02);
          --shadow-inset-dark: rgba(0, 0, 0, 0.6);
          --shadow-inset-shallow-dark: rgba(0, 0, 0, 0.5);
          
          --border-subtle: rgba(255,255,255,0.03);
          
          --font-body: system-ui, -apple-system, sans-serif;
          --font-mono: 'Space Mono', 'Fira Code', monospace;
          --font-display: 'Playfair Display', Georgia, serif;
        }

        body {
          background-color: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-body);
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          color-scheme: dark;
        }

        .font-body { font-family: var(--font-body); }
        .font-mono { font-family: var(--font-mono); }
        .font-serif { font-family: var(--font-display); }

        .neu-raised {
          background: var(--surface);
          box-shadow: -6px -6px 14px var(--shadow-raised-light), 
                       6px 6px 14px var(--shadow-raised-dark);
        }

        .neu-inset {
          background: var(--bg);
          box-shadow: inset -4px -4px 8px var(--shadow-inset-light), 
                      inset 4px 4px 8px var(--shadow-inset-dark);
        }

        .neu-inset-shallow {
          background: var(--surface);
          box-shadow: inset -2px -2px 5px var(--shadow-inset-light), 
                      inset 2px 2px 5px var(--shadow-inset-shallow-dark);
        }

        .neu-btn {
          background: var(--surface);
          box-shadow: -4px -4px 10px var(--shadow-raised-light), 
                       4px 4px 10px var(--shadow-inset-dark);
          transition: all 0.3s ease;
          border: 1px solid var(--border-subtle);
        }

        .neu-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: -6px -6px 15px rgba(255,255,255,0.06), 
                       6px 6px 15px var(--shadow-raised-dark);
          color: var(--accent-primary);
        }
        
        .neu-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: -2px -2px 5px rgba(255, 255, 255, 0.01), 
                       2px 2px 5px rgba(0, 0, 0, 0.3);
        }

        .slide-enter {
          animation: slideIn 0.4s ease forwards;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- Custom Scrollbar for Content Areas --- */
        .custom-scroll::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
            background: rgba(57, 242, 193, 0.15);
            border-radius: 8px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(57, 242, 193, 0.4);
        }
        
        /* Main body scrollbar hidden to maintain app feel */
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>



            <main className="flex-1 flex flex-col md:flex-row gap-6 md:gap-10 h-screen p-8">
                <aside className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 md:gap-3 overflow-x-auto custom-scroll pb-2 md:pb-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full neu-raised flex items-center justify-center border border-[rgba(57,242,193,0.1)]">
                            <Ticket className="w-5 h-5 text-[var(--accent-primary)] drop-shadow-[0_0_8px_rgba(57,242,193,0.6)]" />
                        </div>
                        <div>
                            <h1 className="font-serif font-bold tracking-[0.1em] text-xl md:text-2xl text-[var(--text-primary)] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                NARUKKU
                            </h1>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-primary)] opacity-90 drop-shadow-[0_0_4px_rgba(57,242,193,0.4)]">
                                Architecture Deep Dive
                            </span>
                        </div>
                    </div>

                    {SLIDES.map((slide, idx) => (
                        <button
                            key={slide.id}
                            onClick={() => setCurrentSlide(idx)}
                            className={`text-left px-4 py-3 md:px-5 md:py-4 rounded-2xl md:rounded-3xl flex items-center gap-3 transition-all duration-300 min-w-[200px] md:min-w-0 ${currentSlide === idx
                                ? 'neu-inset-shallow border-l-2 border-[var(--accent-primary)] text-[var(--text-primary)]'
                                : 'hover:bg-[rgba(255,255,255,0.02)] text-[var(--text-secondary)] border-l-2 border-transparent'
                                }`}
                        >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${currentSlide === idx ? 'neu-raised text-[var(--accent-primary)]' : ''}`}>
                                {React.cloneElement(slide.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
                            </div>
                            <div className="flex flex-col min-w-0 truncate">
                                <span className="text-[10px] uppercase tracking-[0.15em] mb-1 opacity-70">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className="text-xs md:text-sm font-bold tracking-wider truncate">
                                    {slide.title}
                                </span>
                            </div>
                        </button>
                    ))}
                </aside>

                <section className="flex-1 flex flex-col relative h-[65vh] md:h-[95vh] min-h-[450px]">
                    <div
                        key={currentSlide}
                        className="slide-enter flex-1 neu-raised rounded-3xl p-6 md:p-10 border border-[rgba(255,255,255,0.02)] flex flex-col overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-6 md:mb-8 flex-shrink-0">
                            <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-[rgba(57,242,193,0.35)] text-[var(--accent-primary)] shadow-[0_0_10px_rgba(57,242,193,0.1)] bg-[rgba(57,242,193,0.05)]">
                                {ActiveSlide.badge}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-secondary)] tracking-[0.2em]">
                                {String(currentSlide + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
                            </div>
                        </div>

                        {/* Added Scrollable Container Here */}
                        <div className="flex-1 overflow-y-auto custom-scroll pr-2 md:pr-4">
                            <ActiveSlide.content />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-6 flex-shrink-0">
                        <button
                            onClick={prevSlide}
                            disabled={currentSlide === 0}
                            className="neu-btn rounded-full px-5 md:px-7 py-3 md:py-4 flex items-center gap-2 text-xs md:text-sm font-bold tracking-[0.1em] uppercase text-[var(--text-secondary)]"
                        >
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden md:inline">Previous</span>
                        </button>

                        <div className="flex gap-2">
                            {SLIDES.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)] scale-125' : 'bg-[rgba(255,255,255,0.1)]'
                                        }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={nextSlide}
                            disabled={currentSlide === SLIDES.length - 1}
                            className="neu-btn rounded-full px-5 md:px-7 py-3 md:py-4 flex items-center gap-2 text-xs md:text-sm font-bold tracking-[0.1em] uppercase text-[var(--text-primary)]"
                        >
                            <span className="hidden md:inline">Next</span>
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent-primary)]" />
                        </button>
                    </div>
                </section>
            </main>
        </>
    );
}
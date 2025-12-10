import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, Link as LinkIcon, ExternalLink, Plus, Copy, 
  CheckCircle, ShieldAlert, User, Clock, Zap, Crown, 
  CheckSquare, Square, Ticket, Filter, Sparkles 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDBLpnqJwRIe1PPKYEPdn0gpi0TbjbAbvY",
  authDomain: "ognib-card.firebaseapp.com",
  projectId: "ognib-card",
  storageBucket: "ognib-card.firebasestorage.app",
  messagingSenderId: "612697971698",
  appId: "1:612697971698:web:6f488ab99214a229c0296b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'bingo_friends_v1'; 

// --- COMPONENTS ---

const Background = () => (
  <div className="fixed inset-0 z-[-1] bg-slate-950 overflow-hidden">
    {/* Animierte Blobs für "lebendigen" Hintergrund */}
    <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-purple-600/20 blur-[100px] animate-pulse-slow" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-600/20 blur-[100px] animate-pulse-slow delay-1000" />
    <div className="absolute top-[40%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-pink-600/10 blur-[80px] animate-pulse-slow delay-2000" />
  </div>
);

const BingoCard = ({ link, onToggle, onDelete, onCopy }) => {
  const isClaimed = link.claimed;

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Gerade eben';
    const date = new Date(timestamp.seconds * 1000);
    const diffMinutes = (new Date() - date) / 1000 / 60; 
    if (diffMinutes < 60) return `${Math.floor(diffMinutes)} min`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getShortCode = (url) => {
    try {
      const u = new URL(url);
      const sub1 = u.searchParams.get('af_sub1');
      return sub1 ? `Code: ${sub1.substring(0, 6)}...` : 'Link';
    } catch { return 'Link'; }
  };

  return (
    <div className={`group relative rounded-2xl transition-all duration-300 isolate
      ${isClaimed 
        ? 'bg-slate-900/40 border border-slate-800 opacity-60 scale-[0.98]' 
        : 'bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1'
      }`}>
        
        {/* Glow Effect Top */}
        {!isClaimed && <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />}
        
        {/* Bedient Overlay */}
        {isClaimed && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="border-4 border-slate-600/50 text-slate-500/50 font-black text-3xl px-4 py-2 rounded-xl uppercase tracking-widest -rotate-12 backdrop-blur-sm">
                    Bedient
                </div>
            </div>
        )}
        
        <div className="p-5">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-lg transition-colors
                        ${isClaimed ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600 border-white/10'}`}>
                        <User size={18} className="text-white" />
                    </div>
                    <div>
                        <div className={`font-bold text-sm flex items-center gap-2 ${isClaimed ? "text-slate-500" : "text-white"}`}>
                            {link.sender}
                            {!isClaimed && <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {formatTime(link.createdAt)}
                        </div>
                    </div>
                </div>
                {!link.note && !isClaimed && (
                    <div className="text-[10px] font-mono bg-slate-950/50 px-2 py-1 rounded text-slate-400 border border-white/5">
                        {getShortCode(link.url)}
                    </div>
                )}
            </div>

            {/* Note Area */}
            {link.note && (
            <div className={`mb-5 relative pl-4 border-l-2 ${isClaimed ? 'border-slate-700' : 'border-purple-500/50'}`}>
                <p className={`text-sm leading-relaxed ${isClaimed ? 'text-slate-600 line-through' : 'text-slate-300'}`}>"{link.note}"</p>
            </div>
            )}

            {/* Actions Grid */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                <button 
                    onClick={() => onToggle(link.id, isClaimed)} 
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all border
                        ${isClaimed 
                            ? 'bg-slate-800/30 text-slate-600 border-slate-800 hover:text-green-500' 
                            : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-green-400'}`}
                >
                    {isClaimed ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>

                <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg
                        ${isClaimed 
                            ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed shadow-none' 
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] border border-white/10 shadow-purple-900/20'}`}
                >
                    <ExternalLink size={16} strokeWidth={2.5} /> 
                    {isClaimed ? 'Erledigt' : 'CLAIM'}
                </a>
                
                <button 
                    onClick={() => onDelete(link.id)} 
                    className="h-11 w-11 rounded-xl flex items-center justify-center transition-colors text-slate-600 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    </div>
  );
};

// --- APP ---
export default function BingoExchangeApp() {
  const [user, setUser] = useState(null);
  const [links, setLinks] = useState([]);
  const [inputText, setInputText] = useState('');
  const [senderName, setSenderName] = useState(() => localStorage.getItem('bingo_username') || '');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { if (senderName) localStorage.setItem('bingo_username', senderName); }, [senderName]);

  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) { setError(`Login: ${e.code}`); } };
    initAuth();
    return onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links'));
    return onSnapshot(q, (snapshot) => {
        const linksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        linksData.sort((a, b) => {
            if (a.claimed === b.claimed) return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            return a.claimed ? 1 : -1;
        });
        setLinks(linksData);
        setLoading(false);
    }, (err) => { setError("Verbindung unterbrochen"); setLoading(false); });
  }, [user]);

  const filteredLinks = useMemo(() => showAll ? links : links.filter(l => !l.claimed), [links, showAll]);

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 2500); };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showSuccess('Link kopiert!'))
      .catch((err) => console.error("Fehler:", err));
  };

  const handleAddLink = async () => {
    setError('');
    if (!senderName.trim()) return setError('Name fehlt!');
    
    // Smart Parsing Regex
    const urlMatch = inputText.match(/(https:\/\/bingocash\.onelink\.me\/[^\s]+)/);
    
    if (!urlMatch) return setError('Kein gültiger Bingo-Link!');
    
    const url = urlMatch[0];
    const note = inputText.replace(url, '').trim(); 

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links'), {
        url, note, sender: senderName, createdAt: serverTimestamp(), claimed: false, clicks: 0
      });
      setInputText('');
      setView('list');
      showSuccess('Gepostet!');
    } catch (err) { setError('Fehler beim Senden.'); }
  };

  const handleToggleClaim = async (id, currentStatus) => {
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bingo_links', id), { claimed: !currentStatus }); } catch (err) {}
  };

  const handleDelete = async (id) => {
    if(window.confirm("Löschen?")) {
        try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bingo_links', id)); } catch (err) {}
    }
  };

  const SkeletonCard = () => (
    <div className="rounded-2xl p-4 border border-white/5 bg-slate-900/40 backdrop-blur-sm animate-pulse h-40" />
  );

  return (
    <div className="min-h-screen font-sans text-slate-100 pb-24 relative overflow-x-hidden">
      <Background />
      <style>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>
      
      {/* HEADER */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="relative group shrink-0 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
             <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 p-0.5 rounded-[18px] shadow-lg shadow-purple-500/20">
                <div className="w-[120px] h-[64px] rounded-[16px] overflow-hidden bg-slate-900">
                    <img src="/hero.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} onError={(e) => e.target.style.display = 'none'} />
                </div>
             </div>
             <div className="absolute -bottom-2 -right-2 bg-slate-950 text-yellow-400 p-1.5 rounded-xl border border-slate-800 shadow-xl">
                <Crown size={14} strokeWidth={3} fill="currentColor" className="text-yellow-500" />
             </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-wider text-white uppercase leading-none">
                OGNIB<br/>
                <span className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold tracking-normal">CARDS DEALER</span>
            </h1>
          </div>
        </div>
      </header>

      {/* TOASTS */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-2 fixed top-32 left-0 right-0 z-40 pointer-events-none">
        {error && <div className="bg-red-500/90 backdrop-blur text-white p-3 rounded-xl text-sm shadow-xl flex items-center gap-2 animate-bounce"><ShieldAlert size={18} /> {error}</div>}
        {successMsg && <div className="bg-emerald-500/90 backdrop-blur text-white p-3 rounded-xl text-sm shadow-xl flex items-center gap-2 justify-center font-bold animate-fade-in-up"><CheckCircle size={18} /> {successMsg}</div>}
      </div>

      <main className="max-w-md mx-auto p-4 pt-6">
        
        {/* ADD VIEW */}
        {view === 'add' && user && (
        <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 animate-fade-in-up mb-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2"><Zap className="text-yellow-400 fill-yellow-400" size={20} /> Neuen Drop teilen</h2>
            
            <div className="space-y-5">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Dein Name</label>
                    <div className="relative">
                        <User size={18} className="absolute left-4 top-3.5 text-slate-500" />
                        <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Gamer Tag" className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-white placeholder-slate-600 transition-all" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Inhalt</label>
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste alles hier rein... Link + Nachricht" className="w-full p-4 bg-black/20 border border-white/10 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-white placeholder-slate-600 h-32 text-sm resize-none transition-all" />
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={() => setView('list')} className="flex-1 py-3 px-4 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors">Zurück</button>
                    <button onClick={handleAddLink} className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-900/40 hover:brightness-110 active:scale-95 transition-all">Posten</button>
                </div>
            </div>
        </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
        <>
            {!loading && links.length > 0 && (
                <div className="flex justify-between items-center mb-6 px-1">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{filteredLinks.length} {showAll ? 'Total' : 'Offen'}</span>
                    </div>
                    <button onClick={() => setShowAll(!showAll)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${showAll ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-purple-500/10 text-purple-300 border-purple-500/30'}`}>
                        <Filter size={14} /> {showAll ? 'Alle zeigen' : 'Nur Offene'}
                    </button>
                </div>
            )}

            <div className="space-y-4">
                {loading && <><SkeletonCard /><SkeletonCard /></>}
                {!loading && links.length === 0 && !error && (
                    <div className="text-center py-20 opacity-60 flex flex-col items-center animate-fade-in-up">
                        <div className="bg-slate-800/50 p-6 rounded-full mb-4 border border-white/5"><Sparkles size={40} className="text-purple-400" /></div>
                        <p className="text-slate-300 text-sm font-medium">Nichts los hier.</p>
                        <p className="text-xs text-slate-500 mt-1">Sei der Erste!</p>
                    </div>
                )}
                {!loading && links.length > 0 && filteredLinks.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-sm mb-2">Alles erledigt! 🎉</p>
                        <button onClick={() => setShowAll(true)} className="text-purple-400 text-xs font-bold hover:underline">Erledigte anzeigen</button>
                    </div>
                )}
                {filteredLinks.map((link) => <BingoCard key={link.id} link={link} onToggle={handleToggleClaim} onDelete={handleDelete} onCopy={copyToClipboard} />)}
            </div>
        </>
        )}
      </main>

      {view === 'list' && user && (
        <button onClick={() => setView('add')} className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xl shadow-purple-600/40 flex items-center justify-center z-20 hover:scale-105 active:scale-90 transition-all border-2 border-white/20">
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
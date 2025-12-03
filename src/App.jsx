import React, { useState, useEffect } from 'react';
import { Trash2, Link as LinkIcon, ExternalLink, Plus, Copy, CheckCircle, ShieldAlert, User, Clock, MessageSquare, Zap, Sparkles, Crown, CheckSquare, Square } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, onSnapshot, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';

// --- FIREBASE KONFIGURATION (LIVE) ---
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

// --- HAUPTKOMPONENTE ---
export default function BingoExchangeApp() {
  const [user, setUser] = useState(null);
  const [links, setLinks] = useState([]);
  const [inputText, setInputText] = useState('');
  const [senderName, setSenderName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);

  // 1. Authentifizierung
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth Fehler:", e);
        if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
            setError(
                <div>
                    <strong>⚠️ Config Missing</strong>
                    <div className="text-xs mt-1">Firebase Console: Auth "Anonymous" aktivieren.</div>
                </div>
            );
        } else {
            setError(`Login Fehler: ${e.code}`);
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { if(u) setUser(u); });
    return () => unsubscribe();
  }, []);

  // 2. Daten laden
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const linksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sortierung: Erst nach Status (Offene zuerst), dann nach Zeit (Neueste zuerst)
        linksData.sort((a, b) => {
            if (a.claimed === b.claimed) {
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            }
            return a.claimed ? 1 : -1; // Geclaimte nach unten
        });
        setLinks(linksData);
      }, (err) => setError(`DB Fehler: ${err.message}`));
      return () => unsubscribe();
    } catch (e) { setError(`Interner Fehler: ${e.message}`); }
  }, [user]);

  // --- LOGIK ---
  const extractLinkAndMessage = (rawText) => {
    const urlRegex = /(https:\/\/bingocash\.onelink\.me\/EPHz\/GenericPromoLink\?[^\s]+)/;
    const match = rawText.match(urlRegex);
    if (!match) return { url: null, note: rawText };
    const url = match[0];
    const note = rawText.replace(url, '').trim(); 
    return { url, note };
  };

  const handleAddLink = async () => {
    setError('');
    if (!senderName.trim()) { setError('Name fehlt!'); return; }
    const { url, note } = extractLinkAndMessage(inputText);
    if (!url) { setError('Kein gültiger Bingo-Link gefunden.'); return; }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links'), {
        url: url,
        note: note,
        sender: senderName,
        createdAt: serverTimestamp(),
        claimed: false, // Standardmäßig offen
        clicks: 0
      });
      setInputText('');
      setView('list');
      showSuccess('Gepostet!');
    } catch (err) { setError('Speichern fehlgeschlagen.'); }
  };

  const handleToggleClaim = async (id, currentStatus) => {
    try {
        const linkRef = doc(db, 'artifacts', appId, 'public', 'data', 'bingo_links', id);
        await updateDoc(linkRef, {
            claimed: !currentStatus
        });
        // Kein Success-Popup nötig, das visuelle Feedback reicht
    } catch (err) {
        console.error(err);
        setError("Status-Update fehlgeschlagen.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Löschen?")) {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bingo_links', id));
            showSuccess('Gelöscht.');
        } catch (err) { setError("Löschen fehlgeschlagen."); }
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const copyToClipboard = (text) => {
    document.execCommand('copy');
    navigator.clipboard.writeText(text).catch(() => {});
    showSuccess('Kopiert!');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Neu';
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = (now - date) / 1000 / 60; // Minuten
    if (diff < 60) return `${Math.floor(diff)} min`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getShortCode = (url) => {
    try {
      const u = new URL(url);
      const s = u.searchParams.get('af_sub1');
      return s ? 'ID: ' + s.substring(0, 5) + '..' : 'Link';
    } catch (e) { return 'Link'; }
  };

  // --- DESIGN COMPONENTS ---
  const Background = () => (
    <div className="fixed inset-0 z-[-1] bg-slate-950">
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[80%] rounded-full bg-purple-900/20 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[100px]" />
    </div>
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen font-sans text-slate-100 pb-24 relative overflow-hidden">
      <Background />
      
      {/* HEADER: Modern & Glassy */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-lg font-black tracking-widest flex items-center gap-2 bg-gradient-to-r from-purple-200 to-white bg-clip-text text-transparent uppercase">
            <span className="bg-purple-600 text-white p-1 rounded-md shadow-lg shadow-purple-500/50">
                <Crown size={16} fill="white" />
            </span>
            OGNIB - CARDS DEALER
          </h1>
          <div className="text-[10px] font-bold tracking-wider uppercase bg-white/5 px-2 py-1 rounded-full text-slate-400 border border-white/5">
            VIP Only
          </div>
        </div>
      </header>

      {/* FEEDBACK OVERLAY */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-2 fixed top-20 left-0 right-0 z-30 pointer-events-none">
        {error && (
          <div className="bg-red-500/90 backdrop-blur text-white p-3 rounded-xl text-sm shadow-xl animate-bounce pointer-events-auto border border-red-400/50 flex items-center gap-2">
            <ShieldAlert size={18} /> {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/90 backdrop-blur text-white p-3 rounded-xl text-sm shadow-xl animate-fade-in-up pointer-events-auto border border-emerald-400/50 flex items-center gap-2 justify-center font-bold">
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}
      </div>

      <main className="max-w-md mx-auto p-4 pt-4">
        
        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
            
            {/* LINKE SPALTE */}
            <div className="order-2 sm:order-1">
                {loading && !user && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* ADD VIEW */}
                {view === 'add' && user && (
                <div className="bg-slate-900/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 animate-fade-in-up relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500"></div>
                    
                    <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                        <Zap className="text-yellow-400 fill-yellow-400" size={20} />
                        Neuen Drop teilen
                    </h2>
                    
                    <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Dein Name</label>
                        <div className="relative group">
                            <User size={18} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)}
                            placeholder="Gamer Tag" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-white placeholder-slate-600 transition-all" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Inhalt</label>
                        <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste alles hier rein... Link + Nachricht"
                        className="w-full p-4 bg-slate-950/50 border border-white/10 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-white placeholder-slate-600 h-32 text-sm resize-none transition-all"
                        />
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
                <div className="space-y-4">
                    {links.length === 0 && !loading && !error && (
                    <div className="text-center py-8 opacity-50">
                        <p className="text-slate-400 text-sm">Keine Drops verfügbar. Sei der Erste!</p>
                    </div>
                    )}
                    
                    {links.map((link) => (
                    <div 
                        key={link.id} 
                        className={`group rounded-2xl p-4 border transition-all shadow-lg relative overflow-hidden
                            ${link.claimed 
                                ? 'bg-slate-900/40 border-slate-800/50 opacity-60 grayscale-[0.8] hover:opacity-100 hover:grayscale-0' 
                                : 'bg-slate-900/60 backdrop-blur-md border-white/5 hover:border-purple-500/30 hover:shadow-purple-900/10'
                            }`}
                    >
                        {/* BEDIENT STEMPEL */}
                        {link.claimed && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-40 -rotate-12 border-4 border-green-500/50 text-green-500/50 font-black text-4xl p-2 rounded-xl uppercase tracking-widest">
                                Bedient
                            </div>
                        )}
                        
                        {/* CARD HEADER */}
                        <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-inner ${link.claimed ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-slate-800 to-slate-900 border-white/10'}`}>
                                <User size={14} className="text-slate-300" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-200 leading-tight">{link.sender}</div>
                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                    {formatTime(link.createdAt)}
                                </div>
                            </div>
                        </div>
                        
                        {!link.note && !link.claimed && (
                            <div className="text-[10px] font-mono bg-slate-950/50 px-2 py-1 rounded text-slate-500 border border-white/5">
                                {getShortCode(link.url)}
                            </div>
                        )}
                        </div>

                        {/* NOTE / MESSAGE AREA */}
                        {link.note && (
                        <div className="mb-4 relative pl-3">
                            <div className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full ${link.claimed ? 'bg-slate-600' : 'bg-yellow-500/50'}`}></div>
                            <p className={`text-sm italic leading-relaxed ${link.claimed ? 'text-slate-500 line-through decoration-slate-600/50' : 'text-slate-300'}`}>"{link.note}"</p>
                        </div>
                        )}

                        {/* ACTIONS */}
                        <div className="flex gap-2.5">
                        
                        {/* CLAIM BUTTON / TOGGLE */}
                        <button 
                            onClick={() => handleToggleClaim(link.id, link.claimed)}
                            className={`w-12 rounded-xl flex items-center justify-center transition-all border border-white/5
                                ${link.claimed 
                                    ? 'bg-green-900/20 text-green-500 hover:bg-green-900/40 border-green-500/20' 
                                    : 'bg-slate-800 text-slate-400 hover:text-green-400 hover:bg-slate-700'}`}
                            title={link.claimed ? "Als offen markieren" : "Als bedient markieren"}
                        >
                            {link.claimed ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>

                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className={`flex-1 py-3 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-all shadow-md
                                ${link.claimed 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none' 
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white active:scale-95 shadow-indigo-900/30 hover:brightness-110'}`}
                        >
                            <ExternalLink size={16} strokeWidth={2.5} /> 
                            {link.claimed ? 'Erledigt' : 'CLAIM'}
                        </a>
                        
                        <button onClick={() => handleDelete(link.id)} className="bg-slate-800/50 text-slate-500 w-11 rounded-xl flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/5">
                            <Trash2 size={18} />
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>

            {/* RECHTE SPALTE (Gimmick) */}
            <div className="order-1 sm:order-2 mb-4 sm:mb-0">
                <div className="w-full h-32 sm:h-auto sm:aspect-[3/4] bg-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-purple-900/20 border border-white/10 relative group sticky top-24">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center">
                        <Crown size={32} className="text-white/10" />
                    </div>
                    <img 
                        src="/hero.jpg" 
                        alt="Bingo King" 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 text-center sm:text-left">
                        <p className="text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-1">Club Status</p>
                        <h2 className="text-sm sm:text-base font-black text-white leading-tight drop-shadow-lg">Karten Dealer<br/>Aktiv</h2>
                        <div className="mt-2 h-1 w-12 bg-purple-500 rounded-full mx-auto sm:mx-0"></div>
                    </div>
                </div>
            </div>
        </div>

      </main>

      {/* FAB */}
      {view === 'list' && user && (
        <button 
          onClick={() => setView('add')}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xl shadow-purple-600/40 flex items-center justify-center z-20 hover:scale-105 active:scale-90 transition-all border-2 border-white/20"
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
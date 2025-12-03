import React, { useState, useEffect } from 'react';
import { Trash2, Link as LinkIcon, ExternalLink, Plus, Copy, CheckCircle, ShieldAlert, User, Clock, MessageSquare, Zap, Sparkles, Crown, CheckSquare, Square, Ticket } from 'lucide-react';
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
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[80%] rounded-full bg-purple-900/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />
    </div>
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen font-sans text-slate-100 pb-24 relative overflow-x-hidden">
      <Background />
      
      {/* HEADER: Modern & Glassy */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-20 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center gap-4">
          
          {/* HERO IMAGE AVATAR - HIER DER FIX: Harte Inline-Styles für erzwungene Größe */}
          <div className="relative group shrink-0">
             <div 
                className="rounded-2xl p-0.5 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 shadow-lg shadow-purple-500/20"
                style={{ width: '160px', height: '100px', overflow: 'hidden', borderRadius: '12px' }} // Breiter und flacher
             >
                <img 
                    src="/hero.jpg" 
                    alt="Logo" 
                    // Inline Styles zwingen das Bild in den Rahmen
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                    className="bg-slate-800 transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => e.target.style.display = 'none'}
                />
             </div>
             <div className="absolute -bottom-2 -right-2 bg-slate-900 text-yellow-400 p-1.5 rounded-full border-2 border-slate-800 shadow-lg transform rotate-12">
                <Crown size={20} strokeWidth={3} fill="currentColor" className="text-yellow-500" />
             </div>
          </div>

          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-widest bg-gradient-to-r from-purple-200 to-white bg-clip-text text-transparent uppercase leading-tight drop-shadow-sm">
                OGNIB<br/>
                <span className="text-sm sm:text-base text-purple-400 tracking-normal font-bold">CARDS DEALER</span>
            </h1>
          </div>
        </div>
      </header>

      {/* FEEDBACK OVERLAY */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-2 fixed top-44 left-0 right-0 z-30 pointer-events-none">
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

      <main className="max-w-md mx-auto p-4 pt-6">
        
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

        {/* LIST VIEW - NEUES CARD DESIGN */}
        {view === 'list' && (
        <div className="space-y-5">
            {links.length === 0 && !loading && !error && (
            <div className="text-center py-12 opacity-50 flex flex-col items-center">
                <div className="bg-slate-800/50 p-4 rounded-full mb-3">
                    <Ticket size={32} className="text-slate-600" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Keine Drops verfügbar.</p>
                <p className="text-xs text-slate-600 mt-1">Sei der Erste!</p>
            </div>
            )}
            
            {links.map((link) => (
            <div 
                key={link.id} 
                className={`group relative rounded-2xl transition-all duration-300 overflow-hidden
                    ${link.claimed 
                        ? 'bg-slate-900/40 border border-slate-800/60 opacity-60 grayscale-[0.8] scale-[0.98]' 
                        : 'bg-slate-900/80 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] hover:-translate-y-1'
                    }`}
            >
                {/* NEON BAR TOP (Nur für aktive) */}
                {!link.claimed && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-80 shadow-[0_2px_10px_rgba(236,72,153,0.3)]"></div>
                )}

                {/* BEDIENT STEMPEL */}
                {link.claimed && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-60 -rotate-12 border-4 border-slate-600 text-slate-500 font-black text-4xl p-2 rounded-xl uppercase tracking-widest mix-blend-screen">
                        Bedient
                    </div>
                )}
                
                <div className="p-4 pt-5">
                    {/* CARD HEADER */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            {/* Avatar Circle */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-inner 
                                ${link.claimed ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20 shadow-purple-900/20'}`}>
                                <User size={18} className={link.claimed ? "text-slate-600" : "text-purple-300"} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm leading-tight flex items-center gap-2 ${link.claimed ? "text-slate-500" : "text-white"}`}>
                                    {link.sender}
                                    {!link.claimed && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                    <Clock size={10} /> {formatTime(link.createdAt)}
                                </div>
                            </div>
                        </div>
                        
                        {!link.note && !link.claimed && (
                            <div className="text-[10px] font-mono bg-slate-950/80 px-2 py-1 rounded text-purple-300 border border-purple-500/10">
                                {getShortCode(link.url)}
                            </div>
                        )}
                    </div>

                    {/* NOTE / MESSAGE AREA */}
                    {link.note && (
                    <div className={`mb-5 relative pl-4 border-l-2 ${link.claimed ? 'border-slate-700' : 'border-purple-500/50'}`}>
                        <p className={`text-sm leading-relaxed ${link.claimed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>"{link.note}"</p>
                    </div>
                    )}

                    {/* ACTIONS */}
                    <div className="flex gap-2">
                        
                        {/* CLAIM BUTTON / TOGGLE */}
                        <button 
                            onClick={() => handleToggleClaim(link.id, link.claimed)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border border-white/5
                                ${link.claimed 
                                    ? 'bg-slate-800/50 text-slate-600 hover:text-green-500' 
                                    : 'bg-slate-800 text-slate-400 hover:text-green-400 hover:bg-slate-700'}`}
                            title={link.claimed ? "Als offen markieren" : "Als bedient markieren"}
                        >
                            {link.claimed ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>

                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className={`flex-1 h-12 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-all shadow-lg
                                ${link.claimed 
                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed shadow-none' 
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] shadow-purple-900/30 ring-1 ring-white/10'}`}
                        >
                            <ExternalLink size={18} strokeWidth={2.5} /> 
                            {link.claimed ? 'Erledigt' : 'CLAIM'}
                        </a>
                        
                        <button onClick={() => handleDelete(link.id)} className="h-12 w-12 rounded-xl flex items-center justify-center transition-colors text-slate-500 hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
            ))}
        </div>
        )}

      </main>

      {/* FAB */}
      {view === 'list' && user && (
        <button 
          onClick={() => setView('add')}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xl shadow-purple-600/40 flex items-center justify-center z-20 hover:scale-105 active:scale-90 transition-all border-2 border-white/20 group"
        >
          <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}

      <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
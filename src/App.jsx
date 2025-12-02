import React, { useState, useEffect } from 'react';
import { Trash2, Link as LinkIcon, ExternalLink, Plus, Copy, CheckCircle, ShieldAlert, User, Clock, Settings, MessageSquare } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';

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
  const [inputText, setInputText] = useState(''); // Umbenannt von newLink, da es jetzt Text + Link sein kann
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
        console.error("Auth Fehler Detailliert:", e.code, e.message);
        if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
            setError(
                <div className="flex flex-col gap-1">
                    <strong>⚠️ WICHTIG: Firebase Konfiguration fehlt</strong>
                    <span>Du musst in der Firebase Console "Anonyme Anmeldung" aktivieren.</span>
                </div>
            );
        } else {
            setError(`Verbindungsfehler: ${e.code || e.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        if(u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Daten laden
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const linksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        linksData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setLinks(linksData);
      }, (err) => {
        setError(`Datenbank Fehler: ${err.message}`);
      });
      return () => unsubscribe();
    } catch (e) {
      setError(`Interner Fehler: ${e.message}`);
    }
  }, [user]);

  // --- HILFSFUNKTIONEN (Smart Scanner) ---

  // Diese Funktion findet den Link im Textsalat und gibt Link + Rest-Text zurück
  const extractLinkAndMessage = (rawText) => {
    // Regex sucht nach dem spezifischen Bingo Link mitten im Text
    const urlRegex = /(https:\/\/bingocash\.onelink\.me\/EPHz\/GenericPromoLink\?[^\s]+)/;
    const match = rawText.match(urlRegex);

    if (!match) return { url: null, note: rawText };

    const url = match[0];
    // Wir entfernen den Link aus dem Text, um die "Notiz" zu bekommen (z.B. "Send me Blue Cheese!")
    const note = rawText.replace(url, '').trim(); 
    
    return { url, note };
  };

  const handleAddLink = async () => {
    setError('');
    
    if (!senderName.trim()) {
      setError('Bitte gib deinen Namen an.');
      return;
    }

    // 1. Smart Parsing anwenden
    const { url, note } = extractLinkAndMessage(inputText);

    // 2. Validierung: Haben wir einen gültigen Link gefunden?
    if (!url) {
      setError('Konnte keinen gültigen Bingo Cash Link in deinem Text finden.');
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links'), {
        url: url,          // Der saubere Link für den Button
        note: note,        // Der Begleittext (z.B. "Suche Blue Cheese")
        sender: senderName,
        createdAt: serverTimestamp(),
        clicks: 0
      });
      setInputText('');
      setView('list');
      showSuccess('Link & Info geteilt!');
    } catch (err) {
      console.error(err);
      setError('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Löschen?")) {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bingo_links', id));
            showSuccess('Entfernt.');
        } catch (err) { setError("Fehler beim Löschen."); }
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const copyToClipboard = (text) => {
    document.execCommand('copy');
    navigator.clipboard.writeText(text).catch(() => {});
    showSuccess('Kopiert!');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Gerade eben';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getShortCode = (url) => {
    try {
      const urlObj = new URL(url);
      const sub1 = urlObj.searchParams.get('af_sub1');
      return sub1 ? sub1.substring(0, 6) + '...' : 'Link';
    } catch (e) { return 'Link'; }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20">
      
      <header className="bg-indigo-600 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-white text-indigo-600 p-1 rounded-md text-sm">B</span>
            Bingo Exchange
          </h1>
          <div className="text-xs opacity-80 bg-indigo-700 px-2 py-1 rounded">Friends Only</div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-4 space-y-2">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm shadow-sm">
            <ShieldAlert size={18} className="inline mr-2" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded text-sm shadow-sm">
            <CheckCircle size={18} className="inline mr-2" /> {successMsg}
          </div>
        )}
      </div>

      <main className="max-w-md mx-auto p-4">
        {loading && !user && <div className="text-center py-10 text-slate-500">Lade...</div>}

        {/* EINGABE-ANSICHT */}
        {view === 'add' && user && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6 animate-fade-in-up">
            <h2 className="text-lg font-semibold mb-4 text-slate-700">Teilen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Dein Name</label>
                <div className="relative">
                    <User size={18} className="absolute left-3 top-3 text-slate-400" />
                    <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Wer bist du?" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Text aus Zwischenablage</label>
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Füg hier einfach alles ein: 'Help me get Blue Cheese! https://bingocash...'"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-32 text-sm resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">Wir filtern den Link automatisch heraus.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setView('list')} className="flex-1 py-2 px-4 bg-slate-200 text-slate-700 rounded-lg">Abbrechen</button>
                <button onClick={handleAddLink} className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg shadow-md">Posten</button>
              </div>
            </div>
          </div>
        )}

        {/* LISTEN-ANSICHT */}
        {view === 'list' && (
          <div className="space-y-4">
            {links.length === 0 && !loading && !error && (
              <div className="text-center py-12 text-slate-400">
                <p>Noch keine Links da.</p>
              </div>
            )}
            {links.map((link) => (
              <div key={link.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-full"><User size={14} /></div>
                      <span className="font-semibold text-slate-700">{link.sender}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-400 gap-1"><Clock size={12} /> {formatTime(link.createdAt)}</div>
                  </div>
                  
                  {/* ANZEIGE DES ZUSATZTEXTES (Notiz) */}
                  {link.note && (
                    <div className="bg-yellow-50 text-slate-700 p-2.5 rounded-lg mb-3 text-sm flex gap-2 items-start border border-yellow-100">
                        <MessageSquare size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="italic">"{link.note}"</span>
                    </div>
                  )}
                  
                  {/* TECHNISCHE INFO */}
                  {!link.note && (
                      <div className="bg-slate-50 rounded-lg p-2 mb-3 border border-slate-100 text-xs text-slate-500 font-mono truncate">
                          Code: <span className="text-slate-800 font-bold">{getShortCode(link.url)}</span>
                      </div>
                  )}

                  <div className="flex gap-2">
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-center flex items-center justify-center gap-2 active:bg-indigo-800 shadow-sm">
                      <ExternalLink size={18} /> Öffnen
                    </a>
                    <button onClick={() => handleDelete(link.id)} className="bg-slate-50 text-slate-400 p-2.5 rounded-lg hover:text-red-500">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {view === 'list' && user && (
        <button onClick={() => setView('add')} className="fixed bottom-6 right-6 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center z-20 hover:scale-105 active:scale-95 transition-all">
          <Plus size={28} />
        </button>
      )}

      <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
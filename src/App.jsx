import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  Copy,
  CheckCircle,
  ShieldAlert,
  User,
  Clock,
  Settings,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

// --- FIREBASE KONFIGURATION (LIVE) ---
const firebaseConfig = {
  apiKey: 'AIzaSyDBLpnqJwRIe1PPKYEPdn0gpi0TbjbAbvY',
  authDomain: 'ognib-card.firebaseapp.com',
  projectId: 'ognib-card',
  storageBucket: 'ognib-card.firebasestorage.app',
  messagingSenderId: '612697971698',
  appId: '1:612697971698:web:6f488ab99214a229c0296b',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'bingo_friends_v1';

// --- HAUPTKOMPONENTE ---
export default function BingoExchangeApp() {
  const [user, setUser] = useState(null);
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState('');
  const [senderName, setSenderName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [view, setView] = useState('list'); // 'list' oder 'add'
  const [loading, setLoading] = useState(true);

  // 1. Authentifizierung
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error('Auth Fehler Detailliert:', e.code, e.message);

        // Noch deutlichere Fehlermeldung für den User
        if (
          e.code === 'auth/configuration-not-found' ||
          e.code === 'auth/operation-not-allowed' ||
          e.code === 'auth/admin-restricted-operation'
        ) {
          setError(
            <div className="flex flex-col gap-1">
              <strong>⚠️ WICHTIG: Firebase Konfiguration fehlt</strong>
              <span>
                Du musst in der Firebase Console "Anonyme Anmeldung" aktivieren:
              </span>
              <ol className="list-decimal list-inside mt-1 ml-1 text-xs">
                <li>Gehe zu "Authentication" &gt; "Sign-in method"</li>
                <li>Wähle "Anonym" (Anonymous)</li>
                <li>Stelle den Schalter auf "Aktiviert"</li>
                <li>Klicke Speichern</li>
              </ol>
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
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Daten laden (Realtime Listener)
  useEffect(() => {
    if (!user) return;

    try {
      // FIX: Pfad korrigiert auf 5 Segmente (Ungerade Zahl ist Pflicht für Collections)
      // Struktur: artifacts (coll) -> appId (doc) -> public (coll) -> data (doc) -> bingo_links (coll)
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const linksData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Sortierung Client-seitig (neueste oben)
          linksData.sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          );
          setLinks(linksData);
        },
        (err) => {
          console.error('Datenbank Fehler:', err);
          if (err.code === 'permission-denied') {
            setError('Zugriff verweigert. Prüfe deine Firestore-Regeln.');
          } else {
            setError(`Datenbank Fehler: ${err.message}`);
          }
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('Setup Fehler', e);
      setError(`Interner Fehler: ${e.message}`);
    }
  }, [user]);

  // --- HILFSFUNKTIONEN ---

  const isValidBingoLink = (url) => {
    const regex =
      /^https:\/\/bingocash\.onelink\.me\/EPHz\/GenericPromoLink\?.*af_sub1=[a-zA-Z0-9]+.*$/;
    return regex.test(url);
  };

  const handleAddLink = async () => {
    setError('');

    if (!senderName.trim()) {
      setError('Bitte gib deinen Namen an (für die Freunde).');
      return;
    }

    if (!isValidBingoLink(newLink)) {
      setError(
        'Sicherheits-Warnung: Dies ist kein gültiger Bingo Cash Promo-Link!'
      );
      return;
    }

    try {
      // FIX: Auch hier den korrekten Pfad mit 5 Segmenten nutzen
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'bingo_links'),
        {
          url: newLink,
          sender: senderName,
          createdAt: serverTimestamp(),
          clicks: 0,
        }
      );
      setNewLink('');
      setView('list');
      showSuccess('Link erfolgreich geteilt!');
    } catch (err) {
      console.error(err);
      setError('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Diesen Link wirklich löschen?')) {
      try {
        // FIX: Auch beim Löschen den korrekten Pfad nutzen
        await deleteDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'bingo_links', id)
        );
        showSuccess('Link entfernt.');
      } catch (err) {
        console.error(err);
        setError('Löschen fehlgeschlagen.');
      }
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const copyToClipboard = (text) => {
    document.execCommand('copy');
    navigator.clipboard.writeText(text).catch(() => {});
    showSuccess('Link kopiert!');
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
    } catch (e) {
      return 'Link';
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20">
      {/* HEADER */}
      <header className="bg-indigo-600 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-white text-indigo-600 p-1 rounded-md text-sm">
              B
            </span>
            Bingo Exchange
          </h1>
          <div className="text-xs opacity-80 bg-indigo-700 px-2 py-1 rounded">
            Friends Only
          </div>
        </div>
      </header>

      {/* ERROR / SUCCESS FEEDBACK */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-2">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded flex items-start text-sm shadow-sm animate-pulse">
            <ShieldAlert size={18} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded flex items-center text-sm shadow-sm transition-all">
            <CheckCircle size={18} className="mr-2 flex-shrink-0" />
            {successMsg}
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-md mx-auto p-4">
        {loading && !user && !error ? (
          <div className="text-center py-10 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            Verbinde mit "ognib-card"...
          </div>
        ) : null}

        {/* ADD LINK VIEW */}
        {view === 'add' && user && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6 animate-fade-in-up">
            <h2 className="text-lg font-semibold mb-4 text-slate-700">
              Neuen Link teilen
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">
                  Dein Name
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-3 text-slate-400"
                  />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Wer bist du?"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">
                  Bingo Cash Link
                </label>
                <textarea
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://bingocash.onelink.me/..."
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 text-xs font-mono resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Nur originale onelink.me Links erlaubt.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setView('list')}
                  className="flex-1 py-2 px-4 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddLink}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                >
                  Posten
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="space-y-4">
            {links.length === 0 && !loading && !error ? (
              <div className="text-center py-12 text-slate-400">
                <div className="bg-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <LinkIcon size={32} className="opacity-50" />
                </div>
                <p>Noch keine Links da.</p>
                <p className="text-sm">Sei der Erste!</p>
              </div>
            ) : (
              links.map((link) => (
                <div
                  key={link.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-full">
                          <User size={14} />
                        </div>
                        <span className="font-semibold text-slate-700">
                          {link.sender}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-slate-400 gap-1">
                        <Clock size={12} />
                        {formatTime(link.createdAt)}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-100 flex justify-between items-center">
                      <div className="text-xs text-slate-500 font-mono truncate max-w-[150px]">
                        Code:{' '}
                        <span className="text-slate-800 font-bold">
                          {getShortCode(link.url)}
                        </span>
                      </div>
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Active
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-center flex items-center justify-center gap-2 active:bg-indigo-800 hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        <ExternalLink size={18} />
                        Öffnen / Claim
                      </a>
                      <button
                        onClick={() => copyToClipboard(link.url)}
                        className="bg-slate-100 text-slate-600 p-2.5 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Link kopieren"
                      >
                        <Copy size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="bg-red-50 text-red-400 p-2.5 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* FAB (Floating Action Button) */}
      {view === 'list' && user && (
        <button
          onClick={() => setView('add')}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 z-20"
        >
          <Plus size={28} />
        </button>
      )}

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

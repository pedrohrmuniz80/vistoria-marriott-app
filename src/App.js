import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import {
  Camera,
  Check,
  ArrowLeft,
  Save,
  Droplets,
  Wind,
  Plus,
  Trash2,
  PieChart,
  Loader,
} from "lucide-react";

// --- 1. COLE SUA CONFIGURAÇÃO DO FIREBASE AQUI ---
const firebaseConfig = {
  apiKey: "AIzaSyCSzNZFNol6mlE9izMhflrqBlOkwg1qfMo",
  authDomain: "vistoriahotel.firebaseapp.com",
  projectId: "vistoriahotel",
  storageBucket: "vistoriahotel.firebasestorage.app",
  messagingSenderId: "595674093330",
  appId: "1:595674093330:web:2c560b109fb55fd9dc45cb",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export default function VistoriaApp() {
  // --- ESTADOS ---
  const [step, setStep] = useState("floor");
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [dashTab, setDashTab] = useState("pending"); // Aba do Dashboard

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulário
  const [hasMold, setHasMold] = useState(null);
  const [hasOdor, setHasOdor] = useState(null);
  const [notes, setNotes] = useState("");
  const [photo1, setPhoto1] = useState(null);
  const [photo2, setPhoto2] = useState(null);

  // Mapa do Hotel
  const HOTEL_MAP = useMemo(() => {
    const map = [];
    for (let f = 1; f <= 9; f++) {
      const rooms = f === 9 ? 36 : 35;
      for (let r = 1; r <= rooms; r++) {
        map.push({ floor: f, number: `${f}${r.toString().padStart(2, "0")}` });
      }
    }
    return map;
  }, []);

  // Escutar Banco de Dados
  useEffect(() => {
    const q = query(collection(db, "vistorias"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setInspections(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- EFEITO PARA CARREGAR DADOS NA EDIÇÃO ---
  // Quando abrir o formulário, verifica se já existe vistoria e preenche
  useEffect(() => {
    if (step === "form" && roomNumber) {
      const existing = inspections.find((i) => i.room === roomNumber);
      if (existing) {
        setHasMold(existing.mold);
        setHasOdor(existing.odor);
        setNotes(existing.notes || "");
        setPhoto1(existing.photo1);
        setPhoto2(existing.photo2);
      } else {
        // Se é novo, limpa os campos
        setHasMold(null);
        setHasOdor(null);
        setNotes("");
        setPhoto1(null);
        setPhoto2(null);
      }
    }
  }, [step, roomNumber, inspections]);

  // --- FUNÇÃO DE UPLOAD (STORAGE) ---
  const uploadPhotoToStorage = async (base64Data, fileName) => {
    if (!base64Data || base64Data.startsWith("http")) return base64Data;
    const storageRef = ref(storage, `fotos/${fileName}`);
    await uploadString(storageRef, base64Data, "data_url");
    return await getDownloadURL(storageRef);
  };

  const handleFileChange = (e, setPhotoFunc) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoFunc(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Salvar no Banco
  const handleSave = async () => {
    setSaving(true);
    try {
      const url1 = await uploadPhotoToStorage(
        photo1,
        `${roomNumber}_1_${Date.now()}.jpg`
      );
      const url2 = await uploadPhotoToStorage(
        photo2,
        `${roomNumber}_2_${Date.now()}.jpg`
      );

      const docData = {
        room: roomNumber,
        floor: selectedFloor,
        mold: hasMold,
        odor: hasOdor,
        notes: notes,
        photo1: url1 || null,
        photo2: url2 || null,
        status: "Realizada",
        timestamp: new Date().toISOString(),
      };

      await setDoc(doc(db, "vistorias", roomNumber), docData);
      setStep("success");
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
    setSaving(false);
  };

  // Excluir Vistoria (Resetar)
  const handleDelete = async () => {
    if (
      window.confirm("Tem certeza que deseja apagar a vistoria deste quarto?")
    ) {
      setSaving(true);
      try {
        await deleteDoc(doc(db, "vistorias", roomNumber));
        alert("Vistoria apagada! Quarto voltou para Pendente.");
        setStep("room");
      } catch (error) {
        alert("Erro ao apagar: " + error.message);
      }
      setSaving(false);
    }
  };

  const resetAll = () => {
    setSelectedFloor(null);
    setStep("floor");
  };

  // --- COMPONENTES VISUAIS ---

  const FloorButton = ({ floor }) => {
    const total = floor === 9 ? 36 : 35;
    const done = inspections.filter((i) => i.floor === floor).length;
    const percent = (done / total) * 100;

    return (
      <button
        onClick={() => {
          setSelectedFloor(floor);
          setRoomNumber(`${floor}01`);
          setStep("room");
        }}
        className="relative h-24 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden active:scale-95 transition-all"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-2xl font-bold text-slate-700">{floor}º</span>
          <span className="text-xs text-slate-400 font-semibold mt-1">
            {done}/{total}
          </span>
        </div>
        {/* Barra de Progresso Verde no Fundo */}
        <div
          className="absolute bottom-0 left-0 h-1.5 bg-green-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </button>
    );
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-bold">
        Carregando...
      </div>
    );

  // --- TELAS ---

  // 5. DASHBOARD (STATUS)
  if (step === "dash") {
    const pendingList = HOTEL_MAP.filter(
      (r) => !inspections.find((i) => i.room === r.number)
    );
    const doneList = inspections;

    return (
      <div className="min-h-screen bg-slate-100 font-sans max-w-md mx-auto flex flex-col shadow-xl">
        <div className="bg-red-600 text-white p-4 flex gap-4 items-center">
          <button onClick={() => setStep("floor")}>
            <ArrowLeft />
          </button>
          <h1 className="font-bold text-lg">Relatório</h1>
        </div>

        {/* Abas */}
        <div className="flex bg-white shadow-sm border-b border-slate-200">
          <button
            onClick={() => setDashTab("pending")}
            className={`flex-1 py-4 font-bold text-sm border-b-2 ${
              dashTab === "pending"
                ? "text-blue-600 border-blue-600"
                : "text-slate-400 border-transparent"
            }`}
          >
            Pendentes ({pendingList.length})
          </button>
          <button
            onClick={() => setDashTab("done")}
            className={`flex-1 py-4 font-bold text-sm border-b-2 ${
              dashTab === "done"
                ? "text-green-600 border-green-600"
                : "text-slate-400 border-transparent"
            }`}
          >
            Realizados ({doneList.length})
          </button>
        </div>

        {/* Lista Clicável para Edição */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {(dashTab === "pending" ? pendingList : doneList).map((item, i) => (
            <div
              key={i}
              onClick={() => {
                // Clicar em qualquer item leva para a edição
                setSelectedFloor(item.floor);
                setRoomNumber(item.room || item.number);
                setStep("form");
              }}
              className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm cursor-pointer hover:bg-slate-50 active:scale-95 transition-all"
            >
              <span className="font-bold text-slate-700 text-lg">
                Quarto {item.room || item.number}
              </span>
              {dashTab === "done" ? (
                <div className="flex gap-1">
                  {item.mold && (
                    <span className="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded font-bold">
                      MOFO
                    </span>
                  )}
                  {item.odor && (
                    <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-1 rounded font-bold">
                      ODOR
                    </span>
                  )}
                  {!item.mold && !item.odor && (
                    <span className="bg-green-100 text-green-600 text-[10px] px-2 py-1 rounded font-bold">
                      OK
                    </span>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                  <ArrowLeft className="rotate-180" size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 1. HOME
  if (step === "floor") {
    const totalDone = inspections.length;
    return (
      <div className="min-h-screen bg-slate-100 font-sans max-w-md mx-auto shadow-xl">
        <div className="bg-red-600 text-white p-6 pb-12 rounded-b-[30px] shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-bold">Vistoria Marriott</h1>
            <button
              onClick={() => setStep("dash")}
              className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-all hover:bg-white/30"
            >
              <PieChart size={14} /> Status
            </button>
          </div>
        </div>
        <div className="mx-4 -mt-8 bg-white rounded-2xl shadow-md p-4 mb-6 relative z-10">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Progresso
            </span>
            <span className="text-xl font-bold text-slate-800">
              {totalDone} / 316
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(totalDone / 316) * 100}%` }}
            />
          </div>
        </div>

        {/* Texto adicionado conforme solicitado */}
        <h2 className="text-sm font-bold text-slate-500 mb-3 ml-5">
          Selecione o Andar:
        </h2>

        <div className="px-4 pb-8 grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => (
            <FloorButton key={f} floor={f} />
          ))}
        </div>
      </div>
    );
  }

  // 2. IDENTIFICAÇÃO
  if (step === "room") {
    const exists = inspections.find((i) => i.room === roomNumber);
    return (
      <div className="min-h-screen bg-slate-100 font-sans max-w-md mx-auto flex flex-col">
        <div className="bg-red-600 text-white p-4 flex items-center gap-4">
          <button onClick={() => setStep("floor")}>
            <ArrowLeft />
          </button>
          <h1 className="font-bold">Identificação</h1>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center">
          <div className="text-center mb-2 text-xs font-bold text-slate-400">
            NÚMERO
          </div>
          <input
            type="number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="text-4xl font-bold text-center p-6 rounded-2xl border-2 border-slate-200 w-full mb-4 outline-none focus:border-blue-500"
          />
          <div className="flex justify-center mb-8">
            {exists ? (
              <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-xs font-bold">
                ⚠️ Já Realizada
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-500 px-4 py-1 rounded-full text-xs font-bold">
                Pendente
              </span>
            )}
          </div>
          <button
            onClick={() => setStep("form")}
            className="bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            {exists ? "EDITAR" : "INICIAR"}
          </button>
        </div>
      </div>
    );
  }

  // 3. FORMULÁRIO
  if (step === "form") {
    const isExisting = inspections.some((i) => i.room === roomNumber);

    return (
      <div className="min-h-screen bg-[#F1F5F9] font-sans max-w-md mx-auto flex flex-col">
        <div className="bg-red-600 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setStep("room")}>
              <ArrowLeft />
            </button>
            <h1 className="font-bold">Quarto {roomNumber}</h1>
          </div>
          {isExisting && (
            <button
              onClick={handleDelete}
              className="bg-white/20 p-2 rounded-lg text-white hover:bg-red-700 transition-all"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mofo */}
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-700 mb-3 flex gap-2 items-center">
              <Droplets size={18} className="text-blue-500" /> Mofo?
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setHasMold(true)}
                className={`flex-1 py-4 rounded-xl font-bold border-2 ${
                  hasMold === true
                    ? "bg-red-500 text-white border-red-500"
                    : "border-slate-100"
                }`}
              >
                SIM
              </button>
              <button
                onClick={() => setHasMold(false)}
                className={`flex-1 py-4 rounded-xl font-bold border-2 ${
                  hasMold === false
                    ? "bg-green-500 text-white border-green-500"
                    : "border-slate-100"
                }`}
              >
                NÃO
              </button>
            </div>
          </div>
          {/* Odor */}
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-700 mb-3 flex gap-2 items-center">
              <Wind size={18} className="text-purple-500" /> Odor?
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setHasOdor(true)}
                className={`flex-1 py-4 rounded-xl font-bold border-2 ${
                  hasOdor === true
                    ? "bg-red-500 text-white border-red-500"
                    : "border-slate-100"
                }`}
              >
                SIM
              </button>
              <button
                onClick={() => setHasOdor(false)}
                className={`flex-1 py-4 rounded-xl font-bold border-2 ${
                  hasOdor === false
                    ? "bg-green-500 text-white border-green-500"
                    : "border-slate-100"
                }`}
              >
                NÃO
              </button>
            </div>
          </div>
          {/* Fotos */}
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-700 mb-3 flex gap-2 items-center">
              <Camera size={18} /> Fotos
            </h3>
            <div className="flex gap-3">
              {[
                { img: photo1, set: setPhoto1 },
                { img: photo2, set: setPhoto2 },
              ].map((p, i) => (
                <div
                  key={i}
                  className="relative w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center"
                >
                  {p.img ? (
                    <>
                      <img src={p.img} className="w-full h-full object-cover" />
                      <button
                        onClick={() => p.set(null)}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center text-slate-400 cursor-pointer">
                      <Plus />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, p.set)}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          <textarea
            placeholder="Observações..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 h-24 resize-none"
          />
        </div>
        <div className="p-4 bg-white border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center gap-2"
          >
            {saving ? (
              <Loader className="animate-spin" />
            ) : (
              <>
                <Save size={20} /> SALVAR
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 4. SUCESSO
  if (step === "success") {
    return (
      <div className="min-h-screen bg-green-500 font-sans max-w-md mx-auto flex flex-col items-center justify-center text-white p-8">
        <div className="bg-white/20 p-6 rounded-full mb-6 animate-bounce">
          <Check size={64} />
        </div>
        <h2 className="text-3xl font-bold mb-8">Salvo!</h2>
        <button
          onClick={() => {
            setStep("room");
            setRoomNumber("");
          }}
          className="w-full bg-white text-green-600 font-bold py-4 rounded-xl shadow-lg mb-4"
        >
          Próximo
        </button>
        <button onClick={resetAll} className="text-white/80 font-bold text-sm">
          Início
        </button>
      </div>
    );
  }
  return null;
}

import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userPhotoBorder = document.getElementById('user-photo-border');
const userNameSpan = document.getElementById('user-name');
const userPhotoImg = document.getElementById('user-photo');
const adminLink = document.getElementById('admin-link');
const profileLink = document.getElementById('profile-link');
const welcomeMessage = document.getElementById('welcome-message');
const mainMenu = document.getElementById('main-menu');
const difficultySelection = document.getElementById('difficulty-selection');
const initialScreen = document.getElementById('initial-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const progressBar = document.getElementById('quiz-progress-bar');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedback = document.getElementById('feedback');
const reference = document.getElementById('reference');
const nextBtn = document.getElementById('next-btn');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const groupsList = document.getElementById('groups-list');
const createGroupBtn = document.getElementById('create-group-btn');
const createGroupModal = document.getElementById('create-group-modal');
const groupNameInput = document.getElementById('group-name-input');
const groupDifficultySelect = document.getElementById('group-difficulty-select');
const saveGroupBtn = document.getElementById('save-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');
const groupPlayNotification = document.getElementById('group-play-notification');
const groupPlayName = document.getElementById('group-play-name');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const rankingCard = document.getElementById('ranking-card');
const dobModal = document.getElementById('dob-modal');
const dobInput = document.getElementById('dob-input');
const saveDobBtn = document.getElementById('save-dob-btn');
const bibleCard = document.getElementById('bible-card');
const bibleModal = document.getElementById('bible-modal');
const closeBibleBtn = document.getElementById('close-bible-btn');
const bibleBookSelect = document.getElementById('bible-book-select');
const bibleChapterSelect = document.getElementById('bible-chapter-select');
const loadChapterBtn = document.getElementById('load-chapter-btn');
const bibleTextDisplay = document.getElementById('bible-text-display');
const competitionCard = document.getElementById('competition-card');
const competitionLobbyModal = document.getElementById('competition-lobby-modal');
const closeLobbyBtn = document.getElementById('close-lobby-btn');
const showCreateCompetitionBtn = document.getElementById('show-create-competition-btn');
const joinCodeInput = document.getElementById('join-code-input');
const joinCompetitionBtn = document.getElementById('join-competition-btn');
const createCompetitionModal = document.getElementById('create-competition-modal');
const competitionDifficultySelect = document.getElementById('competition-difficulty-select');
const competitionQuestionsSelect = document.getElementById('competition-questions-select');
const createCompetitionBtn = document.getElementById('create-competition-btn');
const cancelCreateCompetitionBtn = document.getElementById('cancel-create-competition-btn');
const teamSelectionModal = document.getElementById('team-selection-modal');
const joinBlueBtn = document.getElementById('join-blue-btn');
const joinYellowBtn = document.getElementById('join-yellow-btn');
const waitingRoomModal = document.getElementById('waiting-room-modal');
const inviteCodeDisplay = document.getElementById('invite-code-display');
const blueTeamList = document.getElementById('blue-team-list');
const yellowTeamList = document.getElementById('yellow-team-list');
const startCompetitionBtn = document.getElementById('start-competition-btn');
const leaveWaitingRoomBtn = document.getElementById('leave-waiting-room-btn');
const competitionChatMessages = document.getElementById('competition-chat-messages');
const competitionChatForm = document.getElementById('competition-chat-form');
const competitionChatInput = document.getElementById('competition-chat-input');
const closeWaitingRoomBtn = document.getElementById('close-waiting-room-btn');

// --- Estado do Quiz e Usuário ---
let currentUser = null;
let currentUserAgeGroup = "adulto";
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let currentGroupId = null;
let quizAtualDifficulty = 'facil';
let activeCompetitionId = null;
let competitionIdToJoin = null;
let unsubscribeCompetition = null;
let unsubscribeCompetitionChat = null;
const MIN_PARTICIPANTS = 2;

// --- Dados da Bíblia ---
const bibleBooks = { "Gênesis": 50, "Êxodo": 40, "Levítico": 27, "Números": 36, "Deuteronômio": 34, "Josué": 24, "Juízes": 21, "Rute": 4, "1 Samuel": 31, "2 Samuel": 24, "1 Reis": 22, "2 Reis": 25, "1 Crônicas": 29, "2 Crônicas": 36, "Esdras": 10, "Neemias": 13, "Ester": 10, "Jó": 42, "Salmos": 150, "Provérbios": 31, "Eclesiastes": 12, "Cantares": 8, "Isaías": 66, "Jeremias": 52, "Lamentações": 5, "Ezequiel": 48, "Daniel": 12, "Oseias": 14, "Joel": 3, "Amós": 9, "Obadias": 1, "Jonas": 4, "Miqueias": 7, "Naum": 3, "Habacuque": 3, "Sofonias": 3, "Ageu": 2, "Zacarias": 14, "Malaquias": 4, "Mateus": 28, "Marcos": 16, "Lucas": 24, "João": 21, "Atos": 28, "Romanos": 16, "1 Coríntios": 16, "2 Coríntios": 13, "Gálatas": 6, "Efésios": 6, "Filipenses": 4, "Colossenses": 4, "1 Tessalonicenses": 5, "2 Tessalonicenses": 3, "1 Timóteo": 6, "2 Timóteo": 4, "Tito": 3, "Filemom": 1, "Hebreus": 13, "Tiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 João": 5, "2 João": 1, "3 João": 1, "Judas": 1, "Apocalipse": 22 };

// --- Lógica Principal (event listeners, etc.) ---

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromUrl = urlParams.get('groupId');
    const difficultyFromUrl = urlParams.get('difficulty');
    if (groupIdFromUrl) {
        sessionStorage.setItem('currentGroupId', groupIdFromUrl);
        if (difficultyFromUrl) sessionStorage.setItem('currentGroupDifficulty', difficultyFromUrl);
    }
    if (window.history.replaceState) {
        const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
    populateBookSelect();
});

const provider = new GoogleAuthProvider();
loginBtn.addEventListener('click', () => signInWithPopup(auth, provider).catch(console.error));
logoutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(auth).catch(console.error); });

onAuthStateChanged(auth, async (user) => {
    document.body.classList.remove('tema-crianca');
    if (userPhotoBorder) userPhotoBorder.className = 'profile-photo-container';
    if (user) {
        currentUser = user;
        loginBtn.classList.add('hidden');
        userInfoDiv.classList.remove('hidden');
        userNameSpan.textContent = user.displayName || "Jogador";
        userPhotoImg.src = user.photoURL || `https://placehold.co/45x45/e0e0e0/33A?text=${user.displayName?.[0] || '?'}`;
        profileLink.href = `perfil.html?uid=${user.uid}`;
        profileLink.classList.remove('hidden');
        
        const userDoc = await saveUserToFirestore(user);
        await checkAdminStatus(user.uid);
        
        const userData = userDoc.data();
        if (userData.bordaEquipada) userPhotoBorder.classList.add(userData.bordaEquipada);
        if (userData.dataDeNascimento) {
            currentUserAgeGroup = getAgeGroup(userData.dataDeNascimento);
            if (currentUserAgeGroup === "crianca") document.body.classList.add('tema-crianca');
        } else {
            dobModal.classList.add('visible');
        }

        const groupIdFromSession = sessionStorage.getItem('currentGroupId');
        if (groupIdFromSession) {
            await updateUiforGroupMode();
            startQuiz(sessionStorage.getItem('currentGroupDifficulty'));
        } else {
            mainMenu.classList.remove('hidden');
            welcomeMessage.classList.add('hidden');
            await loadUserGroups(user.uid);
        }
    } else {
        currentUser = null;
        loginBtn.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        mainMenu.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
        adminLink.classList.add('hidden');
        profileLink.classList.add('hidden');
    }
});

// --- Funções (Firestore, UI, Lógica do Quiz) ---

async function saveUserToFirestore(user) {
    const userRef = doc(db, 'usuarios', user.uid);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                nome: user.displayName || "Jogador Anônimo",
                email: user.email || "",
                fotoURL: user.photoURL || "https://placehold.co/150x150/e0e0e0/333?text=?",
                admin: false,
                bio: "Novo no Quiz Bíblico!",
                dataDeNascimento: null,
                showInRanking: true,
                stats: { pontuacaoTotal: 0, quizzesJogadosTotal: 0, respostasCertasTotal: 0, respostasErradasTotal: 0 },
                conquistas: [],
                bordasDesbloqueadas: ["default", "simples_azul", "simples_verde", "simples_roxo"],
                bordaEquipada: "default"
            });
        } else {
            const updateData = {};
            if (user.displayName) updateData.nome = user.displayName;
            if (user.photoURL) updateData.fotoURL = user.photoURL;
            if (Object.keys(updateData).length > 0) {
                await setDoc(userRef, updateData, { merge: true });
            }
        }
        return await getDoc(userRef);
    } catch (error) {
        console.error("Erro ao salvar usuário no Firestore:", error);
    }
}

// ... Colar aqui as outras funções que não mudaram (como startQuiz, displayQuestion, showResults, etc.) ...
// ... O código é muito longo, então vou adicionar apenas a lógica da competição que foi alterada/adicionada ...

// --- Lógica da Competição (MODIFICADA E COMPLETA) ---

if (competitionCard) competitionCard.addEventListener('click', () => competitionLobbyModal.classList.add('visible'));
if (closeLobbyBtn) closeLobbyBtn.addEventListener('click', () => competitionLobbyModal.classList.remove('visible'));
if (showCreateCompetitionBtn) showCreateCompetitionBtn.addEventListener('click', () => createCompetitionModal.classList.add('visible'));
if (cancelCreateCompetitionBtn) cancelCreateCompetitionBtn.addEventListener('click', () => createCompetitionModal.classList.remove('visible'));

createCompetitionBtn.addEventListener('click', async () => {
    if (!currentUser) return alert("Você precisa estar logado.");
    
    const difficulty = competitionDifficultySelect.value;
    const numQuestions = parseInt(competitionQuestionsSelect.value);
    
    createCompetitionBtn.disabled = true;
    createCompetitionBtn.textContent = "Verificando...";

    try {
        const inviteCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        
        const primaryQuery = query(collection(db, "perguntas"), where("nivel", "==", difficulty), where("faixaEtaria", "array-contains", currentUserAgeGroup));
        const primarySnapshot = await getDocs(primaryQuery);
        let allAvailableQuestions = primarySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (allAvailableQuestions.length < numQuestions) {
            const fallbackQuery = query(collection(db, "perguntas"), where("nivel", "==", difficulty));
            const fallbackSnapshot = await getDocs(fallbackQuery);
            fallbackSnapshot.forEach(doc => {
                if (!allAvailableQuestions.find(q => q.id === doc.id)) {
                    allAvailableQuestions.push({ id: doc.id, ...doc.data() });
                }
            });
        }

        if (allAvailableQuestions.length < numQuestions) {
            throw new Error(`Não há perguntas suficientes. Encontradas: ${allAvailableQuestions.length}, Necessárias: ${numQuestions}.`);
        }

        const competitionQuestions = allAvailableQuestions.sort(() => 0.5 - Math.random()).slice(0, numQuestions);

        const creatorParticipant = {
            nome: currentUser.displayName,
            fotoURL: currentUser.photoURL,
            pontuacao: 0,
            respostas: [],
            team: 'azul'
        };

        const competitionRef = await addDoc(collection(db, "competicoes"), {
            codigoConvite: inviteCode,
            criadorUid: currentUser.uid,
            estado: "aguardando",
            dificuldade: difficulty,
            numPerguntas: numQuestions,
            perguntas: competitionQuestions,
            participantes: { [currentUser.uid]: creatorParticipant },
            dataCriacao: serverTimestamp()
        });
        
        activeCompetitionId = competitionRef.id;
        createCompetitionModal.classList.remove('visible');
        competitionLobbyModal.classList.remove('visible');
        showWaitingRoom(true);

    } catch (error) {
        console.error("Erro ao criar competição:", error);
        alert(error.message);
    } finally {
        createCompetitionBtn.disabled = false;
        createCompetitionBtn.textContent = "Criar Sala";
    }
});

joinCompetitionBtn.addEventListener('click', async () => {
    if (!currentUser) return alert("Você precisa estar logado.");
    const code = joinCodeInput.value.trim().toUpperCase();
    if (code.length < 5) return alert("Código inválido.");

    joinCompetitionBtn.disabled = true;
    joinCompetitionBtn.textContent = "...";

    try {
        const q = query(collection(db, "competicoes"), where("codigoConvite", "==", code), where("estado", "==", "aguardando"));
        const competitionSnapshot = await getDocs(q);

        if (competitionSnapshot.empty) throw new Error("Sala não encontrada ou já iniciada.");
        
        competitionIdToJoin = competitionSnapshot.docs[0].id;
        competitionLobbyModal.classList.remove('visible');
        teamSelectionModal.classList.add('visible');

    } catch (error) {
        console.error("Erro ao procurar sala:", error);
        alert(error.message);
    } finally {
        joinCompetitionBtn.disabled = false;
        joinCompetitionBtn.textContent = "Entrar";
    }
});

joinBlueBtn.addEventListener('click', () => joinCompetitionWithTeam('azul'));
joinYellowBtn.addEventListener('click', () => joinCompetitionWithTeam('amarelo'));

async function joinCompetitionWithTeam(team) {
    if (!currentUser || !competitionIdToJoin) return;

    teamSelectionModal.classList.remove('visible');
    const competitionRef = doc(db, 'competicoes', competitionIdToJoin);
    
    try {
        await updateDoc(competitionRef, {
            [`participantes.${currentUser.uid}`]: {
                nome: currentUser.displayName,
                fotoURL: currentUser.photoURL,
                pontuacao: 0,
                respostas: [],
                team: team
            }
        });
        activeCompetitionId = competitionIdToJoin;
        competitionIdToJoin = null;
        showWaitingRoom(false);
    } catch(error) {
        console.error(`Erro ao entrar na equipe ${team}:`, error);
        alert("Não foi possível entrar na sala.");
    }
}

function showWaitingRoom(isCreator) {
    waitingRoomModal.classList.add('visible');
    startCompetitionBtn.classList.toggle('hidden', !isCreator);

    if (unsubscribeCompetition) unsubscribeCompetition();
    loadCompetitionChatMessages(activeCompetitionId);

    unsubscribeCompetition = onSnapshot(doc(db, 'competicoes', activeCompetitionId), (doc) => {
        if (!doc.exists()) {
            alert("A sala foi fechada pelo criador.");
            leaveWaitingRoom();
            return;
        }

        const data = doc.data();
        inviteCodeDisplay.textContent = data.codigoConvite;
        
        blueTeamList.innerHTML = '';
        yellowTeamList.innerHTML = '';

        Object.values(data.participantes).forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.nome;
            if (player.team === 'azul') blueTeamList.appendChild(li);
            else if (player.team === 'amarelo') yellowTeamList.appendChild(li);
        });

        if (data.estado === 'em_andamento') {
            if (unsubscribeCompetition) unsubscribeCompetition();
            if (unsubscribeCompetitionChat) unsubscribeCompetitionChat();
            startCompetitionQuiz(data.perguntas);
        }
    });
}

startCompetitionBtn.addEventListener('click', async () => {
    if (!activeCompetitionId) return;

    const competitionRef = doc(db, 'competicoes', activeCompetitionId);
    const competitionDoc = await getDoc(competitionRef);
    if(competitionDoc.exists()){
        const participantsCount = Object.keys(competitionDoc.data().participantes).length;
        if (participantsCount < MIN_PARTICIPANTS) {
            return alert(`São necessários no mínimo ${MIN_PARTICIPANTS} jogadores para iniciar.`);
        }
    }
    
    await updateDoc(competitionRef, { estado: 'em_andamento' });
});

leaveWaitingRoomBtn.addEventListener('click', leaveWaitingRoom);
closeWaitingRoomBtn.addEventListener('click', leaveWaitingRoom);

async function leaveWaitingRoom() {
    if (unsubscribeCompetition) unsubscribeCompetition();
    if (unsubscribeCompetitionChat) unsubscribeCompetitionChat();
    
    activeCompetitionId = null;
    waitingRoomModal.classList.remove('visible');
}

function loadCompetitionChatMessages(compId) {
    if (unsubscribeCompetitionChat) unsubscribeCompetitionChat();
    const messagesRef = collection(db, 'competicoes', compId, 'mensagens');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
    unsubscribeCompetitionChat = onSnapshot(q, (snapshot) => {
        competitionChatMessages.innerHTML = '';
        const messages = snapshot.docs.reverse();
        messages.forEach((doc) => {
            const msg = doc.data();
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message');
            const isMyMessage = currentUser && msg.senderUid === currentUser.uid;
            if (isMyMessage) messageElement.classList.add('my-message');
            messageElement.innerHTML = `<div class="message-sender">${isMyMessage ? 'Eu' : msg.senderName}</div><div class="message-bubble">${msg.text}</div>`;
            competitionChatMessages.appendChild(messageElement);
        });
        competitionChatMessages.scrollTop = competitionChatMessages.scrollHeight;
    });
}

competitionChatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = competitionChatInput.value.trim();
    if (messageText.length === 0 || !currentUser || !activeCompetitionId) return;
    competitionChatInput.disabled = true;
    try {
        const messagesRef = collection(db, 'competicoes', activeCompetitionId, 'mensagens');
        await addDoc(messagesRef, {
            text: messageText,
            senderUid: currentUser.uid,
            senderName: currentUser.displayName,
            timestamp: serverTimestamp()
        });
        competitionChatInput.value = '';
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
    } finally {
        competitionChatInput.disabled = false;
        competitionChatInput.focus();
    }
});

function startCompetitionQuiz(competitionQuestions) {
    score = 0;
    correctAnswersCount = 0;
    currentQuestionIndex = 0;
    questions = competitionQuestions;
    if (nextBtn) nextBtn.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (questions.length > 0) {
        switchScreen('quiz-screen');
        displayQuestion();
    } else {
        alert("Erro: Nenhuma pergunta foi carregada para a competição.");
        switchScreen('initial-screen');
    }
}

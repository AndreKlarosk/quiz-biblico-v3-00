import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
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
const groupsContainer = document.getElementById('groups-container');
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
const rankingModal = document.getElementById('ranking-modal');
const rankingTbody = document.getElementById('ranking-tbody');
const closeRankingBtn = document.getElementById('close-ranking-btn');
const leaveQuizBtn = document.getElementById('leave-quiz-btn');
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

// --- Estado do Quiz e Usuário ---
let currentUser = null;
let currentUserAgeGroup = "adulto"; // Padrão
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let currentGroupId = null;

// --- Dados da Bíblia ---
const bibleBooks = {
    "Gênesis": 50, "Êxodo": 40, "Levítico": 27, "Números": 36, "Deuteronômio": 34, "Josué": 24, "Juízes": 21, "Rute": 4, "1 Samuel": 31, "2 Samuel": 24, "1 Reis": 22, "2 Reis": 25, "1 Crônicas": 29, "2 Crônicas": 36, "Esdras": 10, "Neemias": 13, "Ester": 10, "Jó": 42, "Salmos": 150, "Provérbios": 31, "Eclesiastes": 12, "Cantares": 8, "Isaías": 66, "Jeremias": 52, "Lamentações": 5, "Ezequiel": 48, "Daniel": 12, "Oseias": 14, "Joel": 3, "Amós": 9, "Obadias": 1, "Jonas": 4, "Miqueias": 7, "Naum": 3, "Habacuque": 3, "Sofonias": 3, "Ageu": 2, "Zacarias": 14, "Malaquias": 4, "Mateus": 28, "Marcos": 16, "Lucas": 24, "João": 21, "Atos": 28, "Romanos": 16, "1 Coríntios": 16, "2 Coríntios": 13, "Gálatas": 6, "Efésios": 6, "Filipenses": 4, "Colossenses": 4, "1 Tessalonicenses": 5, "2 Tessalonicenses": 3, "1 Timóteo": 6, "2 Timóteo": 4, "Tito": 3, "Filemom": 1, "Hebreus": 13, "Tiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 João": 5, "2 João": 1, "3 João": 1, "Judas": 1, "Apocalipse": 22
};

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromUrl = urlParams.get('groupId');
    const difficultyFromUrl = urlParams.get('difficulty');
    if (groupIdFromUrl) {
        sessionStorage.setItem('currentGroupId', groupIdFromUrl);
        if (difficultyFromUrl) {
            sessionStorage.setItem('currentGroupDifficulty', difficultyFromUrl);
        }
    }
    if (window.history.replaceState) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }
    populateBookSelect();
});

// --- Funções ---
function getAgeGroup(birthDateString) {
    if (!birthDateString) return "adulto";
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    if (age >= 6 && age <= 10) return "crianca";
    if (age >= 11 && age <= 16) return "adolescente";
    return "adulto";
}

function switchScreen(newScreenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        if (screen && !screen.classList.contains('hidden')) {
            screen.classList.add('hidden');
        }
    });
    const screenToShow = document.getElementById(newScreenId);
    if (screenToShow) {
        screenToShow.classList.remove('hidden');
    }
}

async function updateUiforGroupMode() {
    const groupId = sessionStorage.getItem('currentGroupId');
    if (groupPlayNotification && groupPlayName) {
        if (groupId) {
            try {
                const groupRef = doc(db, 'grupos', groupId);
                const groupDoc = await getDoc(groupRef);
                if (groupDoc.exists()) {
                    groupPlayName.textContent = groupDoc.data().nomeDoGrupo;
                    groupPlayNotification.classList.remove('hidden');
                }
            } catch (error) {
                console.error("Erro ao buscar nome do grupo:", error);
                groupPlayNotification.classList.add('hidden');
            }
        } else {
            groupPlayNotification.classList.add('hidden');
        }
    }
}

const provider = new GoogleAuthProvider();
if (loginBtn) loginBtn.addEventListener('click', () => signInWithPopup(auth, provider).catch(console.error));
if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(auth).catch(console.error); });

onAuthStateChanged(auth, async (user) => {
    document.body.classList.remove('tema-crianca');
    if (user) {
        currentUser = user;
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userInfoDiv) userInfoDiv.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (userNameSpan) userNameSpan.textContent = user.displayName || "Jogador";
        if (userPhotoImg) userPhotoImg.src = user.photoURL || "https://placehold.co/45x45/e0e0e0/333?text=?";
        if (profileLink) {
            profileLink.href = `perfil.html?uid=${user.uid}`;
            profileLink.classList.remove('hidden');
        }
        
        const userDoc = await saveUserToFirestore(user);
        await checkAdminStatus(user.uid);

        if (userDoc.exists() && userDoc.data().dataDeNascimento) {
            const birthDate = userDoc.data().dataDeNascimento;
            currentUserAgeGroup = getAgeGroup(birthDate);
            if (currentUserAgeGroup === "crianca") {
                document.body.classList.add('tema-crianca');
            }
        } else {
            if(dobModal) dobModal.classList.add('visible');
        }

        const groupIdFromSession = sessionStorage.getItem('currentGroupId');
        const groupDifficultyFromSession = sessionStorage.getItem('currentGroupDifficulty');
        if (groupIdFromSession && groupDifficultyFromSession) {
            await updateUiforGroupMode();
            startQuiz(groupDifficultyFromSession);
        } else {
            if (mainMenu) mainMenu.classList.remove('hidden');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
            await loadUserGroups(user.uid);
        }
    } else {
        currentUser = null;
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userInfoDiv) userInfoDiv.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (mainMenu) mainMenu.classList.add('hidden');
        if (welcomeMessage) welcomeMessage.classList.remove('hidden');
        if (adminLink) adminLink.classList.add('hidden');
        if (profileLink) profileLink.classList.add('hidden');
    }
});

async function saveUserToFirestore(user) {
    const userRef = doc(db, 'usuarios', user.uid);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                nome: user.displayName || "Jogador Anônimo",
                email: user.email,
                fotoURL: user.photoURL || "https://placehold.co/150x150/e0e0e0/333?text=?",
                admin: false,
                bio: "Novo no Quiz Bíblico!",
                dataDeNascimento: null,
                showInRanking: true,
                stats: { pontuacaoTotal: 0, quizzesJogados: 0, respostasCertas: 0, respostasErradas: 0 },
                conquistas: []
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

async function checkAdminStatus(uid) {
    if (!adminLink) return;
    const userRef = doc(db, 'usuarios', uid);
    const userDoc = await getDoc(userRef);
    adminLink.classList.toggle('hidden', !(userDoc.exists() && userDoc.data().admin === true));
}

if(saveDobBtn) {
    saveDobBtn.addEventListener('click', async () => {
        const dobValue = dobInput.value;
        if (!dobValue) {
            alert("Por favor, selecione sua data de nascimento.");
            return;
        }
        if (currentUser) {
            try {
                const userRef = doc(db, 'usuarios', currentUser.uid);
                await updateDoc(userRef, { dataDeNascimento: dobValue });
                currentUserAgeGroup = getAgeGroup(dobValue);
                if (currentUserAgeGroup === 'crianca') {
                    document.body.classList.add('tema-crianca');
                } else {
                    document.body.classList.remove('tema-crianca');
                }
                if(dobModal) dobModal.classList.remove('visible');
            } catch (error) {
                console.error("Erro ao salvar data de nascimento: ", error);
                alert("Não foi possível salvar a data. Tente novamente.");
            }
        }
    });
}

async function loadUserGroups(uid) {
    if (!groupsList) return;
    groupsList.innerHTML = '<p>A carregar...</p>';
    const q = query(collection(db, "grupos"), where("memberUIDs", "array-contains", uid));
    try {
        const querySnapshot = await getDocs(q);
        groupsList.innerHTML = '';
        if (querySnapshot.empty) {
            groupsList.innerHTML = '<p>Ainda não participa de nenhum grupo.</p>';
        }
        querySnapshot.forEach((doc) => {
            const group = doc.data();
            const groupElement = document.createElement('a');
            groupElement.href = `grupo.html?id=${doc.id}`;
            groupElement.className = 'group-item';
            groupElement.innerHTML = `<span><i class="${group.groupIcon || 'fas fa-users'}"></i> ${group.nomeDoGrupo}</span><span class="member-count">${group.memberUIDs.length} membros</span>`;
            groupsList.appendChild(groupElement);
        });
    } catch (error) {
        console.error("Erro ao carregar grupos:", error);
        groupsList.innerHTML = '<p>Não foi possível carregar os grupos.</p>';
    }
}
if (createGroupBtn) createGroupBtn.addEventListener('click', () => createGroupModal.classList.add('visible'));
if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => createGroupModal.classList.remove('visible'));
if (saveGroupBtn) saveGroupBtn.addEventListener('click', async () => {
    if (!groupNameInput || !groupDifficultySelect) return;
    const groupName = groupNameInput.value.trim();
    const groupDifficulty = groupDifficultySelect.value;
    if (groupName.length < 3) {
        alert("O nome do grupo deve ter pelo menos 3 caracteres.");
        return;
    }
    if (!currentUser) {
        alert("Precisa de estar logado para criar um grupo.");
        return;
    }
    saveGroupBtn.disabled = true;
    saveGroupBtn.textContent = 'A criar...';
    try {
        const newGroup = {
            nomeDoGrupo: groupName,
            difficulty: groupDifficulty,
            criadorUid: currentUser.uid,
            criadorNome: currentUser.displayName,
            dataCriacao: serverTimestamp(),
            groupIcon: 'fas fa-book-bible',
            memberUIDs: [currentUser.uid],
            membros: {
                [currentUser.uid]: {
                    uid: currentUser.uid,
                    nome: currentUser.displayName,
                    fotoURL: currentUser.photoURL,
                    pontuacaoNoGrupo: 0
                }
            }
        };
        await addDoc(collection(db, "grupos"), newGroup);
        alert(`Grupo "${groupName}" criado com sucesso!`);
        groupNameInput.value = '';
        createGroupModal.classList.remove('visible');
        await loadUserGroups(currentUser.uid);
    } catch (error) {
        console.error("Erro ao criar grupo:", error);
        alert("Não foi possível criar o grupo.");
    } finally {
        saveGroupBtn.disabled = false;
        saveGroupBtn.textContent = 'Criar';
    }
});
if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentGroupId');
    sessionStorage.removeItem('currentGroupDifficulty');
    updateUiforGroupMode();
});

if (rankingCard) rankingCard.addEventListener('click', async () => {
    if (rankingModal) rankingModal.classList.add('visible');
    await loadGeneralRanking();
});
if (closeRankingBtn) closeRankingBtn.addEventListener('click', () => {
    if (rankingModal) rankingModal.classList.remove('visible');
});
async function loadGeneralRanking() {
    if (!rankingTbody) return;
    rankingTbody.innerHTML = '<tr><td colspan="3">A carregar ranking...</td></tr>';
    try {
        const q = query(
            collection(db, "usuarios"), 
            where("showInRanking", "==", true),
            orderBy("stats.pontuacaoTotal", "desc"), 
            limit(100)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            rankingTbody.innerHTML = '<tr><td colspan="3">Nenhum jogador no ranking ainda.</td></tr>';
            return;
        }
        rankingTbody.innerHTML = '';
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `<td class="rank rank-${rank}">${rank}</td><td class="member-info"><a href="perfil.html?uid=${user.uid}" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 15px;"><img src="${user.fotoURL || 'https://placehold.co/40x40'}" alt="Foto de ${user.nome}"><span>${user.nome}</span></a></td><td class="score">${user.stats.pontuacaoTotal || 0}</td>`;
            rankingTbody.appendChild(row);
            rank++;
        });
    } catch (error) {
        console.error("Erro ao carregar o ranking geral:", error);
        rankingTbody.innerHTML = '<tr><td colspan="3">Não foi possível carregar o ranking.</td></tr>';
    }
}

if (difficultySelection) difficultySelection.addEventListener('click', (e) => {
    if (e.target.matches('.btn[data-difficulty]')) {
        startQuiz(e.target.dataset.difficulty);
    }
});

async function startQuiz(difficulty) {
    currentGroupId = sessionStorage.getItem('currentGroupId');
    score = 0;
    correctAnswersCount = 0;
    currentQuestionIndex = 0;
    if (nextBtn) nextBtn.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';
    try {
        const q = query(
            collection(db, "perguntas"), 
            where("nivel", "==", difficulty),
            where("faixaEtaria", "array-contains", currentUserAgeGroup)
        );
        const querySnapshot = await getDocs(q);
        let allQuestions = [];
        querySnapshot.forEach(doc => allQuestions.push({ id: doc.id, ...doc.data() }));
        
        if (allQuestions.length < 10) {
            console.warn(`Poucas perguntas para ${difficulty}/${currentUserAgeGroup}. Buscando em todas as faixas etárias.`);
            const fallbackQuery = query(collection(db, "perguntas"), where("nivel", "==", difficulty));
            const fallbackSnapshot = await getDocs(fallbackQuery);
            fallbackSnapshot.forEach(doc => {
                if (!allQuestions.find(q => q.id === doc.id)) {
                    allQuestions.push({ id: doc.id, ...doc.data() });
                }
            });
        }
        
        questions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        if (questions.length > 0) {
            switchScreen('quiz-screen');
            displayQuestion();
        } else {
            alert(`Não foram encontradas perguntas para a dificuldade ${difficulty}.`);
            switchScreen('initial-screen');
        }
    } catch (error) {
        console.error("Erro ao buscar perguntas: ", error);
        alert("Ocorreu um erro ao carregar as perguntas.");
    }
}

function displayQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }
    const progress = (currentQuestionIndex / questions.length) * 100;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (questionText) questionText.textContent = questions[currentQuestionIndex].enunciado;
    if (optionsContainer) optionsContainer.innerHTML = '';
    if (feedback) feedback.innerHTML = '';
    if (reference) reference.innerHTML = '';
    if (nextBtn) nextBtn.classList.add('hidden');
    questions[currentQuestionIndex].alternativas.forEach((alt, index) => {
        const button = document.createElement('button');
        button.textContent = alt;
        button.classList.add('btn', 'option-btn');
        button.dataset.index = index;
        button.addEventListener('click', handleAnswer);
        if (optionsContainer) optionsContainer.appendChild(button);
    });
}

function handleAnswer(e) {
    Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);
    const selectedButton = e.target;
    const selectedIndex = parseInt(selectedButton.dataset.index);
    const question = questions[currentQuestionIndex];
    const isCorrect = selectedIndex === question.correta;
    if (isCorrect) {
        selectedButton.classList.add('correct');
        if (feedback) feedback.textContent = 'Resposta Correta!';
        score += 10;
        correctAnswersCount++;
    } else {
        selectedButton.classList.add('wrong');
        if (feedback) feedback.textContent = 'Resposta Errada!';
        optionsContainer.children[question.correta].classList.add('correct');
    }
    if (reference) reference.textContent = `Referência: ${question.referencia}`;
    if (nextBtn) nextBtn.classList.remove('hidden');
    if (progressBar) progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
}

if (nextBtn) nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    displayQuestion();
});

async function showResults() {
    switchScreen('result-screen');
    if (finalScore) finalScore.textContent = score;
    const motivationalMessage = document.getElementById('motivational-message');
    if (motivationalMessage) motivationalMessage.textContent = '"Combati o bom combate, acabei a carreira, guardei a fé." - 2 Timóteo 4:7';
    if (!currentUser) return;
    try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        const wrongAnswersCount = questions.length - correctAnswersCount;
        await updateDoc(userRef, {
            "stats.pontuacaoTotal": increment(score),
            "stats.quizzesJogados": increment(1),
            "stats.respostasCertas": increment(correctAnswersCount),
            "stats.respostasErradas": increment(wrongAnswersCount)
        });
        if (currentGroupId) {
            const groupRef = doc(db, 'grupos', currentGroupId);
            await updateDoc(groupRef, {
                [`membros.${currentUser.uid}.pontuacaoNoGrupo`]: increment(score)
            });
        }
        await checkAndAwardAchievements(userRef);
    } catch (error) {
        console.error("Erro ao atualizar estatísticas:", error);
    }
}

async function checkAndAwardAchievements(userRef) {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;
    const userData = userDoc.data();
    const userAchievements = new Set(userData.conquistas || []);
    let newAchievements = [];
    const stats = userData.stats;
    if (!userAchievements.has("iniciante_da_fe") && stats.quizzesJogados >= 1) newAchievements.push("iniciante_da_fe");
    if (!userAchievements.has("erudito_aprendiz") && stats.pontuacaoTotal >= 1000) newAchievements.push("erudito_aprendiz");
    if (!userAchievements.has("peregrino_fiel") && stats.quizzesJogados >= 10) newAchievements.push("peregrino_fiel");
    if (!userAchievements.has("sabio_de_israel") && stats.pontuacaoTotal >= 5000) newAchievements.push("sabio_de_israel");
    if (!userAchievements.has("mestre_da_palavra") && stats.respostasCertas >= 100) newAchievements.push("mestre_da_palavra");
    if (newAchievements.length > 0) {
        await updateDoc(userRef, { conquistas: arrayUnion(...newAchievements) });
        setTimeout(() => {
            alert(`Parabéns! Desbloqueou ${newAchievements.length} nova(s) conquista(s)!`);
        }, 500);
    }
}

if (leaveQuizBtn) {
    leaveQuizBtn.addEventListener('click', () => {
        if (confirm("Tem certeza de que deseja sair do quiz? O seu progresso nesta partida não será salvo.")) {
            sessionStorage.removeItem('currentGroupId');
            sessionStorage.removeItem('currentGroupDifficulty');
            updateUiforGroupMode();
            switchScreen('initial-screen');
            if (mainMenu) mainMenu.classList.remove('hidden');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
        }
    });
}

if (restartBtn) restartBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentGroupId');
    sessionStorage.removeItem('currentGroupDifficulty');
    updateUiforGroupMode();
    switchScreen('initial-screen');
    if (mainMenu) mainMenu.classList.remove('hidden');
    if (welcomeMessage) welcomeMessage.classList.add('hidden');
});

// --- Lógica da Bíblia ---
function populateBookSelect() {
    if (!bibleBookSelect) return;
    for (const book in bibleBooks) {
        const option = document.createElement('option');
        option.value = book;
        option.textContent = book;
        bibleBookSelect.appendChild(option);
    }
    populateChapterSelect();
}
function populateChapterSelect() {
    if (!bibleBookSelect || !bibleChapterSelect) return;
    const selectedBook = bibleBookSelect.value;
    const chapterCount = bibleBooks[selectedBook];
    bibleChapterSelect.innerHTML = '';
    for (let i = 1; i <= chapterCount; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Capítulo ${i}`;
        bibleChapterSelect.appendChild(option);
    }
}
async function loadChapterText() {
    if (!bibleBookSelect || !bibleChapterSelect || !bibleTextDisplay) return;
    const book = bibleBookSelect.value;
    const chapter = bibleChapterSelect.value;
    const apiUrl = `https://bible-api.com/${book} ${chapter}?translation=almeida`;
    bibleTextDisplay.innerHTML = `<p>Carregando ${book} ${chapter}...</p>`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Não foi possível carregar o texto.');
        const data = await response.json();
        let chapterHtml = `<h3>${data.reference}</h3>`;
        data.verses.forEach(verse => {
            chapterHtml += `<p><strong>${verse.verse}</strong> ${verse.text}</p>`;
        });
        bibleTextDisplay.innerHTML = chapterHtml;
    } catch (error) {
        console.error("Erro ao buscar capítulo da Bíblia:", error);
        bibleTextDisplay.innerHTML = `<p style="color: red;">Erro ao carregar o capítulo. Tente novamente.</p>`;
    }
}
if (bibleCard) bibleCard.addEventListener('click', () => { if (bibleModal) bibleModal.classList.add('visible'); });
if (closeBibleBtn) closeBibleBtn.addEventListener('click', () => { if (bibleModal) bibleModal.classList.remove('visible'); });
if (bibleBookSelect) bibleBookSelect.addEventListener('change', populateChapterSelect);
if (loadChapterBtn) loadChapterBtn.addEventListener('click', loadChapterText);

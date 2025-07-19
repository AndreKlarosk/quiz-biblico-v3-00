import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loadingDiv = document.getElementById('loading-profile');
const contentDiv = document.getElementById('profile-content');
const notFoundDiv = document.getElementById('profile-not-found');
const profilePhotoContainer = document.getElementById('profile-photo-container');
const profilePhoto = document.getElementById('profile-photo');
const profileName = document.getElementById('profile-name');
const profileBio = document.getElementById('profile-bio');
const editBioBtn = document.getElementById('edit-bio-btn');
const shareProfileBtn = document.getElementById('share-profile-btn');
const statScore = document.getElementById('stat-score');
const statQuizzes = document.getElementById('stat-quizzes');
const statCorrect = document.getElementById('stat-correct');
const statAccuracy = document.getElementById('stat-accuracy');
const achievementsGrid = document.getElementById('achievements-grid');
const editBioModal = document.getElementById('edit-bio-modal');
const bioTextarea = document.getElementById('bio-textarea');
const saveBioBtn = document.getElementById('save-bio-btn');
const cancelBioBtn = document.getElementById('cancel-bio-btn');
const showInRankingCheckbox = document.getElementById('show-in-ranking-checkbox');
const settingsSection = document.getElementById('profile-settings');
const dobInput = document.getElementById('dob-input');
const saveDobBtn = document.getElementById('save-dob-btn');
const statScoreFacil = document.getElementById('stat-score-facil');
const statScoreMedio = document.getElementById('stat-score-medio');
const statScoreDificil = document.getElementById('stat-score-dificil');
const bordersSection = document.getElementById('profile-borders-section');
const bordersGrid = document.getElementById('borders-grid');

let currentUser = null;
let profileUid = null;

// LISTA DE CONQUISTAS EXPANDIDA
const allAchievements = {
    'iniciante_da_fe': { title: 'Iniciante da Fé', description: 'Completou seu primeiro quiz.', icon: '📖' },
    'peregrino_fiel': { title: 'Peregrino Fiel', description: 'Jogou 10 quizzes.', icon: '👣' },
    'discipulo_dedicado': { title: 'Discípulo Dedicado', description: 'Jogou 50 quizzes.', icon: '🚶‍♂️' },
    'veterano_da_palavra': { title: 'Veterano da Palavra', description: 'Jogou 100 quizzes.', icon: '🏃‍♂️' },
    'erudito_aprendiz': { title: 'Erudito Aprendiz', description: 'Alcançou 1.000 pontos totais.', icon: '📜' },
    'sabio_de_israel': { title: 'Sábio de Israel', description: 'Alcançou 5.000 pontos totais.', icon: '👑' },
    'conselheiro_real': { title: 'Conselheiro Real', description: 'Alcançou 10.000 pontos totais.', icon: '🏛️' },
    'patriarca_do_saber': { title: 'Patriarca do Saber', description: 'Alcançou 25.000 pontos totais.', icon: '🌟' },
    'mestre_da_palavra': { title: 'Mestre da Palavra', description: 'Acertou 100 perguntas.', icon: '✒️' },
    'escriba_habil': { title: 'Escriba Hábil', description: 'Acertou 500 perguntas.', icon: '✍️' },
    'doutor_da_lei': { title: 'Doutor da Lei', description: 'Acertou 1.000 perguntas.', icon: '🎓' },
    'quase_la': { title: 'Quase Lá', description: 'Fez 90 pontos em um único quiz.', icon: '🥈' },
    'perfeccionista': { title: 'Perfeccionista', description: 'Fez 100 pontos em um único quiz.', icon: '🏆' },
    'impecavel': { title: 'Impecável', description: 'Completou um quiz sem errar nenhuma pergunta.', icon: '🎯' },
    'explorador_facil': { title: 'Explorador Dócil', description: 'Alcançou 1.000 pontos no nível Fácil.', icon: '🐑' },
    'desafiante_medio': { title: 'Desafiante Sólido', description: 'Alcançou 1.000 pontos no nível Médio.', icon: '🗿' },
    'estrategista_dificil': { title: 'Estrategista Audaz', description: 'Alcançou 1.000 pontos no nível Difícil.', icon: '🦁' },
    'fundador_de_grupo': { title: 'Fundador', description: 'Criou seu primeiro grupo.', icon: '🏗️' },
    'socializador': { title: 'Socializador', description: 'Entrou em um grupo.', icon: '🤝' },
    'competidor': { title: 'Competidor', description: 'Jogou uma partida por um grupo.', icon: '⚔️' },
    'campeao_de_grupo': { title: 'Campeão de Grupo', description: 'Alcançou 1.000 pontos em um grupo.', icon: '🥇' },
    'competicao_ouro': { title: 'Campeão da Competição', description: 'Venceu uma competição em 1º lugar.', icon: '🏆' },
    'competicao_prata': { title: 'Vice-Campeão', description: 'Ficou em 2º lugar em uma competição.', icon: '🥈' },
    'competicao_bronze': { title: 'Pódio de Bronze', description: 'Ficou em 3º lugar em uma competição.', icon: '🥉' },
    'competicao_honra': { title: 'Menção Honrosa', description: 'Ficou em 4º lugar em uma competição.', icon: '🎖️' }
};

const allBorders = {
    'default': { name: 'Padrão' },
    'simples_azul': { name: 'Azul Simples' },
    'simples_verde': { name: 'Verde Simples' },
    'simples_roxo': { name: 'Roxo Simples' },
    'ranking_bronze': { name: 'Bronze Rank' },
    'ranking_prata': { name: 'Prata Rank' },
    'ranking_ouro': { name: 'Ouro Rank' },
    'competicao_vencedor': { name: 'Campeão' }
};

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');
    if (!profileUid) {
        showNotFound();
        return;
    }
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.add('hidden');
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadProfileData();
    });
});

async function loadProfileData() {
    try {
        const userRef = doc(db, 'usuarios', profileUid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            displayProfileData(userDoc.data());
            if (contentDiv) contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        showNotFound();
    } finally {
        if (loadingDiv) loadingDiv.classList.add('hidden');
    }
}

function displayProfileData(data) {
    if (profilePhoto) profilePhoto.src = data.fotoURL || 'https://placehold.co/150x150/e0e0e0/333?text=?';
    if (profileName) profileName.textContent = data.nome || 'Jogador Anônimo';
    if (profileBio) profileBio.textContent = data.bio || '';

    const isOwnProfile = currentUser && currentUser.uid === profileUid;
    if (editBioBtn) editBioBtn.classList.toggle('hidden', !isOwnProfile);
    if (settingsSection) settingsSection.classList.toggle('hidden', !isOwnProfile);
    if(bordersSection) bordersSection.classList.toggle('hidden', !isOwnProfile);

    const equippedBorder = data.bordaEquipada || 'default';
    if (profilePhotoContainer) {
        profilePhotoContainer.className = 'profile-photo-container';
        if (equippedBorder !== 'default') {
            profilePhotoContainer.classList.add(equippedBorder);
        }
    }

    if (isOwnProfile) {
        if (showInRankingCheckbox) {
            showInRankingCheckbox.checked = data.showInRanking !== false;
        }
        if (dobInput && data.dataDeNascimento) {
            dobInput.value = data.dataDeNascimento;
        }
        if (bordersGrid) {
            bordersGrid.innerHTML = '';
            const unlockedBorders = new Set(data.bordasDesbloqueadas || []);
            unlockedBorders.add('default');
            unlockedBorders.add('simples_azul'); // Borda inicial
            unlockedBorders.add('simples_verde'); // Borda inicial
            unlockedBorders.add('simples_roxo'); // Borda inicial

            Object.keys(allBorders).forEach(key => {
                const border = allBorders[key];
                if (unlockedBorders.has(key)) {
                    const borderElement = document.createElement('div');
                    borderElement.className = 'profile-photo-container';
                    borderElement.classList.add(key);
                    borderElement.dataset.borderKey = key;
                    borderElement.title = border.name;
                    borderElement.style.cursor = 'pointer';
                    if (key === equippedBorder) {
                        borderElement.style.outline = '3px solid var(--accent-color)';
                    }
                    const img = document.createElement('img');
                    img.src = data.fotoURL || 'https://placehold.co/150x150/e0e0e0/333?text=?';
                    borderElement.appendChild(img);
                    bordersGrid.appendChild(borderElement);
                }
            });
        }
    }

    const stats = data.stats || {};
    const totalCertas = stats.respostasCertasTotal || 0;
    const totalErradas = stats.respostasErradasTotal || 0;
    const totalRespostas = totalCertas + totalErradas;
    const accuracy = totalRespostas > 0 ? ((totalCertas / totalRespostas) * 100).toFixed(0) : 0;

    if (statScore) statScore.textContent = stats.pontuacaoTotal || 0;
    if (statScoreFacil) statScoreFacil.textContent = stats.pontuacaoFacil || 0;
    if (statScoreMedio) statScoreMedio.textContent = stats.pontuacaoMedio || 0;
    if (statScoreDificil) statScoreDificil.textContent = stats.pontuacaoDificil || 0;
    if (statQuizzes) statQuizzes.textContent = stats.quizzesJogadosTotal || 0;
    if (statCorrect) statCorrect.textContent = totalCertas;
    if (statAccuracy) statAccuracy.textContent = `${accuracy}%`;

    if (achievementsGrid) {
        achievementsGrid.innerHTML = '';
        const userAchievements = new Set(data.conquistas || []);
        Object.keys(allAchievements).forEach(key => {
            const achievement = allAchievements[key];
            const isUnlocked = userAchievements.has(key);
            const achievElement = document.createElement('div');
            achievElement.className = 'achievement-badge' + (isUnlocked ? '' : ' locked');
            achievElement.innerHTML = `<div class="achievement-icon">${achievement.icon}</div><div class="achievement-info"><h4>${achievement.title}</h4><p>${achievement.description}</p></div>`;
            achievementsGrid.appendChild(achievElement);
        });
    }
}

function showNotFound() {
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.remove('hidden');
}

if (editBioBtn) editBioBtn.addEventListener('click', () => {
    if (bioTextarea) bioTextarea.value = profileBio.textContent;
    if (editBioModal) editBioModal.classList.add('visible');
});
if (cancelBioBtn) cancelBioBtn.addEventListener('click', () => {
    if (editBioModal) editBioModal.classList.remove('visible');
});
if (saveBioBtn) saveBioBtn.addEventListener('click', async () => {
    const newBio = bioTextarea.value.trim();
    if (newBio.length > 150) {
        alert("A biografia não pode ter mais de 150 caracteres.");
        return;
    }
    saveBioBtn.disabled = true;
    saveBioBtn.textContent = 'Salvando...';
    try {
        await updateDoc(doc(db, 'usuarios', profileUid), { bio: newBio });
        if (profileBio) profileBio.textContent = newBio;
        if (editBioModal) editBioModal.classList.remove('visible');
    } catch (error) {
        console.error("Erro ao salvar a bio:", error);
        alert("Não foi possível salvar a bio.");
    } finally {
        saveBioBtn.disabled = false;
        saveBioBtn.textContent = 'Salvar';
    }
});
if (saveDobBtn) {
    saveDobBtn.addEventListener('click', async () => {
        const dobValue = dobInput.value;
        if (!dobValue) {
            alert("Por favor, selecione uma data válida.");
            return;
        }
        saveDobBtn.disabled = true;
        saveDobBtn.textContent = '...';
        try {
            await updateDoc(doc(db, 'usuarios', profileUid), { dataDeNascimento: dobValue });
            alert("Data de nascimento atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar data de nascimento:", error);
            alert("Não foi possível salvar a data.");
        } finally {
            saveDobBtn.disabled = false;
            saveDobBtn.textContent = 'Salvar';
        }
    });
}
if (shareProfileBtn) shareProfileBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link do perfil copiado!'))
        .catch(() => alert('Não foi possível copiar o link.'));
});
if (showInRankingCheckbox) showInRankingCheckbox.addEventListener('change', async (e) => {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, 'usuarios', currentUser.uid), {
            showInRanking: e.target.checked
        });
    } catch (error) {
        console.error("Erro ao atualizar preferência de ranking:", error);
        alert("Não foi possível salvar sua preferência.");
    }
});

if (bordersGrid) {
    bordersGrid.addEventListener('click', async (e) => {
        const target = e.target.closest('.profile-photo-container');
        if (target && currentUser) {
            const borderKey = target.dataset.borderKey;
            
            bordersGrid.querySelectorAll('.profile-photo-container').forEach(el => el.style.outline = 'none');
            target.style.outline = '3px solid var(--accent-color)';

            try {
                const userRef = doc(db, 'usuarios', currentUser.uid);
                await updateDoc(userRef, { bordaEquipada: borderKey });
                
                if (profilePhotoContainer) {
                    profilePhotoContainer.className = 'profile-photo-container';
                    if (borderKey !== 'default') {
                         profilePhotoContainer.classList.add(borderKey);
                    }
                }
            } catch (error) {
                console.error("Erro ao equipar borda:", error);
                alert("Não foi possível equipar a borda.");
            }
        }
    });
}

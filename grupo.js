import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, deleteField, arrayRemove, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loadingDiv = document.getElementById('loading-group');
const contentDiv = document.getElementById('group-content');
const notFoundDiv = document.getElementById('group-not-found');
const groupIcon = document.getElementById('group-icon');
const groupNameH2 = document.getElementById('group-name');
const groupCreatorSpan = document.getElementById('group-creator');
const rankingTbody = document.getElementById('ranking-tbody');
const groupActionsDiv = document.getElementById('group-actions');
const editGroupModal = document.getElementById('edit-group-modal');
const editGroupNameInput = document.getElementById('edit-group-name-input');
const iconSelectionDiv = document.getElementById('icon-selection');
const saveGroupBtn = document.getElementById('save-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');
// Novos elementos do Chat
const groupChatSection = document.getElementById('group-chat');
const chatMessagesDiv = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');


let currentUser = null;
let groupId = null;
let groupData = null;
let selectedIcon = null;
let unsubscribeChat = null; // Para parar de ouvir o chat quando sair da página

const groupIcons = [
    'fas fa-book-bible', 'fas fa-cross', 'fas fa-dove', 'fas fa-church', 
    'fas fa-hands-praying', 'fas fa-lightbulb', 'fas fa-scroll', 'fas fa-star-of-david'
];

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    groupId = params.get('id');
    if (!groupId) { showNotFound(); return; }
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadGroupData();
    });
});

async function loadGroupData() {
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.add('hidden');

    try {
        const groupRef = doc(db, 'grupos', groupId);
        const groupDoc = await getDoc(groupRef);

        if (groupDoc.exists()) {
            groupData = groupDoc.data();
            displayGroupData();
            if (contentDiv) contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar grupo:", error);
        showNotFound();
    } finally {
        if (loadingDiv) loadingDiv.classList.add('hidden');
    }
}

function displayGroupData() {
    if (!groupData) return;
    if (groupIcon) groupIcon.className = `group-icon ${groupData.groupIcon || 'fas fa-users'}`;
    if (groupNameH2) groupNameH2.textContent = groupData.nomeDoGrupo;
    if (groupCreatorSpan) groupCreatorSpan.textContent = groupData.criadorNome;

    const members = Object.values(groupData.membros).sort((a, b) => b.pontuacaoNoGrupo - a.pontuacaoNoGrupo);
    const isCreator = currentUser && currentUser.uid === groupData.criadorUid;

    if (rankingTbody) {
        rankingTbody.innerHTML = '';
        members.forEach((member, index) => {
            const row = document.createElement('tr');
            const rankClass = `rank-${index + 1}`;
            
            const removeButtonHtml = isCreator && member.uid !== groupData.criadorUid
                ? `<button class="remove-member-btn" data-uid="${member.uid}" title="Remover Membro"><i class="fas fa-times"></i></button>`
                : '';

            row.innerHTML = `
                <td class="rank ${rankClass}">${index + 1}</td>
                <td class="member-info">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${member.fotoURL || 'https://placehold.co/40x40'}" alt="Foto de ${member.nome}">
                        <span>${member.nome}</span>
                    </div>
                    ${removeButtonHtml}
                </td>
                <td class="score">${member.pontuacaoNoGrupo}</td>
            `;
            rankingTbody.appendChild(row);
        });

        rankingTbody.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberUid = e.currentTarget.dataset.uid;
                removeMember(memberUid);
            });
        });
    }

    updateActionButtons();
}

function updateActionButtons() {
    if (!groupActionsDiv) return;
    groupActionsDiv.innerHTML = '';
    if (!currentUser) {
        groupActionsDiv.innerHTML = '<p>Faça login para interagir com o grupo.</p>';
        return;
    }

    const isMember = groupData.memberUIDs.includes(currentUser.uid);
    const isCreator = currentUser.uid === groupData.criadorUid;

    if (isMember) {
        if (groupChatSection) groupChatSection.classList.remove('hidden');
        loadChatMessages(); // Inicia o chat se for membro

        const playBtn = document.createElement('button');
        playBtn.className = 'btn';
        playBtn.innerHTML = '<i class="fas fa-play"></i> Jogar pelo Grupo';
        playBtn.addEventListener('click', () => {
            window.location.href = `index.html?groupId=${groupId}`;
        });
        groupActionsDiv.appendChild(playBtn);

        const inviteBtn = document.createElement('button');
        inviteBtn.className = 'btn btn-secondary';
        inviteBtn.innerHTML = '<i class="fas fa-share-alt"></i> Convidar Amigos';
        inviteBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert('Link de convite copiado!'))
                .catch(() => alert('Não foi possível copiar o link.'));
        });
        groupActionsDiv.appendChild(inviteBtn);
    } else {
        if (groupChatSection) groupChatSection.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat(); // Para de ouvir o chat se não for membro

        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn';
        joinBtn.innerHTML = '<i class="fas fa-user-plus"></i> Entrar no Grupo';
        joinBtn.addEventListener('click', joinGroup);
        groupActionsDiv.appendChild(joinBtn);
    }

    if (isCreator) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Editar';
        editBtn.addEventListener('click', openEditModal);
        groupActionsDiv.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn';
        deleteBtn.style.background = 'var(--danger-color)';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir';
        deleteBtn.addEventListener('click', deleteGroup);
        groupActionsDiv.appendChild(deleteBtn);
    }
}

// --- LÓGICA DO CHAT ---
function loadChatMessages() {
    if (unsubscribeChat) unsubscribeChat(); // Garante que não haja listeners duplicados

    const messagesRef = collection(db, 'grupos', groupId, 'mensagens');
    const q = query(messagesRef, orderBy('timestamp'));

    unsubscribeChat = onSnapshot(q, (querySnapshot) => {
        if (chatMessagesDiv) chatMessagesDiv.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const msg = doc.data();
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message');
            
            const isMyMessage = msg.senderUid === currentUser.uid;
            if (isMyMessage) {
                messageElement.classList.add('my-message');
            }

            messageElement.innerHTML = `
                <div class="message-sender">${isMyMessage ? 'Eu' : msg.senderName}</div>
                <div class="message-bubble">${msg.text}</div>
            `;
            if (chatMessagesDiv) chatMessagesDiv.appendChild(messageElement);
        });
        // Rola para a mensagem mais recente
        if (chatMessagesDiv) chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
}

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = chatInput.value.trim();
        if (messageText.length === 0) return;

        chatInput.disabled = true;

        try {
            const messagesRef = collection(db, 'grupos', groupId, 'mensagens');
            await addDoc(messagesRef, {
                text: messageText,
                senderUid: currentUser.uid,
                senderName: currentUser.displayName,
                timestamp: serverTimestamp()
            });
            chatInput.value = '';
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            alert("Não foi possível enviar a sua mensagem.");
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    });
}

// --- Outras Funções do Grupo ---
async function joinGroup() { /* ... (código existente sem alterações) ... */ }
async function removeMember(memberUid) { /* ... (código existente sem alterações) ... */ }
function openEditModal() { /* ... (código existente sem alterações) ... */ }
if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => editGroupModal.classList.remove('visible'));
if (saveGroupBtn) saveGroupBtn.addEventListener('click', async () => { /* ... (código existente sem alterações) ... */ });
async function deleteGroup() { /* ... (código existente sem alterações) ... */ }
function showNotFound() { /* ... (código existente sem alterações) ... */ }
